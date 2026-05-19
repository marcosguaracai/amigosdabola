import {
  authStateObserver,
  getFirebaseAuth,
  getFirestoreDb,
  login as firebaseLogin,
  logout as firebaseLogout,
  register as firebaseRegister,
} from "./firebase-client.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestoreDb();

function normalizeRole(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .trim();
  const synonyms = new Map([
    ["administrador", "admin"],
    ["administradora", "admin"],
    ["diretor", "diretor"],
    ["diretora", "diretor"],
    ["financeiro", "financeiro"],
    ["tesoureiro", "tesoureiro"],
    ["imprensa", "imprensa"],
    ["socio", "socio"],
    ["sócio", "socio"],
    ["visitante", "visitante"],
    ["crianca", "crianca"],
    ["criança", "crianca"],
  ]);
  if (synonyms.has(normalized)) {
    return synonyms.get(normalized);
  }
  return normalized;
}

const AUTO_LOGOUT_TIMEOUT_MS = 15 * 60 * 1000;
const hasBrowserEnvironment = typeof window !== "undefined" && typeof document !== "undefined";

const autoLogoutState = {
  timerId: null,
  redirectTo: "index.html",
  active: false,
  listenersBound: false,
};

async function handleAutoLogoutTimeout() {
  autoLogoutState.active = false;
  if (autoLogoutState.timerId) {
    window.clearTimeout(autoLogoutState.timerId);
    autoLogoutState.timerId = null;
  }
  try {
    await firebaseLogout();
  } catch (error) {
    console.warn("Falha ao encerrar sessão por inatividade:", error);
  }
  window.location.href = autoLogoutState.redirectTo;
}

function resetAutoLogoutTimer() {
  if (!autoLogoutState.active) return;
  if (autoLogoutState.timerId) {
    window.clearTimeout(autoLogoutState.timerId);
  }
  autoLogoutState.timerId = window.setTimeout(handleAutoLogoutTimeout, AUTO_LOGOUT_TIMEOUT_MS);
}

function bindAutoLogoutListeners() {
  if (!hasBrowserEnvironment || autoLogoutState.listenersBound) return;
  const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
  const listenerOptions = { passive: true };
  events.forEach((eventName) => {
    window.addEventListener(eventName, resetAutoLogoutTimer, listenerOptions);
  });
  document.addEventListener("visibilitychange", () => {
    if (!autoLogoutState.active || document.visibilityState !== "visible") return;
    resetAutoLogoutTimer();
  });
  autoLogoutState.listenersBound = true;
}

function ensureAutoLogout(redirectTo = "index.html") {
  if (!hasBrowserEnvironment) return;
  autoLogoutState.redirectTo = redirectTo;
  autoLogoutState.active = true;
  bindAutoLogoutListeners();
  resetAutoLogoutTimer();
}

function clearAutoLogoutTimer() {
  autoLogoutState.active = false;
  if (!autoLogoutState.timerId) return;
  window.clearTimeout(autoLogoutState.timerId);
  autoLogoutState.timerId = null;
}

export function onAuthChange(callback) {
  return authStateObserver(async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    const profile = await fetchMemberProfile(user.uid, user.email);
    callback(user, profile);
  });
}

export async function fetchMemberProfile(uid, email) {
  if (!uid) return null;
  const docRef = doc(db, "members", uid);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return { id: snapshot.id, ...data, role: normalizeRole(data.role) };
  }
  if (email) {
    const normalized = email.toLowerCase();
    const altDocRef = doc(db, "membersByEmail", normalized);
    const altSnapshot = await getDoc(altDocRef);
    if (altSnapshot.exists()) {
      const memberId = altSnapshot.data().memberId;
      if (memberId) {
        const memberDoc = await getDoc(doc(db, "members", memberId));
          if (memberDoc.exists()) {
            return { id: memberDoc.id, ...memberDoc.data() };
        }
      }
    }
  }
  return null;
}

export async function ensureSelfProfile(user) {
  if (!user) return null;
  const profile = await fetchMemberProfile(user.uid, user.email);
  if (profile) {
    return { ...profile, role: normalizeRole(profile.role) };
  }
  const membersSnapshot = await getDocs(query(collection(db, "members"), limit(1)));
  const isFirstMember = membersSnapshot.empty;
  if (!isFirstMember) {
    return null;
  }
  const newProfile = {
    id: user.uid,
    name: user.displayName || user.email.split("@")[0],
    email: user.email,
    role: isFirstMember ? "admin" : "visitante",
    status: "ativo",
    joinDate: new Date().toISOString().slice(0, 10),
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  };
  await setDoc(doc(db, "members", user.uid), newProfile);
  if (user.email) {
    await setDoc(
      doc(db, "membersByEmail", user.email.toLowerCase()),
      { memberId: user.uid },
      { merge: true },
    );
  }
  return newProfile;
}

export async function requireAuth({ allowedRoles = [], redirectTo = "index.html" } = {}) {
  return new Promise((resolve) => {
    const unsubscribe = authStateObserver(async (user) => {
      if (!user) {
        unsubscribe();
        window.location.href = redirectTo;
        return;
      }
      const profile = await ensureSelfProfile(user);
      if (!profile) {
        unsubscribe();
        window.location.href = redirectTo;
        return;
      }
      const normalizedRole = normalizeRole(profile.role);
      const normalizedProfile = { ...profile, role: normalizedRole };
      const normalizedAllowed = allowedRoles.map((role) => normalizeRole(role));
      if (normalizedAllowed.length && !normalizedAllowed.includes(normalizedRole)) {
        console.warn(
          "[auth] acesso negado",
          { role: normalizedRole, email: profile.email, allowed: normalizedAllowed },
        );
        unsubscribe();
        window.location.href = "dashboard.html";
        return;
      }
      ensureAutoLogout(redirectTo);
      unsubscribe();
      resolve({ user, profile: normalizedProfile });
    });
  });
}

export function logout() {
  if (hasBrowserEnvironment) {
    clearAutoLogoutTimer();
  }
  return firebaseLogout();
}

export function currentUser() {
  return getFirebaseAuth().currentUser;
}

export function login(email, password) {
  return firebaseLogin(email, password);
}

export function register(email, password) {
  return firebaseRegister(email, password);
}
