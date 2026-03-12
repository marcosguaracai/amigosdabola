// ✅ Importa a configuração do Firebase
import { firebaseConfig } from "./firebase-config.js";

// ✅ Importa módulos do Firebase (versão 10.7.1)
import {
  initializeApp,
  getApps,
  deleteApp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔹 Armazena a referência do app principal
let primaryApp;
let authInstance;

/**
 * Retorna o app Firebase principal (ou inicializa, se necessário)
 */
export function getFirebaseApp() {
  if (!primaryApp) {
    if (getApps().length) {
      primaryApp = getApps()[0];
    } else {
      primaryApp = initializeApp(firebaseConfig);
    }
  }
  return primaryApp;
}

/**
 * Retorna a instância de autenticação
 */
export function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    authInstance.languageCode = "pt-BR"; // força emails de sistema em português (redefinição de senha, verificação, etc.)
  }
  return authInstance;
}

/**
 * Retorna o banco Firestore
 */
export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}

/**
 * Retorna o Storage
 */
export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

/**
 * Observa mudanças de autenticação
 */
export function authStateObserver(callback) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/**
 * Login com e-mail e senha
 */
export function login(email, password) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export function register(email, password) {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

/**
 * Logout do usuário atual
 */
export function logout() {
  return signOut(getFirebaseAuth());
}

/**
 * Cria uma instância temporária de autenticação
 * (usada para ações paralelas como redefinir senha)
 */
export async function withSecondaryAuth(callback) {
  const secondaryName = "amigosdabola-secondary";
  const secondaryApp = initializeApp(firebaseConfig, secondaryName);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    return await callback(secondaryAuth);
  } finally {
    await deleteApp(secondaryApp);
  }
}

export { serverTimestamp };
