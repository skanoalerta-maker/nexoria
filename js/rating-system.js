import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export function initNovelRating({
  novelId,
  starsSelector = "#ratingStars",
  averageSelector = "#ratingAverage",
  totalSelector = "#ratingTotal",
  statusSelector = "#ratingStatus"
}) {
  const starsWrap = document.querySelector(starsSelector);
  const averageEl = document.querySelector(averageSelector);
  const totalEl = document.querySelector(totalSelector);
  const statusEl = document.querySelector(statusSelector);

  if (!starsWrap || !novelId) return;

  const summaryRef = doc(db, "novel_ratings", novelId);
  let currentUser = null;
  let currentUserRating = 0;

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#ffb4b4" : "#b8c4da";
  }

  function renderStars(selected = 0) {
    const stars = [...starsWrap.querySelectorAll(".rating-star")];
    stars.forEach((star, index) => {
      const value = index + 1;
      star.classList.toggle("active", value <= selected);
    });
  }

  async function loadSummary() {
    const summarySnap = await getDoc(summaryRef);

    if (!summarySnap.exists()) {
      if (averageEl) averageEl.textContent = "0.0";
      if (totalEl) totalEl.textContent = "0";
      return;
    }

    const data = summarySnap.data();
    if (averageEl) averageEl.textContent = Number(data.avgRating || 0).toFixed(1);
    if (totalEl) totalEl.textContent = String(data.totalRatings || 0);
  }

  async function loadUserVote(user) {
    const voteRef = doc(db, "novel_ratings", novelId, "votes", user.uid);
    const voteSnap = await getDoc(voteRef);

    currentUserRating = voteSnap.exists() ? Number(voteSnap.data().rating || 0) : 0;
    renderStars(currentUserRating);

    if (currentUserRating > 0) {
      setStatus(`Tu voto actual es de ${currentUserRating} estrella${currentUserRating === 1 ? "" : "s"}.`);
    } else {
      setStatus("Aún no has votado esta novela.");
    }
  }

  async function submitVote(newRating) {
    if (!currentUser) {
      setStatus("Debes iniciar sesión para votar.", true);
      return;
    }

    const voteRef = doc(db, "novel_ratings", novelId, "votes", currentUser.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const summarySnap = await transaction.get(summaryRef);
        const voteSnap = await transaction.get(voteRef);

        let totalRatings = 0;
        let ratingSum = 0;

        if (summarySnap.exists()) {
          const summaryData = summarySnap.data();
          totalRatings = Number(summaryData.totalRatings || 0);
          ratingSum = Number(summaryData.ratingSum || 0);
        }

        const previousRating = voteSnap.exists() ? Number(voteSnap.data().rating || 0) : 0;

        if (previousRating > 0) {
          ratingSum = ratingSum - previousRating + newRating;
        } else {
          ratingSum += newRating;
          totalRatings += 1;
        }

        const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;

        transaction.set(summaryRef, {
          novelId,
          avgRating,
          totalRatings,
          ratingSum,
          updatedAt: serverTimestamp()
        }, { merge: true });

        transaction.set(voteRef, {
          userId: currentUser.uid,
          rating: newRating,
          createdAt: voteSnap.exists()
            ? (voteSnap.data().createdAt || serverTimestamp())
            : serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      currentUserRating = newRating;
      renderStars(currentUserRating);
      await loadSummary();
      setStatus(`Votaste con ${newRating} estrella${newRating === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setStatus("No se pudo guardar tu votación.", true);
    }
  }

  const stars = [...starsWrap.querySelectorAll(".rating-star")];

  stars.forEach((star) => {
    const value = Number(star.dataset.value || 0);

    star.addEventListener("mouseenter", () => {
      renderStars(value);
    });

    star.addEventListener("mouseleave", () => {
      renderStars(currentUserRating);
    });

    star.addEventListener("click", () => {
      submitVote(value);
    });
  });

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    await loadSummary();

    if (!user) {
      currentUserRating = 0;
      renderStars(0);
      setStatus("Inicia sesión para votar esta novela.");
      return;
    }

    await loadUserVote(user);
  });
}
