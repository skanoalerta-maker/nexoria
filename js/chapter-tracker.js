import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

export function trackChapterRead(chapterId) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      await setDoc(doc(db, "users", user.uid), {
        readChapters: arrayUnion(chapterId)
      }, { merge: true });

      console.log("📖 Guardado:", chapterId);
    } catch (error) {
      console.error("Error guardando capítulo:", error);
    }
  });
}
