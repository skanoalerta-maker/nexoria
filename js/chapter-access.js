import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

function getCurrentChapterInfo() {
  const path = window.location.pathname;

  const chapterMatch = path.match(/capitulo(\d+)\.html$/i);
  const chapterNumber = chapterMatch ? Number(chapterMatch[1]) : null;

  const pathParts = path.split("/").filter(Boolean);

  // Busca carpeta "novelas" y toma lo que sigue como baseFolder
  const novelasIndex = pathParts.indexOf("novelas");

  if (novelasIndex === -1 || !chapterNumber) {
    return null;
  }

  // ejemplo:
  // /nebula/novelas/futurista/codigo-nebula/temporada1/capitulo4.html
  // baseFolder = futurista/codigo-nebula
  const seasonIndex = pathParts.findIndex(part => /^temporada\d+$/i.test(part));

  if (seasonIndex === -1 || seasonIndex <= novelasIndex + 1) {
    return null;
  }

  const baseFolder = pathParts.slice(novelasIndex + 1, seasonIndex).join("/");

  return {
    chapterNumber,
    baseFolder
  };
}

function findNovelByBaseFolder() {
  if (!window.NEBULA_NOVELS) return null;

  const info = getCurrentChapterInfo();
  if (!info) return null;

  const entries = Object.values(window.NEBULA_NOVELS);
  return entries.find(novel => novel.baseFolder === info.baseFolder) || null;
}

function redirectToPaywall(novel) {
  const novelId = novel?.id || "";
  window.location.href = `/nebula/novelas/index.html?id=${encodeURIComponent(novelId)}&locked=1`;
}

export function protectCurrentChapter() {
  const info = getCurrentChapterInfo();
  const novel = findNovelByBaseFolder();

  if (!info || !novel) {
    console.warn("No se pudo detectar novela o capítulo actual.");
    return;
  }

  const freeChapters = Number(novel.freeChapters ?? 3);

  // Gratis, deja pasar
  if (info.chapterNumber <= freeChapters) {
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      redirectToPaywall(novel);
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        redirectToPaywall(novel);
        return;
      }

      const data = snap.data() || {};

      const hasPremium =
        data.premiumActive === true ||
        data.subscription === "premium" ||
        data.plan === "premium";

      const purchasedNovels = Array.isArray(data.purchasedNovels)
        ? data.purchasedNovels
        : [];

      const hasBoughtNovel = purchasedNovels.includes(novel.id);

      if (!hasPremium && !hasBoughtNovel) {
        redirectToPaywall(novel);
      }

    } catch (error) {
      console.error("Error validando acceso al capítulo:", error);
      redirectToPaywall(novel);
    }
  });
}
