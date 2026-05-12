/* ═══════════════════════════════
   library.js — Saved Quizzes
   ═══════════════════════════════ */

async function goLibrary() {
    if (!curUser) {
        toast('⚠️ Sign in to view your library');
        return openAuth();
    }
    ld(true);
    try {
        const snap = await db.collection('quizzes')
            .where('uid', '==', curUser.uid)
            .get();
        
        const list = document.getElementById('lib-list');
        if (snap.empty) {
            list.innerHTML = `<div class="empty-state">No saved quizzes yet. Create one!</div>`;
        } else {
            const docs = snap.docs.sort((a, b) => {
                const ta = a.data().createdAt?.toMillis() || 0;
                const tb = b.data().createdAt?.toMillis() || 0;
                return tb - ta;
            });
            list.innerHTML = docs.map(doc => {
                const q = doc.data();
                const qJson = encodeURIComponent(JSON.stringify(q));
                return `
                <div class="lib-card">
                    <h3>${q.title || 'Untitled Quiz'}</h3>
                    <p>${q.questions.length} questions</p>
                    <button class="btn bp bsm" onclick="launchFromLib('${qJson}')">🚀 Launch</button>
                </div>
                `;
            }).join('');
        }
        showPage('page-library');
    } catch (e) {
        toast('❌ Failed to load library: ' + e.message);
        console.error(e);
    }
    ld(false);
}

window.launchFromLib = function(qJsonEncoded) {
    try {
        const q = JSON.parse(decodeURIComponent(qJsonEncoded));
        launchQuiz(q);
    } catch (e) {
        toast('❌ Error parsing quiz data');
        console.error(e);
    }
}

window.goLibrary = goLibrary;
