import { login, logout, onAuthChange } from "./auth.js";
import { getFirestoreDb } from "./firebase-client.js";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestoreDb();

const navToggleButton = document.getElementById("gallery-menu-toggle");
const drawer = document.getElementById("drawer-menu");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerClose = document.getElementById("drawer-close");
const loginTriggers = document.querySelectorAll("[data-action='open-login']");
const loginDialog = document.getElementById("login-dialog");
const loginForm = document.getElementById("login-form");
const loginPasswordInput = document.getElementById("login-password");
const loginPasswordToggle = document.getElementById("login-password-toggle");
const loginFeedback = document.getElementById("login-feedback");
const galleryGrid = document.getElementById("gallery-grid");
const galleryCount = document.getElementById("gallery-count");
const galleryFeedback = document.getElementById("gallery-feedback");
const logoutButtons = Array.from(document.querySelectorAll("[data-logout-button]"));
const publicNavLinks = document.querySelectorAll("a[data-public-nav]");
const restrictedNavItems = document.querySelectorAll("[data-auth-only]");
const LOGOUT_DESKTOP_BREAKPOINT = 768;
const ALLOWED_GALLERY_ROLES = new Set([
  "admin",
  "diretor",
  "financeiro",
  "tesoureiro",
  "imprensa",
  "socio",
  "visitante",
  "crianca",
]);
const publicStatsRef = doc(db, "settings", "publicStats");
const loadingFlags = { members: false, stats: false };

function setPageLoading(isLoading) {
  document.body.classList.toggle("page-loading", isLoading);
}

function updatePageLoading() {
  const done = Object.values(loadingFlags).every(Boolean);
  setPageLoading(!done);
}

const PASSWORD_TOGGLE_ICONS = {
  hidden: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  `,
  visible: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10 10 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94m4-1.5A9.79 9.79 0 0 1 12 5c7 0 11 7 11 7a21.6 21.6 0 0 1-2.31 3.41" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  `,
};

function setPasswordToggleState(button, isVisible) {
  if (!button) return;
  button.dataset.state = isVisible ? "visible" : "hidden";
  button.setAttribute("aria-label", isVisible ? "Ocultar senha" : "Mostrar senha");
  button.innerHTML = isVisible ? PASSWORD_TOGGLE_ICONS.visible : PASSWORD_TOGGLE_ICONS.hidden;
}

let membersUnsubscribe = null;
let cachedMembers = [];
let publicStatsUnsubscribe = null;
let latestPublicActiveCount = null;
let lastRenderedMembersCount = null;
let currentUser = null;
let currentProfile = null;
const state = {};
const bindState = (key, getter, setter) => {
  Object.defineProperty(state, key, {
    get: getter,
    set: setter,
    enumerable: true,
  });
};
window.pageState = state;

bindState("membersUnsubscribe", () => membersUnsubscribe, (value) => { membersUnsubscribe = value; });
bindState("cachedMembers", () => cachedMembers, (value) => { cachedMembers = value; });
bindState("publicStatsUnsubscribe", () => publicStatsUnsubscribe, (value) => { publicStatsUnsubscribe = value; });
bindState("latestPublicActiveCount", () => latestPublicActiveCount, (value) => { latestPublicActiveCount = value; });
bindState("lastRenderedMembersCount", () => lastRenderedMembersCount, (value) => { lastRenderedMembersCount = value; });
bindState("currentUser", () => currentUser, (value) => { currentUser = value; });
bindState("currentProfile", () => currentProfile, (value) => { currentProfile = value; });
bindState("loadingFlags", () => loadingFlags, (value) => {
  if (value && typeof value === "object") {
    Object.assign(loadingFlags, value);
  }
});

const ROLE_SYNONYMS = new Map([
  ["administrador", "admin"],
  ["administradora", "admin"],
  ["diretor", "diretor"],
  ["diretora", "diretor"],
  ["financeiro", "financeiro"],
  ["tesoureiro", "tesoureiro"],
  ["imprensa", "imprensa"],
  ["socio", "socio"],
  ["sócio", "socio"],
  ["socia", "socio"],
  ["sócia", "socio"],
  ["visitante", "visitante"],
  ["crianca", "crianca"],
  ["criança", "crianca"],
]);

function normalizeRole(value) {
  const key = String(value || "").trim().toLowerCase();
  return ROLE_SYNONYMS.get(key) || key;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

if (galleryFeedback) {
  galleryFeedback.textContent = "Carregando sócios...";
}
setPageLoading(true);

setupDrawerMenu();

function setupDrawerMenu() {
  if (!navToggleButton || !drawer || !drawerBackdrop) return;
  const srLabel = navToggleButton.querySelector(".sr-only");

  const setOpen = (open) => {
    navToggleButton.setAttribute("aria-expanded", open ? "true" : "false");
    drawer.dataset.open = open ? "true" : "false";
    drawerBackdrop.dataset.open = open ? "true" : "false";
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    drawerBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
    if (srLabel) srLabel.textContent = open ? "Fechar navegação" : "Abrir navegação";
    document.body.classList.toggle("overflow-hidden", open);
  };

  navToggleButton.addEventListener("click", () => {
    const isOpen = drawer.dataset.open === "true";
    setOpen(!isOpen);
  });

  drawerBackdrop.addEventListener("click", () => setOpen(false));
  drawerClose?.addEventListener("click", () => setOpen(false));
  drawer.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  setOpen(false);
}

publicNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    try {
      sessionStorage.setItem("admin:returnPath", window.location.pathname);
    } catch (error) {
      console.warn("Não foi possível registrar a última rota da área restrita.", error);
    }
  });
});

const closeButtons = document.querySelectorAll("button[data-action='close']");
closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.closest("dialog");
    if (dialog && dialog.open) dialog.close();
  });
});

loginTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    if (trigger.dataset.state === "authenticated") {
      window.location.href = "dashboard.html";
      return;
    }
    if (!loginDialog) return;
    if (window.setFeedback) {
      window.setFeedback(loginFeedback, "", "info");
    } else {
      loginFeedback.textContent = "";
    }
    if (loginForm) loginForm.reset();
    if (loginPasswordInput) loginPasswordInput.type = "password";
    setPasswordToggleState(loginPasswordToggle, false);
    loginDialog.showModal();
  });
});

logoutButtons.forEach((button) => {
  button?.addEventListener("click", async () => {
    try {
      logoutButtons.forEach((btn) => {
        btn.disabled = true;
        btn.classList.add("opacity-60", "pointer-events-none");
      });
      await logout();
      window.location.href = "index.html";
    } catch (error) {
      console.error("Erro ao encerrar sessão:", error);
    }
  });
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (window.setFeedback) {
      window.setFeedback(loginFeedback, "", "info");
    } else {
      loginFeedback.textContent = "";
    }
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    try {
      await login(email, password);
      loginDialog.close();
      window.location.href = "dashboard.html";
    } catch (error) {
      const message = traduzirErro(error);
      if (window.setFeedback) {
        window.setFeedback(loginFeedback, message, "error");
      } else {
        loginFeedback.textContent = message;
      }
    }
  });
}

setPasswordToggleState(loginPasswordToggle, false);
loginPasswordToggle?.addEventListener("click", () => {
  if (!loginPasswordInput) return;
  const reveal = loginPasswordInput.type === "password";
  loginPasswordInput.type = reveal ? "text" : "password";
  setPasswordToggleState(loginPasswordToggle, reveal);
});

onAuthChange((user, profile) => {
  currentUser = user;
  currentProfile = profile;
  loginTriggers.forEach((trigger) => {
    if (user && profile) {
      trigger.dataset.state = "authenticated";
      trigger.textContent = formatRole(profile.role);
    } else {
      trigger.dataset.state = "anonymous";
      if (trigger.dataset.labelAnon) trigger.textContent = trigger.dataset.labelAnon;
    }
  });
  toggleRestrictedNav(Boolean(user && profile));
  syncLogoutButtons(Boolean(user && profile));
});

function resolveLogoutVisibility(button, isAuthenticated) {
  if (!button || !isAuthenticated) return false;
  const visibility = button.dataset.logoutVisibility || "all";
  if (visibility === "desktop") return window.innerWidth >= LOGOUT_DESKTOP_BREAKPOINT;
  if (visibility === "mobile") return window.innerWidth < LOGOUT_DESKTOP_BREAKPOINT;
  return true;
}

function syncLogoutButtons(isAuthenticated) {
  logoutButtons.forEach((button) => {
    const shouldShow = resolveLogoutVisibility(button, isAuthenticated);
    button.classList.toggle("hidden", !shouldShow);
    button.toggleAttribute("aria-hidden", !shouldShow);
    button.disabled = !shouldShow;
  });
}

window.addEventListener("resize", () => {
  syncLogoutButtons(Boolean(currentUser && currentProfile));
});

function toggleRestrictedNav(isAuthenticated) {
  restrictedNavItems.forEach((item) => {
    item.classList.toggle("hidden", !isAuthenticated);
    item.toggleAttribute("aria-hidden", !isAuthenticated);
  });
}

function attachMembersListener() {
  detachMembersListener();
  if (galleryFeedback) {
    galleryFeedback.textContent = "Carregando sócios...";
    galleryFeedback.classList.remove("hidden");
  }
  const membersRef = collection(db, "members");
  const membersQuery = query(membersRef, orderBy("name", "asc"));
  membersUnsubscribe = onSnapshot(
    membersQuery,
    (snapshot) => {
      cachedMembers = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      renderMembers(cachedMembers);
      loadingFlags.members = true;
      updatePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar galeria:", error);
      if (galleryFeedback) {
        galleryFeedback.textContent =
          "Não foi possível carregar os dados da galeria. Tente novamente mais tarde.";
      }
      loadingFlags.members = true;
      updatePageLoading();
    },
  );
}

function detachMembersListener() {
  if (membersUnsubscribe) {
    membersUnsubscribe();
    membersUnsubscribe = null;
  }
}

function updateGalleryCount() {
  if (!galleryCount) return;
  const value = latestPublicActiveCount ?? lastRenderedMembersCount;
  galleryCount.textContent = value != null ? String(value) : "--";
}

function attachPublicStatsListener() {
  detachPublicStatsListener();
  publicStatsUnsubscribe = onSnapshot(
    publicStatsRef,
    (snapshot) => {
      const data = snapshot.data();
      const active = data?.members?.active;
      latestPublicActiveCount = Number.isFinite(Number(active)) ? Number(active) : null;
      updateGalleryCount();
      loadingFlags.stats = true;
      updatePageLoading();
    },
    (error) => {
      latestPublicActiveCount = null;
      console.error("Erro ao carregar estatísticas públicas:", error);
      updateGalleryCount();
      loadingFlags.stats = true;
      updatePageLoading();
    },
  );
}

function detachPublicStatsListener() {
  if (publicStatsUnsubscribe) {
    publicStatsUnsubscribe();
    publicStatsUnsubscribe = null;
  }
}

function renderMembers(members) {
  if (!galleryGrid || !galleryCount || !galleryFeedback) return;
  const sociosAtivos = (members || [])
    .map((member) => {
      const role = normalizeRole(member.role || "socio");
      const status = normalizeStatus(member.status || "ativo");
      return { ...member, role, status };
    })
    .filter((member) => ALLOWED_GALLERY_ROLES.has(member.role) && member.status === "ativo")
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));
  galleryGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  lastRenderedMembersCount = sociosAtivos.length;
  updateGalleryCount();
  if (!sociosAtivos.length) {
    galleryFeedback.textContent = "Nenhum sócio ativo cadastrado até o momento.";
    galleryFeedback.classList.remove("hidden");
    return;
  }
  galleryFeedback.textContent = "";
  galleryFeedback.classList.add("hidden");
  sociosAtivos.forEach((member) => {
    const displayName = (member.displayName || member.preferredName || member.nickname || member.name || member.email || "Sócio").toString().trim();
    const card = document.createElement("article");
    card.className =
      "rounded-2xl shadow-sm bg-white border border-slate-200 flex flex-col overflow-hidden";
    const photoUrl = member.photoUrl || "https://placehold.co/400x300?text=Amigos+da+Bola";
    card.innerHTML = `
      <div class="pt-4">
        <div class="w-full max-w-[180px] aspect-[3/4] bg-slate-200 overflow-hidden mx-auto">
          <img src="${photoUrl}" alt="Foto de ${displayName || "sócio"}" class="h-full w-full object-cover" />
        </div>
      </div>
      <div class="p-4 space-y-2 text-center">
        <h3 class="text-lg font-semibold text-secondary">${displayName || "Sócio"}</h3>
        <p class="text-xs uppercase tracking-wide text-primary font-semibold">Sócio desde ${formatPlainDate(member.joinDate)}</p>
      </div>
    `;
    fragment.appendChild(card);
  });
  galleryGrid.appendChild(fragment);
}

function formatRole(role) {
  const key = normalizeRole(role);
  const map = {
    admin: "Administrador",
    diretor: "Diretor",
    financeiro: "Financeiro",
    tesoureiro: "Tesoureiro",
    imprensa: "Imprensa",
    socio: "Sócio",
    visitante: "Visitante",
    crianca: "Criança",
  };
  if (map[key]) return map[key];
  if (!key) return "Perfil";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function traduzirErro(error) {
  if (!error?.code) return "Não foi possível entrar. Confira os dados e tente novamente.";
  const map = {
    "auth/user-not-found": "Usuário não encontrado. Confira o email digitado.",
    "auth/wrong-password": "Senha inválida. Tente novamente.",
    "auth/invalid-email": "Formato de email inválido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.",
  };
  return map[error.code] || "Não foi possível entrar. Confira os dados e tente novamente.";
}

function formatPlainDate(value) {
  const date = parseDateInput(value);
  if (!date) return value || "--";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

attachMembersListener();
attachPublicStatsListener();

window.addEventListener("unload", () => {
  detachMembersListener();
  detachPublicStatsListener();
});

function excelSerialToDate(serial) {
  if (!Number.isFinite(serial)) return null;
  const excelEpoch = new Date(1899, 11, 30);
  const wholeDays = Math.floor(serial);
  const fractional = serial - wholeDays;
  const milliseconds = Math.round(fractional * 24 * 60 * 60 * 1000);
  const result = new Date(
    excelEpoch.getTime() + wholeDays * 24 * 60 * 60 * 1000 + milliseconds,
  );
  if (Number.isNaN(result.getTime())) return null;
  return result;
}

function parseDateInput(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToDate(value) || new Date(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split("/").map(Number);
      return new Date(year, month - 1, day);
    }
    if (/^\d{8}$/.test(trimmed)) {
      const day = Number(trimmed.slice(0, 2));
      const month = Number(trimmed.slice(2, 4));
      const year = Number(trimmed.slice(4));
      return new Date(year, month - 1, day);
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const excelDate = excelSerialToDate(numeric);
      if (excelDate) return excelDate;
    }
    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  if (value?.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}
