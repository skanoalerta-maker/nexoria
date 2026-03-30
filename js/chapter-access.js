import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDccMk1KLoCwXWG2g4r1sOI6qEt_7d5gTw",
  authDomain: "dyh-nebula.firebaseapp.com",
  projectId: "dyh-nebula",
  storageBucket: "dyh-nebula.firebasestorage.app",
  messagingSenderId: "230506596749",
  appId: "1:230506596749:web:d7ffcf38de039c9629d5c4",
  measurementId: "G-KD5ZRFR8C9"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

function getPathParts() {
  return window.location.pathname.split("/").filter(Boolean);
}

function getCurrentChapterNumber() {
  const match = window.location.pathname.match(/capitulo(\d+)\.html$/i);
  return match ? Number(match[1]) : null;
}

function getCurrentSeason() {
  const parts = getPathParts();
  const season = parts.find((part) => /^temporada\d+$/i.test(part));
  return season || null;
}

function getCurrentBaseFolder() {
  const parts = getPathParts();

  const novelasIndex = parts.indexOf("novelas");
  const seasonIndex = parts.findIndex((part) => /^temporada\d+$/i.test(part));

  if (novelasIndex === -1 || seasonIndex === -1 || seasonIndex <= novelasIndex + 1) {
    return null;
  }

  return parts.slice(novelasIndex + 1, seasonIndex).join("/");
}

function findCurrentNovel() {
  if (!window.NEBULA_NOVELS) return null;

  const currentBaseFolder = getCurrentBaseFolder();
  if (!currentBaseFolder) return null;

  return Object.values(window.NEBULA_NOVELS).find(
    (novel) => String(novel.baseFolder || "").trim() === currentBaseFolder
  ) || null;
}

function isChapterFree(novel, chapterNumber, season) {
  if (!novel || !chapterNumber) return false;

  const defaultSeason = novel.defaultSeason || "temporada1";
  const freeLimit = Number(novel.freeChapters ?? 3);

  if (season && season !== defaultSeason) {
    return false;
  }

  return chapterNumber <= freeLimit;
}

function redirectToNovelPaywall(novel) {
  if (!novel?.id) {
    window.location.href = "/nebula/novelas/index.html";
    return;
  }

  window.location.href = `/nebula/novelas/index.html?id=${encodeURIComponent(novel.id)}&locked=1`;
}

function showBlockedOverlay(novel) {
  const title = novel?.title || "esta novela";

  document.body.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:linear-gradient(180deg,#040816 0%,#07101f 100%);
      color:#f8fbff;
      font-family:Inter,system-ui,sans-serif;
      padding:24px;
    ">
      <div style="
        max-width:720px;
        width:100%;
        background:rgba(8,18,40,.92);
        border:1px solid rgba(255,255,255,.08);
        border-radius:24px;
        padding:28px;
        text-align:center;
        box-shadow:0 24px 70px rgba(0,0,0,.34);
      ">
        <div style="font-size:54px; margin-bottom:14px;">🔒</div>
        <h1 style="margin:0 0 12px; font-size:2rem;">Contenido bloqueado</h1>
        <p style="margin:0 0 22px; color:#b8c4da; line-height:1.7;">
          Debes comprar <strong>${title}</strong> o tener <strong>Nébula Premium</strong>
          para seguir leyendo este capítulo.
        </p>

        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a
            href="/nebula/novelas/index.html?id=${encodeURIComponent(novel?.id || "")}"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              min-height:50px;
              padding:0 20px;
              border-radius:16px;
              background:linear-gradient(135deg,#2a82ff 0%,#4aa7ff 100%);
              color:#fff;
              text-decoration:none;
              font-weight:800;
            "
          >
            Desbloquear ahora
          </a>

          <a
            href="/nebula/index.html"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              min-height:50px;
              padding:0 20px;
              border-radius:16px;
              background:rgba(255,255,255,.06);
              border:1px solid rgba(255,255,255,.08);
              color:#fff;
              text-decoration:none;
              font-weight:800;
            "
          >
            Volver a Nébula
          </a>
        </div>
      </div>
    </div>
  `;
}

export function protectCurrentChapter() {
  const novel = findCurrentNovel();
  const chapterNumber = getCurrentChapterNumber();
  const season = getCurrentSeason();

  if (!novel || !chapterNumber) {
    console.warn("No se pudo determinar novela o capítulo actual.");
    return;
  }

  if (isChapterFree(novel, chapterNumber, season)) {
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showBlockedOverlay(novel);
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        showBlockedOverlay(novel);
        return;
      }

      const data = snap.data() || {};

      const plan = String(data.plan || "").toLowerCase();
      const subscription = String(data.subscription || "").toLowerCase();

      const isPremium =
        data.premiumActive === true ||
        plan === "premium" ||
        subscription === "premium";

      const purchasedNovels = Array.isArray(data.purchasedNovels)
        ? data.purchasedNovels
        : [];

      const hasNovelPurchase = purchasedNovels.includes(novel.id);

      if (!isPremium && !hasNovelPurchase) {
        showBlockedOverlay(novel);
      }
    } catch (error) {
      console.error("Error validando acceso al capítulo:", error);
      showBlockedOverlay(novel);
    }
  });
}
