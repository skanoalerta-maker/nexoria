import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD0nB8uMQRC_d17zCf2r-nw0jb0eq4s45w",
  authDomain: "nebula-1955f.firebaseapp.com",
  projectId: "nebula-1955f",
  storageBucket: "nebula-1955f.firebasestorage.app",
  messagingSenderId: "736722257829",
  appId: "1:736722257829:web:605cab7fde553470454a4c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
