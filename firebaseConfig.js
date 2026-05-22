import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEpx0KKrLJKjEmYn9H4SLkAPXam0VsYCI",
  authDomain: "uxer-870af.firebaseapp.com",
  projectId: "uxer-870af",
  storageBucket: "uxer-870af.firebasestorage.app",
  messagingSenderId: "132571887694",
  appId: "1:132571887694:web:967128a234c91382f4eb1f",
  measurementId: "G-MD1E0G78PE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);