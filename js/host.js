/* ═══════════════════════════════
   host.js — Host game management
   ═══════════════════════════════ */

let hunsub = null;

// ── QR Code ──
function generateQR(pin) {
    const el = document.getElementById('qr-code');
    if (!el) return;
    el.innerHTML = '';  // clear previous

    // Build join URL — works both on Firebase Hosting and locally
    const base = window.location.origin + window.location.pathname.replace('index.html', '');
    const url = `${base}?join=${pin}`;

    // Show the site URL hint
    const siteEl = document.getElementById('site-url');
    if (siteEl) siteEl.textContent = window.location.hostname;

    if (typeof QRCode !== 'undefined') {
        new QRCode(el, {
            text: url,
            width: 160,
            height: 160,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
    }
}
window.generateQR = generateQR;

function showHV(id) {
    document.querySelectorAll('.hv').forEach(v => v.classList.remove('on'));
    document.getElementById(id).classList.add('on');
}
window.showHV = showHV;

// ── Firestore listener ──
function startHL() {
    if (hunsub) hunsub();
    hunsub = db.collection('sessions').doc(session.id).onSnapshot(s => {
        if (!s.exists) return;
        syncHostUI(s.data());
    });
}
window.startHL = startHL;

function syncHostUI(d) {
    const ps = Object.values(d.players || {});
    document.getElementById('hplbl').textContent = `Players (${ps.length})`;
    document.getElementById('hchips').innerHTML = ps.map(n => `<span class="chip">${n}</span>`).join('');
    if (d.status === 'question') {
        const cnt = Object.values(d.answers || {}).filter(a => a.qIdx === d.currentQ).length;
        const el = document.getElementById('hacnt');
        if (el) el.textContent = cnt + ' answered';
    }
}

async function hostBegin() {
    if (!fbOK) {
        const d = JSON.parse(localStorage.getItem(LS) || '{}');
        if (!Object.keys(d.players || {}).length)
            return toast('⚠️ Demo: Open another tab, join as a player, then come back here');
    }
    window.qIdx = 0;
    await showHQ(0);
}
window.hostBegin = hostBegin;

async function showHQ(idx) {
    const q = quiz.questions[idx];
    const upd = {
        status: 'question', currentQ: idx,
        questionText: q.text, questionOptions: q.options,
        questionTime: q.time, answers: {}
    };
    if (fbOK) await db.collection('sessions').doc(session.id).update(upd);
    else {
        const d = { ...JSON.parse(localStorage.getItem(LS)), ...upd };
        localStorage.setItem(LS, JSON.stringify(d));
        bcH({ type: 'upd', data: d });
    }

    showHV('hv-q');
    document.getElementById('hprog').textContent = `Question ${idx + 1} / ${quiz.questions.length}`;
    document.getElementById('hqtext').textContent = q.text;
    document.getElementById('hacnt').textContent = '0 answered';
    document.getElementById('hopts').innerHTML = q.options.map((o, i) => `
    <div class="hopt" style="background:${OC[i]}">
      <span class="osh">${OS[i]}</span>${o}
    </div>`).join('');

    startHT(q.time, () => revealH(idx));
}

function startHT(sec, onEnd) {
    clearInterval(tInt);
    let rem = sec;
    const ne = document.getElementById('htnum');
    const fe = document.getElementById('htfill');
    const up = () => { ne.textContent = rem; fe.style.width = (rem / sec * 100) + '%'; };
    up();
    window.tInt = setInterval(() => { rem--; up(); if (rem <= 0) { clearInterval(tInt); onEnd(); } }, 1000);
}

async function revealH(idx) {
    clearInterval(tInt);
    const q = quiz.questions[idx];
    let d;
    if (fbOK) d = (await db.collection('sessions').doc(session.id).get()).data();
    else d = JSON.parse(localStorage.getItem(LS));

    const ans = d.answers || {};
    const scores = { ...(d.scores || {}) };
    const counts = [0, 0, 0, 0];
    const lr = {};

    for (const [uid, a] of Object.entries(ans)) {
        if (a.qIdx !== idx) continue;
        counts[a.option]++;
        const ok = a.option === q.correct;
        const pts = ok ? Math.round(500 + 1000 * (a.timeLeft / q.time)) : 0;
        scores[uid] = (scores[uid] || 0) + pts;
        lr[uid] = { pts, isCorrect: ok };
    }

    const upd = { status: 'reveal', scores, lastReveal: lr, revealCorrect: q.correct };
    if (fbOK) await db.collection('sessions').doc(session.id).update(upd);
    else {
        const nd = { ...d, ...upd };
        localStorage.setItem(LS, JSON.stringify(nd));
        bcH({ type: 'upd', data: nd });
    }

    showHV('hv-r');
    document.getElementById('hrvq').textContent = q.text;
    const tot = counts.reduce((a, b) => a + b, 0) || 1;
    document.getElementById('hropts').innerHTML = q.options.map((o, i) => `
    <div class="rvopt${i === q.correct ? ' ok' : ''}" style="background:${OC[i]}">
      <span>${OS[i]}</span>${o}
      <span class="rvcnt">${counts[i]}</span>
      <div class="rvbar" style="width:${Math.round(counts[i] / tot * 100)}%"></div>
    </div>`).join('');

    renderLB('hlb', scores, d.players || {}, 5);

    const isLast = idx >= quiz.questions.length - 1;
    const bn = document.getElementById('bnext');
    bn.textContent = isLast ? '🏁 End Game' : 'Next Question →';
    bn.onclick = isLast ? hostEnd : hostNext;
}

async function hostNext() { window.qIdx++; await showHQ(qIdx); }
window.hostNext = hostNext;

async function hostEnd() {
    const upd = { status: 'ended' };
    let d;
    if (fbOK) {
        await db.collection('sessions').doc(session.id).update(upd);
        d = (await db.collection('sessions').doc(session.id).get()).data();
    } else {
        d = { ...JSON.parse(localStorage.getItem(LS)), ...upd };
        localStorage.setItem(LS, JSON.stringify(d));
        bcH({ type: 'upd', data: d });
    }
    renderLB('hflb', d.scores || {}, d.players || {}, 10);
    showHV('hv-f');
    const hsaveBtn = document.getElementById('hsave-btn');
    if (hsaveBtn) hsaveBtn.style.display = curUser ? 'inline-flex' : 'none';
}

function renderLB(elId, scores, players, lim) {
    const med = ['🥇', '🥈', '🥉'];
    const rows = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, lim);
    document.getElementById(elId).innerHTML = rows.length
        ? rows.map(([uid, pts], i) => `
        <div class="lbrow">
          <span class="lbm">${med[i] || (i + 1)}</span>
          <span class="lbn">${players[uid] || uid.slice(0, 8)}</span>
          <span class="lbp">${pts} pts</span>
        </div>`).join('')
        : '<div style="color:var(--muted);text-align:center;padding:12px">No answers yet</div>';
}
window.renderLB = renderLB;

function endGame() {
    clearInterval(tInt);
    if (hunsub) hunsub();
    if (window._hbc) { window._hbc.close(); window._hbc = null; }
    window.session = null; window.quiz = null;
    showPage('page-home');
}
window.endGame = endGame;

function bcH(msg) { if (window._hbc) window._hbc.postMessage(msg); }
window.bcH = bcH;

function demoHostMsg(msg) {
    if (msg.type === 'join') {
        const d = JSON.parse(localStorage.getItem(LS));
        d.players = d.players || {};
        d.players[msg.uid] = msg.nick;
        localStorage.setItem(LS, JSON.stringify(d));
        bcH({ type: 'upd', data: d });
        syncHostUI(d);
    }
    if (msg.type === 'ans') {
        const d = JSON.parse(localStorage.getItem(LS));
        d.answers = d.answers || {};
        d.answers[msg.uid] = msg.ans;
        localStorage.setItem(LS, JSON.stringify(d));
        syncHostUI(d);
    }
}
window.demoHostMsg = demoHostMsg;

async function hostSaveQuiz() {
    if (!curUser) {
        toast('⚠️ Sign in to save quizzes');
        return openAuth();
    }
    if (!quiz) return toast('❌ No quiz to save');
    ld(true);
    try {
        await db.collection('quizzes').add({
            ...quiz,
            uid: curUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        toast('✅ Quiz saved!');
        document.getElementById('hsave-btn').disabled = true;
        document.getElementById('hsave-btn').textContent = '✅ Saved';
    } catch (e) { toast('❌ ' + e.message); }
    ld(false);
}
window.hostSaveQuiz = hostSaveQuiz;