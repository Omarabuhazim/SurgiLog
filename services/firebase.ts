
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCziI0bUVmeZ6rR4XSKfEbS4acIRMRmnvM",
  authDomain: "surgilog-book-f29b6.firebaseapp.com",
  projectId: "surgilog-book-f29b6",
  storageBucket: "surgilog-book-f29b6.firebasestorage.app",
  messagingSenderId: "887639342662",
  appId: "1:887639342662:web:27bbc32d17d6cd45b75447",
  measurementId: "G-YVEF0N56VP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
