/* ═══════════════════════════════
   play.js — Player flow
   ═══════════════════════════════ */

let punsub = null;
let myNick = "",
  myScore = 0,
  myUid = "",
  myAns = null;

function showPV(id) {
  document.querySelectorAll(".pv").forEach((v) => v.classList.remove("on"));
  document.getElementById(id).classList.add("on");
}
window.showPV = showPV;

async function joinGame() {
  const pin = document.getElementById("ppin").value.trim().toUpperCase();
  const nick = document.getElementById("pnick").value.trim();
  if (pin.length < 6) return toast("Enter the PIN code");
  if (!nick) return toast("Enter a nickname");

  myNick = nick;
  myScore = 0;
  myAns = null;
  myUid = "p_" + Math.random().toString(36).slice(2, 8);

  ld(true);
  try {
    if (fbOK) {
      const s = await db
        .collection("sessions")
        .where("pin", "==", pin)
        .where("status", "==", "waiting")
        .limit(1)
        .get();
      if (s.empty) {
        ld(false);
        return toast("Invalid PIN or game already started");
      }
      const doc = s.docs[0];
      window.session = { pin, id: doc.id };
      await db
        .collection("sessions")
        .doc(doc.id)
        .update({ [`players.${myUid}`]: nick });
      startPL();
    } else {
      const d = JSON.parse(localStorage.getItem(LS) || "{}");
      if (!d.pin || d.pin !== pin) {
        ld(false);
        return toast("Invalid PIN — use the PIN shown on the host screen");
      }
      window.session = { pin, id: "demo" };
      if (window._pbc) window._pbc.close();
      window._pbc = new BroadcastChannel("qp");
      window._pbc.postMessage({ type: "join", uid: myUid, nick });
      window._pbc.onmessage = (e) => {
        if (e.data.type === "upd") handlePUpd(e.data.data);
      };
      clearInterval(window._poll);
      let _last = "";
      window._poll = setInterval(() => {
        const raw = localStorage.getItem(LS) || "{}";
        if (raw !== _last) {
          _last = raw;
          handlePUpd(JSON.parse(raw));
        }
      }, 400);
    }
    document.getElementById("pnlbl").textContent = `Joined as ${nick}`;
    showPV("pv-w");
    toast(`Joined as ${nick}!`);
  } catch (e) {
    toast(e.message);
  }
  ld(false);
}
window.joinGame = joinGame;

function startPL() {
  if (punsub) punsub();
  punsub = db
    .collection("sessions")
    .doc(session.id)
    .onSnapshot((s) => {
      if (!s.exists) return;
      handlePUpd(s.data());
    });
}

function handlePUpd(d) {
  if (!d) return;
  if (d.status === "waiting") showPV("pv-w");
  else if (d.status === "question") renderPQ(d);
  else if (d.status === "reveal") renderPR(d);
  else if (d.status === "ended") renderPF(d);
}

function renderPQ(d) {
  myAns = null;
  showPV("pv-q");
  document.getElementById("pqtext").textContent = d.questionText;
  document.getElementById("popts").innerHTML = d.questionOptions
    .map(
      (o, i) => `
  <button class="popt" style="background:${OC[i]}"
    onclick="submitAns(${i}, ${d.currentQ}, ${d.questionTime})">

    <span class="popt-letter">
      ${["A", "B", "C", "D"][i]}
    </span>

    <span class="popt-text">
      ${o}
    </span>

  </button>`,
    )
    .join("");

  clearInterval(tInt);
  let rem = d.questionTime;
  const el = document.getElementById("ptimer");
  el.textContent = rem;
  window.tInt = setInterval(() => {
    rem--;
    el.textContent = rem;
    if (rem <= 0) clearInterval(tInt);
  }, 1000);
}

async function submitAns(opt, qIdx, totalTime) {
  if (myAns !== null) return;
  myAns = opt;
  clearInterval(tInt);
  const tl = parseInt(document.getElementById("ptimer").textContent) || 0;

  document.querySelectorAll(".popt").forEach((b, i) => {
    b.disabled = true;
    if (i === opt) b.classList.add("sel");
  });

  const ans = { option: opt, qIdx, timeLeft: tl };
  if (fbOK) {
    await db
      .collection("sessions")
      .doc(session.id)
      .update({ [`answers.${myUid}`]: ans });
  } else if (window._pbc) {
    window._pbc.postMessage({ type: "ans", uid: myUid, ans });
  }
  toast("Answer submitted!");
}
window.submitAns = submitAns;

function renderPR(d) {
  clearInterval(tInt);
  const rv = (d.lastReveal || {})[myUid];
  const ok = rv?.isCorrect || false;
  const pts = rv?.pts || 0;
  myScore = (d.scores || {})[myUid] || 0;

  showPV("pv-r");
  document.getElementById("premi").innerHTML = ok
    ? '<i class="ph-fill ph-check-circle"></i>'
    : '<i class="ph-fill ph-x-circle"></i>';
  document.getElementById("prlbl").textContent = ok
    ? "Correct!"
    : "Wrong Answer";
  const pe = document.getElementById("prpts");
  pe.textContent = (ok ? "+" : "") + pts + " pts";
  pe.className = "ptsbig " + (ok ? "c" : "w");

  const sorted = Object.values(d.scores || {}).sort((a, b) => b - a);
  const rank = sorted.indexOf(myScore) + 1;
  document.getElementById("prrk").textContent =
    `Rank #${rank} • Total: ${myScore} pts`;
}

// ── Auto-fill PIN from URL (?join=ABC123) ──
(function () {
  const params = new URLSearchParams(window.location.search);
  const pinFromUrl = params.get("join");
  if (pinFromUrl) {
    // Wait for templates to load, then fill & switch to play page
    const tryFill = setInterval(() => {
      const pinEl = document.getElementById("ppin");
      const pageEl = document.getElementById("page-play");
      if (pinEl && pageEl) {
        clearInterval(tryFill);
        pinEl.value = pinFromUrl.toUpperCase();
        showPage("page-play");
        showPV("pv-j");
        document.getElementById("pnick")?.focus();
      }
    }, 100);
  }
})();

function renderPF(d) {
  clearInterval(tInt);
  clearInterval(window._poll);
  if (punsub) punsub();
  if (window._pbc) {
    window._pbc.close();
    window._pbc = null;
  }

  myScore = (d.scores || {})[myUid] || 0;
  const sorted = Object.values(d.scores || {}).sort((a, b) => b - a);
  document.getElementById("pfscore").textContent = myScore;
  document.getElementById("pfrank").textContent =
    `You finished #${sorted.indexOf(myScore) + 1}`;
  showPV("pv-f");
}
