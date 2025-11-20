import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const missingConfigEntries = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfigEntries.length > 0) {
  console.warn(
    `[Firebase] Variáveis de ambiente ausentes: ${missingConfigEntries.join(
      ", ",
    )}. Verifique seu arquivo .env.`,
  );
}

const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const firebaseAuth: Auth = getAuth(firebaseApp);
const firebaseFirestore: Firestore = getFirestore(firebaseApp);
const firebaseStorage: FirebaseStorage = getStorage(firebaseApp);
const firebaseFunctions: Functions = getFunctions(firebaseApp);

if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";

  connectAuthEmulator(firebaseAuth, `http://${emulatorHost}:9099`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(firebaseFirestore, emulatorHost, 8080);
  connectFunctionsEmulator(firebaseFunctions, emulatorHost, 5001);
  connectStorageEmulator(firebaseStorage, emulatorHost, 9199);
}

export {
  firebaseApp as app,
  firebaseAuth as auth,
  firebaseFirestore as db,
  firebaseFunctions as functions,
  firebaseStorage as storage,
};







