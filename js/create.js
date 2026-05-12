/* ═══════════════════════════════
   create.js — Quiz creation
   ═══════════════════════════════ */

function goCreate() {
    window.quiz = { title: '', questions: [] };
    document.getElementById('qtitle').value = '';
    document.getElementById('qcont').innerHTML = '';
    addQ();
    showPage('page-create');
    updateNav();
}

function addQ() {
    const c = document.getElementById('qcont');
    const i = c.children.length;
    const d = document.createElement('div');
    d.className = 'qcard';
    d.innerHTML = `
    <div class="qhdr">
      <span class="qnum">Q${i + 1}</span>
      <input type="text" class="qtinp" placeholder="Type your question here…">
      <button class="qdel" onclick="delQ(this)">🗑 Delete</button>
    </div>
    <div class="ogrid">
      ${[0, 1, 2, 3].map(j => `
        <div class="orow">
          <span class="odot" style="background:${OC[j]}"></span>
          <input type="text" placeholder="Option ${j + 1}" class="oinp">
          <input type="radio" name="cq${i}" value="${j}" class="orb" title="Correct answer">
        </div>`).join('')}
    </div>
    <div class="qfoot">
      <label>⏱ Time:</label>
      <select class="qtime">
        <option value="10">10 s</option>
        <option value="20" selected>20 s</option>
        <option value="30">30 s</option>
        <option value="60">60 s</option>
      </select>
      <span class="hint">📌 Radio = correct answer</span>
    </div>`;
    c.appendChild(d);
    renum();
}

function delQ(btn) {
    const c = document.getElementById('qcont');
    if (c.children.length <= 1) return toast('❌ At least 1 question required');
    btn.closest('.qcard').remove();
    renum();
}

function renum() {
    document.querySelectorAll('.qcard').forEach((c, i) => {
        c.querySelector('.qnum').textContent = `Q${i + 1}`;
        c.querySelectorAll('.orb').forEach(r => r.name = `cq${i}`);
    });
}

function collectQuiz() {
    const title = document.getElementById('qtitle').value.trim() || 'Quiz';
    const cards = document.querySelectorAll('.qcard');
    const questions = [];

    for (const c of cards) {
        const text = c.querySelector('.qtinp').value.trim();
        if (!text) { toast('❌ Fill in all questions'); return null; }

        const opts = [...c.querySelectorAll('.oinp')].map(i => i.value.trim());
        if (opts.some(o => !o)) { toast('❌ Fill in all answer options'); return null; }

        const rb = c.querySelector('.orb:checked');
        if (!rb) { toast('❌ Select the correct answer for each question'); return null; }

        questions.push({
            text,
            options: opts,
            correct: parseInt(rb.value),
            time: parseInt(c.querySelector('.qtime').value)
        });
    }
    return { title, questions };
}

async function saveQuiz() {
    if (!curUser) return toast('❌ Sign in to save quizzes');
    const q = collectQuiz();
    if (!q) return;
    ld(true);
    try {
        await db.collection('quizzes').add({
            ...q,
            uid: curUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        toast('✅ Quiz saved!');
    } catch (e) { toast('❌ ' + e.message); }
    ld(false);
}

async function startGame() {
    const q = collectQuiz();
    if (!q) return;
    window.quiz = q;
    window.qIdx = -1;
    const pin = genPin();

    if (fbOK) {
        ld(true);
        try {
            const ref = await db.collection('sessions').add({
                pin, quizTitle: q.title, questions: q.questions,
                status: 'waiting', currentQ: -1,
                players: {}, answers: {}, scores: {},
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            window.session = { pin, id: ref.id };
            ld(false);
        } catch (e) { ld(false); toast('❌ ' + e.message); return; }
    } else {
        window.session = { pin, id: 'demo' };
        const data = {
            pin, quizTitle: q.title, questions: q.questions,
            status: 'waiting', currentQ: -1,
            players: {}, answers: {}, scores: {}
        };
        localStorage.setItem(LS, JSON.stringify(data));
        if (window._hbc) window._hbc.close();
        window._hbc = new BroadcastChannel('qp');
        window._hbc.onmessage = e => demoHostMsg(e.data);
    }

    document.getElementById('hpin-disp').textContent = pin;
    document.getElementById('hqname').textContent = q.title;
    document.getElementById('hchips').innerHTML = '';
    document.getElementById('hplbl').textContent = 'Players (0)';
    showHV('hv-w');
    showPage('page-host');
    generateQR(pin);
    if (fbOK) startHL();
    toast('✅ Game ready! PIN: ' + pin);
}

window.goCreate = goCreate;
window.addQ = addQ;
window.delQ = delQ;
window.saveQuiz = saveQuiz;
window.startGame = startGame;
window.collectQuiz = collectQuiz;