import { requireAuth, logout as doLogout } from "./auth.js";
import {
  getFirestoreDb,
  serverTimestamp,
  withSecondaryAuth,
  getFirebaseStorage,
} from "./firebase-client.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  deleteDoc,
  deleteField,
  limit,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const db = getFirestoreDb();
const storage = getFirebaseStorage();

const navToggleButton = document.getElementById("members-menu-toggle");
const drawer = document.getElementById("drawer-menu");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerClose = document.getElementById("drawer-close");
const logoutButtons = Array.from(document.querySelectorAll("[data-logout-button]"));
const roleBadge = document.getElementById("members-user-role");
const searchInput = document.getElementById("member-search");
const roleFilter = document.getElementById("member-role-filter");
const statusFilter = document.getElementById("member-status-filter");
const memberTableBody = document.getElementById("members-table");
const memberEmptyState = document.getElementById("members-empty");
const membersToggleButton = document.getElementById("members-toggle-list");
const membersListWrapper = document.getElementById("members-list-wrapper");
const membersBackTopButton = document.getElementById("members-back-top");
const membersCloseButton = document.getElementById("members-close-list");
const memberForm = document.getElementById("member-form");
const memberFeedback = document.getElementById("member-feedback");
const memberAdminOnlyHint = document.getElementById("member-admin-only-hint");
const memberPhotoInput = document.getElementById("member-photo");
const memberPhotoName = document.getElementById("member-photo-name");
const memberEditIdInput = document.getElementById("member-edit-id");
const memberNameInput = memberForm ? memberForm["member-name"] : null;
const memberPhoneInput = memberForm ? memberForm["member-phone"] : null;
const memberStreetInput = memberForm ? memberForm["member-street"] : null;
const memberNumberInput = memberForm ? memberForm["member-number"] : null;
const memberNoNumberInput = memberForm ? memberForm["member-no-number"] : null;
const memberCityInput = memberForm ? memberForm["member-city"] : null;
const memberStateInput = memberForm ? memberForm["member-state"] : null;
const memberSubmitButton = memberForm?.querySelector("button[type='submit']");
const memberHistoryContainer = document.getElementById("member-history");
const memberHistoryEmpty = document.getElementById("member-history-empty");
const historyMemberName = document.getElementById("history-member-name");
const historyMemberRole = document.getElementById("history-member-role");
const historyMemberPhone = document.getElementById("history-member-phone");
const historyMemberStatus = document.getElementById("history-member-status");
const historyMemberAddress = document.getElementById("history-member-address");
const exitForm = document.getElementById("member-exit-form");
const exitStatus = document.getElementById("exit-status");
const exitReason = document.getElementById("exit-reason");
const historyList = document.getElementById("member-history-list");
const historyDeleteHint = document.getElementById("history-delete-hint");
const roleUpdateWrapper = document.getElementById("role-update-wrapper");
const roleUpdateSelect = document.getElementById("history-role-select");
const roleUpdateButton = document.getElementById("role-update-button");
const historyEditButton = document.getElementById("history-edit-member");
const paymentsDialog = document.getElementById("payments-dialog");
const paymentsForm = document.getElementById("payments-form");
const paymentsHistoryList = document.getElementById("payments-history-list");
const paymentsMemberId = document.getElementById("payments-member-id");
const paymentsMemberName = document.getElementById("payments-member-name");
const paymentsMemberInfo = document.getElementById("payments-member-info");
const paymentsMonthlyTitle = document.getElementById("payments-monthly-title");
const paymentsMonthlyStatus = document.getElementById("payments-monthly-status");
const paymentsMonthlyEmpty = document.getElementById("payments-monthly-empty");
const paymentMonth = document.getElementById("payment-month");
const paymentStatus = document.getElementById("payment-status");
const paymentNotes = document.getElementById("payment-notes");
const exemptStart = document.getElementById("exempt-start");
const exemptEnd = document.getElementById("exempt-end");
const exemptNotes = document.getElementById("exempt-notes");
const exemptApplyButton = document.getElementById("exempt-apply");
const exemptRemoveButton = document.getElementById("exempt-remove");
const exportMembersButton = document.getElementById("members-export-button");
const loadingFlags = { settings: false, members: false };

function setPageLoading(isLoading) {
  document.body.classList.toggle("page-loading", isLoading);
}

function updatePageLoading() {
  const done = Object.values(loadingFlags).every(Boolean);
  setPageLoading(!done);
}

const memberRowTemplate = document.getElementById("member-row-template");
const CREDENTIAL_ROLES = new Set(["admin", "diretor", "imprensa", "financeiro", "tesoureiro", "socio"]);
const publicNavLinks = document.querySelectorAll("a[data-public-nav]");
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PHOTO_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function isAllowedPhotoFile(file) {
  if (!file) return true;
  if (file.type) {
    return file.type.startsWith("image/");
  }
  const lowerName = (file.name || "").toLowerCase();
  return Array.from(ALLOWED_PHOTO_EXTENSIONS).some((ext) => lowerName.endsWith(ext));
}

const CLUB_BILLING_START = new Date(2026, 0, 1); // Janeiro/2026 (mês 0 pois Date é 0-based)
const CLUB_BILLING_START_COMPETENCE = "2026-01";

publicNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    try {
      sessionStorage.setItem("admin:returnPath", window.location.pathname);
    } catch (error) {
      console.warn("Não foi possível registrar a última rota da área restrita.", error);
    }
  });
});

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

const BIRTHDAY_PATCHES = {
  DUBINHA: "1972-04-30",
  FRED: "1980-04-05",
  MARQUINHOS: "1974-02-17",
  MICHEL: "1982-11-23",
  MINARI: "1954-05-28",
  MIRTINHO: "1954-04-21",
  "NENÃO": "1976-11-26",
  "NEZÃO": "1982-01-06",
  NICO: "1980-03-02",
  NILTON: "1981-03-06",
  "NILTON 42": "1974-09-24",
  OSMANO: "1971-05-06",
  OTON: "1983-01-26",
  PACHECO: "1973-03-04",
  PADEIRO: "1976-10-24",
  PAULINHO: "1980-06-10",
  RAFAEL: "1991-09-03",
  RAIMUNDIM: "1977-01-25",
  RICARDO: "1977-05-25",
  ROBSON: "1987-07-22",
  ROCHA: "1969-01-24",
  "RODRIGO GIM.": "1987-01-03",
  ROGERINHO: "1976-05-21",
  "RONALDO COSTA": "1981-06-07",
  RONI: "1986-01-21",
  TAVINHO: "1980-05-25",
  "TECÃO": "1973-03-04",
  "TIÃO 42": "1968-11-07",
  "TIÃO AGUTOLI": "1957-04-21",
  "TIAGO CORUJA": "1994-12-22",
  VAGNER: "1977-08-21",
  VALDAIR: "1967-06-22",
  "VALÉRIO": "1978-03-06",
  VALTINHO: "1978-10-10",
  "VITÃO": "1983-09-11",
  "ZÉ ANTONIO": "1979-03-05",
  "ZÉ GALINHA": "1974-10-20",
  "BINHA 42": "1975-09-25",
  CAIO: "1991-04-25",
  "CARLÃO": "1971-05-03",
  CLAUDIO: "1982-01-13",
  "DIEGO NOGUEIRA": "1987-10-08",
  FELIPE: "1994-12-19",
  FRANCIS: "1982-11-27",
  "GABRIEL ANU": "1998-07-22",
  KAMIMURA: "1959-07-03",
  MAIKOM: "1989-02-08",
  "MARCELO PIMEN.": "1979-09-20",
  "TIAGO PIPOCA": "1990-10-22",
  DIRCEU: "1974-11-23",
  "ADRIANO FRESC.": "1987-01-04",
  ALTAIR: "1967-01-04",
  "BÁH": "1970-12-25",
  "DIÓ": "1964-11-29",
  KAIQUY: "1992-06-16",
  "LAÉRCIO": "1969-02-05",
  NATO: "1981-09-26",
  "NICO FIUMARI": "1976-11-04",
  OSCAR: "1977-02-10",
  OSVALDO: "1974-05-20",
  PISCIDA: "1969-05-24",
  TUINHA: "1954-08-29",
  WILLIAN: "1993-02-11",
  NIKINHO: "1985-06-06",
  MIRO: "1954-04-21",
};
const patchedBirthdates = new Set();

if (memberPhotoName) {
  memberPhotoName.textContent = "Nenhum arquivo selecionado";
}

function applyNumberInputState(checked) {
  if (!memberNumberInput) return;
  memberNumberInput.disabled = checked;
  memberNumberInput.classList.toggle("bg-slate-100", checked);
  memberNumberInput.classList.toggle("text-slate-500", checked);
}

const closeButtons = document.querySelectorAll("button[data-action='close']");
closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.closest("dialog");
    if (dialog && dialog.open) dialog.close();
  });
});

memberPhotoInput?.addEventListener("change", () => {
  const file = memberPhotoInput.files?.[0];
  memberPhotoName.textContent = file ? file.name : "Nenhum arquivo selecionado";
});

memberNameInput?.addEventListener("blur", (event) => {
  const input = event.target;
  if (!input) return;
  const normalized = input.value.replace(/\s+/g, " ").trim();
  input.value = normalized ? normalized.toUpperCase() : "";
});



membersToggleButton?.addEventListener("click", () => {
  if (!membersListWrapper || !membersToggleButton) return;
  const isHidden = membersListWrapper.classList.toggle("hidden");
  membersToggleButton.textContent = isHidden ? "Abrir lista" : "Fechar lista";
  membersToggleButton.setAttribute("aria-expanded", isHidden ? "false" : "true");
});
membersBackTopButton?.addEventListener("click", () => {
  membersListWrapper?.scrollIntoView({ behavior: "smooth", block: "start" });
});
membersCloseButton?.addEventListener("click", () => {
  if (!membersListWrapper || !membersToggleButton) return;
  membersListWrapper.classList.add("hidden");
  membersToggleButton.textContent = "Abrir lista";
  membersToggleButton.setAttribute("aria-expanded", "false");
  membersToggleButton.scrollIntoView({ behavior: "smooth", block: "center" });
});

memberPhoneInput?.addEventListener("blur", () => {
  const digits = normalizePhone(memberPhoneInput.value);
  memberPhoneInput.value = digits ? formatPhone(digits) : "";
});

memberStateInput?.addEventListener("input", (event) => {
  const input = event.target;
  if (!input) return;
  input.value = input.value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
});

memberNoNumberInput?.addEventListener("change", (event) => {
  const checked = Boolean(event.target?.checked);
  applyNumberInputState(checked);
  if (checked) {
    if (memberNumberInput) memberNumberInput.value = "";
  } else {
    memberNumberInput?.focus();
  }
});

function maybePatchMemberBirthDate(memberId, memberData) {
  if (!memberData || memberData.birthDate) return;
  const name = (memberData.name || "").trim();
  if (!name) return;
  const key = name.toUpperCase();
  const patchValue = BIRTHDAY_PATCHES[key];
  if (!patchValue) return;
  memberData.birthDate = patchValue;
  if (patchedBirthdates.has(memberId)) return;
  patchedBirthdates.add(memberId);
  updateDoc(doc(db, "members", memberId), { birthDate: patchValue }).catch((error) => {
    console.error("Erro ao preencher data de nascimento:", error);
    patchedBirthdates.delete(memberId);
  });
}

function resetMemberFormState() {
  if (!memberForm) return;
  if (memberEditIdInput) memberEditIdInput.value = "";
  memberForm.dataset.mode = "create";
  if (memberSubmitButton) memberSubmitButton.textContent = "Salvar sócio";
  if (memberPhotoName) memberPhotoName.textContent = "Nenhum arquivo selecionado";
  if (memberNoNumberInput) memberNoNumberInput.checked = false;
  applyNumberInputState(false);
  const passwordField = memberForm["member-password"];
  if (passwordField) {
    passwordField.readOnly = true;
    passwordField.classList.add("bg-slate-100", "text-slate-500");
    passwordField.placeholder = "Gerada automaticamente ao salvar";
    passwordField.value = "";
  }
}

memberForm?.reset();
if (memberNoNumberInput) memberNoNumberInput.checked = false;
applyNumberInputState(false);
resetMemberFormState();

roleUpdateButton?.addEventListener("click", async () => {
  if (!selectedMember || !roleUpdateSelect) return;
  if (!context || !["admin", "diretor"].includes(context.profile.role)) {
    showMemberFeedback("Você não tem permissão para alterar o perfil do sócio.", "error");
    return;
  }
  const newRole = roleUpdateSelect.value;
  if (!newRole || newRole === selectedMember.role) {
    showMemberFeedback("Selecione um perfil diferente para atualizar.", "error");
    return;
  }
  try {
    await updateDoc(doc(db, "members", selectedMember.id), {
      role: newRole,
      updatedAt: serverTimestamp(),
      updatedBy: context.user.uid,
    });
    showMemberFeedback("Perfil atualizado com sucesso.", "success");
    selectedMember = { ...selectedMember, role: newRole };
    const cacheIndex = membersCache.findIndex((member) => member.id === selectedMember.id);
    if (cacheIndex >= 0) membersCache[cacheIndex] = { ...membersCache[cacheIndex], role: newRole };
    renderMembers();
    historyMemberRole.textContent = formatRole(newRole);
    schedulePublicStatsUpdate(true);
    setTimeout(() => showMemberFeedback(""), 4000);
  } catch (error) {
    console.error(error);
    showMemberFeedback("Não foi possível atualizar o perfil. Tente novamente.", "error");
  }
});

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

let context = null;
let membersCache = [];
let visibleMembers = [];
let selectedMember = null;
let membersUnsubscribe = null;
let defaultMonthlyFee = 30;
let paymentsEditable = false;
let publicStatsTimeout = null;
// Keep the public stats aligned with the gallery roles so the published counters match the cards.
const PUBLIC_STATS_ROLES = new Set([
  "admin",
  "diretor",
  "financeiro",
  "tesoureiro",
  "imprensa",
  "socio",
  "visitante",
  "crianca",
]);
let lastPublicStats = { total: null, active: null };
const state = {};
const bindState = (key, getter, setter) => {
  Object.defineProperty(state, key, {
    get: getter,
    set: setter,
    enumerable: true,
  });
};
window.pageState = state;

bindState("context", () => context, (value) => { context = value; });
bindState("membersCache", () => membersCache, (value) => { membersCache = value; });
bindState("visibleMembers", () => visibleMembers, (value) => { visibleMembers = value; });
bindState("selectedMember", () => selectedMember, (value) => { selectedMember = value; });
bindState("membersUnsubscribe", () => membersUnsubscribe, (value) => { membersUnsubscribe = value; });
bindState("defaultMonthlyFee", () => defaultMonthlyFee, (value) => { defaultMonthlyFee = value; });
bindState("paymentsEditable", () => paymentsEditable, (value) => { paymentsEditable = value; });
bindState("publicStatsTimeout", () => publicStatsTimeout, (value) => { publicStatsTimeout = value; });
bindState("lastPublicStats", () => lastPublicStats, (value) => { lastPublicStats = value; });
bindState("loadingFlags", () => loadingFlags, (value) => {
  if (value && typeof value === "object") {
    Object.assign(loadingFlags, value);
  }
});

(async function init() {
  setPageLoading(true);
  context = await requireAuth({
    allowedRoles: ["admin", "diretor", "imprensa", "financeiro", "tesoureiro", "socio", "visitante", "crianca"]
  });
  if (roleBadge) {
    roleBadge.textContent = getUserHeaderLabel(context.profile);
    roleBadge.classList.remove("hidden");
  }
  try {
    await loadDefaultMonthlyFee();
  } finally {
    loadingFlags.settings = true;
    updatePageLoading();
  }
  configurePermissions();
  subscribeMembers();
})();

function configurePermissions() {
  const canCreateMembers = context.profile.role === "admin";
  const canManageStatus = ["admin", "diretor"].includes(context.profile.role);
  paymentsEditable = ["admin", "financeiro"].includes(context.profile.role);
  if (!canCreateMembers && memberForm) {
    memberForm.closest(".bg-white")?.classList.add("opacity-60", "pointer-events-none");
    memberForm.querySelector("button[type='submit']")?.classList.add("hidden");
  }
  if (memberAdminOnlyHint) {
    memberAdminOnlyHint.classList.toggle("hidden", canCreateMembers);
  }
  if (!canManageStatus) {
    exitForm?.classList.add("opacity-60", "pointer-events-none");
  }
  const paymentSubmit = paymentsForm?.querySelector("button[type='submit']");
  if (paymentSubmit) {
    paymentSubmit.classList.toggle("hidden", !paymentsEditable);
  }
  updatePaymentsFormInteractivity();
  if (historyDeleteHint) {
    historyDeleteHint.classList.toggle("hidden", context.profile.role !== "admin");
  }

  if (historyEditButton) {
    if (["admin", "diretor"].includes(context.profile.role)) {
      historyEditButton.classList.remove("hidden");
    } else {
      historyEditButton.classList.add("hidden");
    }
  }

  const roleSelect = memberForm?.querySelector("#member-role");
  if (context.profile.role === "diretor" && roleSelect) {
    Array.from(roleSelect.options).forEach((option) => {
      if (["admin", "diretor"].includes(option.value)) {
        option.disabled = true;
      }
    });
  }
  if (context.profile.role === "socio" && roleSelect) {
    Array.from(roleSelect.options).forEach((option) => {
      if (option.value !== "crianca") {
        option.disabled = true;
      }
    });
  }
}

function updatePaymentsFormInteractivity() {
  const readOnly = !paymentsEditable;
  [paymentMonth, paymentStatus, exemptStart, exemptEnd].forEach((field) => {
    if (!field) return;
    field.disabled = readOnly;
  });
  if (paymentNotes) {
    paymentNotes.readOnly = readOnly;
  }
  if (exemptNotes) {
    exemptNotes.readOnly = readOnly;
  }
  [exemptApplyButton, exemptRemoveButton].forEach((button) => {
    if (!button) return;
    button.disabled = readOnly;
    button.classList.toggle("opacity-60", readOnly);
    button.classList.toggle("pointer-events-none", readOnly);
  });
}

async function loadDefaultMonthlyFee() {
  const financeRef = doc(db, "settings", "finance");
  try {
    const docSnap = await getDoc(financeRef);
    if (docSnap.exists()) {
      const configuredFee = Number(docSnap.data().defaultMonthlyFee);
      if (Number.isFinite(configuredFee) && configuredFee > 0) {
        defaultMonthlyFee = configuredFee;
      } else if (!docSnap.data().hasOwnProperty("defaultMonthlyFee")) {
        await setDoc(
          financeRef,
          { defaultMonthlyFee },
          { merge: true },
        );
      }
    } else {
      await setDoc(
        financeRef,
        { defaultMonthlyFee },
        { merge: true },
      );
    }
  } catch (error) {
    console.error("Não foi possível carregar a configuração de mensalidade padrão:", error);
  }
}

function subscribeMembers() {
  const membersRef = collection(db, "members");
  const membersQuery = query(membersRef);
  membersUnsubscribe = onSnapshot(
    membersQuery,
    (snapshot) => {
      membersCache = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        maybePatchMemberBirthDate(docSnap.id, data);
        return {
          id: docSnap.id,
          ...data,
        };
      });
      membersCache.sort((a, b) => formatSortableName(a.name).localeCompare(formatSortableName(b.name), "pt-BR"));
      renderMembers();
      schedulePublicStatsUpdate();
      loadingFlags.members = true;
      updatePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar sócios:", error);
      if (memberEmptyState) {
        memberEmptyState.textContent = "Não foi possível carregar os sócios. Tente novamente mais tarde.";
        memberEmptyState.classList.remove("hidden");
      }
      loadingFlags.members = true;
      updatePageLoading();
    },
  );
}

function renderMembers() {
  let filtered = [...membersCache];
  const searchRaw = searchInput.value || "";
  const tokens = getSearchTokens(searchRaw);
  const numericSearchTerm = normalizeSearchValue(searchRaw).replace(/\D/g, "");
  const roleValue = (roleFilter.value || "").trim();
  const statusValue = (statusFilter.value || "").trim().toLowerCase();
  const isAdmin = context?.profile?.role === "admin";

  if (roleValue) {
    filtered = filtered.filter((member) => (member.role || "").trim() === roleValue);
  }

  if (statusValue) {
    filtered = filtered.filter((member) => {
      const currentStatus = (member.status || "ativo").toString().trim().toLowerCase();
      return currentStatus === statusValue;
    });
  }

  if (tokens.length || numericSearchTerm) {
    filtered = filtered.filter((member) => {
      const phoneDigits = normalizePhone(member.phone || "");
      const matchesName = matchesSearchTokens(member.name || "", tokens);
      const matchesEmail = matchesSearchTokens(member.email || "", tokens);
      const matchesPhone = numericSearchTerm ? phoneDigits.includes(numericSearchTerm) : false;
      return matchesName || matchesEmail || matchesPhone;
    });
  }

  visibleMembers = filtered;

  if (!memberTableBody) return;
  memberTableBody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  if (!filtered.length) {
    memberEmptyState.classList.remove("hidden");
    return;
  }
  memberEmptyState.classList.add("hidden");

  filtered.forEach((member, index) => {
    const clone = memberRowTemplate.content.cloneNode(true);
    const serialCell = clone.querySelector("[data-field='serial']");
    if (serialCell) {
      serialCell.textContent = `${index + 1}`;
    }
    clone.querySelector("[data-field='photo']").src = member.photoUrl || "https://placehold.co/80x80?text=⚽";
    clone.querySelector("[data-field='name']").textContent = member.name;
    const emailField = clone.querySelector("[data-field='email']");
    if (emailField) {
      if (member.email) {
        emailField.textContent = member.email;
        emailField.classList.remove("hidden", "italic", "text-slate-400");
        emailField.setAttribute("data-copy", member.email);
      } else {
        emailField.textContent = "Email não informado";
        emailField.classList.add("italic", "text-slate-400");
        emailField.removeAttribute("data-copy");
      }
    }
    clone.querySelector("[data-field='role']").textContent = formatRole(member.role);
    const phoneField = clone.querySelector("[data-field='phone']");
    if (phoneField) {
      const phoneDigits = normalizePhone(member.phone || "");
      const formattedPhone = formatPhone(member.phone);
      phoneField.textContent = formattedPhone;
      if (phoneDigits) {
        phoneField.setAttribute("data-copy", formattedPhone);
      } else {
        phoneField.removeAttribute("data-copy");
      }
    }
    clone.querySelector("[data-field='joinDate']").textContent = formatDate(member.joinDate);
    const statusBadge = clone.querySelector("[data-field='status']");
    const statusValue = member.status || "ativo";
    statusBadge.textContent = statusValue.toUpperCase();
    statusBadge.className = `px-2 py-1 text-xs rounded-full font-medium ${statusColor(statusValue)}`;
    const editButton = clone.querySelector("[data-action='edit']");
    if (editButton) {
      if (isAdmin) {
        editButton.classList.remove("hidden");
        editButton.addEventListener("click", () => {
          selectMember(member.id, { scroll: false });
          startMemberEdit(member, { scroll: true });
        });
      } else {
        editButton.remove();
      }
    }
    const deleteButton = clone.querySelector("[data-action='delete']");
    if (deleteButton) {
      if (isAdmin) {
        deleteButton.classList.remove("hidden");
        deleteButton.addEventListener("click", () => confirmMemberDeletion(member));
      } else {
        deleteButton.remove();
      }
    }
    clone.querySelector("[data-action='select']").addEventListener("click", () => selectMember(member.id));
    clone.querySelector("[data-action='payments']").addEventListener("click", () => openPayments(member.id));
    fragment.appendChild(clone);
  });
  memberTableBody.appendChild(fragment);
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

searchInput?.addEventListener("input", debounce(renderMembers, 250));
roleFilter?.addEventListener("change", renderMembers);
statusFilter?.addEventListener("change", renderMembers);
exportMembersButton?.addEventListener("click", exportMembersList);

memberForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!context) return;
  showMemberFeedback("");
  const formData = collectMemberFormData();
  if (!formData) return;

  try {
    if (formData.editId) {
      await updateExistingMember(formData);
    } else {
      await createNewMember(formData);
    }
  } catch (error) {
    console.error(error);
    showMemberFeedback(translateMemberError(error), "error");
  }
});

memberForm?.addEventListener("reset", () => {
  resetMemberFormState();
});

if (historyEditButton) {
  historyEditButton.addEventListener("click", () => {
    if (context?.profile?.role !== "admin") return;
    if (!selectedMember) {
    notify("info", "Selecione um sócio na lista para editar.");
      return;
    }
    startMemberEdit(selectedMember);
  });
}


function collectMemberFormData() {
  if (!memberForm || !context) return null;
  const editId = memberEditIdInput?.value.trim() || "";
  const rawRole = (memberForm["member-role"].value || "").trim();
  const role = editId ? rawRole : rawRole || "socio";
  if (!editId && role && !canCreateRole(role, context.profile.role)) {
    notify("error", "Você não tem permissão para criar este tipo de perfil.");
    return null;
  }
  const rawName = (memberForm["member-name"].value || "").toString();
  const normalizedName = rawName.replace(/\s+/g, " ").trim();
  const name = normalizedName ? normalizedName.toUpperCase() : "";
  if (memberNameInput) memberNameInput.value = name;
  const rawEmail = (memberForm["member-email"].value || "").trim().toLowerCase();
  const email = role === "crianca" ? "" : rawEmail;
  const phoneDigits = normalizePhone(memberForm["member-phone"].value);
  const phone = phoneDigits;
  if (memberPhoneInput) {
    memberPhoneInput.value = phoneDigits ? formatPhone(phoneDigits) : "";
  }

  const street = memberStreetInput?.value.trim() || "";
  const rawNumber = memberNumberInput?.value.trim() || "";
  const noNumber = Boolean(memberNoNumberInput?.checked);
  const city = memberCityInput?.value.trim() || "";
  const stateInputValue = memberStateInput?.value || "";
  const state = stateInputValue.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
  if (memberStateInput) memberStateInput.value = state;

  if (state && state.length !== 2) {
    showMemberFeedback("Informe a sigla do estado com duas letras.", "error");
    memberStateInput?.focus();
    return null;
  }

  const displayNumber = noNumber ? "S/N" : rawNumber;
  const addressNumber = noNumber ? "" : rawNumber;
  let address = "";
  if (street) {
    address = street;
    if (displayNumber) {
      address += `, ${displayNumber}`;
    }
  } else if (displayNumber) {
    address = displayNumber;
  }
  if (city) {
    address = address ? `${address} - ${city}` : city;
    if (state) address += `/${state}`;
  } else if (state) {
    address = address ? `${address} - ${state}` : state;
  }
  address = address.trim();

  const birthInput = (memberForm["member-birth"].value || "").trim();
  let birthDate = "";
  if (birthInput) {
    const normalized = normalizeDateInput(birthInput);
    birthDate = parseDateValue(normalized) ? normalized : birthInput;
  }

  const joinInput = (memberForm["member-join"].value || "").trim();
  let joinDate = "";
  if (joinInput) {
    const normalized = normalizeDateInput(joinInput);
    joinDate = parseDateValue(normalized) ? normalized : joinInput;
  }

  const feeInput = (memberForm["member-fee"].value || "").trim();
  let customFee = null;
  if (feeInput) {
    const normalizedFee = feeInput.replace(",", ".");
    const parsedFee = Number(normalizedFee);
    if (Number.isNaN(parsedFee)) {
      showMemberFeedback("Informe um valor de mensalidade válido (use apenas números).", "error");
      memberForm["member-fee"].focus();
      return null;
    }
    customFee = parsedFee;
  }
  const notes = memberForm["member-notes"].value.trim();
  const passwordField = memberForm["member-password"];
  const password = passwordField?.value.trim() || "";
  const photoFile = memberForm["member-photo"].files[0] || null;

  const needsCredentials = !editId && CREDENTIAL_ROLES.has(role);
  if (needsCredentials && !email) {
    showMemberFeedback("Email não informado. Este sócio não poderá acessar o sistema até que um email seja cadastrado.", "info");
  }
  return {
    editId,
    role: role || "",
    name,
    email,
    phone,
    birthDate: birthDate || null,
    joinDate: joinDate || null,
    customFee,
    notes,
    password,
    photoFile,
    address,
    addressStreet: street,
    addressNumber,
    addressNoNumber: noNumber,
    addressCity: city,
    addressState: state,
  };
}

async function createNewMember(data) {
  const {
    role,
    name,
    email,
    phone,
    birthDate,
    joinDate,
    customFee,
    notes,
    password,
    photoFile,
    address,
    addressStreet,
    addressNumber,
    addressNoNumber,
    addressCity,
    addressState,
  } = data;
  let authUid = null;
  let existingMember = null;
  let createdCredential = false;

  let provisionalPassword = password || "";
  if (CREDENTIAL_ROLES.has(role) && email) {
    await withSecondaryAuth(async (secondaryAuth) => {
      const candidatePassword = provisionalPassword || generateTemporaryPassword();
      try {
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, candidatePassword);
        authUid = credential.user.uid;
        provisionalPassword = candidatePassword;
        createdCredential = true;
        await updateProfile(credential.user, { displayName: name });
      } catch (authError) {
        if (authError.code === "auth/email-already-in-use") {
          existingMember = await findMemberByEmail(email);
          authUid = existingMember?.ownerUid || existingMember?.id || null;
        } else {
          throw authError;
        }
      }
    });
    if (!existingMember && !authUid) {
      const error = new Error("Não foi possível criar as credenciais do sócio no Firebase Auth.");
      error.code = "auth/credential-creation-failed";
      throw error;
    }
  }

  let photoUrl = existingMember?.photoUrl || null;
  let photoPath = existingMember?.photoPath || null;
  if (photoFile) {
    if (photoFile.size > MAX_PHOTO_SIZE_BYTES) {
      throw new Error("A foto deve ter no máximo 5 MB.");
    }
    if (!isAllowedPhotoFile(photoFile)) {
      throw new Error("Envie uma foto em formato JPG, PNG ou WebP.");
    }
    const storageRef = ref(storage, `members/${authUid || existingMember?.id || randomId()}/${Date.now()}_${photoFile.name}`);
    showMemberFeedback("Enviando foto... 0%", "info");
    if (uploadBytesResumable) {
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, photoFile);
        task.on(
          "state_changed",
          (snapshot) => {
            const progress = snapshot.totalBytes
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
            showMemberFeedback(`Enviando foto... ${progress}%`, "info");
          },
          reject,
          resolve,
        );
      });
    } else {
      await uploadBytes(storageRef, photoFile);
    }
    photoUrl = await getDownloadURL(storageRef);
    photoPath = storageRef.fullPath;
    showMemberFeedback("", "info");
  }

  const memberId = authUid || existingMember?.id || doc(collection(db, "members")).id;
  const payload = {
    name,
    email: email || null,
    phone,
    birthDate,
    joinDate,
    role,
    status: "ativo",
    notes,
    monthlyFee: Number.isFinite(customFee) ? customFee : null,
    photoUrl,
    photoPath,
    address: address || "",
    addressStreet: addressStreet || "",
    addressNumber: addressNumber || "",
    addressNoNumber: Boolean(addressNoNumber),
    addressCity: addressCity || "",
    addressState: addressState || "",
    updatedAt: serverTimestamp(),
    updatedBy: context.user.uid,
    ownerUid: authUid || existingMember?.ownerUid || null,
  };

  if (!existingMember) {
    payload.createdAt = serverTimestamp();
    payload.createdBy = context.user.uid;
    payload.mustResetPassword = role !== "crianca";
    if (createdCredential && provisionalPassword) {
      payload.temporaryPassword = provisionalPassword;
      payload.passwordIssuedAt = serverTimestamp();
    }
  }

  await setDoc(doc(db, "members", memberId), payload, { merge: true });
  if (payload.email) {
    await setDoc(doc(db, "membersByEmail", payload.email), { memberId }, { merge: true });
  }
  if (!existingMember) {
    await addDoc(collection(db, "members", memberId, "history"), {
      status: "ativo",
      reason: "Cadastro inicial",
      createdAt: serverTimestamp(),
      createdBy: context.user.uid,
      createdByName: context.profile.name,
    });
  }

  const message = createdCredential
    ? `Sócio cadastrado com sucesso! Guarde a senha provisória: ${provisionalPassword}`
    : "Sócio cadastrado/atualizado com sucesso.";
  showMemberFeedback(message, "success");
  if (createdCredential) notify("success", message);

  if (!existingMember) {
    membersCache.push({ id: memberId, ...payload });
  } else {
    const cacheIndex = membersCache.findIndex((member) => member.id === memberId);
    if (cacheIndex >= 0) membersCache[cacheIndex] = { ...membersCache[cacheIndex], ...payload };
  }

  memberForm?.reset();
  resetMemberFormState();
  renderMembers();
  schedulePublicStatsUpdate(true);
  setTimeout(() => showMemberFeedback(""), 4000);
}

async function updateExistingMember(data) {
  const memberId = data.editId;
  const existing = membersCache.find((member) => member.id === memberId);
  if (!existing) {
    notify("error", "Não foi possível localizar o sócio selecionado.");
    return;
  }
  if (context.profile.role !== "admin") {
    notify("error", "Somente administradores podem editar dados completos de um sócio.");
    return;
  }

  const role = data.role || existing.role;
  const rawEmailInput = (data.email || "").toString().trim().toLowerCase();
  const email = role === "crianca" ? "" : rawEmailInput;
  const phone = normalizePhone(data.phone);
  const customFee = Number.isFinite(data.customFee) ? data.customFee : null;
  const address = (data.address || "").trim();
  const addressStreet = data.addressStreet || "";
  const addressNumber = data.addressNumber || "";
  const addressNoNumber = Boolean(data.addressNoNumber);
  const addressCity = data.addressCity || "";
  const addressState = (data.addressState || "").toUpperCase();

  const hadCredential = Boolean(existing.ownerUid);
  const emailChanged = (existing.email || "") !== email;
  const requiresCredential = CREDENTIAL_ROLES.has(role);
  const shouldRemoveCredential = hadCredential && (!requiresCredential || !email);
  const needsCredential = requiresCredential && email && (!hadCredential || emailChanged);
  let provisionalPassword = "";
  let createdCredential = false;
  let authUid = existing.ownerUid || null;

  if (shouldRemoveCredential) {
    authUid = null;
  }

  let createCredential = needsCredential;
  if (needsCredential) {
    const emailOwner = await findMemberByEmail(email);
    if (emailOwner && emailOwner.id !== memberId) {
      const conflictError = new Error("Este email já está vinculado a outro sócio.");
      conflictError.code = "auth/email-already-in-use";
      throw conflictError;
    }
    if (emailOwner && emailOwner.id === memberId) {
      authUid = emailOwner.ownerUid || memberId;
      createCredential = false;
    }
  }

  if (createCredential) {
    provisionalPassword = generateTemporaryPassword();
    await withSecondaryAuth(async (secondaryAuth) => {
      try {
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, provisionalPassword);
        authUid = credential.user.uid;
        createdCredential = true;
        await updateProfile(credential.user, { displayName: data.name });
      } catch (authError) {
        throw authError;
      }
    });
    if (!authUid) {
      const error = new Error("Não foi possível criar as credenciais do sócio no Firebase Auth.");
      error.code = "auth/credential-creation-failed";
      throw error;
    }
  }

  let photoUrl = existing.photoUrl || null;
  let photoPath = existing.photoPath || null;
  if (data.photoFile) {
    if (data.photoFile.size > MAX_PHOTO_SIZE_BYTES) {
      throw new Error("A foto deve ter no máximo 5 MB.");
    }
    if (!isAllowedPhotoFile(data.photoFile)) {
      throw new Error("Envie uma foto em formato JPG, PNG ou WebP.");
    }
    const storageRef = ref(storage, `members/${memberId}/${Date.now()}_${data.photoFile.name}`);
    showMemberFeedback("Enviando foto... 0%", "info");
    if (uploadBytesResumable) {
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, data.photoFile);
        task.on(
          "state_changed",
          (snapshot) => {
            const progress = snapshot.totalBytes
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
              : 0;
            showMemberFeedback(`Enviando foto... ${progress}%`, "info");
          },
          reject,
          resolve,
        );
      });
    } else {
      await uploadBytes(storageRef, data.photoFile);
    }
    photoUrl = await getDownloadURL(storageRef);
    photoPath = storageRef.fullPath;
    showMemberFeedback("", "info");
  }

  const payload = {
    name: data.name,
    phone,
    birthDate: data.birthDate,
    joinDate: data.joinDate,
    role,
    notes: data.notes,
    monthlyFee: customFee,
    photoUrl,
    photoPath,
    address: address || "",
    addressStreet: addressStreet || "",
    addressNumber: addressNumber || "",
    addressNoNumber,
    addressCity: addressCity || "",
    addressState: addressState || "",
    updatedAt: serverTimestamp(),
    updatedBy: context.user.uid,
  };
  payload.email = email || null;
  if (shouldRemoveCredential) {
    payload.ownerUid = deleteField();
    payload.mustResetPassword = false;
    payload.temporaryPassword = deleteField();
    payload.passwordIssuedAt = deleteField();
    payload.passwordUpdatedAt = deleteField();
  }
  if (!hadCredential && authUid && !createdCredential && !shouldRemoveCredential) {
    payload.ownerUid = authUid;
  }
  if (createdCredential) {
    payload.ownerUid = authUid;
    payload.mustResetPassword = true;
    payload.temporaryPassword = provisionalPassword;
    payload.passwordIssuedAt = serverTimestamp();
    payload.passwordUpdatedAt = deleteField();
  }

  await updateDoc(doc(db, "members", memberId), payload);

  const oldEmail = existing.email?.toLowerCase();
  if (oldEmail && oldEmail !== email) {
    await deleteDoc(doc(db, "membersByEmail", oldEmail));
  }
  if (email) {
    await setDoc(doc(db, "membersByEmail", email), { memberId }, { merge: true });
  }

  const updated = { ...existing, ...payload };
  if (shouldRemoveCredential) {
    delete updated.ownerUid;
    delete updated.temporaryPassword;
    delete updated.passwordIssuedAt;
    delete updated.passwordUpdatedAt;
    updated.mustResetPassword = false;
  }
  if (!hadCredential && authUid && !createdCredential && !shouldRemoveCredential) {
    updated.ownerUid = authUid;
  }
  if (createdCredential) {
    updated.ownerUid = authUid;
    updated.mustResetPassword = true;
    updated.temporaryPassword = provisionalPassword;
    updated.passwordIssuedAt = new Date();
    delete updated.passwordUpdatedAt;
  }
  const index = membersCache.findIndex((member) => member.id === memberId);
  if (index >= 0) membersCache[index] = updated;
  if (selectedMember?.id === memberId) selectedMember = updated;

  let message = "Dados do sócio atualizados com sucesso.";
  if (createdCredential) {
    message = `Dados atualizados. Compartilhe a senha provisória: ${provisionalPassword}`;
  } else if (shouldRemoveCredential) {
    message = "Credenciais removidas. Este sócio não possui mais acesso ao sistema.";
  }
  showMemberFeedback(message, "success");
  if (createdCredential) notify("success", message);
  setTimeout(() => showMemberFeedback(""), 4000);
  memberForm?.reset();
  resetMemberFormState();
  renderMembers();
  schedulePublicStatsUpdate(true);
  selectMember(memberId);
}

function startMemberEdit(member, { scroll = true } = {}) {
  if (!memberForm) return;
  memberEditIdInput.value = member.id;
  memberForm.dataset.mode = "edit";
  if (memberSubmitButton) memberSubmitButton.textContent = "Atualizar sócio";
  memberForm["member-name"].value = member.name || "";
  memberForm["member-role"].value = member.role || "";
  const emailField = memberForm["member-email"];
  if (emailField) {
    emailField.value = member.role === "crianca" ? "" : (member.email || "");
  }
  memberForm["member-phone"].value = formatPhone(member.phone || "");
  memberForm["member-birth"].value = formatDateForInput(member.birthDate);
  memberForm["member-join"].value = formatDateForInput(member.joinDate);
  memberForm["member-fee"].value = member.monthlyFee ?? "";
  memberForm["member-notes"].value = member.notes || "";
  if (memberStreetInput) {
    memberStreetInput.value = member.addressStreet || "";
    if (!memberStreetInput.value && member.address) {
      memberStreetInput.value = member.address;
    }
  }
  const useNoNumber = Boolean(member.addressNoNumber);
  if (memberNoNumberInput) memberNoNumberInput.checked = useNoNumber;
  applyNumberInputState(useNoNumber);
  if (memberNumberInput) {
    memberNumberInput.value = useNoNumber ? "" : (member.addressNumber || "");
  }
  if (memberCityInput) memberCityInput.value = member.addressCity || "";
  if (memberStateInput) memberStateInput.value = (member.addressState || "").toUpperCase();
  const passwordField = memberForm["member-password"];
  if (passwordField) {
    const provisional = member.temporaryPassword || "";
    passwordField.value = provisional;
    passwordField.readOnly = true;
    passwordField.classList.add("bg-slate-100", "text-slate-500");
    passwordField.placeholder = provisional
      ? "Senha provisória atual (recomende redefinição no primeiro acesso)"
      : "Nenhuma senha provisória ativa";
  }
  if (memberPhotoName) {
    memberPhotoName.textContent = member.photoUrl
      ? "Foto atual cadastrada. Envie outra para substituir."
      : "Nenhum arquivo selecionado";
  }
  if (scroll) {
    memberForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function canCreateRole(targetRole, currentRole) {
  if (currentRole === "admin") return true;
  return false;
}

async function selectMember(memberId, { scroll = true } = {}) {
  selectedMember = membersCache.find((member) => member.id === memberId);
  if (!selectedMember) return;
  historyMemberName.textContent = selectedMember.name;
  historyMemberRole.textContent = formatRole(selectedMember.role);
  const formattedPhone = formatPhone(selectedMember.phone);
  historyMemberPhone.textContent = formattedPhone;
  const phoneDigits = normalizePhone(selectedMember.phone || "");
  if (phoneDigits) {
    historyMemberPhone.setAttribute("data-copy", formattedPhone);
  } else {
    historyMemberPhone.removeAttribute("data-copy");
  }
  historyMemberStatus.textContent = (selectedMember.status || "ativo").toUpperCase();
  if (historyMemberAddress) {
    historyMemberAddress.textContent = formatAddress(selectedMember);
  }
  exitStatus.value = selectedMember.status || "ativo";
  exitReason.value = "";
  if (roleUpdateWrapper) {
    if (context.profile.role === "admin") {
      roleUpdateWrapper.classList.remove("hidden");
      if (roleUpdateSelect) roleUpdateSelect.value = selectedMember.role || "visitante";
    } else {
      roleUpdateWrapper.classList.add("hidden");
    }
  }
  if (historyEditButton) {
    if (context.profile.role === "admin") {
      historyEditButton.classList.remove("hidden");
    } else {
      historyEditButton.classList.add("hidden");
    }
  }
  memberHistoryEmpty.classList.add("hidden");
  memberHistoryContainer.classList.remove("hidden");
  await loadMemberHistory(memberId);
  if (scroll) {
    memberHistoryContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadMemberHistory(memberId) {
  historyList.innerHTML = "";
  const historyRef = collection(db, "members", memberId, "history");
  const historySnap = await getDocs(query(historyRef, orderBy("createdAt", "desc"), limit(20)));
  const canDeleteHistory = context?.profile?.role === "admin";
  if (historySnap.empty) {
    historyList.innerHTML = `<li class="text-xs text-slate-500">Nenhum histórico registrado.</li>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  historySnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const deleteButton = canDeleteHistory
      ? `<button
            type="button"
            class="text-[11px] font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
            data-action="delete-history"
            data-history-id="${docSnap.id}"
            data-member-id="${memberId}"
          >
            Excluir
          </button>`
      : "";
    const li = document.createElement("li");
    li.className = "border border-slate-200 rounded-lg px-3 py-2";
    li.innerHTML = `
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold">${data.status?.toUpperCase()}</span>
        <div class="flex items-center gap-2 text-slate-500">
          <time>${formatDateTime(data.createdAt)}</time>
          ${deleteButton}
        </div>
      </div>
      ${data.reason ? `<p class="text-xs text-slate-600 mt-1">${data.reason}</p>` : ""}
      <p class="text-[11px] text-slate-400 mt-1">Por: ${data.createdByName || "Sistema"}</p>
    `;
    fragment.appendChild(li);
  });
  historyList.appendChild(fragment);
}

exitForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedMember) return;
  const status = exitStatus.value;
  const reason = exitReason.value.trim();
  try {
    await updateDoc(doc(db, "members", selectedMember.id), {
      status,
      exitReason: reason,
      updatedAt: serverTimestamp(),
      updatedBy: context.user.uid,
    });
    await addDoc(collection(db, "members", selectedMember.id, "history"), {
      status,
      reason,
      createdAt: serverTimestamp(),
      createdBy: context.user.uid,
      createdByName: context.profile.name,
    });
    selectedMember = { ...selectedMember, status };
    const cacheIndex = membersCache.findIndex((member) => member.id === selectedMember.id);
    if (cacheIndex >= 0) {
      membersCache[cacheIndex] = { ...membersCache[cacheIndex], status };
    }
    historyMemberStatus.textContent = status.toUpperCase();
    renderMembers();
    schedulePublicStatsUpdate(true);
    notify("success", "Status atualizado com sucesso.");
    exitReason.value = "";
  } catch (error) {
    console.error(error);
    notify("error", "Não foi possível atualizar o status. Tente novamente.");
  }
});

historyList?.addEventListener("click", handleHistoryDelete);

async function handleHistoryDelete(event) {
  const button = event.target.closest("[data-action='delete-history']");
  if (!button || !historyList.contains(button)) return;
  if (!context || context.profile.role !== "admin") {
    notify("error", "Somente administradores podem excluir registros de baixa.");
    return;
  }

  const memberId = button.dataset.memberId;
  const historyId = button.dataset.historyId;
  if (!memberId || !historyId) return;

  const confirmed = confirm("Excluir este registro de baixa? Esta ação não pode ser desfeita.");
  if (!confirmed) return;

  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Excluindo...";

  try {
    await deleteDoc(doc(db, "members", memberId, "history", historyId));
    await loadMemberHistory(memberId);
  } catch (error) {
    console.error(error);
    notify("error", "Não foi possível excluir o registro. Tente novamente.");
    button.disabled = false;
    button.textContent = previousLabel;
  }
}

async function openPayments(memberId) {
  const member = membersCache.find((item) => item.id === memberId);
  if (!member) return;
  paymentsMemberId.value = member.id;
  paymentsMemberName.textContent = member.name;
  paymentsMemberInfo.textContent = `${formatRole(member.role)} • ${member.email || "sem email"}`;
  paymentMonth.value = currentPaymentDateValue();
  paymentStatus.value = "pago";
  paymentNotes.value = "";
  await loadPaymentHistory(member);
  paymentsDialog.showModal();
}

async function loadPaymentHistory(member) {
  paymentsHistoryList.innerHTML = "";
  const paymentsRef = collection(db, "members", member.id, "payments");
  const paymentsQuery = query(paymentsRef, orderBy("updatedAt", "desc"), limit(24));
  let paymentsSnap = await getDocs(paymentsQuery, { source: "server" }).catch(() => getDocs(paymentsQuery));
  renderMonthlyInstallments(member, paymentsSnap);
  if (paymentsSnap.empty) {
    paymentsHistoryList.innerHTML = `<li class="text-xs text-slate-500">Nenhum registro financeiro encontrado.</li>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  paymentsSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.className = "border border-slate-200 rounded-lg px-3 py-2 text-xs";
    li.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-semibold">${formatCompetence(data.competence)}</span>
        <span class="${statusColor(data.status)} font-semibold">${data.status.toUpperCase()}</span>
      </div>
      <div class="mt-1 text-slate-600">Valor: ${formatCurrencyBRL(data.amount || member.monthlyFee || defaultMonthlyFee)}</div>
      <div class="mt-1 text-slate-500">${formatDateTime(data.updatedAt)}</div>
      ${data.notes ? `<p class="mt-1 text-slate-500">${data.notes}</p>` : ""}
    `;
    fragment.appendChild(li);
  });
  paymentsHistoryList.appendChild(fragment);
}

function renderMonthlyInstallments(member, paymentsSnap) {
  if (!paymentsMonthlyStatus || !paymentsMonthlyEmpty || !paymentsMonthlyTitle) return;
  paymentsMonthlyStatus.innerHTML = "";
  paymentsMonthlyStatus.classList.remove("hidden");
  paymentsMonthlyEmpty.classList.add("hidden");

  const statusByCompetence = new Map();
  if (paymentsSnap && !paymentsSnap.empty) {
    paymentsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const competence = data.competence || docSnap.id || "";
      if (!competence) return;
      const status = String(data.status || "pendente").trim().toLowerCase();
      statusByCompetence.set(competence, status);
    });
  }

  if (!statusByCompetence.size) {
    paymentsMonthlyStatus.classList.add("hidden");
    paymentsMonthlyEmpty.textContent = "Nenhuma mensalidade registrada.";
    paymentsMonthlyEmpty.classList.remove("hidden");
    paymentsMonthlyTitle.textContent = "Mensalidades";
    return;
  }

  const joinDate = parseDateValue(member.joinDate);
  const joinMonthStart = joinDate ? new Date(joinDate.getFullYear(), joinDate.getMonth(), 1) : null;
  const billingStart = new Date(CLUB_BILLING_START.getFullYear(), CLUB_BILLING_START.getMonth(), 1);
  const effectiveStart = joinMonthStart && joinMonthStart > billingStart ? joinMonthStart : billingStart;

  const competenceDates = Array.from(statusByCompetence.keys())
    .map((competence) => competenceToMonthDate(competence))
    .filter((date) => date instanceof Date);

  const today = new Date();
  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let latestReference = competenceDates.length
    ? competenceDates.reduce((acc, current) => (current > acc ? current : acc))
    : null;
  if (!latestReference || latestReference < todayMonthStart) {
    latestReference = todayMonthStart;
  }
  if (latestReference < effectiveStart) {
    latestReference = effectiveStart;
  }

  const startCompetence = dateToCompetence(effectiveStart);
  const endCompetence = dateToCompetence(latestReference);
  const startLabel = formatCompetence(startCompetence);
  const endLabel = formatCompetence(endCompetence);
  paymentsMonthlyTitle.textContent =
    startLabel === endLabel ? `Mensalidades — ${startLabel}` : `Mensalidades — ${startLabel} a ${endLabel}`;

  const badges = Array.from(statusByCompetence.entries())
    .map(([competence, status]) => ({ competence, status }))
    .sort((a, b) => a.competence.localeCompare(b.competence));

  const fragment = document.createDocumentFragment();
  badges.forEach(({ competence, status }) => {
    const badge = document.createElement("span");
    const { className, label } = resolveMonthlyBadge(status);
    badge.className = className;
    badge.textContent = `${formatCompetenceShort(competence)} • ${label}`;
    badge.title = `${formatCompetence(competence)} — ${label}`;
    fragment.appendChild(badge);
  });
  paymentsMonthlyStatus.appendChild(fragment);
}

paymentsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!paymentsEditable) {
    notify("error", "Somente administradores e financeiro podem registrar mensalidades.");
    return;
  }
  const memberId = paymentsMemberId.value;
  const member = membersCache.find((item) => item.id === memberId);
  if (!member) return;
  const competence = paymentMonthDateToCompetence(paymentMonth.value);
  const status = paymentStatus.value;
  const notes = paymentNotes.value.trim();
  const amount = member.monthlyFee || defaultMonthlyFee;
  try {
    const memberPaymentRef = doc(db, "members", memberId, "payments", competence);
    const existingPaymentSnap = await getDoc(memberPaymentRef);
    const existingStatus = String(existingPaymentSnap.data()?.status || "").toLowerCase();
    if (existingPaymentSnap.exists() && existingStatus === "pago" && status === "pago") {
      notify("info", "Esta competência já está registrada como paga para este sócio. Não é possível receber duas vezes.");
      return;
    }
    const topLevelRef = doc(db, "payments", `${memberId}_${competence}`);
    const payload = {
      memberId,
      memberName: member.name,
      memberRole: member.role,
      competence,
      status,
      notes,
      amount,
      updatedAt: serverTimestamp(),
      updatedBy: context.user.uid,
      updatedByName: context.profile.name,
    };
    await Promise.all([
      setDoc(topLevelRef, payload, { merge: true }),
      setDoc(memberPaymentRef, payload, { merge: true }),
    ]);
    notify("success", "Movimentação financeira registrada com sucesso.");
    await loadPaymentHistory(member);
  } catch (error) {
    console.error(error);
    notify("error", "Não foi possível registrar a mensalidade. Tente novamente.");
  }
});

exemptApplyButton?.addEventListener("click", async () => {
  if (!paymentsEditable) {
    notify("error", "Somente administradores e financeiro podem registrar isenções.");
    return;
  }
  const memberId = paymentsMemberId.value;
  const member = membersCache.find((item) => item.id === memberId);
  if (!member) return;
  if (String(member.status || "ativo").toLowerCase() !== "ativo") {
    notify("info", "Apenas sócios ativos podem receber isenção.");
    return;
  }
  const startCompetence = monthInputToCompetence(exemptStart?.value);
  const endCompetence = monthInputToCompetence(exemptEnd?.value);
  if (!startCompetence || !endCompetence) {
    notify("info", "Informe o período completo da isenção.");
    return;
  }
  if (startCompetence > endCompetence) {
    notify("info", "O mês inicial não pode ser maior que o mês final.");
    return;
  }
  const competences = buildCompetenceRange(startCompetence, endCompetence);
  if (!competences.length) {
    notify("error", "Não foi possível montar o período informado.");
    return;
  }
  const notes = exemptNotes?.value.trim() || "";
  const amount = member.monthlyFee || defaultMonthlyFee;
  try {
    const writes = [];
    for (const competence of competences) {
      const memberPaymentRef = doc(db, "members", memberId, "payments", competence);
      const existingSnap = await getDoc(memberPaymentRef);
      const existingStatus = String(existingSnap.data()?.status || "").toLowerCase();
      if (existingStatus.startsWith("pago") || existingStatus === "quitado") {
        continue;
      }
      const topLevelRef = doc(db, "payments", `${memberId}_${competence}`);
      const payload = {
        memberId,
        memberName: member.name,
        memberRole: member.role,
        competence,
        status: "isentado",
        notes,
        amount,
        updatedAt: serverTimestamp(),
        updatedBy: context.user.uid,
        updatedByName: context.profile.name,
      };
      writes.push(
        setDoc(topLevelRef, payload, { merge: true }),
        setDoc(memberPaymentRef, payload, { merge: true }),
      );
    }
    if (!writes.length) {
      notify("info", "Nenhuma competência disponível para isenção (pagamentos já quitados).");
      return;
    }
    await Promise.all(writes);
    if (exemptStart) exemptStart.value = "";
    if (exemptEnd) exemptEnd.value = "";
    if (exemptNotes) exemptNotes.value = "";
    notify("success", "Isenção aplicada com sucesso.");
    await loadPaymentHistory(member);
  } catch (error) {
    console.error(error);
    notify("error", "Não foi possível aplicar a isenção. Tente novamente.");
  }
});

exemptRemoveButton?.addEventListener("click", async () => {
  if (!paymentsEditable) {
    notify("error", "Somente administradores e financeiro podem remover isenções.");
    return;
  }
  const memberId = paymentsMemberId.value;
  const member = membersCache.find((item) => item.id === memberId);
  if (!member) return;
  const startCompetence = monthInputToCompetence(exemptStart?.value);
  const endCompetence = monthInputToCompetence(exemptEnd?.value);
  if (!startCompetence || !endCompetence) {
    notify("info", "Informe o período completo para remover a isenção.");
    return;
  }
  if (startCompetence > endCompetence) {
    notify("info", "O mês inicial não pode ser maior que o mês final.");
    return;
  }
  const competences = buildCompetenceRange(startCompetence, endCompetence);
  if (!competences.length) {
    notify("error", "Não foi possível montar o período informado.");
    return;
  }
  const confirmed = window.confirm("Tem certeza que deseja remover a isenção deste período?");
  if (!confirmed) return;
  try {
    const writes = [];
    for (const competence of competences) {
      const memberPaymentRef = doc(db, "members", memberId, "payments", competence);
      const existingSnap = await getDoc(memberPaymentRef);
      if (!existingSnap.exists()) continue;
      const existingStatus = String(existingSnap.data()?.status || "").toLowerCase();
      if (!existingStatus.includes("isento") && existingStatus !== "isentado") {
        continue;
      }
      const topLevelRef = doc(db, "payments", `${memberId}_${competence}`);
      writes.push(
        setDoc(memberPaymentRef, { status: "pendente", updatedAt: serverTimestamp(), updatedBy: context.user.uid }, { merge: true }),
        setDoc(topLevelRef, {
          status: "pendente",
          updatedAt: serverTimestamp(),
          updatedBy: context.user.uid,
          updatedByName: context.profile.name,
        }, { merge: true }),
      );
    }
    if (!writes.length) {
      notify("info", "Nenhuma isenção encontrada no período informado.");
      return;
    }
    await Promise.all(writes);
    if (exemptStart) exemptStart.value = "";
    if (exemptEnd) exemptEnd.value = "";
    if (exemptNotes) exemptNotes.value = "";
    notify("success", "Isenções removidas com sucesso.");
    await loadPaymentHistory(member);
  } catch (error) {
    console.error(error);
    notify("error", "Não foi possível remover as isenções. Tente novamente.");
  }
});

function currentPaymentDateValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function paymentMonthDateToCompetence(value) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return CLUB_BILLING_START_COMPETENCE;
  }
  return dateToCompetence(parsed);
}

function monthInputToCompetence(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  return dateToCompetence(parsed);
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

function buildCompetenceRange(start, end) {
  if (!start || !end || start > end) return [];
  const competences = [];
  let cursor = start;
  while (cursor && cursor <= end) {
    competences.push(cursor);
    cursor = incrementCompetence(cursor);
  }
  return competences;
}

function generatePassword() {
  return Math.random().toString(36).slice(-10);
}

function randomId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
}

function exportMembersList() {
  if (!visibleMembers.length) {
    notify("info", "Nenhum sócio encontrado com os filtros atuais.");
    return;
  }

  const header = ["Nome", "Email", "Telefone", "Endereço", "Perfil", "Status", "Entrada", "Mensalidade"];
  const rows = visibleMembers.map((member) => {
    const fee = Number(member.monthlyFee);
    const feeLabel = Number.isFinite(fee)
      ? fee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "--";
    return [
      member.name || "",
      member.email || "",
      formatPhone(member.phone || ""),
      formatAddress(member),
      formatRole(member.role || "visitante"),
      (member.status || "ativo").toUpperCase(),
      formatDate(member.joinDate || member.createdAt),
      feeLabel,
    ];
  });

  const csvContent = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "").replace(/"/g, '""');
          return `"${value}"`;
        })
        .join(";"),
    )
    .join("\n");

  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cadastro_socios_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatRole(role) {
  const map = {
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
  if (map[key]) return map[key];
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

function formatSortableName(name) {
  if (!name) return "";
  return name
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatPhone(value) {
  const digits = normalizePhone(value);
  if (!digits) return "--";
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function formatAddress(member) {
  if (!member) return "--";
  const street = (member.addressStreet || "").trim();
  const number = member.addressNoNumber ? "S/N" : (member.addressNumber || "").trim();
  const city = (member.addressCity || "").trim();
  const state = (member.addressState || "").trim().toUpperCase();
  const parts = [];
  if (street) {
    parts.push(number ? `${street}, ${number}` : street);
  } else if (number) {
    parts.push(number);
  }
  let locality = "";
  if (city) {
    locality = state ? `${city}/${state}` : city;
  } else if (state) {
    locality = state;
  }
  if (locality) {
    parts.push(locality);
  }
  const formatted = parts.join(" - ").trim();
  if (formatted) return formatted;
  const legacy = (member.address || "").trim();
  return legacy || "--";
}

function normalizePhone(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length <= 11) return digits;
  return digits.slice(0, 11);
}

const MONTH_NAMES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function formatDateForInput(value) {
  const date = parseDateValue(value);
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatDate(value) {
  const formatted = formatDateForInput(value);
  return formatted || "--";
}

function formatDateTime(timestamp) {
  if (!timestamp) return "--";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function competenceToMonthDate(value) {
  if (!value || typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToCompetence(date) {
  if (!(date instanceof Date)) return CLUB_BILLING_START_COMPETENCE;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCompetenceShort(value) {
  if (!value) return "--";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = MONTH_NAMES_PT[monthIndex] || month;
  const short = monthName.slice(0, 3);
  const capitalized = short.charAt(0).toUpperCase() + short.slice(1);
  return `${capitalized} ${year}`;
}

function formatCompetence(value) {
  if (!value) return "--";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = MONTH_NAMES_PT[monthIndex] || month;
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} ${year}`;
}

function resolveMonthlyBadge(status) {
  const normalized = String(status || "pendente").toLowerCase();
  if (normalized === "pago") {
    return {
      className:
        "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
      label: "Pago",
    };
  }
  if (normalized === "isentado") {
    return {
      className:
        "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600",
      label: "Isento",
    };
  }
  return {
    className:
      "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700",
    label: "Pendente",
  };
}

function formatCurrencyBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusColor(status) {
  switch (status) {
    case "ativo":
    case "pago":
      return "bg-green-100 text-green-600";
    case "pendente":
    case "inativo":
      return "bg-amber-100 text-amber-600";
    case "isentado":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-slate-200 text-slate-600";
  }
}

function schedulePublicStatsUpdate(force = false) {
  if (!context?.profile) return;
  const canUpdate = ["admin", "diretor"].includes(context.profile.role);
  if (!canUpdate) return;
  if (force && publicStatsTimeout) {
    clearTimeout(publicStatsTimeout);
    publicStatsTimeout = null;
  }
  if (publicStatsTimeout) return;
  const delay = force ? 50 : 500;
  publicStatsTimeout = setTimeout(updatePublicStats, delay);
}

async function updatePublicStats() {
  if (!context?.profile) return;
  publicStatsTimeout = null;
  const totals = computePublicStats();
  if (!totals) return;
  if (totals.total === lastPublicStats.total && totals.active === lastPublicStats.active) return;
  lastPublicStats = totals;
  try {
    await setDoc(
      doc(db, "settings", "publicStats"),
      {
        members: totals,
        updatedAt: serverTimestamp(),
        updatedBy: context.user.uid,
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Não foi possível atualizar as estatísticas públicas:", error);
  }
}

function computePublicStats() {
  const total = membersCache.length;
  const active = membersCache.filter(
    (member) => PUBLIC_STATS_ROLES.has(member.role || "visitante") && (member.status || "ativo") === "ativo",
  ).length;
  return { total, active };
}

function excelSerialToDate(serial) {
  if (!Number.isFinite(serial)) return null;
  const excelEpoch = new Date(1899, 11, 30);
  const wholeDays = Math.floor(serial);
  const fractional = serial - wholeDays;
  const milliseconds = Math.round(fractional * 24 * 60 * 60 * 1000);
  const result = new Date(excelEpoch.getTime() + wholeDays * 24 * 60 * 60 * 1000 + milliseconds);
  if (Number.isNaN(result.getTime())) return null;
  return result;
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelDate = excelSerialToDate(value);
    if (excelDate) return excelDate;
    const fromMillis = new Date(value);
    if (!Number.isNaN(fromMillis.getTime())) return fromMillis;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [year, month] = trimmed.split("-").map(Number);
      return new Date(year, month - 1, 1);
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      const base = trimmed.slice(0, 10);
      const [year, month, day] = base.split("-").map(Number);
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
    if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split("/").map(Number);
      const normalizedYear = year >= 70 ? 1900 + year : 2000 + year;
      return new Date(normalizedYear, month - 1, day);
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 5000) {
      const excelDate = excelSerialToDate(numeric);
      if (excelDate) return excelDate;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (value?.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function normalizeDateInput(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = parseDateValue(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    if (typeof value === "string") return value.trim();
    return String(value);
  }
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

async function confirmMemberDeletion(member) {
  if (!context?.profile || context.profile.role !== "admin") return;
  if (!member) return;
  const confirmMessage = `Deseja realmente excluir o sócio ${member.name || "sem nome"}? Essa ação não pode ser desfeita.`;
  if (!window.confirm(confirmMessage)) return;
  const reason = (window.prompt("Informe o motivo da exclusão (campo obrigatório):") || "").trim();
  if (!reason) {
    notify("info", "É obrigatório informar o motivo da exclusão.");
    return;
  }
  showMemberFeedback("Excluindo sócio...", "info");
  try {
    // excluir subcoleção history
    const historySnap = await getDocs(collection(db, "members", member.id, "history"));
    await Promise.all(historySnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));

    // excluir subcoleção payments do sócio
    const paymentsSnap = await getDocs(collection(db, "members", member.id, "payments"));
    await Promise.all(paymentsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));

    // excluir pagamentos agregados
    const topPaymentsQuery = query(collection(db, "payments"), where("memberId", "==", member.id));
    const topPaymentsSnap = await getDocs(topPaymentsQuery);
    await Promise.all(topPaymentsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));

    // remover cadastro principal e índice por email
    await deleteDoc(doc(db, "members", member.id));
    if (member.email) {
      await deleteDoc(doc(db, "membersByEmail", member.email.toLowerCase()));
    }

    await addDoc(collection(db, "auditLogs"), {
      action: "memberDeletion",
      memberId: member.id,
      memberName: member.name || null,
      memberRole: member.role || null,
      reason,
      performedBy: context.user?.uid || null,
      performedByName: context.profile?.name || "Usuário não identificado",
      performedByRole: context.profile?.role || null,
      createdAt: serverTimestamp(),
      status: "success",
    });

    membersCache = membersCache.filter((item) => item.id !== member.id);
    if (selectedMember?.id === member.id) {
      selectedMember = null;
      historyList.innerHTML = "";
      memberHistoryContainer?.classList.add("hidden");
      memberHistoryEmpty?.classList.remove("hidden");
      exitStatus.value = "ativo";
      exitReason.value = "";
      memberForm?.reset();
      resetMemberFormState();
    }
    renderMembers();
    schedulePublicStatsUpdate(true);
    showMemberFeedback("Sócio excluído com sucesso.", "success");
    setTimeout(() => showMemberFeedback(""), 4000);
  } catch (error) {
    console.error(error);
    showMemberFeedback("Não foi possível excluir o sócio. Tente novamente.", "error");
  }
}

function showMemberFeedback(message, variant = "") {
  if (!memberFeedback) return;
  memberFeedback.classList.remove(
    "hidden",
    "border-green-200",
    "bg-green-50",
    "text-green-700",
    "border-rose-200",
    "bg-rose-50",
    "text-rose-700",
    "border-slate-200",
    "bg-slate-50",
    "text-slate-600",
  );

  if (!message) {
    memberFeedback.textContent = "";
    memberFeedback.classList.add("hidden");
    return;
  }

  if (variant === "success") {
    memberFeedback.classList.add("border-green-200", "bg-green-50", "text-green-700");
  } else if (variant === "error") {
    memberFeedback.classList.add("border-rose-200", "bg-rose-50", "text-rose-700");
  } else if (variant === "info") {
    memberFeedback.classList.add("border-slate-200", "bg-slate-50", "text-slate-600");
  }

  memberFeedback.textContent = message;
}

function translateMemberError(error) {
  if (!error) return "Não foi possível salvar o sócio. Verifique os dados e tente novamente.";
  if (typeof error === "string") return error;
  const { code } = error;
  const messages = {
    "auth/email-already-in-use":
      "Este email já está vinculado a outro sócio. Atualize o cadastro existente ou utilize um email diferente.",
    "auth/invalid-email": "O email informado não é válido.",
    "auth/weak-password": "A senha provisória precisa ter ao menos 6 caracteres.",
    "auth/operation-not-allowed":
      "O cadastro de usuários por email/senha está desativado no Firebase Auth. Ative o provedor para continuar.",
    "auth/credential-creation-failed":
      "Não foi possível criar as credenciais do sócio no Firebase Auth. Tente novamente em instantes.",
  };
  if (code && messages[code]) return messages[code];
  return error.message || "Não foi possível salvar o sócio. Verifique os dados e tente novamente.";
}

function generateTemporaryPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
  if (length <= 0) return "";
  let password = "";
  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj?.getRandomValues) {
    const randomBuffer = new Uint32Array(length);
    cryptoObj.getRandomValues(randomBuffer);
    for (let i = 0; i < length; i += 1) {
      password += alphabet[randomBuffer[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      const index = Math.floor(Math.random() * alphabet.length);
      password += alphabet[index];
    }
  }
  return password;
}

async function findMemberByEmail(email) {
  if (!email) return null;
  const normalized = email.toLowerCase();
  const local = membersCache.find((member) => member.email && member.email.toLowerCase() === normalized);
  if (local) return local;

  const aliasDoc = await getDoc(doc(db, "membersByEmail", normalized));
  if (aliasDoc.exists() && aliasDoc.data().memberId) {
    const referenced = await getDoc(doc(db, "members", aliasDoc.data().memberId));
    if (referenced.exists()) {
      return { id: referenced.id, ...referenced.data() };
    }
  }

  const emailQuery = query(collection(db, "members"), where("email", "==", normalized), limit(1));
  const emailSnapshot = await getDocs(emailQuery);
  if (!emailSnapshot.empty) {
    const docSnap = emailSnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}
