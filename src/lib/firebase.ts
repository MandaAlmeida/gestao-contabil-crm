// Ambiente de teste: sem Firebase. Os dados ficam salvos localmente no navegador.
import { localDb, type Firestore } from "./localDb";

const firebaseFirestore: Firestore = localDb;

export { firebaseFirestore as db };
