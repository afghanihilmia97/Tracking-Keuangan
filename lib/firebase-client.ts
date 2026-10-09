import type { AppData } from "./finance-types";

export type FinanceAccount = { uid: string; email: string | null };
export type FinanceCloudSnapshot = {
  data: AppData | null;
  updatedAt: number | null;
  pendingWrites: boolean;
};

const config = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBYoveOJsT7iZZFEHBQyzmJ9B7Ic-AsrOo",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "financetrack-d8239.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "financetrack-d8239",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "financetrack-d8239.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "394635815343",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:394635815343:web:1ed0cc5506838084aa675a",
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.projectId && config.appId,
);

async function services() {
  if (!isFirebaseConfigured) throw new Error("Firebase belum dikonfigurasi");
  const [
    { getApps, initializeApp },
    {
      deleteUser,
      getAuth,
      GoogleAuthProvider,
      onAuthStateChanged,
      reauthenticateWithCredential,
      reauthenticateWithPopup,
      signInWithCredential,
      signInWithPopup,
      signOut,
    },
    {
      deleteDoc,
      collection,
      doc,
      getDoc,
      getDocs,
      getFirestore,
      onSnapshot,
      serverTimestamp,
      setDoc,
    },
    {
      deleteObject,
      getDownloadURL,
      getStorage,
      listAll,
      ref,
      uploadString,
    },
  ] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);
  const app = getApps()[0] || initializeApp(config);
  return {
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    signInWithPopup,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    signOut,
    deleteUser,
    deleteDoc,
    deleteObject,
    collection,
    doc,
    getDoc,
    getDocs,
    getDownloadURL,
    listAll,
    onSnapshot,
    ref,
    setDoc,
    serverTimestamp,
    uploadString,
  };
}

export async function signInFinanceTrack() {
  const s = await services();
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } =
      await import("@capacitor-firebase/authentication");
    const nativeResult = await FirebaseAuthentication.signInWithGoogle({
      skipNativeAuth: true,
    });
    const nativeCredential = nativeResult.credential;
    if (!nativeCredential?.idToken)
      throw new Error(
        "Google tidak mengirimkan token login. Periksa SHA-1 aplikasi di Firebase.",
      );
    const credential = s.GoogleAuthProvider.credential(
      nativeCredential.idToken,
      nativeCredential.accessToken || undefined,
    );
    const result = await s.signInWithCredential(s.auth, credential);
    return result.user;
  }
  const result = await s.signInWithPopup(s.auth, new s.GoogleAuthProvider());
  return result.user;
}

export async function uploadFinanceData(data: AppData) {
  const s = await services();
  const user = s.auth.currentUser;
  if (!user) throw new Error("Silakan masuk terlebih dahulu");
  await s.setDoc(s.doc(s.db, "users", user.uid, "finance", "current"), {
    data,
    updatedAt: s.serverTimestamp(),
    clientUpdatedAt: Date.now(),
    schemaVersion: 1,
  });
}

export async function downloadFinanceData(): Promise<AppData | null> {
  const s = await services();
  const user = s.auth.currentUser;
  if (!user) throw new Error("Silakan masuk terlebih dahulu");
  const snapshot = await s.getDoc(
    s.doc(s.db, "users", user.uid, "finance", "current"),
  );
  return snapshot.exists() ? (snapshot.data().data as AppData) : null;
}

export async function getFinanceAccount(): Promise<{
  email: string | null;
} | null> {
  const s = await services();
  await s.auth.authStateReady();
  return s.auth.currentUser ? { email: s.auth.currentUser.email } : null;
}

export async function subscribeFinanceData(
  callback: (snapshot: FinanceCloudSnapshot) => void,
  onError: (error: Error) => void,
) {
  const s = await services();
  await s.auth.authStateReady();
  const user = s.auth.currentUser;
  if (!user) throw new Error("Silakan masuk terlebih dahulu");
  const reference = s.doc(s.db, "users", user.uid, "finance", "current");
  return s.onSnapshot(
    reference,
    { includeMetadataChanges: true },
    (snapshot) => {
      const value = snapshot.data();
      const timestamp = value?.updatedAt;
      callback({
        data: snapshot.exists() ? (value?.data as AppData) : null,
        updatedAt:
          typeof timestamp?.toMillis === "function"
            ? timestamp.toMillis()
            : null,
        pendingWrites: snapshot.metadata.hasPendingWrites,
      });
    },
    (error) => onError(error),
  );
}

export async function signOutFinanceTrack() {
  const s = await services();
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } =
      await import("@capacitor-firebase/authentication");
    await FirebaseAuthentication.signOut().catch(() => undefined);
  }
  await s.signOut(s.auth);
}

export async function subscribeFinanceAccount(
  callback: (account: FinanceAccount | null) => void,
) {
  const s = await services();
  return s.onAuthStateChanged(s.auth, (user) =>
    callback(user ? { uid: user.uid, email: user.email } : null),
  );
}

export async function uploadReceiptImage(dataUrl: string, transactionId: string) {
  const s = await services();
  await s.auth.authStateReady();
  const user = s.auth.currentUser;
  if (!user) return dataUrl;
  const reference = s.ref(
    s.storage,
    `users/${user.uid}/receipts/${transactionId}.jpg`,
  );
  await s.uploadString(reference, dataUrl, "data_url", {
    contentType: "image/jpeg",
    customMetadata: { ownerUid: user.uid, transactionId },
  });
  return s.getDownloadURL(reference);
}

export type AccountDeletionReport = {
  uid: string;
  firestoreDocuments: number;
  storageObjects: number;
  authenticationDeleted: boolean;
};

export async function deleteFinanceAccount(): Promise<AccountDeletionReport> {
  const s = await services();
  await s.auth.authStateReady();
  const user = s.auth.currentUser;
  if (!user) throw new Error("Silakan masuk dengan Google terlebih dahulu");

  // Firebase hanya mengizinkan penghapusan akun setelah login yang masih baru.
  // Reautentikasi dilakukan sebelum data apa pun dihapus agar kegagalan login
  // tidak meninggalkan akun tanpa data.
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } =
      await import("@capacitor-firebase/authentication");
    const nativeResult = await FirebaseAuthentication.signInWithGoogle({
      skipNativeAuth: true,
    });
    if (!nativeResult.credential?.idToken)
      throw new Error("auth/requires-recent-login");
    const credential = s.GoogleAuthProvider.credential(
      nativeResult.credential.idToken,
      nativeResult.credential.accessToken || undefined,
    );
    await s.reauthenticateWithCredential(user, credential);
  } else {
    await s.reauthenticateWithPopup(user, new s.GoogleAuthProvider());
  }

  // Server-side Billing records contain tokens and are not client-readable.
  // Refresh the reauthenticated token before calling the protected cleanup.
  await user.getIdToken(true);
  const {getFunctions,httpsCallable} = await import("firebase/functions");
  const {getApp} = await import("firebase/app");
  try {
    await httpsCallable(getFunctions(getApp(),"asia-southeast2"),"deletePremiumData")({});
  } catch (error) {
    const code = (error as {code?:string}).code;
    // Older free deployments have no Billing functions. Other errors must be retried.
    if (code !== "functions/not-found") throw error;
    const registeredPurchases = await s.getDocs(s.collection(s.db,"users",user.uid,"billingPurchases"));
    if (!registeredPurchases.empty) throw new Error("Server penghapusan Premium belum tersedia. Coba lagi sebelum menghapus akun.");
  }

  let storageObjects = 0;
  const deleteStorageFolder = async (
    reference: ReturnType<typeof s.ref>,
  ): Promise<void> => {
    const result = await s.listAll(reference);
    await Promise.all(
      result.items.map(async (item) => {
        await s.deleteObject(item);
        storageObjects += 1;
      }),
    );
    await Promise.all(result.prefixes.map(deleteStorageFolder));
  };
  await deleteStorageFolder(s.ref(s.storage, `users/${user.uid}`));

  let firestoreDocuments = 0;
  const familyIds = new Set<string>();
  for (const collectionName of ["finance", "sync", "family", "families", "premium", "billingPurchases"]) {
    const snapshot = await s.getDocs(
      s.collection(s.db, "users", user.uid, collectionName),
    );
    snapshot.docs.forEach((item) => {
      const value = item.data();
      if (typeof value.familyId === "string") familyIds.add(value.familyId);
      if (collectionName === "family" || collectionName === "families")
        familyIds.add(item.id);
    });
    await Promise.all(snapshot.docs.map((item) => s.deleteDoc(item.ref)));
    firestoreDocuments += snapshot.size;
  }
  await Promise.all(
    [...familyIds].map((familyId) =>
      s.deleteDoc(
        s.doc(s.db, "families", familyId, "members", user.uid),
      ),
    ),
  );
  firestoreDocuments += familyIds.size;
  await s.deleteDoc(s.doc(s.db, "users", user.uid));
  firestoreDocuments += 1;

  await s.deleteUser(user);
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } =
      await import("@capacitor-firebase/authentication");
    await FirebaseAuthentication.signOut().catch(() => undefined);
  }
  return {
    uid: user.uid,
    firestoreDocuments,
    storageObjects,
    authenticationDeleted: true,
  };
}

export async function financeFirebaseApp() {
  await services();
  const { getApp } = await import("firebase/app");
  return getApp();
}
