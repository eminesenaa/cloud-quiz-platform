/* ═══════════════════════════════════════════
   app.js — Firebase init, Auth, Utils, Router
   ═══════════════════════════════════════════ */

// ─────────────────────────────────────────────
//  Firebase Config — paste your own values here
//  Leave empty to run in Demo Mode (localStorage)
// ─────────────────────────────────────────────
const FBC = {
    apiKey: "AIzaSyDgvV-KfLFXDDtRoU9xcP_hkJIzulHaW2M",
    authDomain: "cloud-quiz-platform-2f646.firebaseapp.com",
    projectId: "cloud-quiz-platform-2f646",
    storageBucket: "cloud-quiz-platform-2f646.firebasestorage.app",
    messagingSenderId: "521731075438",
    appId: "1:521731075438:web:1a6882e0c4b8707cd9457f"
};
// ─────────────────────────────────────────────

window.DEMO = !FBC.apiKey;
window.db = null;
window.auth = null;
window.fbOK = false;

if (!DEMO) {
    firebase.initializeApp(FBC);
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.fbOK = true;
    const b = document.getElementById('dbanner');
    if (b) b.style.display = 'none';
    auth.onAuthStateChanged(u => { window.curUser = u; updateNav(); });
}

// ── SHARED STATE ──
window.curUser = null;
window.quiz = null;   // { title, questions[] }
window.session = null;   // { pin, id }
window.qIdx = 0;
window.tInt = null;

// ── CONSTANTS ──
window.OC = ['var(--ca)', 'var(--cb)', 'var(--cc)', 'var(--cd)'];
window.OS = ['▲', '◆', '●', '■'];
window.LS = 'qp_sess';

// ── ROUTER ──
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
window.showPage = showPage;

// ── UTILS ──
function toast(m, d = 3000) {
    const t = document.getElementById('toast');
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), d);
}
function ld(on) {
    document.getElementById('ld').classList.toggle('show', on);
}
function genPin() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

window.toast = toast;
window.ld = ld;
window.genPin = genPin;

// ── NAV ──
function updateNav() {
    const el = document.getElementById('navr');
    if (curUser) {
        el.innerHTML = `
      <span class="upill">👤 ${curUser.displayName || curUser.email.split('@')[0]}</span>
      <button class="btn bo bsm" onclick="doLogout()">Sign Out</button>`;
        const b = document.getElementById('bsave');
        if (b) b.style.display = 'inline-flex';
    } else {
        el.innerHTML = `<button class="btn bo bsm" onclick="openAuth()">Sign In</button>`;
        const b = document.getElementById('bsave');
        if (b) b.style.display = 'none';
    }
}
window.updateNav = updateNav;

// ── AUTH ──
function openAuth() {
    if (!fbOK) return toast('⚠️ Firebase config not set');
    document.getElementById('amod').classList.add('show');
}
function closeAuth() {
    document.getElementById('amod').classList.remove('show');
}
function atab(t) {
    document.querySelectorAll('.tab').forEach((el, i) =>
        el.classList.toggle('on', (i === 0 && t === 'l') || (i === 1 && t === 'r')));
    document.getElementById('tl').style.display = t === 'l' ? '' : 'none';
    document.getElementById('tr').style.display = t === 'r' ? '' : 'none';
}
async function doLogin() {
    ld(true);
    try {
        await auth.signInWithEmailAndPassword(
            document.getElementById('le').value,
            document.getElementById('lp').value
        );
        closeAuth(); toast('✅ Signed in!');
    } catch (e) { toast('❌ ' + e.message); }
    ld(false);
}
async function doReg() {
    ld(true);
    try {
        await auth.createUserWithEmailAndPassword(
            document.getElementById('re').value,
            document.getElementById('rp').value
        );
        closeAuth(); toast('✅ Account created!');
    } catch (e) { toast('❌ ' + e.message); }
    ld(false);
}
async function doGoogle() {
    ld(true);
    try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        closeAuth(); toast('✅ Signed in with Google!');
    } catch (e) { toast('❌ ' + e.message); }
    ld(false);
}
async function doLogout() {
    await auth.signOut();
    toast('👋 Signed out');
}

window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.atab = atab;
window.doLogin = doLogin;
window.doReg = doReg;
window.doGoogle = doGoogle;
window.doLogout = doLogout;

// ── HOME ──
function goJoin() {
    const pin = document.getElementById('hpin').value.trim();
    if (pin.length < 6) return toast('❌ Enter a 6-character PIN');
    document.getElementById('ppin').value = pin;
    showPage('page-play');
    showPV('pv-j');
}
window.goJoin = goJoin;