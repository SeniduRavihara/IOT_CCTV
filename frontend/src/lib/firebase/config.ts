import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB_uDooDBu5Ko_PF93y7c8kjWcOJtfCp80",
  authDomain: "iot-cctv-ede95.firebaseapp.com",
  projectId: "iot-cctv-ede95",
  storageBucket: "iot-cctv-ede95.firebasestorage.app",
  messagingSenderId: "330151394962",
  appId: "1:330151394962:web:e0659e05af61b4cf33f04b"
};

// Initialize Firebase only if it hasn't been initialized
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// if (process.env.NODE_ENV === "development") {
//   connectAuthEmulator(auth, "http://localhost:9099");
//   connectFirestoreEmulator(db, "localhost", 8080);
//   connectStorageEmulator(storage, "localhost", 9199);
//   connectFunctionsEmulator(functions, "localhost", 5001);
// }

export default app;
