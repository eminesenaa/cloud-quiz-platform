/* ═══════════════════════════════
   library.js — Saved Quizzes
   ═══════════════════════════════ */

async function goLibrary() {
  if (!curUser) {
    toast("Sign in to view your library");
    return openAuth();
  }
  ld(true);
  try {
    const snap = await db
      .collection("quizzes")
      .where("uid", "==", curUser.uid)
      .get();

    const list = document.getElementById("lib-list");
    if (snap.empty) {
      list.innerHTML = `
<div class="empty-state">
    <div class="empty-icon">
        <i class="ph-fill ph-books"></i>
    </div>

    <h3>No saved quizzes yet</h3>

    <p>
        Your created quizzes will appear here.
        Start by creating your first quiz.
    </p>
</div>
`;
    } else {
      const docs = snap.docs.sort((a, b) => {
        const ta = a.data().createdAt?.toMillis() || 0;
        const tb = b.data().createdAt?.toMillis() || 0;
        return tb - ta;
      });
      list.innerHTML = docs
        .map((doc) => {
          const q = doc.data();
          const qJson = encodeURIComponent(JSON.stringify(q));
          return `
                <div class="lib-card" id="quiz-${doc.id}">
                    <div class="lc-head">
                        <h3>${q.title || "Untitled Quiz"}</h3>
                        <div class="lc-acts">
                            <button class="icon-btn" onclick="editQuiz('${doc.id}', '${qJson}')" title="Edit">
    <i class="ph-fill ph-pencil-simple"></i>
</button>
                            <button class="icon-btn delete-btn" onclick="deleteQuiz('${doc.id}')" title="Delete">
    <i class="ph-fill ph-trash"></i>
</button>
                        </div>
                    </div>
                    <p>${q.questions.length} questions</p>
                    <button class="btn bp bsm launch-lib-btn" onclick="launchFromLib('${qJson}')">
    <i class="ph-fill ph-rocket-launch"></i>
    Launch
</button>
                </div>
                `;
        })
        .join("");
    }
    showPage("page-library");
  } catch (e) {
    toast("Failed to load library: " + e.message);
    console.error(e);
  }
  ld(false);
}

window.launchFromLib = function (qJsonEncoded) {
  try {
    const q = JSON.parse(decodeURIComponent(qJsonEncoded));
    launchQuiz(q);
  } catch (e) {
    toast("Error parsing quiz data");
    console.error(e);
  }
};

window.deleteQuiz = async function (id) {
  if (!confirm("Are you sure you want to delete this quiz?")) return;
  ld(true);
  try {
    await db.collection("quizzes").doc(id).delete();
    toast("Quiz deleted successfully");
    goLibrary(); // Refresh the list
  } catch (e) {
    toast("Failed to delete: " + e.message);
    console.error(e);
  }
  ld(false);
};

window.editQuiz = function (id, qJsonEncoded) {
  try {
    const q = JSON.parse(decodeURIComponent(qJsonEncoded));
    window.editingQuizId = id;
    document.getElementById("qtitle").value = q.title || "";
    document.getElementById("qcont").innerHTML = "";

    if (q.questions && q.questions.length) {
      q.questions.forEach((qs) => addQ(qs));
    } else {
      addQ();
    }

    const bsave = document.getElementById("bsave");
    if (bsave) {
      bsave.disabled = false;
      bsave.innerHTML = `
<i class="ph-fill ph-floppy-disk"></i>
Save Changes
`;
    }

    window.editingFromLibrary = true;

    const backBtn = document.getElementById("create-back-btn");
    const backLabel = document.getElementById("create-back-label");

    if (backBtn && backLabel) {
      backBtn.onclick = () => goLibrary();
      backLabel.textContent = "Back";
    }

    showPage("page-create");
    updateNav();
  } catch (e) {
    toast("Error loading quiz for edit");
    console.error(e);
  }
};

window.goLibrary = goLibrary;
