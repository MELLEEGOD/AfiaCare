import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "afiacare-5e25b",
  appId: "1:574814753667:web:89ccc557f4e91357eedcb6",
  storageBucket: "afiacare-5e25b.firebasestorage.app",
  apiKey: "AIzaSyAqKm2E3ZLW0o1lKR1JrhMB4_KkGiX_pHM",
  authDomain: "afiacare-5e25b.firebaseapp.com",
  messagingSenderId: "574814753667",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
