import { requireAuth, logout as doLogout } from "./auth.js";
import { updatePassword, updateEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestoreDb,
  serverTimestamp,
  getFirebaseStorage,
} from "./firebase-client.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const db = getFirestoreDb();
const storage = getFirebaseStorage();

const navToggleButton = document.getElementById("dashboard-menu-toggle");
const drawer = document.getElementById("drawer-menu");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerClose = document.getElementById("drawer-close");
const userRoleBadge = document.getElementById("user-role");
const logoutButtons = Array.from(document.querySelectorAll("[data-logout-button]"));
const editProfileBtn = document.getElementById("edit-profile-btn");
const profileDialog = document.getElementById("profile-dialog");
const profileForm = document.getElementById("profile-form");
const profileFields = {
  name: document.getElementById("profile-name"),
  email: document.getElementById("profile-email"),
  phone: document.getElementById("profile-phone"),
  birth: document.getElementById("profile-birth"),
  join: document.getElementById("profile-join"),
};
const profileInputs = {
  name: document.getElementById("profile-name-input"),
  phone: document.getElementById("profile-phone-input"),
  birth: document.getElementById("profile-birth-input"),
  join: document.getElementById("profile-join-input"),
  photo: document.getElementById("profile-photo-input"),
};
const profileFeedback = document.getElementById("profile-feedback");
const MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PROFILE_PHOTO_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function isAllowedProfilePhoto(file) {
  if (!file) return true;
  if (file.type) return file.type.startsWith("image/");
  const lowerName = (file.name || "").toLowerCase();
  return Array.from(ALLOWED_PROFILE_PHOTO_EXTENSIONS).some((ext) => lowerName.endsWith(ext));
}

const changePasswordBtn = document.getElementById("change-password-btn");
const passwordDialog = document.getElementById("password-dialog");
const passwordForm = document.getElementById("password-form");
const passwordNewInput = document.getElementById("password-new");
const passwordConfirmInput = document.getElementById("password-confirm");
const passwordFeedback = document.getElementById("password-feedback");
const passwordDialogTitle = document.getElementById("password-dialog-title");
const passwordDialogMessage = document.getElementById("password-dialog-message");
const passwordEmailRow = document.getElementById("password-email-row");
const passwordEmailInput = document.getElementById("password-email");
const passwordEmailHelp = document.getElementById("password-email-help");
const publicNavLinks = document.querySelectorAll("a[data-public-nav]");

setupDrawerMenu();

logoutButtons.forEach((button) => {
  button?.addEventListener("click", async () => {
    logoutButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("opacity-60", "pointer-events-none");
    });
    await doLogout();
    window.location.href = "index.html";
  });
});

publicNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    try {
      sessionStorage.setItem("admin:returnPath", window.location.pathname);
    } catch (error) {
      console.warn("Não foi possível registrar a última rota da área restrita.", error);
    }
  });
});

if (passwordDialog) {
  passwordDialog.addEventListener("cancel", (event) => {
    if (forcePasswordChange) event.preventDefault();
  });
  passwordDialog.addEventListener("close", () => {
    if (forcePasswordChange) {
      setTimeout(() => {
        if (!passwordDialog.open) passwordDialog.showModal();
      }, 100);
    }
  });
}

changePasswordBtn?.addEventListener("click", () => openPasswordDialog(false));

const memberCountLabel = document.getElementById("member-count");
const currentFeeLabel = document.getElementById("current-fee");
const paymentsUpLabel = document.getElementById("payments-up-to-date");
const paymentsPendingLabel = document.getElementById("payments-pending");
const currentMonthIncomeLabel = document.getElementById("current-month-income");
const timelineList = document.getElementById("timeline-list");
const timelineEmpty = document.getElementById("timeline-empty");
const timelineBody = document.getElementById("timeline-body");
const timelineToggleButton = document.getElementById("timeline-toggle");
const timelineSearch = document.getElementById("timeline-search");
const timelineSearchWrapper = document.getElementById("timeline-search-wrapper");
const timelineFilters = document.querySelectorAll(".timeline-filter");
const quickSummaryCards = Array.from(document.querySelectorAll("[data-summary-card]"));
const quickSummaryDetails = document.getElementById("quick-summary-details");
const quickSummaryTitle = document.getElementById("quick-summary-title");
const quickSummaryNames = document.getElementById("quick-summary-names");
const quickSummaryClose = document.getElementById("quick-summary-close");
let pageLoadingResolved = false;

function setPageLoading(isLoading) {
  document.body.classList.toggle("page-loading", isLoading);
}

function resolvePageLoading() {
  if (pageLoadingResolved) return;
  pageLoadingResolved = true;
  setPageLoading(false);
}

let currentContext = null;
let currentTimelineRange = 0;
let forcePasswordChange = false;
let lastPersistedPendingCount = null;
let timelineItems = [];
let quickSummaryData = {
  paid: [],
  pending: [],
  income: [],
};
const state = {};
const bindState = (key, getter, setter) => {
  Object.defineProperty(state, key, {
    get: getter,
    set: setter,
    enumerable: true,
  });
};
window.pageState = state;

bindState("pageLoadingResolved", () => pageLoadingResolved, (value) => { pageLoadingResolved = value; });
bindState("currentContext", () => currentContext, (value) => { currentContext = value; });
bindState("currentTimelineRange", () => currentTimelineRange, (value) => { currentTimelineRange = value; });
bindState("forcePasswordChange", () => forcePasswordChange, (value) => { forcePasswordChange = value; });
bindState("lastPersistedPendingCount", () => lastPersistedPendingCount, (value) => { lastPersistedPendingCount = value; });
bindState("timelineItems", () => timelineItems, (value) => { timelineItems = value; });

const CLUB_START_DATE = new Date(2024, 6, 1); // Julho/2024 (mês 6 pois Date é 0-based)
const CLUB_BILLING_START_DATE = new Date(2024, 6, 1); // Inicio da cobranca das mensalidades
const CLUB_START_COMPETENCE = formatCompetenceKeyFromDate(CLUB_BILLING_START_DATE);
const MONTHLY_DUE_DAY = 12;

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

const closeButtons = document.querySelectorAll("button[data-action='close']");
closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.closest("dialog");
    if (!dialog) return;
    if (dialog.id === "password-dialog" && forcePasswordChange) return;
    if (dialog.open) dialog.close();
  });
});

function selectTimelineRange(selected) {
  currentTimelineRange = selected;
  timelineFilters.forEach((btn) => btn.classList.remove("bg-primary", "text-white"));
  const activeButton = Array.from(timelineFilters).find(
    (btn) => Number(btn.dataset.interval) === selected,
  );
  activeButton?.classList.add("bg-primary", "text-white");
  if (currentContext) {
    loadTimeline(currentContext.profile);
  } else {
    timelineList.innerHTML = "";
    timelineEmpty.classList.remove("hidden");
  }
  if (timelineBody) timelineBody.classList.remove("hidden");
  if (timelineToggleButton) timelineToggleButton.textContent = "Fechar lista";
}

timelineFilters.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = Number(button.dataset.interval) || 30;
    // Se já estiver selecionado, desativa e limpa
    if (currentTimelineRange === selected) {
      currentTimelineRange = 0;
      timelineFilters.forEach((btn) => btn.classList.remove("bg-primary", "text-white"));
      if (timelineList) timelineList.innerHTML = "";
      if (timelineEmpty) {
        timelineEmpty.textContent = "Selecione um período para visualizar as movimentações.";
        timelineEmpty.classList.remove("hidden");
      }
      if (timelineBody) timelineBody.classList.add("hidden");
      if (timelineToggleButton) timelineToggleButton.textContent = "Abrir lista";
      return;
    }
    selectTimelineRange(selected);
  });
});

timelineToggleButton?.addEventListener("click", () => {
  if (!timelineBody) return;
  const isHidden = timelineBody.classList.toggle("hidden");
  timelineToggleButton.textContent = isHidden ? "Abrir lista" : "Fechar lista";
  if (timelineSearchWrapper) {
    timelineSearchWrapper.classList.toggle("hidden", isHidden);
  }
  if (!isHidden && timelineSearch) {
    timelineSearch.focus();
  }
});

timelineSearch?.addEventListener("input", debounce(() => {
  renderTimelineList();
}, 250));

quickSummaryCards.forEach((card) => {
  card.addEventListener("click", () => {
    const type = card.dataset.summaryType || "";
    if (!type) return;
    toggleQuickSummary(type);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const type = card.dataset.summaryType || "";
    if (!type) return;
    toggleQuickSummary(type);
  });
});

quickSummaryClose?.addEventListener("click", () => {
  if (!quickSummaryDetails) return;
  quickSummaryDetails.classList.add("hidden");
  quickSummaryDetails.dataset.active = "";
  updateQuickSummaryAria("");
});

(async function init() {
  setPageLoading(true);
  const context = await requireAuth();
  currentContext = context;
  updateRoleBadge(context.profile);
  await loadProfile(context.profile);
  applyProfilePermissions(context.profile);
  if (context.profile.mustResetPassword) {
    openPasswordDialog(true);
  }
  await loadDashboardSummaries(context.profile);
  resolvePageLoading();
  if (timelineList) timelineList.innerHTML = "";
  if (timelineEmpty) {
    timelineEmpty.textContent = "Selecione um período para visualizar as movimentações.";
    timelineEmpty.classList.remove("hidden");
  }
  if (timelineBody) timelineBody.classList.add("hidden");
  if (timelineToggleButton) timelineToggleButton.textContent = "Abrir lista";
  if (timelineSearchWrapper) timelineSearchWrapper.classList.add("hidden");
  if (timelineSearch) timelineSearch.value = "";
  currentTimelineRange = 0;
})();

function updateRoleBadge(profile) {
  if (!userRoleBadge) return;
  userRoleBadge.textContent = getUserHeaderLabel(profile);
  userRoleBadge.classList.remove("hidden");
}

async function loadProfile(profile) {
  profileFields.name.textContent = profile.name || "--";
  if (profileFields.email) {
    const fallbackEmail = currentContext?.user?.email || "";
    profileFields.email.textContent = profile.email || fallbackEmail || "--";
  }
  profileFields.phone.textContent = profile.phone || "--";
  profileFields.birth.textContent = formatDisplayDate(profile.birthDate || profile.birth);
  profileFields.join.textContent = formatDisplayDate(profile.joinDate || profile.join);
}

function applyProfilePermissions(profile) {
  const canEditProfile = ["admin", "diretor"].includes(profile.role);
  if (canEditProfile) {
    editProfileBtn.classList.remove("hidden");
    editProfileBtn.addEventListener("click", () => openProfileDialog(profile));
  } else {
    editProfileBtn.classList.add("hidden");
  }
  if (changePasswordBtn) {
    const canChangePassword = profile.role !== "visitante" && !profile.mustResetPassword;
    if (canChangePassword) {
      changePasswordBtn.classList.remove("hidden");
    } else {
      changePasswordBtn.classList.add("hidden");
    }
  }
}

function openPasswordDialog(force = false) {
  if (!passwordDialog) return;
  forcePasswordChange = force;
  if (passwordFeedback) {
    if (window.setFeedback) {
      window.setFeedback(passwordFeedback, "", "info");
    } else {
      passwordFeedback.textContent = "";
      passwordFeedback.className = "text-sm";
    }
  }
  if (passwordNewInput) passwordNewInput.value = "";
  if (passwordConfirmInput) passwordConfirmInput.value = "";
  const currentEmail = normalizeEmail(
    currentContext?.user?.email || currentContext?.profile?.email || "",
  );
  if (passwordEmailInput) {
    passwordEmailInput.value = "";
    passwordEmailInput.dataset.currentEmail = currentEmail;
    passwordEmailInput.placeholder = currentEmail || "seu.email@exemplo.com";
  }
  if (passwordEmailRow) {
    if (force) {
      passwordEmailRow.classList.remove("hidden");
      passwordEmailInput?.setAttribute("required", "required");
      passwordEmailHelp?.classList.remove("hidden");
    } else {
      passwordEmailRow.classList.add("hidden");
      passwordEmailInput?.removeAttribute("required");
      passwordEmailHelp?.classList.add("hidden");
    }
  }
  if (passwordDialogTitle) {
    passwordDialogTitle.textContent = force ? "Defina sua senha definitiva" : "Alterar senha";
  }
  if (passwordDialogMessage) {
    passwordDialogMessage.textContent = force
      ? "Informe um email válido e defina uma senha definitiva para continuar."
      : "Informe a nova senha que deseja utilizar.";
  }
  const dialogCloseButtons = passwordDialog.querySelectorAll("button[data-action='close']");
  dialogCloseButtons.forEach((btn) => {
    if (force) {
      btn.classList.add("hidden");
      btn.disabled = true;
    } else {
      btn.classList.remove("hidden");
      btn.disabled = false;
    }
  });
  passwordDialog.showModal();
}

function openProfileDialog(profile) {
  profileInputs.name.value = profile.name || "";
  profileInputs.phone.value = profile.phone || "";
  profileInputs.birth.value = formatDateForInput(profile.birthDate);
  profileInputs.join.value = formatDateForInput(profile.joinDate);
  profileInputs.photo.value = "";
  if (window.setFeedback) window.setFeedback(profileFeedback, "", "info");
  profileDialog.showModal();
}

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentContext?.profile) return;

  const updates = {
    name: profileInputs.name.value.trim(),
    phone: profileInputs.phone.value.trim(),
    birthDate: profileInputs.birth.value,
    joinDate: profileInputs.join.value,
    updatedAt: serverTimestamp(),
    updatedBy: currentContext.user.uid,
  };
  try {
    let photoUrl = currentContext.profile.photoUrl;
    let photoPath = currentContext.profile.photoPath;
    const file = profileInputs.photo.files[0];
    if (file) {
      if (file.size > MAX_PROFILE_PHOTO_SIZE_BYTES) {
        if (window.setFeedback) {
          window.setFeedback(profileFeedback, "A foto deve ter no máximo 5 MB.", "error");
        }
        return;
      }
      if (!isAllowedProfilePhoto(file)) {
        if (window.setFeedback) {
          window.setFeedback(profileFeedback, "Envie uma foto em formato JPG, PNG ou WebP.", "error");
        }
        return;
      }
      const path = `members/${currentContext.user.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      if (window.setFeedback) {
        window.setFeedback(profileFeedback, "Enviando foto... 0%", "info");
      }
      if (uploadBytesResumable && window.setFeedback) {
        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file);
          task.on(
            "state_changed",
            (snapshot) => {
              const progress = snapshot.totalBytes
                ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                : 0;
              window.setFeedback(profileFeedback, `Enviando foto... ${progress}%`, "info");
            },
            reject,
            resolve,
          );
        });
      } else {
        await uploadBytes(storageRef, file);
      }
      photoUrl = await getDownloadURL(storageRef);
      photoPath = path;
      updates.photoUrl = photoUrl;
      updates.photoPath = photoPath;
      if (window.setFeedback) {
        window.setFeedback(profileFeedback, "Foto enviada com sucesso.", "success");
        setTimeout(() => window.setFeedback(profileFeedback, "", "info"), 2500);
      }
    }
    await updateDoc(doc(db, "members", currentContext.user.uid), updates);
    const refreshed = { ...currentContext.profile, ...updates };
    currentContext.profile = refreshed;
    await loadProfile(refreshed);
    profileDialog.close();
  } catch (error) {
    notify("error", "Não foi possível atualizar o perfil. Tente novamente.");
    console.error(error);
  }
});

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentContext?.user || !currentContext?.profile) return;

  const newPassword = passwordNewInput?.value.trim() || "";
  const confirmation = passwordConfirmInput?.value.trim() || "";

  if (newPassword.length < 8) {
    showPasswordFeedback("A senha deve ter pelo menos 8 caracteres.", true);
    return;
  }

  if (newPassword !== confirmation) {
    showPasswordFeedback("As senhas não conferem.", true);
    return;
  }

  try {
    // 🔑 Atualiza somente a senha no Firebase Authentication
    await updatePassword(currentContext.user, newPassword);

    // 🗂 Atualiza dados no Firestore (remove senha temporária e marca atualização)
    await updateDoc(doc(db, "members", currentContext.user.uid), {
      mustResetPassword: false,
      passwordUpdatedAt: serverTimestamp(),
      temporaryPassword: deleteField(),
      passwordIssuedAt: deleteField(),
      updatedAt: serverTimestamp(),
      updatedBy: currentContext.user.uid,
    });

    // Atualiza o contexto local
    currentContext.profile = {
      ...currentContext.profile,
      mustResetPassword: false,
      temporaryPassword: undefined,
      passwordIssuedAt: undefined,
    };

    applyProfilePermissions(currentContext.profile);
    showPasswordFeedback("Senha atualizada com sucesso.", false);
    forcePasswordChange = false;

    passwordForm.reset();
    setTimeout(() => {
      if (passwordDialog?.open) passwordDialog.close();
    }, 1200);
  } catch (error) {
    console.error("Erro ao atualizar senha:", error);
    showPasswordFeedback(translatePasswordError(error), true);
  }
});



function showPasswordFeedback(message, isError) {
  if (!passwordFeedback) return;
  if (window.setFeedback) {
    window.setFeedback(passwordFeedback, message, isError ? "error" : "success");
    return;
  }
  passwordFeedback.textContent = message;
  passwordFeedback.className = isError ? "text-sm text-rose-600" : "text-sm text-green-600";
}

function normalizeEmail(value) {
  return (value || "").toString().trim().toLowerCase();
}

function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function translateEmailError(error) {
  if (!error?.code) return "Não foi possível atualizar o email. Tente novamente.";
  const map = {
    "auth/invalid-email": "O email informado não é válido.",
    "auth/email-already-in-use": "Este email já está em uso por outro sócio.",
    "auth/requires-recent-login": "Faça login novamente para alterar o email.",
  };
  return map[error.code] || "Não foi possível atualizar o email. Tente novamente.";
}

function translatePasswordError(error) {
  if (!error?.code) return "Não foi possível atualizar a senha. Tente novamente.";
  const map = {
    "auth/weak-password": "A senha informada é muito fraca. Utilize ao menos 8 caracteres.",
    "auth/requires-recent-login": "Faça login novamente para alterar a senha.",
  };
  return map[error.code] || "Não foi possível atualizar a senha. Tente novamente.";
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function notify(type, message) {
  if (window.toast && typeof window.toast[type] === "function") {
    window.toast[type](message);
    return;
  }
  alert(message);
}

function normalizeSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTokens(value) {
  const normalized = normalizeSearchValue(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function matchesSearchTokens(target, tokens) {
  if (!tokens.length) return true;
  const normalizedTarget = normalizeSearchValue(target);
  return tokens.some((token) => normalizedTarget.includes(token));
}

async function loadDashboardSummaries(profile) {
  await Promise.all([loadMemberCount(), loadFinanceSnapshot(profile)]);
}

async function loadMemberCount() {
  const membersSnap = await getDocs(collection(db, "members"));
  const activeMembers = membersSnap.docs.reduce((count, docSnap) => {
    const status = normalizeMemberStatus(docSnap.data()?.status);
    return status === "ativo" ? count + 1 : count;
  }, 0);
  memberCountLabel.textContent = `${activeMembers} sócios`;
}

async function loadFinanceSnapshot(profile) {
  const normalizedTarget = resolveReferenceCompetence();

  const settingsDoc = await getDoc(doc(db, "settings", "finance"));
  const settingsData = settingsDoc.exists() ? settingsDoc.data() : {};
  const persistedPendingCount =
    Number.isFinite(Number(settingsData.pendingMembersCount)) ? Number(settingsData.pendingMembersCount) : null;
  lastPersistedPendingCount = persistedPendingCount;
  const defaultFee = Number.isFinite(Number(settingsData.defaultMonthlyFee)) ? Number(settingsData.defaultMonthlyFee) : 30;
  currentFeeLabel.textContent = `R$ ${defaultFee.toFixed(2)}`;

  const paymentsRef = collection(db, "payments");

  const [paymentsSnap, membersSnap] = await Promise.all([
    getDocs(paymentsRef),
    getDocs(collection(db, "members")),
  ]);

  const memberDirectory = new Map();
  membersSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const name = String(data.name || data.fullName || data.nome || "").trim();
    if (name) memberDirectory.set(docSnap.id, name);
  });

  const paymentMemberNames = new Map();
  const resolveMemberName = (memberId, fallback) => {
    if (memberId && memberDirectory.has(memberId)) return memberDirectory.get(memberId);
    if (memberId && paymentMemberNames.has(memberId)) return paymentMemberNames.get(memberId);
    if (fallback) return String(fallback).trim();
    return "";
  };

  const paymentIndex = new Map();
  const paymentsData = [];

  paymentsSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const memberId = data.memberId;
    if (memberId && data.memberName) {
      paymentMemberNames.set(memberId, String(data.memberName).trim());
    }
    const comp = normalizeCompetenceKey(data.competence);
    const status = normalizeStatusKey(data.status);
    const amount = resolvePaymentAmount(data.amount, defaultFee);
    const updatedAt = data.updatedAt || data.createdAt || null;
    if (comp) {
      paymentsData.push({
        docId: docSnap.id,
        memberId,
        competence: comp,
        status,
        amount,
        updatedAt,
      });
    }
    if (!memberId || !comp) return;
    const key = `${memberId}:${comp}`;
    const existing = paymentIndex.get(key);
    if (!existing || resolveStatusPriority(status) > resolveStatusPriority(existing.status)) {
      paymentIndex.set(key, { status });
    }
  });

  let targetCompetence = normalizedTarget;
  if (!targetCompetence) {
    targetCompetence = paymentsData
      .map((entry) => entry.competence)
      .filter((competence) => competence >= CLUB_START_COMPETENCE)
      .sort((a, b) => a.localeCompare(b))
      .pop() || "";
  }

  if (!targetCompetence) {
    setPendingLabel(0);
    paymentsUpLabel.textContent = "0";
    currentMonthIncomeLabel.textContent = "R$ 0.00";
    return;
  }

  const activeMembers = membersSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((member) => normalizeMemberStatus(member.status) === "ativo");

  const currentReceiptMonth = monthKeyFromDate(new Date());
  const currentMonthIncome = paymentsData
    .filter((entry) => isPaidStatus(entry.status))
    .filter((entry) => paymentMonthKey(entry) === currentReceiptMonth)
    .reduce((sum, entry) => sum + entry.amount, 0);

  currentMonthIncomeLabel.textContent = `R$ ${currentMonthIncome.toFixed(2)}`;

  const activeMemberIds = new Set(activeMembers.map((member) => member.id).filter(Boolean));
  const paidMembersThisMonth = new Set();
  paymentsData
    .filter((entry) => {
      const normalized = normalizeStatusKey(entry.status);
      const isPaid = isPaidStatus(normalized);
      const isExempt = normalized.includes("isento") || normalized === "isentado";
      const competenceMonth = normalizeCompetenceKey(entry.competence);
      if (isPaid) return competenceMonth === currentReceiptMonth;
      if (isExempt) return competenceMonth === currentReceiptMonth;
      return false;
    })
    .forEach((entry) => {
      const memberId = entry.memberId;
      if (memberId && activeMemberIds.has(memberId)) {
        paidMembersThisMonth.add(memberId);
      }
    });
  paymentsUpLabel.textContent = `${paidMembersThisMonth.size}`;
  const pendingCount = Math.max(activeMembers.length - paidMembersThisMonth.size, 0);
  setPendingLabel(pendingCount);

  const paidNames = Array.from(paidMembersThisMonth)
    .map((memberId) => resolveMemberName(memberId))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const pendingNames = activeMembers
    .filter((member) => !paidMembersThisMonth.has(member.id))
    .map((member) => String(member.name || member.fullName || member.nome || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const incomeNamesSet = new Set();
  paymentsData
    .filter((entry) => isPaidStatus(entry.status))
    .filter((entry) => paymentMonthKey(entry) === currentReceiptMonth)
    .forEach((entry) => {
      const name = resolveMemberName(entry.memberId, entry.memberName);
      if (name) incomeNamesSet.add(name);
    });

  quickSummaryData = {
    paid: paidNames,
    pending: pendingNames,
    income: Array.from(incomeNamesSet).sort((a, b) => a.localeCompare(b)),
  };

  if (quickSummaryDetails && !quickSummaryDetails.classList.contains("hidden")) {
    const activeType = quickSummaryDetails.dataset.active || "";
    if (activeType) renderQuickSummary(activeType);
  }
}

function normalizeCompetenceKey(value) {
  if (!value) return "";
  const parsedDate = parseDateInput(value);
  if (parsedDate) {
    return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`;
  }
  const str = value.toString().trim();
  if (/^\d{4}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month] = str.split("-");
    return `${year}-${month}`;
  }
  if (/^\d{6}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4)}`;
  }
  if (/^\d{4}-\d{1}$/.test(str)) {
    const [year, month] = str.split("-");
    return `${year}-${month.padStart(2, "0")}`;
  }
  return str;
}

function resolveReferenceCompetence(referenceDate = new Date()) {
  if (referenceDate < CLUB_BILLING_START_DATE) return "";
  const base = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  if (referenceDate.getDate() < MONTHLY_DUE_DAY) {
    base.setMonth(base.getMonth() - 1);
  }
  if (base < CLUB_BILLING_START_DATE) return "";
  return formatCompetenceKeyFromDate(base);
}

function setPendingLabel(count) {
  if (!paymentsPendingLabel) return;
  if (!Number.isFinite(count) || count <= 0) {
    paymentsPendingLabel.textContent = "Sem pendências";
    return;
  }
  paymentsPendingLabel.textContent = `${count}`;
}

function toggleQuickSummary(type) {
  if (!quickSummaryDetails) return;
  const isOpen = !quickSummaryDetails.classList.contains("hidden");
  const activeType = quickSummaryDetails.dataset.active || "";
  if (isOpen && activeType === type) {
    quickSummaryDetails.classList.add("hidden");
    quickSummaryDetails.dataset.active = "";
    updateQuickSummaryAria("");
    return;
  }
  renderQuickSummary(type);
}

function renderQuickSummary(type) {
  if (!quickSummaryDetails || !quickSummaryTitle || !quickSummaryNames) return;
  const titles = {
    paid: "Pagamentos em dia",
    pending: "Mensalidades pendentes",
    income: "Entradas no mês",
  };
  const names = (quickSummaryData[type] || []).filter(Boolean);
  quickSummaryTitle.textContent = titles[type] || "Detalhes";
  quickSummaryNames.textContent = names.length ? names.join(", ") : "Nenhum sócio encontrado.";
  quickSummaryNames.classList.toggle("text-slate-600", names.length > 0);
  quickSummaryNames.classList.toggle("text-slate-500", names.length === 0);
  quickSummaryDetails.classList.remove("hidden");
  quickSummaryDetails.dataset.active = type;
  updateQuickSummaryAria(type);
}

function updateQuickSummaryAria(activeType) {
  quickSummaryCards.forEach((card) => {
    const isActive = card.dataset.summaryType === activeType;
    card.setAttribute("aria-expanded", isActive ? "true" : "false");
  });
}

function normalizeStatusKey(value) {
  return String(value || "pendente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function computePendingMembersForCompetence(members, paymentIndex, targetCompetence) {
  const normalizedTarget = normalizeCompetenceKey(targetCompetence);
  if (!normalizedTarget) return new Set();
  const pending = new Set();
  members
    .filter((member) => normalizeMemberStatus(member.status) === "ativo")
    .forEach((member) => {
      const firstCompetence = resolveFirstChargeCompetence(member);
      const normalizedFirst = normalizeCompetenceKey(firstCompetence);
      if (normalizedFirst && normalizedFirst > normalizedTarget) return;
      const key = `${member.id}:${normalizedTarget}`;
      const entry = paymentIndex.get(key);
      if (!entry || !isResolvedPaymentStatus(entry.status)) {
        const identifier = member.id || member.email || member.name || "";
        if (identifier) pending.add(identifier);
      }
    });
  return pending;
}

function resolveStatusPriority(status) {
  const normalized = normalizeStatusKey(status);
  if (isPaidStatus(normalized)) return 3;
  if (normalized.includes("isento") || normalized === "isentado") return 2;
  if (normalized === "pendente") return 1;
  return 0;
}

function isPaidStatus(status) {
  const normalized = normalizeStatusKey(status);
  return normalized.startsWith("pago") || normalized === "quitado";
}

function isResolvedPaymentStatus(status) {
  const normalized = normalizeStatusKey(status);
  if (isPaidStatus(normalized)) return true;
  if (normalized.includes("isento") || normalized === "isentado") return true;
  return normalized === "liberado";
}

function resolvePaymentAmount(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(/\s+/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    const converted = value.toNumber();
    if (Number.isFinite(converted)) return converted;
  }
  return Number.isFinite(fallback) ? fallback : 0;
}

function calculatePendingInstallments(members, paymentIndex, targetCompetence) {
  const normalizedTarget = normalizeCompetenceKey(targetCompetence);
  if (!normalizedTarget) return new Set();
  const pendingMembers = new Set();
  members
    .filter((member) => normalizeMemberStatus(member.status) === "ativo")
    .forEach((member) => {
      const firstCompetence = resolveFirstChargeCompetence(member);
      const normalizedFirst = normalizeCompetenceKey(firstCompetence);
      if (!normalizedFirst || normalizedFirst > normalizedTarget) return;
      const competences = enumerateCompetenceRange(normalizedFirst, normalizedTarget);
      const hasPending = competences.some((competence) => {
        if (competence < CLUB_START_COMPETENCE) return false;
        const key = `${member.id}:${competence}`;
        const entry = paymentIndex.get(key);
        return !entry || !isResolvedPaymentStatus(entry.status);
      });
      if (hasPending) {
        const identifier = member.id || member.email || member.name || "";
        if (identifier) pendingMembers.add(identifier);
      }
    });
  return pendingMembers;
}

function collectPendingMembersFromPayments(paymentDocs, targetCompetence) {
  if (!Array.isArray(paymentDocs)) return new Set();
  const normalizedTarget = normalizeCompetenceKey(targetCompetence);
  const pendingMembers = new Set();
  paymentDocs.forEach((docSnap) => {
    const data = docSnap.data ? docSnap.data() : docSnap;
    const status = normalizeStatusKey(data.status);
    if (status !== "pendente") return;
    const competence = normalizeCompetenceKey(data.competence);
    if (!competence) return;
    if (normalizedTarget && competence > normalizedTarget) return;
    if (competence < CLUB_START_COMPETENCE) return;
    const key = data.memberId || data.memberName || docSnap.id || "";
    if (key) pendingMembers.add(key);
  });
  return pendingMembers;
}

function normalizeMemberStatus(value) {
  return String(value || "ativo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveFirstChargeCompetence(member) {
  const firstDate = resolveMemberJoinDate(member);
  const baseline = new Date(CLUB_BILLING_START_DATE.getFullYear(), CLUB_BILLING_START_DATE.getMonth(), 1);
  let startDate = baseline;
  if (firstDate instanceof Date && !Number.isNaN(firstDate.getTime())) {
    const normalized = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    if (normalized > baseline) startDate = normalized;
  }
  return formatCompetenceKeyFromDate(startDate);
}

function resolveMemberJoinDate(member) {
  if (!member) return null;
  const candidates = [
    member.firstChargeDate,
    member.startDate,
    member.joinDate,
    member.joinMonth,
    member.entryDate,
    member.joinedAt,
    member.joinedOn,
  ];
  for (const candidate of candidates) {
    const parsed = parseDateInput(candidate);
    if (parsed) return parsed;
  }
  const fallbackCandidates = [member.createdAt, member.updatedAt];
  for (const fallback of fallbackCandidates) {
    const parsed = parseDateInput(fallback);
    if (parsed) return parsed;
  }
  return null;
}

function enumerateCompetenceRange(start, end) {
  const normalizedStart = normalizeCompetenceKey(start);
  const normalizedEnd = normalizeCompetenceKey(end);
  if (!normalizedStart || !normalizedEnd || normalizedStart > normalizedEnd) return [];
  const competences = [];
  let cursor = normalizedStart;
  while (cursor && cursor <= normalizedEnd) {
    competences.push(cursor);
    cursor = incrementCompetence(cursor);
  }
  return competences;
}

function incrementCompetence(value) {
  const [yearStr, monthStr] = (value || "").split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function formatCompetenceKeyFromDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

async function loadTimeline(profile) {
  const paymentsRef = collection(db, "payments");
  const snapshot = await getDocs(paymentsRef);
  const boundary = daysAgo(currentTimelineRange);
  timelineItems = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .map((item) => ({
      ...item,
      movementDate: resolveMovementDate(item),
      movementMillis: resolveMovementMillis(item.updatedAt || item.createdAt || item.competence),
    }))
    .filter((item) => {
      if (!currentTimelineRange) return false;
      if (!item.movementDate) return false;
      return item.movementDate >= boundary;
    })
    .sort((a, b) => b.movementMillis - a.movementMillis);

  if (!timelineItems.length) {
    timelineList.innerHTML = "";
    timelineEmpty.classList.remove("hidden");
    return;
  }
  renderTimelineList();
}

function formatDateForInput(value) {
  if (!value) return "";
  const date = parseDateInput(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(value) {
  if (!value) return "--";
  const date = parseDateInput(value);
  if (!date) return value || "--";
  return date.toLocaleDateString("pt-BR");
}

function formatRole(role) {
  const roles = {
    admin: "Administrador",
    diretor: "Diretor",
    tesoureiro: "Tesoureiro",
    financeiro: "Financeiro",
    socio: "Sócio",
    visitante: "Visitante",
    crianca: "Criança",
    imprensa: "Imprensa",
  };
  const key = String(role || "").toLowerCase().trim();
  if (roles[key]) return roles[key];
  if (!key) return "Perfil";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function getUserHeaderLabel(profile) {
  if (!profile) return "";
  const rawName = String(profile.name || "").trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : "Usuário";
  const roleLabel = formatRole(profile.role);
  return `${firstName} (${roleLabel})`;
}

function formatDate(value) {
  const date = parseDateInput(value);
  if (!date) return value || "--";
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(timestamp) {
  const date = parseDateInput(timestamp);
  if (!date) return "--";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function renderTimelineList() {
  if (!timelineList || !timelineEmpty) return;
  const tokens = getSearchTokens(timelineSearch?.value || "");
  const filtered = timelineItems.filter((item) => {
    if (!tokens.length) return true;
    const name = String(item.memberName || "");
    const role = String(item.memberRole || "");
    const status = String(item.status || "");
    const competence = String(item.competence || "");
    const notes = String(item.notes || "");
    return (
      matchesSearchTokens(name, tokens) ||
      matchesSearchTokens(role, tokens) ||
      matchesSearchTokens(status, tokens) ||
      matchesSearchTokens(competence, tokens) ||
      matchesSearchTokens(notes, tokens)
    );
  });
  if (!filtered.length) {
    timelineList.innerHTML = "";
    timelineEmpty.textContent = "Nenhuma movimentação registrada no período.";
    timelineEmpty.classList.remove("hidden");
    return;
  }
  timelineEmpty.classList.add("hidden");
  timelineList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => {
    const li = document.createElement("li");
    li.className = "border border-slate-200 rounded-lg px-4 py-3";
    li.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">${item.memberName || "Sócio"}</span>
        <time class="text-xs text-slate-500">
          ${formatDateTime(item.updatedAt || item.createdAt || item.competence)}
        </time>
      </div>
      <div class="text-xs text-slate-500 mt-1">
        ${formatRole(item.memberRole)} • ${formatCompetence(item.competence)}
      </div>
      <div class="text-sm mt-2">
        Status: <span class="font-medium ${statusColor(item.status)}">${String(item.status || "").toUpperCase()}</span>
        — Valor: R$ ${(item.amount || 0).toFixed(2)}
      </div>
      ${item.notes ? `<div class="text-xs text-slate-500 mt-2">Obs.: ${item.notes}</div>` : ""}
    `;
    fragment.appendChild(li);
  });
  timelineList.appendChild(fragment);
}

function resolveMovementDate(item) {
  const candidate = item?.updatedAt || item?.createdAt || item?.competence || null;
  return parseDateInput(candidate);
}

function resolveMovementMillis(value) {
  const date = parseDateInput(value);
  if (!date) return 0;
  return date.getTime();
}

function formatCompetence(value) {
  if (!value) return "--";
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function statusColor(status) {
  switch (status) {
    case "pago":
      return "text-primary";
    case "pendente":
      return "text-amber-500";
    case "isentado":
      return "text-slate-400";
    default:
      return "text-slate-500";
  }
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value?.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [year, month, day] = value.slice(0, 10).split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    if (/^\d{4}-\d{2}$/.test(value)) {
      const [year, month] = value.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split("/").map(Number);
      return new Date(year, month - 1, day);
    }
    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  return null;
}

function monthKeyFromDate(value) {
  const parsed = parseDateInput(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function paymentMonthKey(payment) {
  const timestamp = payment?.updatedAt || payment?.createdAt || null;
  const parsed = parseDateInput(timestamp);
  const fallback = parsed || parseDateInput(payment?.competence);
  if (!fallback || Number.isNaN(fallback.getTime())) return "";
  return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}`;
}
