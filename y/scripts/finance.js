import { requireAuth, logout as doLogout } from "./auth.js";
import { getFirestoreDb, getFirebaseStorage } from "./firebase-client.js";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const db = getFirestoreDb();
const storage = getFirebaseStorage();

const navToggleButton = document.getElementById("finance-menu-toggle");
const drawer = document.getElementById("drawer-menu");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerClose = document.getElementById("drawer-close");
const logoutButtons = Array.from(document.querySelectorAll("[data-logout-button]"));
const roleBadge = document.getElementById("finance-user-role");
const feeForm = document.getElementById("finance-fee-form");
const feeValueInput = document.getElementById("finance-fee-value");
const feeFeedback = document.getElementById("finance-fee-feedback");
const totalReceivedLabel = document.getElementById("finance-total-received");
const totalReceivedCountLabel = document.getElementById("finance-total-received-count");
const totalPendingLabel = document.getElementById("finance-total-pending");
const totalPendingCountLabel = document.getElementById("finance-total-pending-count");
const cashBalanceLabel = document.getElementById("finance-cash-balance");
const cashBalanceMonthLabel = document.getElementById("finance-cash-balance-month");
const previousBalanceLabel = document.getElementById("finance-previous-balance");
const previousBalanceMonthLabel = document.getElementById("finance-previous-balance-month");
const breakdownList = document.getElementById("finance-breakdown");
const breakdownEmpty = document.getElementById("finance-breakdown-empty");
const pendingSearch = document.getElementById("finance-pending-search");
const pendingTableBody = document.getElementById("finance-pending-table");
const pendingEmptyState = document.getElementById("finance-pending-empty");
const pendingToggleButton = document.getElementById("finance-pending-toggle");
const pendingSection = document.getElementById("finance-pending-body");
const pendingBackTopButton = document.getElementById("finance-pending-back-top");
const pendingCloseButton = document.getElementById("finance-pending-close");
const focusMonthSelect = document.getElementById("finance-focus-month");
const periodSelect = document.getElementById("finance-period");
const roleFilter = document.getElementById("finance-role-filter");
const exportActiveButton = document.getElementById("export-active-members");
const exportPendingButton = document.getElementById("export-pending-payments");
const openPaymentButton = document.getElementById("open-payment-modal");
const paymentDialog = document.getElementById("finance-payment-dialog");
const paymentForm = document.getElementById("finance-payment-form");
const paymentFeedback = document.getElementById("finance-payment-feedback");
const paymentMemberSelect = document.getElementById("finance-member-select");
const paymentMemberSummary = document.getElementById("finance-member-summary");
const paymentIdInput = document.getElementById("finance-payment-id");
const paymentMonthInput = document.getElementById("finance-payment-month");
const paymentMonthDisplay = document.querySelector('[data-display-for="finance-payment-month"]');
const paymentStatusSelect = document.getElementById("finance-payment-status");
const paymentAmountInput = document.getElementById("finance-payment-amount");
const paymentNotesInput = document.getElementById("finance-payment-notes");

const overallRevenueLabel = document.getElementById("overall-total-revenue");
const overallExpenseLabel = document.getElementById("overall-total-expense");
const overallBalanceLabel = document.getElementById("overall-total-balance");
const barBalanceLabel = document.getElementById("bar-total-balance");
const receiptsBody = document.getElementById("finance-receipts-body");
const receiptsList = document.getElementById("finance-receipts-list");
const receiptsEmptyState = document.getElementById("finance-receipts-empty");
const receiptsCountLabel = document.getElementById("finance-receipts-count");
const receiptsTotalLabel = document.getElementById("finance-receipts-total");
const receiptsToggleButton = document.getElementById("finance-receipts-toggle");
const receiptsSearchInput = document.getElementById("finance-receipts-search");
const receiptsBackTopButton = document.getElementById("finance-receipts-back-top");
const receiptsCloseButton = document.getElementById("finance-receipts-close");
const deleteReceiptDialog = document.getElementById("finance-delete-receipt-dialog");
const deleteReceiptForm = document.getElementById("finance-delete-receipt-form");
const deleteReceiptSummary = document.getElementById("finance-delete-receipt-summary");
const deleteGeneralDialog = document.getElementById("finance-delete-general-dialog");
const deleteGeneralForm = document.getElementById("finance-delete-general-form");
const deleteGeneralSummary = document.getElementById("finance-delete-general-summary");
const financeSummaryDialog = document.getElementById("finance-summary-dialog");
const financeSummaryTitle = document.getElementById("finance-summary-title");
const financeSummarySubtitle = document.getElementById("finance-summary-subtitle");
const financeSummaryDescription = document.getElementById("finance-summary-description");
const financeSummaryValue = document.getElementById("finance-summary-value");
const financeSummaryEmpty = document.getElementById("finance-summary-empty");
const financeSummaryList = document.getElementById("finance-summary-list");
const summaryCards = Array.from(document.querySelectorAll("[data-summary-card]"));
const duesDetailDialog = document.getElementById("finance-dues-detail-dialog");
const duesDetailTitle = document.getElementById("finance-dues-detail-title");
const duesDetailSubtitle = document.getElementById("finance-dues-detail-subtitle");
const duesDetailDescription = document.getElementById("finance-dues-detail-description");
const duesDetailEmpty = document.getElementById("finance-dues-detail-empty");
const duesDetailList = document.getElementById("finance-dues-detail-list");
const generalSectionToggle = document.getElementById("general-section-toggle");
const generalSectionBody = document.getElementById("general-section-body");
const generalSectionClose = document.getElementById("general-section-close");

const generalTransactionForm = document.getElementById("general-transaction-form");
const generalTransactionFeedback = document.getElementById("general-transaction-feedback");
const generalTransactionDateInput = document.getElementById("general-transaction-date");
const generalTransactionTypeSelect = document.getElementById("general-transaction-type");
const generalTransactionCategorySelect = document.getElementById("general-transaction-category");
const generalTransactionDescriptionInput = document.getElementById("general-transaction-description");
const generalTransactionAmountInput = document.getElementById("general-transaction-amount");
const generalTransactionNotesInput = document.getElementById("general-transaction-notes");
const generalTransactionReceiptInput = document.getElementById("general-transaction-receipt");
const generalTransactionReceiptLabel = document.getElementById("general-transaction-receipt-label");
const generalSummaryRevenue = document.getElementById("general-summary-revenue");
const generalSummaryExpense = document.getElementById("general-summary-expense");
const generalSummaryBalance = document.getElementById("general-summary-balance");
const generalSummaryDues = document.getElementById("general-summary-dues");
const generalTransactionsTable = document.getElementById("general-transactions-table");
const generalTransactionsTbody = generalTransactionsTable ? generalTransactionsTable.querySelector("tbody") : null;
const generalTransactionsEmpty = document.getElementById("general-transactions-empty");
const generalTransactionsMonthSelect = document.getElementById("general-transactions-month");
const memberSearchInput = document.getElementById("finance-member-search");

setupDrawerMenu();
syncPaymentDateDisplay();
paymentMonthInput?.addEventListener("input", syncPaymentDateDisplay);
paymentMonthInput?.addEventListener("change", syncPaymentDateDisplay);

let context = null;
let defaultFee = 30;
let financeChart = null;
let pendingPayments = [];
let breakdownData = {};
let membersIndex = [];
let membersMap = new Map();
let membersUnsubscribe = null;
let pendingPaymentsMap = new Map();
let allPayments = [];
let rawPayments = [];
let monthlyTotals = { received: 0, pending: 0, isentado: 0 };
let barTotals = { revenue: 0, expense: 0 };
let barTransactions = [];
let duesChart = null;
let revenueCompositionChart = null;
let revenueExpenseChart = null;
let balanceHistoryChart = null;
const INITIAL_PREVIOUS_BALANCE = 12102.09;
const INITIAL_PREVIOUS_BALANCE_MONTH = "2025-12";
let generalTotals = { revenue: 0, expense: 0 };
let generalTransactions = [];
let generalUnsubscribe = null;
let generalTransactionsMonthKey = currentMonthValue();
let barTotalsUnsubscribe = null;
let paymentsUnsubscribe = null;
let availableCompetences = [];
let availableReceiptMonths = [];
let focusCompetence = currentMonthValue();
let currentReceiptMonthKey = currentMonthValue();
let pendingCountByMember = new Map();
let aggregateTotals = { revenue: 0 };
let memberSearchTerm = "";
let supplementalPaymentsPromise = null;
let joinDateOverridesPromise = null;
let joinDateOverrides = new Map();
let lastPersistedPendingCount = null;
let lockedCompetence = "";
const autoInactivitySyncInFlight = new Set();
const autoInactivitySynced = new Set();
const AUTO_INACTIVITY_REASON_TAG = "[AUTO_INADIMPLENCIA]";
const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_RECEIPT_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);

function isAllowedReceiptFile(file) {
  if (!file) return true;
  if (file.type) {
    if (file.type === "application/pdf") return true;
    if (file.type.startsWith("image/")) return true;
  }
  const lowerName = (file.name || "").toLowerCase();
  return Array.from(ALLOWED_RECEIPT_EXTENSIONS).some((ext) => lowerName.endsWith(ext));
}
const MONTHLY_DUE_DAY = 12;
let pendingReceiptDeletion = null;
let pendingGeneralDeletion = null;
let receiptsSearchTerm = "";
const loadingFlags = {
  settings: false,
  members: false,
  payments: false,
  bar: false,
  general: false,
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

bindState("context", () => context, (value) => { context = value; });
bindState("defaultFee", () => defaultFee, (value) => { defaultFee = value; });
bindState("financeChart", () => financeChart, (value) => { financeChart = value; });
bindState("pendingPayments", () => pendingPayments, (value) => { pendingPayments = value; });
bindState("breakdownData", () => breakdownData, (value) => { breakdownData = value; });
bindState("membersIndex", () => membersIndex, (value) => { membersIndex = value; });
bindState("membersMap", () => membersMap, (value) => { membersMap = value; });
bindState("membersUnsubscribe", () => membersUnsubscribe, (value) => { membersUnsubscribe = value; });
bindState("pendingPaymentsMap", () => pendingPaymentsMap, (value) => { pendingPaymentsMap = value; });
bindState("allPayments", () => allPayments, (value) => { allPayments = value; });
bindState("rawPayments", () => rawPayments, (value) => { rawPayments = value; });
bindState("monthlyTotals", () => monthlyTotals, (value) => { monthlyTotals = value; });
bindState("barTotals", () => barTotals, (value) => { barTotals = value; });
bindState("barTransactions", () => barTransactions, (value) => { barTransactions = value; });
bindState("duesChart", () => duesChart, (value) => { duesChart = value; });
bindState("revenueCompositionChart", () => revenueCompositionChart, (value) => { revenueCompositionChart = value; });
bindState("revenueExpenseChart", () => revenueExpenseChart, (value) => { revenueExpenseChart = value; });
bindState("balanceHistoryChart", () => balanceHistoryChart, (value) => { balanceHistoryChart = value; });
bindState("generalTotals", () => generalTotals, (value) => { generalTotals = value; });
bindState("generalTransactions", () => generalTransactions, (value) => { generalTransactions = value; });
bindState("generalUnsubscribe", () => generalUnsubscribe, (value) => { generalUnsubscribe = value; });
bindState("barTotalsUnsubscribe", () => barTotalsUnsubscribe, (value) => { barTotalsUnsubscribe = value; });
bindState("paymentsUnsubscribe", () => paymentsUnsubscribe, (value) => { paymentsUnsubscribe = value; });
bindState("availableCompetences", () => availableCompetences, (value) => { availableCompetences = value; });
bindState("availableReceiptMonths", () => availableReceiptMonths, (value) => { availableReceiptMonths = value; });
bindState("focusCompetence", () => focusCompetence, (value) => { focusCompetence = value; });
bindState("currentReceiptMonthKey", () => currentReceiptMonthKey, (value) => { currentReceiptMonthKey = value; });
bindState("pendingCountByMember", () => pendingCountByMember, (value) => { pendingCountByMember = value; });
bindState("aggregateTotals", () => aggregateTotals, (value) => { aggregateTotals = value; });
bindState("memberSearchTerm", () => memberSearchTerm, (value) => { memberSearchTerm = value; });
bindState("supplementalPaymentsPromise", () => supplementalPaymentsPromise, (value) => { supplementalPaymentsPromise = value; });
bindState("joinDateOverridesPromise", () => joinDateOverridesPromise, (value) => { joinDateOverridesPromise = value; });
bindState("joinDateOverrides", () => joinDateOverrides, (value) => { joinDateOverrides = value; });
bindState("lastPersistedPendingCount", () => lastPersistedPendingCount, (value) => { lastPersistedPendingCount = value; });
bindState("lockedCompetence", () => lockedCompetence, (value) => { lockedCompetence = value; });
bindState("pendingReceiptDeletion", () => pendingReceiptDeletion, (value) => { pendingReceiptDeletion = value; });
bindState("receiptsSearchTerm", () => receiptsSearchTerm, (value) => { receiptsSearchTerm = value; });
bindState("loadingFlags", () => loadingFlags, (value) => {
  if (value && typeof value === "object") {
    Object.assign(loadingFlags, value);
  }
});

function setPageLoading(isLoading) {
  document.body.classList.toggle("page-loading", isLoading);
}

function updatePageLoading() {
  const done = Object.values(loadingFlags).every(Boolean);
  setPageLoading(!done);
}

function notify(type, message) {
  if (window.toast && typeof window.toast[type] === "function") {
    window.toast[type](message);
    return;
  }
  alert(message);
}

function initializeCurrencyInputs() {
  [feeValueInput, paymentAmountInput, generalTransactionAmountInput].forEach((field) => {
    applyCurrencyMask(field);
  });
}

function updateReceiptLabel() {
  if (!generalTransactionReceiptLabel) return;
  const fileName = generalTransactionReceiptInput?.files?.[0]?.name || "Nenhum arquivo selecionado";
  generalTransactionReceiptLabel.textContent = fileName;
}

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

function setFormEnabled(form, enabled, feedbackElement, disabledMessage = "") {
  if (!form) return;
  const fields = form.querySelectorAll("input, select, button, textarea");
  fields.forEach((field) => {
    field.disabled = !enabled;
  });
  if (!enabled) {
    form.classList.add("opacity-60", "pointer-events-none");
    if (feedbackElement && disabledMessage) {
      if (window.setFeedback) {
        window.setFeedback(feedbackElement, disabledMessage, "info", { persist: true });
      } else {
        feedbackElement.textContent = disabledMessage;
      }
    }
  } else {
    form.classList.remove("opacity-60", "pointer-events-none");
    if (feedbackElement && feedbackElement.dataset.persist !== "true") {
      if (window.setFeedback) {
        window.setFeedback(feedbackElement, "", "info");
      } else {
        feedbackElement.textContent = "";
      }
    }
  }
}

function toggleButtonEnabled(button, enabled) {
  if (!button) return;
  button.disabled = !enabled;
  button.classList.toggle("opacity-60", !enabled);
  button.classList.toggle("pointer-events-none", !enabled);
}

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

(async function init() {
  setPageLoading(true);
  context = await requireAuth({
    allowedRoles: ["admin", "diretor", "financeiro", "imprensa", "socio", "tesoureiro", "visitante", "crianca"]
  });
  if (roleBadge) {
    roleBadge.textContent = getUserHeaderLabel(context.profile);
    roleBadge.classList.remove("hidden");
  }
  configurePermissions();
  try {
    await loadSettings();
  } finally {
    loadingFlags.settings = true;
    updatePageLoading();
  }
  await loadJoinDateOverrides();
  initializeCurrencyInputs();
  generalTransactionReceiptInput?.addEventListener("change", updateReceiptLabel);
  updateReceiptLabel();
  applyDateMask(generalTransactionDateInput);
  subscribeToMembers();
  subscribeBarTotals();
  subscribeGeneralTransactions();
  subscribePayments();
  refreshFinanceData();
  attachListeners();
})();

function configurePermissions() {
  setFormEnabled(
    feeForm,
    ["admin", "financeiro"].includes(context.profile.role),
    feeFeedback,
    "Somente administradores ou financeiro podem alterar o valor padrão da mensalidade."
  );
  setFormEnabled(
    generalTransactionForm,
    ["admin", "financeiro"].includes(context.profile.role),
    generalTransactionFeedback,
    "Somente administradores ou financeiro podem registrar movimentações gerais."
  );
  if (openPaymentButton) {
    const enabled = ["admin", "financeiro"].includes(context.profile.role);
    toggleButtonEnabled(openPaymentButton, enabled);
  }
}

async function loadSettings() {
  const docSnap = await getDoc(doc(db, "settings", "finance"));
  if (docSnap.exists()) {
    defaultFee = docSnap.data().defaultMonthlyFee || defaultFee;
  } else {
    await setDoc(doc(db, "settings", "finance"), { defaultMonthlyFee: defaultFee });
  }
  if (feeValueInput) {
    feeValueInput.value = formatCurrencyInputValue(defaultFee);
  }
  updatePreviousMonthBalance();
}

function attachListeners() {
  const requestDialogClose = (dialog) => {
    if (!dialog || !dialog.open) return;
    if (dialog.dataset.closing === "true") return;
    dialog.dataset.closing = "true";
    dialog.classList.add("closing");
    setTimeout(() => {
      dialog.classList.remove("closing");
      dialog.dataset.closing = "false";
      dialog.close();
    }, 200);
  };

  feeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = parseCurrency(feeValueInput.value);
    if (!Number.isFinite(value) || value < 0) {
      if (window.setFeedback) {
        window.setFeedback(feeFeedback, "Informe um valor válido.", "error");
      } else {
        feeFeedback.textContent = "Informe um valor válido.";
      }
      return;
    }
    try {
      await setDoc(doc(db, "settings", "finance"), { defaultMonthlyFee: value }, { merge: true });
      defaultFee = value;
      if (feeValueInput) {
        feeValueInput.value = formatCurrencyInputValue(defaultFee);
      }
      if (window.setFeedback) {
        window.setFeedback(feeFeedback, "Mensalidade atualizada com sucesso.", "success");
        setTimeout(() => window.setFeedback(feeFeedback, "", "info"), 4000);
      } else {
        feeFeedback.textContent = "Mensalidade atualizada com sucesso.";
        setTimeout(() => (feeFeedback.textContent = ""), 4000);
      }
      refreshFinanceData();
    } catch (error) {
      console.error(error);
      if (window.setFeedback) {
        window.setFeedback(feeFeedback, "Não foi possível atualizar o valor. Tente novamente.", "error");
      } else {
        feeFeedback.textContent = "Não foi possível atualizar o valor. Tente novamente.";
      }
    }
  });

  periodSelect?.addEventListener("change", refreshFinanceData);
  focusMonthSelect?.addEventListener("change", () => {
    focusCompetence = focusMonthSelect.value || currentMonthValue();
    refreshFinanceData();
  });
  generalTransactionsMonthSelect?.addEventListener("change", () => {
    generalTransactionsMonthKey = generalTransactionsMonthSelect.value || "";
    renderGeneralTransactions();
  });
  memberSearchInput?.addEventListener("input", debounce(() => {
    memberSearchTerm = memberSearchInput.value;
    refreshFinanceData();
  }, 250));
  pendingToggleButton?.addEventListener("click", () => {
    if (!pendingSection) return;
    const isHidden = pendingSection.classList.toggle("hidden");
    if (pendingToggleButton) {
      pendingToggleButton.textContent = isHidden ? "Abrir lista" : "Fechar lista";
      pendingToggleButton.setAttribute("aria-expanded", isHidden ? "false" : "true");
    }
  });
  pendingBackTopButton?.addEventListener("click", () => {
    pendingSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  pendingCloseButton?.addEventListener("click", () => {
    if (!pendingSection || !pendingToggleButton) return;
    pendingSection.classList.add("hidden");
    pendingToggleButton.textContent = "Abrir lista";
    pendingToggleButton.setAttribute("aria-expanded", "false");
    pendingToggleButton.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  roleFilter?.addEventListener("change", refreshFinanceData);
  pendingSearch?.addEventListener("input", debounce(renderPendingTable, 250));
  receiptsToggleButton?.addEventListener("click", () => {
    if (!receiptsBody) return;
    const isHidden = receiptsBody.classList.toggle("hidden");
    if (receiptsToggleButton) {
      receiptsToggleButton.textContent = isHidden ? "Abrir lista" : "Fechar lista";
      receiptsToggleButton.setAttribute("aria-expanded", isHidden ? "false" : "true");
    }
  });
  receiptsSearchInput?.addEventListener("input", debounce(() => {
    receiptsSearchTerm = receiptsSearchInput.value;
    renderReceiptsSummary(allPayments);
  }, 250));
  receiptsBackTopButton?.addEventListener("click", () => {
    receiptsList?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  receiptsCloseButton?.addEventListener("click", () => {
    if (!receiptsBody || !receiptsToggleButton) return;
    receiptsBody.classList.add("hidden");
    receiptsToggleButton.textContent = "Abrir lista";
    receiptsToggleButton.setAttribute("aria-expanded", "false");
    receiptsToggleButton.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  generalSectionToggle?.addEventListener("click", () => {
    if (!generalSectionBody || !generalSectionToggle) return;
    const isHidden = generalSectionBody.classList.toggle("hidden");
    generalSectionToggle.textContent = isHidden ? "Abrir" : "Fechar";
    generalSectionToggle.setAttribute("aria-expanded", isHidden ? "false" : "true");
  });
  generalSectionClose?.addEventListener("click", () => {
    if (!generalSectionBody || !generalSectionToggle) return;
    generalSectionBody.classList.add("hidden");
    generalSectionToggle.textContent = "Abrir";
    generalSectionToggle.setAttribute("aria-expanded", "false");
    generalSectionToggle.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  receiptsList?.addEventListener("click", async (event) => {
    const toggleButton = event.target.closest("[data-action='toggle-receipts-member']");
    if (toggleButton && receiptsList?.contains(toggleButton)) {
      const container = toggleButton.closest("li");
      const details = container?.querySelector("[data-receipts-details]");
      if (details) {
        const isHidden = details.classList.toggle("hidden");
        toggleButton.setAttribute("aria-expanded", isHidden ? "false" : "true");
      }
      return;
    }
    const button = event.target.closest("[data-action='delete-receipt']");
    if (!button || !receiptsList?.contains(button)) return;
    if (!context || !["admin", "financeiro"].includes(context.profile.role)) {
      notify("error", "Somente administradores ou financeiro podem excluir payments.");
      return;
    }
    const idDocumento = button.dataset.docId || "";
    const idSocio = button.dataset.memberId || "";
    const competence = button.dataset.competence || "";
    const memberName = button.dataset.memberName || "sócio";
    if (!idDocumento) return;
    pendingReceiptDeletion = { docId: idDocumento, memberId: idSocio, competence: competence };
    if (deleteReceiptSummary) {
      const rotuloCompetencia = competence ? formatCompetence(competence) : "competência não informada";
      deleteReceiptSummary.textContent = `Excluir pagamento de ${memberName} (${rotuloCompetencia}). Essa ação estorna o valor e restaura a pendência.`;
    }
    deleteReceiptDialog?.showModal();
  });

  exportActiveButton?.addEventListener("click", exportActiveMembers);
  exportPendingButton?.addEventListener("click", exportPendingPaymentsCsv);

  openPaymentButton?.addEventListener("click", () => {
    if (!context || !["admin", "financeiro"].includes(context.profile.role)) {
      notify("error", "Somente administradores ou financeiro podem registrar payments.");
      return;
    }
    openPaymentDialog();
  });

  paymentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handlePaymentSubmit();
  });

  paymentMemberSelect?.addEventListener("change", () => {
    updatePaymentMemberSummary(paymentMemberSelect.value, { forceAmount: true });
  });

  document
    .querySelectorAll("#finance-payment-dialog [data-action='close']")
    .forEach((button) => button.addEventListener("click", () => requestDialogClose(paymentDialog)));

  paymentDialog?.addEventListener("close", resetPaymentForm);

  document
    .querySelectorAll("#finance-delete-receipt-dialog [data-action='close']")
    .forEach((button) => button.addEventListener("click", () => requestDialogClose(deleteReceiptDialog)));
  document
    .querySelectorAll("#finance-delete-general-dialog [data-action='close']")
    .forEach((button) => button.addEventListener("click", () => requestDialogClose(deleteGeneralDialog)));
  document
    .querySelectorAll("#finance-summary-dialog [data-action='close']")
    .forEach((button) => button.addEventListener("click", () => requestDialogClose(financeSummaryDialog)));
  document
    .querySelectorAll("#finance-dues-detail-dialog [data-action='close']")
    .forEach((button) => button.addEventListener("click", () => requestDialogClose(duesDetailDialog)));
  deleteReceiptDialog?.addEventListener("close", () => {
    pendingReceiptDeletion = null;
    if (deleteReceiptForm) deleteReceiptForm.reset();
  });
  deleteGeneralDialog?.addEventListener("close", () => {
    pendingGeneralDeletion = null;
    if (deleteGeneralForm) deleteGeneralForm.reset();
  });
  financeSummaryDialog?.addEventListener("click", (event) => {
    if (event.target === financeSummaryDialog) requestDialogClose(financeSummaryDialog);
  });
  duesDetailDialog?.addEventListener("click", (event) => {
    if (event.target === duesDetailDialog) requestDialogClose(duesDetailDialog);
  });
  summaryCards.forEach((card) => {
    const openHandler = () => openSummaryDialog(card.dataset.summaryCard);
    card.addEventListener("click", openHandler);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openHandler();
      }
    });
  });
  deleteReceiptForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingReceiptDeletion) return;
    const { docId, memberId, competence } = pendingReceiptDeletion;
    if (!docId) return;
    const submitButton = deleteReceiptForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Excluindo...";
    }
    try {
      await deleteDoc(doc(db, "payments", docId));
      if (memberId && competence) {
        await deleteDoc(doc(db, "members", memberId, "payments", competence));
      }
      deleteReceiptDialog?.close();
    } catch (error) {
      console.error("Erro ao excluir pagamento:", error);
      notify("error", "Não foi possível excluir o pagamento. Tente novamente.");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Excluir";
      }
    }
  });

  deleteGeneralForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingGeneralDeletion?.id) return;
    const submitButton = deleteGeneralForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Excluindo...";
    }
    try {
      const docRef = doc(db, "generalTransactions", pendingGeneralDeletion.id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        notify("error", "Movimentação não encontrada.");
        return;
      }
      const data = snapshot.data() || {};
      const attachmentPath =
        data.attachment?.path ||
        data.attachmentPath ||
        "";
      await deleteDoc(docRef);
      if (attachmentPath) {
        await deleteObject(ref(storage, attachmentPath)).catch(() => {});
      }
      generalTransactions = generalTransactions.filter((tx) => tx.id !== pendingGeneralDeletion.id);
      renderGeneralSummary();
      renderGeneralTransactions();
      renderFinanceInsights();
      updatePreviousMonthBalance();
      deleteGeneralDialog?.close();
    } catch (error) {
      console.error("Erro ao excluir movimentação geral:", error);
      notify("error", "Não foi possível excluir a movimentação.");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Excluir";
      }
    }
  });
  generalTransactionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!context || !["admin", "financeiro"].includes(context.profile.role)) {
      if (window.setFeedback) {
        window.setFeedback(
          generalTransactionFeedback,
          "Você não tem permissão para registrar essa movimentação.",
          "error",
        );
      } else {
        generalTransactionFeedback.textContent = "Você não tem permissão para registrar essa movimentação.";
      }
      return;
    }
    try {
      await registerGeneralTransaction();
      if (window.setFeedback) {
        window.setFeedback(generalTransactionFeedback, "Movimentação registrada com sucesso.", "success");
        setTimeout(() => window.setFeedback(generalTransactionFeedback, "", "info"), 4000);
      } else {
        generalTransactionFeedback.textContent = "Movimentação registrada com sucesso.";
        setTimeout(() => (generalTransactionFeedback.textContent = ""), 4000);
      }
      generalTransactionForm.reset();
      if (generalTransactionReceiptInput) {
        generalTransactionReceiptInput.value = "";
      }
    } catch (error) {
      console.error(error);
      const fallbackMessage = error?.message || "Não foi possível registrar. Verifique os dados e tente novamente.";
      if (window.setFeedback) {
        window.setFeedback(generalTransactionFeedback, fallbackMessage, "error");
      } else {
        generalTransactionFeedback.textContent = fallbackMessage;
      }
    }
  });

  pendingTableBody?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, id, target } = button.dataset;
    if (action === "toggle-details" && target) {
      const detailRow = pendingTableBody.querySelector(`tr[data-target="${target}"]`);
      if (detailRow) {
        detailRow.classList.toggle("hidden");
        button.textContent = detailRow.classList.contains("hidden") ? "Detalhar" : "Ocultar";
      }
      return;
    }
    if (action === "receive" && id) {
      if (!context || !["admin", "financeiro"].includes(context.profile.role)) {
        notify("error", "Somente administradores ou financeiro podem registrar payments.");
        return;
      }
      const payment = pendingPaymentsMap.get(id);
      if (payment) {
        openPaymentDialog({
          docId: payment.docId || "",
          memberId: payment.memberId,
          competence: payment.competence,
          status: "pago",
          amount: payment.amount,
          notes: payment.notes || "",
        });
      }
    }
  });

  generalTransactionsTable?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (!["admin", "financeiro"].includes(context.profile.role)) {
      notify("error", "Somente administradores ou financeiro podem excluir movimentações.");
      return;
    }
    const action = button.dataset.action;
    if (action === "delete-general") {
      const { id: idMovimentacao } = button.dataset;
      if (!idMovimentacao) return;
      let summaryText = "Essa ação remove o lançamento do saldo.";
      if (button.closest("tr")) {
        const cells = button.closest("tr").querySelectorAll("td");
        const dateText = (cells[1]?.textContent || "").trim();
        const descriptionText = (cells[4]?.textContent || "").trim();
        const amountText = (cells[5]?.textContent || "").trim();
        if (descriptionText || amountText) {
          summaryText = `${descriptionText || "Lançamento"}${amountText ? ` • ${amountText}` : ""}${dateText ? ` • ${dateText}` : ""}`;
        }
      }
      pendingGeneralDeletion = { id: idMovimentacao, summaryText };
      if (deleteGeneralSummary) {
        deleteGeneralSummary.textContent = summaryText;
      }
      deleteGeneralDialog?.showModal();
      return;
    }
    if (action === "delete-payment") {
      const idDocumento = button.dataset.docId || "";
      const idSocio = button.dataset.memberId || "";
      const competence = button.dataset.competence || "";
      const memberName = button.dataset.memberName || "sócio";
      if (!idDocumento) return;
      pendingReceiptDeletion = { docId: idDocumento, memberId: idSocio, competence: competence };
      if (deleteReceiptSummary) {
        const rotuloCompetencia = competence ? formatCompetence(competence) : "competência não informada";
        deleteReceiptSummary.textContent = `Excluir pagamento de ${memberName} (${rotuloCompetencia}). Essa ação estorna o valor e restaura a pendência.`;
      }
      deleteReceiptDialog?.showModal();
    }
  });
}

function subscribeToMembers() {
  if (membersUnsubscribe) membersUnsubscribe();
  const membersRef = collection(db, "members");
  const membersQuery = query(membersRef, orderBy("name", "asc"));
  membersUnsubscribe = onSnapshot(membersQuery, (snapshot) => {
    membersIndex = snapshot.docs.map((docSnap) => {
      const data = { id: docSnap.id, ...docSnap.data() };
      return applyJoinDateOverride(data);
    });
    membersMap = new Map(membersIndex.map((member) => [member.id, member]));
    renderMemberOptions();
    refreshFinanceData();
    loadingFlags.members = true;
    updatePageLoading();
  }, (error) => {
    console.error("Erro ao carregar sócios:", error);
    loadingFlags.members = true;
    updatePageLoading();
  });
}

function subscribeBarTotals() {
  if (barTotalsUnsubscribe) barTotalsUnsubscribe();
  const barRef = collection(db, "barTransactions");
  const barQuery = query(barRef);
  barTotalsUnsubscribe = onSnapshot(
    barQuery,
    (snapshot) => {
      let revenue = 0;
      let expense = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const total = Number(data.totalValue || 0);
        if (data.type === "entrada") {
          revenue += total;
        } else {
          expense += total;
        }
      });
      barTransactions = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      barTotals = { revenue: revenue, expense: expense };
      updateOverallTotals();
      renderFinanceInsights();
      updatePreviousMonthBalance();
      loadingFlags.bar = true;
      updatePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar totais do bar:", error);
      barTotals = { revenue: 0, expense: 0 };
      barTransactions = [];
      updateOverallTotals();
      renderFinanceInsights();
      updatePreviousMonthBalance();
      loadingFlags.bar = true;
      updatePageLoading();
    },
  );
}

function subscribeGeneralTransactions() {
  if (!generalTransactionsTable && !generalSummaryRevenue) return;
  if (generalUnsubscribe) generalUnsubscribe();
  const generalRef = collection(db, "generalTransactions");
  const generalQuery = query(generalRef, orderBy("date", "desc"));
  generalUnsubscribe = onSnapshot(
    generalQuery,
    (snapshot) => {
      generalTransactions = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      renderGeneralSummary();
      renderGeneralTransactions();
      renderFinanceInsights();
      updatePreviousMonthBalance();
      loadingFlags.general = true;
      updatePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar despesas gerais:", error);
      generalTransactions = [];
      renderGeneralSummary();
      renderGeneralTransactions("Não foi possível carregar as despesas gerais.");
      renderFinanceInsights();
      updatePreviousMonthBalance();
      loadingFlags.general = true;
      updatePageLoading();
    },
  );
}

function subscribePayments() {
  if (paymentsUnsubscribe) paymentsUnsubscribe();
  const paymentsRef = collection(db, "payments");
  const paymentsQuery = query(paymentsRef, orderBy("competence", "asc"));
  paymentsUnsubscribe = onSnapshot(
    paymentsQuery,
    (snapshot) => {
      const payments = snapshot.docs.map((docSnap) => ({
        docId: docSnap.id,
        ...docSnap.data(),
      }));
      rawPayments = payments;
      refreshFinanceData();
      loadingFlags.payments = true;
      updatePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar mensalidades:", error);
      rawPayments = [];
      refreshFinanceData();
      loadingFlags.payments = true;
      updatePageLoading();
    },
  );
}

function refreshFinanceData() {
  const rawMonths = Number(periodSelect?.value);
  const months = Number.isFinite(rawMonths) && rawMonths > 0 ? rawMonths : 1;
  const role = roleFilter?.value || "";
  const startCompetence = competenceMonthsAgo(months - 1);
  const normalizedPayments = rawPayments
    .map((data) => {
      const competence = normalizeCompetenceValue(data.competence);
      const status = normalizeStatusValue(data.status);
      const amount = normalizeAmountValue(data.amount, defaultFee);
      const chave = `${data.memberId || data.docId}|${competence || ""}`;
      const member = data.memberId ? membersMap.get(data.memberId) : null;
      const primeiraCompetenciaPermitida = member ? resolveFirstChargeCompetence(member) : CLUB_START_COMPETENCE;
      if (
        status === "pendente" &&
        competence &&
        primeiraCompetenciaPermitida &&
        competence < primeiraCompetenciaPermitida
      ) {
        return null;
      }
      return {
        id: chave,
        docId: data.docId,
        memberId: data.memberId,
        memberName: data.memberName,
      memberRole: data.memberRole,
      competence,
      status,
      notes: data.notes || "",
      amount,
        updatedAt: data.updatedAt || null,
        synthetic: false,
      };
    })
    .filter(Boolean);
  const autoInactiveCandidates = collectMembersForAutoInactivity(normalizedPayments);
  void syncMembersAutoInactivity(autoInactiveCandidates);

  const basePayments = normalizedPayments;

  allPayments = enrichPayments(basePayments);
  availableCompetences = Array.from(
    new Set(
      allPayments
        .map((item) => item.competence)
        .filter(Boolean),
    ),
  ).sort((a, b) => b.localeCompare(a));
  availableReceiptMonths = Array.from(
    new Set(
      allPayments
        .filter((item) => item.status === "pago")
        .map((item) => paymentMonthKey(item)),
    ),
  )
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
  updateFocusMonthOptions();

  const dentroDoPeriodo = (item) => {
    if (!item.competence) return true;
    return months <= 0 || item.competence >= startCompetence;
  };

  const periodPayments = allPayments.filter(dentroDoPeriodo);

  const paymentsForView = role
    ? periodPayments.filter((item) => item.memberRole === role)
    : [...periodPayments];

  const scopedPayments = applyMemberSearchFilter(paymentsForView);

  aggregateTotals = {
    revenue: allPayments
      .filter((item) => item.status === "pago")
      .reduce((sum, item) => sum + (item.amount || defaultFee), 0),
  };

  const targetCompetence = focusCompetence || currentMonthValue();
  const focusPayments = scopedPayments.filter((item) => item.competence === targetCompetence);
  const totalPendingAll = allPayments
    .filter((item) => item.status === "pendente")
    .reduce((sum, item) => sum + (item.amount || defaultFee), 0);
  const receiptMonth = normalizeCompetenceValue(targetCompetence || currentMonthValue());
  currentReceiptMonthKey = receiptMonth;
  computeFinancialCards(allPayments, receiptMonth, totalPendingAll);
  computeBreakdown(scopedPayments);
  renderChart(scopedPayments, months);
  renderGeneralSummary();
  const filteredForPending = (role ? scopedPayments.filter((item) => item.memberRole === role) : scopedPayments).filter(
    (item) => shouldDisplayInPending(item),
  );
  const pendingOnly = scopedPayments.filter((item) => item.status === "pendente");
  pendingPayments = applyMemberSearchFilter(filteredForPending);
  pendingCountByMember = buildPendingCountMap(pendingOnly);
  persistPendingMembersCount(pendingCountByMember.size);
  renderPendingTable();
  renderReceiptsSummary(allPayments);
  renderFinanceInsights();
  updatePreviousMonthBalance();
}

function applyMemberSearchFilter(collection) {
  if (!Array.isArray(collection)) return [];
  const tokens = getSearchTokens(memberSearchTerm);
  if (!tokens.length) return [...collection];
  return collection.filter((item) => {
    const name = item.memberName || "";
    const role = item.memberRole || "";
    return matchesSearchTokens(name, tokens) || matchesSearchTokens(role, tokens);
  });
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
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

function shouldDisplayInPending(entry, referenceDate = new Date()) {
  const status = normalizeStatusValue(entry.status);
  if (status === "pendente") return true;
  if (status !== "pago" && status !== "isentado") return false;

  const competence = normalizeCompetenceValue(entry.competence);
  if (!competence) return false;

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const prevMonth = competenceMonthsAgo(1);
  const withinGrace = today.getDate() <= MONTHLY_DUE_DAY;

  return withinGrace && competence === prevMonth;
}

function computeFinancialCards(payments, receiptMonth, globalPending = 0) {
  const competenceTotals = computeCompetenceTotals(payments, receiptMonth);
  const cashTotals = computeCashTotals(payments, receiptMonth);
  totalReceivedLabel.textContent = formatCurrency(competenceTotals.received);
  totalPendingLabel.textContent = formatCurrency(globalPending);
  cashBalanceLabel.textContent = formatCurrency(cashTotals.received);
  if (totalReceivedCountLabel) {
    const receivedCount = computeMonthlyCounts(payments, receiptMonth).received;
    totalReceivedCountLabel.textContent = `${receivedCount} mensalidade(s) recebida(s)`;
  }
  if (totalPendingCountLabel) {
    const pendingCount = computeMonthlyCounts(payments, receiptMonth).pending;
    totalPendingCountLabel.textContent = `${pendingCount} mensalidade(s) pendente(s)`;
  }
  if (cashBalanceMonthLabel) {
    cashBalanceMonthLabel.textContent = formatMonthLong(receiptMonth);
  }
  monthlyTotals = computeMonthlyCounts(payments, receiptMonth);
  updateOverallTotals();
  renderDuesChart();
}

function computeBreakdown(payments) {
  const roles = {};
  payments.forEach((item) => {
    const bucket = (roles[item.memberRole] ||= { received: 0, pending: 0, count: 0 });
    if (item.status === "pago") {
      bucket.received += item.amount || defaultFee;
    }
    if (item.status === "pendente") {
      bucket.pending += item.amount || defaultFee;
    }
    bucket.count += 1;
  });
  breakdownData = roles;
  renderBreakdown();
}

function computeCompetenceTotals(payments, monthKey) {
  const targetMonth = normalizeCompetenceValue(monthKey || currentMonthValue());
  const totals = { received: 0, isentado: 0, anticipated: 0 };
  payments.forEach((item) => {
    const status = normalizeStatusValue(item.status);
    if (status !== "pago" && status !== "isentado") return;
    const competence = normalizeCompetenceValue(item.competence);
    if (competence !== targetMonth) return;
    const value = item.amount || defaultFee;
    if (status === "pago") {
      totals.received += value;
    } else if (status === "isentado") {
      totals.isentado += value;
    }
  });
  return totals;
}

function computeCashTotals(payments, monthKey) {
  const targetMonth = normalizeCompetenceValue(monthKey || currentMonthValue());
  const totals = { received: 0, isentado: 0 };
  const duesReceived = sumDuesByMonth(targetMonth);
  const isJanuary = targetMonth.endsWith("-01");
  const generalMonthTotals = isJanuary ? { revenue: 0 } : sumGeneralTotalsByMonth(targetMonth);
  totals.received = duesReceived + generalMonthTotals.revenue;
  return totals;
}

function getAnticipatedPaymentsForMonth(payments, monthKey) {
  const targetMonth = normalizeCompetenceValue(monthKey || currentMonthValue());
  return payments
    .filter((item) => {
      if (normalizeStatusValue(item.status) !== "pago") return false;
      const paymentMonth = paymentMonthKey(item);
      const competence = normalizeCompetenceValue(item.competence);
      return paymentMonth === targetMonth && competence && competence > paymentMonth;
    })
    .map((item) => {
      return {
        memberKey: item.memberId || `name:${(item.memberName || "").toLowerCase().trim()}`,
        memberName: item.memberName || "Sócio sem nome",
        competence: normalizeCompetenceValue(item.competence),
        amount: item.amount || defaultFee,
      };
    })
    .sort((a, b) => (a.memberName || "").localeCompare(b.memberName || ""));
}

function openSummaryDialog(type) {
  if (!financeSummaryDialog || !financeSummaryValue || !financeSummaryTitle || !financeSummaryDescription) return;
  const targetMonth = currentReceiptMonthKey || currentMonthValue();
  const monthLabel = formatCompetence(targetMonth);
  const currentMonthLabel = formatCompetence(currentMonthValue());
  const accentClasses = ["summary-accent-green", "summary-accent-amber", "summary-accent-blue", "summary-accent-red"];
  financeSummaryDialog.classList.remove(...accentClasses);
  const accentByType = {
    entries: "summary-accent-green",
    expenses: "summary-accent-red",
    balance: "summary-accent-blue",
    bar: "summary-accent-amber",
    "previous-balance": "summary-accent-blue",
    "cash-month": "summary-accent-blue",
    "total-received": "summary-accent-amber",
    "pending-total": "summary-accent-amber",
    "general-revenue": "summary-accent-green",
    "general-expense": "summary-accent-red",
    "general-balance": "summary-accent-blue",
  };
  const accentClass = accentByType[type];
  if (accentClass) {
    financeSummaryDialog.classList.add(accentClass);
  }
  const definitions = {
    entries: {
      title: "Outras entradas",
      subtitle: `Receitas gerais de ${currentMonthLabel}`,
      description: "Entradas gerais registradas no mês atual (mensalidades fora).",
      value: overallRevenueLabel?.textContent || "R$ 0,00",
    },
    expenses: {
      title: "Despesas gerais",
      subtitle: "Despesas gerais",
      description: "Movimentações gerais de saída registradas no sistema.",
      value: overallExpenseLabel?.textContent || "R$ 0,00",
    },
    balance: {
      title: "Saldo geral",
      subtitle: "Entradas - saídas",
      description: "Detalhamento do saldo geral (bar excluído).",
      value: overallBalanceLabel?.textContent || "R$ 0,00",
    },
    bar: {
      title: "Saldo do bar",
      subtitle: "Entradas - saídas",
      description: "Resumo do bar considerando entradas e saídas.",
      value: barBalanceLabel?.textContent || "R$ 0,00",
    },
    "previous-balance": {
      title: `Saldo de fechamento de ${formatMonthLong(previousMonthKey())}`,
      subtitle: "Entradas - saídas (sem bar)",
      description: "Detalhamento das entradas e saídas que formaram o saldo de fechamento do mês anterior.",
      value: previousBalanceLabel?.textContent || "R$ 0,00",
    },
    "cash-month": {
      title: `Saldo do mês de ${monthLabel}`,
      subtitle: `Entradas de ${monthLabel}`,
      description: "Total de entradas do mês (mensalidades recebidas, incluindo antecipadas, + entradas gerais). Bar fora.",
      value: cashBalanceLabel?.textContent || "R$ 0,00",
    },
    "total-received": {
      title: "Total de mensalidades recebidas no mês",
      subtitle: `Mensalidades de ${monthLabel}`,
      description: "Mensalidades pagas com competência no mês selecionado.",
      value: totalReceivedLabel?.textContent || "R$ 0,00",
    },
    "pending-total": {
      title: "Mensalidades pendentes no mês",
      subtitle: "Pendências do mês",
      description: "Mensalidades pendentes registradas no sistema.",
      value: totalPendingLabel?.textContent || "R$ 0,00",
    },
    "general-revenue": {
      title: "Receitas (mensalidades e extras)",
      subtitle: "Mensalidades + extras",
      description: "Detalhamento das receitas gerais e mensalidades registradas.",
      value: generalSummaryRevenue?.textContent || "R$ 0,00",
    },
    "general-expense": {
      title: "Despesas do clube",
      subtitle: "Saídas gerais",
      description: "Detalhamento das despesas gerais registradas.",
      value: generalSummaryExpense?.textContent || "R$ 0,00",
    },
    "general-balance": {
      title: "Saldo",
      subtitle: "Receitas - despesas",
      description: "Resumo do saldo considerando receitas e despesas do clube.",
      value: generalSummaryBalance?.textContent || "R$ 0,00",
    },
  };
  const info = definitions[type] || definitions.entries;
  financeSummaryTitle.textContent = info.title;
  if (financeSummarySubtitle) financeSummarySubtitle.textContent = info.subtitle;
  financeSummaryDescription.textContent = info.description;
  financeSummaryValue.textContent = info.value;
  renderSummaryDetails(type);
  financeSummaryDialog.showModal();
}

function renderSummaryDetails(type) {
  if (!financeSummaryList || !financeSummaryEmpty) return;
  financeSummaryList.innerHTML = "";
  const items = [];
  const isLegacyCarryOver = (tx) => {
    const desc = (tx?.description || "").toString().trim().toLowerCase();
    return desc === "caixa proveniente de 2025";
  };
  if (type === "entries") {
    const currentMonthKey = currentMonthValue();
    generalTransactions
      .filter((tx) => tx.type === "entrada")
      .filter((tx) => !isLegacyCarryOver(tx))
      .filter((tx) => monthKeyFromDate(tx.date || tx.createdAt) === currentMonthKey)
      .forEach((tx) => {
        const title = tx.description || formatGeneralCategory(tx.category);
        items.push({
          label: `${formatDate(tx.date || tx.createdAt)} • ${title}`,
          value: formatCurrency(Number(tx.amount || 0)),
        });
      });
  } else if (type === "cash-month") {
    const targetMonth = currentReceiptMonthKey || currentMonthValue();
    const paidEntries = allPayments
      .filter((item) => normalizeStatusValue(item.status) === "pago")
      .filter((item) => paymentMonthKey(item) === targetMonth)
      .sort((a, b) => {
        const aTime = parseDateInput(a.updatedAt || a.createdAt)?.getTime() || 0;
        const bTime = parseDateInput(b.updatedAt || b.createdAt)?.getTime() || 0;
        if (aTime !== bTime) return bTime - aTime;
        return (a.memberName || "").localeCompare(b.memberName || "");
      });
    if (paidEntries.length) {
      paidEntries.forEach((item) => {
        const memberName = item.memberName || "Sócio sem nome";
        const competence = normalizeCompetenceValue(item.competence);
        const paymentMonth = paymentMonthKey(item);
        const paymentLabel = formatDateTime(item.updatedAt || item.createdAt);
        const isAnticipated = paymentMonth && competence && competence > paymentMonth;
        items.push({
          label: `${paymentLabel} • ${memberName}${competence ? ` • Comp. ${formatCompetence(competence)}` : ""}${isAnticipated ? " • Antecipado" : ""}`,
          value: formatCurrency(item.amount || defaultFee),
        });
      });
    }
    items.push({
      label: `Subtotal de mensalidades (${formatCompetence(targetMonth)})`,
      value: formatCurrency(sumDuesByMonth(targetMonth)),
    });
    const isJanuary = targetMonth.endsWith("-01");
    if (!isJanuary) {
      generalTransactions
        .filter((tx) => tx.type === "entrada")
        .filter((tx) => !isLegacyCarryOver(tx))
        .filter((tx) => monthKeyFromDate(tx.date || tx.createdAt) === targetMonth)
        .forEach((tx) => {
          const title = tx.description || formatGeneralCategory(tx.category);
          items.push({
            label: `${formatDate(tx.date || tx.createdAt)} • ${title}`,
            value: formatCurrency(Number(tx.amount || 0)),
          });
        });
    }
    items.push({
      label: `Total do saldo do mês (${formatCompetence(targetMonth)})`,
      value: cashBalanceLabel?.textContent || formatCurrency(0),
    });
  } else if (type === "previous-balance") {
    const targetMonth = previousMonthKey();
    const targetDate = competenceToMonthDate(targetMonth);
    const initialDate = competenceToMonthDate(INITIAL_PREVIOUS_BALANCE_MONTH);
    if (targetMonth) {
      const dues = sumDuesByMonth(targetMonth);
      const generalTotals = sumGeneralTotalsByMonth(targetMonth);
      const revenue = dues + generalTotals.revenue;
      const expense = generalTotals.expense;
      if (initialDate && targetDate && targetDate >= initialDate) {
        items.push({
          label: `Saldo base (${formatCompetence(INITIAL_PREVIOUS_BALANCE_MONTH)})`,
          value: formatCurrency(INITIAL_PREVIOUS_BALANCE),
        });
      }
      items.push({
        label: `Mensalidades recebidas (${formatCompetence(targetMonth)})`,
        value: formatCurrency(dues),
      });
      items.push({
        label: "Outras entradas (sem bar)",
        value: formatCurrency(generalTotals.revenue),
      });
      items.push({
        label: "Despesas gerais (sem bar)",
        value: formatCurrency(generalTotals.expense),
      });
      items.push({
        label: "Saldo do mês (entradas - saídas)",
        value: formatCurrency(revenue - expense),
      });
      items.push({
        label: "Saldo de fechamento (acumulado)",
        value: previousBalanceLabel?.textContent || formatCurrency(0),
      });
      generalTransactions
        .filter((tx) => monthKeyFromDate(tx.date || tx.createdAt) === targetMonth)
        .filter((tx) => !isLegacyCarryOver(tx))
        .forEach((tx) => {
          const title = tx.description || formatGeneralCategory(tx.category);
          const typeLabel = tx.type === "entrada" ? "Entrada" : "Saída";
          items.push({
            label: `${formatDate(tx.date || tx.createdAt)} • ${title} • ${typeLabel}`,
            value: formatCurrency(Number(tx.amount || 0)),
          });
        });
    }
  } else if (type === "general-revenue") {
    items.push({
      label: "Mensalidades (total)",
      value: generalSummaryDues?.textContent || formatCurrency(0),
    });
    generalTransactions
      .filter((tx) => tx.type === "entrada")
      .forEach((tx) => {
        const title = tx.description || formatGeneralCategory(tx.category);
        items.push({
          label: `${formatDate(tx.date)} • ${title}`,
          value: formatCurrency(Number(tx.amount || 0)),
        });
      });
  } else if (type === "general-expense") {
    generalTransactions
      .filter((tx) => tx.type !== "entrada")
      .forEach((tx) => {
        const title = tx.description || formatGeneralCategory(tx.category);
        items.push({
          label: `${formatDate(tx.date)} • ${title}`,
          value: formatCurrency(Number(tx.amount || 0)),
        });
      });
  } else if (type === "general-balance") {
    items.push({
      label: "Receitas (total)",
      value: generalSummaryRevenue?.textContent || formatCurrency(0),
    });
    items.push({
      label: "Mensalidades (total)",
      value: generalSummaryDues?.textContent || formatCurrency(0),
    });
    generalTransactions
      .filter((tx) => tx.type === "entrada")
      .forEach((tx) => {
        const title = tx.description || formatGeneralCategory(tx.category);
        items.push({
          label: `${formatDate(tx.date)} • ${title}`,
          value: formatCurrency(Number(tx.amount || 0)),
        });
      });
    items.push({
      label: "Despesas (total)",
      value: generalSummaryExpense?.textContent || formatCurrency(0),
    });
    generalTransactions
      .filter((tx) => tx.type !== "entrada")
      .forEach((tx) => {
        const title = tx.description || formatGeneralCategory(tx.category);
        items.push({
          label: `${formatDate(tx.date)} • ${title}`,
          value: formatCurrency(Number(tx.amount || 0)),
        });
      });
  } else if (type === "total-received") {
    const targetMonth = currentReceiptMonthKey || currentMonthValue();
    const received = allPayments
      .filter((item) => normalizeStatusValue(item.status) === "pago")
      .filter((item) => normalizeCompetenceValue(item.competence) === targetMonth)
      .sort((a, b) => (a.memberName || "").localeCompare(b.memberName || ""));
    received.forEach((item) => {
      const memberName = item.memberName || "Sócio sem nome";
      const competence = normalizeCompetenceValue(item.competence);
      const paymentMonth = paymentMonthKey(item);
      const isAnticipated = paymentMonth && competence && paymentMonth < competence;
      const label = `${memberName} • ${formatCompetence(competence)}${isAnticipated ? " • Antecipado" : ""}`;
      items.push({
        label,
        value: formatCurrency(item.amount || defaultFee),
      });
    });
  } else if (type === "pending-total") {
    const pending = allPayments
      .filter((item) => normalizeStatusValue(item.status) === "pendente")
      .sort((a, b) => {
        const nameCompare = (a.memberName || "").localeCompare(b.memberName || "");
        if (nameCompare !== 0) return nameCompare;
        return (a.competence || "").localeCompare(b.competence || "");
      });
    pending.forEach((item) => {
      const memberName = item.memberName || "Sócio sem nome";
      const competence = normalizeCompetenceValue(item.competence);
      const label = `${memberName} • ${competence ? formatCompetence(competence) : "--"}`;
      items.push({
        label,
        value: formatCurrency(item.amount || defaultFee),
      });
    });
  } else if (type === "expenses") {
    generalTransactions
      .filter((tx) => tx.type !== "entrada")
      .forEach((tx) => {
        const title = tx.description || formatGeneralCategory(tx.category);
        items.push({
          label: `${formatDate(tx.date)} • ${title}`,
          value: formatCurrency(Number(tx.amount || 0)),
        });
      });
  } else if (type === "bar") {
    barTransactions
      .filter((tx) => tx.type === "entrada")
      .forEach((tx) => {
        const itemLabel = tx.item || "Item do bar";
        const quantity = Number(tx.quantity || 0);
        const unitValue = Number(tx.unitValue || 0);
        const details =
          quantity && unitValue ? ` (${quantity} x ${formatCurrency(unitValue)})` : "";
        items.push({
          label: `${formatDate(tx.date || tx.createdAt)} • ${itemLabel}${details}`,
          value: formatCurrency(Number(tx.totalValue || 0)),
        });
      });
    barTransactions
      .filter((tx) => tx.type !== "entrada")
      .forEach((tx) => {
        const itemLabel = tx.item || "Item do bar";
        const quantity = Number(tx.quantity || 0);
        const unitValue = Number(tx.unitValue || 0);
        const details =
          quantity && unitValue ? ` (${quantity} x ${formatCurrency(unitValue)})` : "";
        items.push({
          label: `${formatDate(tx.date || tx.createdAt)} • ${itemLabel}${details} • Saída`,
          value: formatCurrency(Number(tx.totalValue || 0)),
        });
      });
  } else if (type === "balance") {
    const legacyCarryOver = getLegacyCarryOverTotal();
    const otherEntries = Math.max(0, (generalTotals.revenue || 0) - legacyCarryOver);
    items.push({
      label: "Mensalidades (total)",
      value: formatCurrency(aggregateTotals.revenue || 0),
    });
    items.push({
      label: "Outras entradas (sem saldo 2025)",
      value: formatCurrency(otherEntries),
    });
    if (legacyCarryOver > 0) {
      items.push({
        label: "Saldo de dezembro (CAIXA PROVENIENTE DE 2025)",
        value: formatCurrency(legacyCarryOver),
      });
    }
    items.push({
      label: "Despesas gerais",
      value: formatCurrency(generalTotals.expense || 0),
    });
    items.push({
      label: "Saldo geral",
      value: overallBalanceLabel?.textContent || formatCurrency(0),
    });
  }

  if (!items.length) {
    financeSummaryEmpty.classList.remove("hidden");
    return;
  }
  financeSummaryEmpty.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  items.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "flex items-center justify-between gap-3 border border-slate-100 rounded-md px-3 py-2";
    li.innerHTML = `
      <span>${entry.label}</span>
      <span class="font-semibold text-secondary">${entry.value || ""}</span>
    `;
    fragment.appendChild(li);
  });
  financeSummaryList.appendChild(fragment);
}

function getLegacyCarryOverTotal() {
  return generalTransactions
    .filter((tx) => tx.type === "entrada")
    .reduce((sum, tx) => {
      const desc = (tx?.description || "").toString().trim().toLowerCase();
      if (desc !== "caixa proveniente de 2025") return sum;
      return sum + Number(tx.amount || 0);
    }, 0);
}

function renderReceiptsSummary(payments) {
  if (!receiptsList || !receiptsEmptyState) return;
  receiptsList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const targetMonth = currentReceiptMonthKey || currentMonthValue();
  const paidAll = payments
    .filter((item) => normalizeStatusValue(item.status) === "pago")
    .filter((item) => {
      const paymentMonth = paymentMonthKey(item);
      const competence = normalizeCompetenceValue(item.competence);
      return paymentMonth === targetMonth || competence === targetMonth;
    });
  const tokens = getSearchTokens(receiptsSearchTerm);
  const paid = tokens.length
    ? paidAll.filter((item) => {
        const name = item.memberName || "";
        const competence = normalizeCompetenceValue(item.competence) || "";
        const monthLabel = formatCompetence(competence);
        return matchesSearchTokens(name, tokens) ||
          matchesSearchTokens(competence, tokens) ||
          matchesSearchTokens(monthLabel, tokens);
      })
    : paidAll;
  const totalPaid = paid.reduce((sum, item) => sum + (item.amount || defaultFee), 0);
  if (receiptsCountLabel) {
    receiptsCountLabel.textContent = `${paid.length} pagamento(s)`;
  }
  if (receiptsTotalLabel) {
    receiptsTotalLabel.textContent = formatCurrency(totalPaid);
  }
  if (!paid.length) {
    receiptsEmptyState.textContent = tokens.length
      ? "Nenhum recebimento encontrado para a busca."
      : "Nenhum recebimento registrado.";
    receiptsEmptyState.classList.remove("hidden");
    return;
  }
  receiptsEmptyState.classList.add("hidden");

  const grouped = new Map();
  paid.forEach((item) => {
    const memberName = item.memberName || "Sócio sem nome";
    const memberKey = item.memberId || `name:${memberName.toLowerCase().trim()}`;
    if (!memberKey) return;
    const paymentMonth = paymentMonthKey(item);
    if (!paymentMonth) return;
    const competence = normalizeCompetenceValue(item.competence);
    const value = item.amount || defaultFee;
    const isAnticipated = competence && paymentMonth && competence > paymentMonth;
    const entry = {
      item,
      memberName,
      paymentMonth,
      competence,
      value,
      isAnticipated,
    };
    const bucket = grouped.get(memberKey) || { memberKey, memberName, payments: [], total: 0 };
    bucket.payments.push(entry);
    bucket.total += value;
    grouped.set(memberKey, bucket);
  });

  const groupedList = Array.from(grouped.values())
    .map((bucket) => {
      const latestTimestamp = bucket.payments
        .map((entry) => {
          const raw = entry.item?.updatedAt || entry.item?.createdAt || null;
          const parsed = parseDateInput(raw);
          return parsed ? parsed.getTime() : 0;
        })
        .reduce((max, value) => Math.max(max, value), 0);
      return { ...bucket, latestTimestamp };
    })
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp)
    .slice(0, 60);

  groupedList.forEach((bucket) => {
    const canDeleteReceipt = !!context && ["admin", "financeiro"].includes(context.profile.role);
    const ordered = [...bucket.payments].sort((a, b) => {
      const aTime = parseDateInput(a.item?.updatedAt || a.item?.createdAt)?.getTime() || 0;
      const bTime = parseDateInput(b.item?.updatedAt || b.item?.createdAt)?.getTime() || 0;
      return bTime - aTime;
    });
    const detailsHtml = ordered
      .map((entry) => {
        const competenceLabel = entry.competence ? formatCompetence(entry.competence) : "";
        const paymentLabel = formatCompetence(entry.paymentMonth);
        const registeredAt = formatDateTime(entry.item?.updatedAt || entry.item?.createdAt);
        return `
          <li class="flex flex-wrap items-center justify-between gap-2 py-2 border-t border-slate-100">
            <div class="text-xs text-slate-600">
              Pagamento: ${paymentLabel}
              ${competenceLabel ? `• Competência: ${competenceLabel}` : ""}
              ${entry.isAnticipated ? `<span class="ml-1 text-emerald-600 font-semibold">Antecipado</span>` : ""}
              <span class="ml-1 text-slate-500">• Registrado: ${registeredAt}</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-xs font-semibold text-secondary">${formatCurrency(entry.value)}</div>
              ${
                canDeleteReceipt
                  ? `<button
                      type="button"
                      data-action="delete-receipt"
                      data-doc-id="${entry.item?.docId || ""}"
                      data-member-id="${entry.item?.memberId || ""}"
                      data-competence="${entry.competence || ""}"
                      data-member-name="${entry.memberName}"
                      class="text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition"
                    >
                      Excluir
                    </button>`
                  : ""
              }
            </div>
          </li>
        `;
      })
      .join("");

    const li = document.createElement("li");
    li.className = "py-2";
    li.innerHTML = `
      <div class="border border-slate-200 rounded-lg px-4 py-3 bg-slate-50">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            data-action="toggle-receipts-member"
            class="text-sm font-semibold text-slate-800 hover:text-primary transition"
            aria-expanded="false"
          >
            ${bucket.memberName}
          </button>
          <div class="text-sm font-semibold text-secondary">${formatCurrency(bucket.total)}</div>
        </div>
        <div data-receipts-details class="hidden mt-2">
          <ul class="divide-y divide-slate-100">${detailsHtml}</ul>
        </div>
      </div>
    `;
    fragment.appendChild(li);
  });

  receiptsList.appendChild(fragment);
}

function computeMonthlyCounts(payments, monthKey) {
  const targetMonth = normalizeCompetenceValue(monthKey || currentMonthValue());
  const counts = { received: 0, pending: 0, isentado: 0 };
  payments.forEach((item) => {
    const competence = normalizeCompetenceValue(item.competence);
    if (!competence || competence !== targetMonth) return;
    const status = normalizeStatusValue(item.status);
    if (status === "pendente") {
      counts.pending += 1;
      return;
    }
    if (status.startsWith("pago") || status === "quitado") {
      counts.received += 1;
      return;
    }
    if (status.includes("isento") || status === "isentado") {
      counts.isentado += 1;
    }
  });
  return counts;
}

function getMonthlyStatusBucket(item) {
  const status = normalizeStatusValue(item.status);
  if (status === "pendente") return "pending";
  if (status.startsWith("pago") || status === "quitado") return "received";
  if (status.includes("isento") || status === "isentado") return "isentado";
  return "";
}

function getMemberNamesByStatusBucket(monthKey, bucket) {
  const targetMonth = normalizeCompetenceValue(monthKey || currentMonthValue());
  return allPayments
    .filter((item) => normalizeCompetenceValue(item.competence) === targetMonth)
    .filter((item) => getMonthlyStatusBucket(item) === bucket)
    .map((item) => item.memberName || "Sócio sem nome")
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getMemberEntriesByStatusBucket(monthKey, bucket) {
  const targetMonth = normalizeCompetenceValue(monthKey || currentMonthValue());
  return allPayments
    .filter((item) => normalizeCompetenceValue(item.competence) === targetMonth)
    .filter((item) => getMonthlyStatusBucket(item) === bucket)
    .map((item) => ({
      name: item.memberName || "Sócio sem nome",
      notes: item.notes || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function renderDuesChart() {
  const canvas = document.getElementById("finance-dues-chart");
  if (!canvas || typeof Chart === "undefined") return;
  const data = [monthlyTotals.received, monthlyTotals.pending, monthlyTotals.isentado];
  const labels = ["Recebidas", "Pendentes", "Isentas"];
  if (duesChart) {
    duesChart.data.labels = labels;
    duesChart.data.datasets[0].data = data;
    duesChart.update();
    return;
  }
  duesChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ["#16a34a", "#f59e0b", "#94a3b8"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      cutout: "60%",
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const bucketMap = {
                Recebidas: "received",
                Pendentes: "pending",
                Isentas: "isentado",
              };
              const bucket = bucketMap[context.label] || "";
              const names = bucket ? getMemberNamesByStatusBucket(currentReceiptMonthKey, bucket) : [];
              const visible = names.slice(0, 6);
              const extra = names.length > visible.length ? ` +${names.length - visible.length}` : "";
              const nameLine = names.length ? `Sócios: ${visible.join(", ")}${extra}` : "Sócios: --";
              return [`${context.label}: ${context.formattedValue}`, nameLine];
            },
          },
        },
        legend: {
          display: false,
        },
      },
      onClick: (_event, elements) => {
        if (!elements?.length) return;
        const index = elements[0].index;
        const label = labels[index];
        const bucketMap = { Recebidas: "received", Pendentes: "pending", Isentas: "isentado" };
        const bucket = bucketMap[label] || "";
        openDuesDetailDialog(bucket, label);
      },
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

function openDuesDetailDialog(bucket, label) {
  if (!duesDetailDialog || !duesDetailList || !duesDetailEmpty || !duesDetailTitle) return;
  const targetMonth = currentReceiptMonthKey || currentMonthValue();
  const monthLabel = formatCompetence(targetMonth);
  const entries = getMemberEntriesByStatusBucket(targetMonth, bucket);
  const descriptionMap = {
    received: "Sócios com mensalidades recebidas no mês.",
    pending: "Sócios com mensalidades pendentes no mês.",
    isentado: "Sócios com mensalidades isentas no mês.",
  };
  duesDetailTitle.textContent = `Mensalidades ${label?.toLowerCase?.() || ""}`.trim();
  if (duesDetailSubtitle) duesDetailSubtitle.textContent = `Competência ${monthLabel}`;
  if (duesDetailDescription) duesDetailDescription.textContent = descriptionMap[bucket] || "";
  duesDetailList.innerHTML = "";
  if (!entries.length) {
    duesDetailEmpty.classList.remove("hidden");
    duesDetailDialog.showModal();
    return;
  }
  duesDetailEmpty.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  entries.forEach((entry) => {
    const li = document.createElement("li");
    const motivo = bucket === "isentado"
      ? ` • Motivo: ${entry.notes ? entry.notes : "não informado"}`
      : "";
    li.className = "flex items-center justify-between gap-3 border border-slate-100 rounded-md px-3 py-2";
    li.innerHTML = `<span>${entry.name}${motivo}</span>`;
    fragment.appendChild(li);
  });
  duesDetailList.appendChild(fragment);
  duesDetailDialog.showModal();
}

function renderFinanceInsights() {
  if (typeof Chart === "undefined") return;
  const compositionCanvas = document.getElementById("finance-revenue-composition");
  const revenueExpenseCanvas = document.getElementById("finance-revenue-expense");
  const balanceCanvas = document.getElementById("finance-balance-line");
  if (!compositionCanvas && !revenueExpenseCanvas && !balanceCanvas) return;

  const monthKey = currentReceiptMonthKey || currentMonthValue();
  const duesRevenue = sumDuesByMonth(monthKey);
  const barMonthTotals = sumBarTotalsByMonth(monthKey);
  const generalMonthTotals = sumGeneralTotalsByMonth(monthKey);

  const compositionData = [duesRevenue, barMonthTotals.revenue, generalMonthTotals.revenue];
  const compositionLabels = ["Mensalidades", "Bar", "Extras"];

  if (compositionCanvas) {
    if (revenueCompositionChart) {
      revenueCompositionChart.data.labels = compositionLabels;
      revenueCompositionChart.data.datasets[0].data = compositionData;
      revenueCompositionChart.update();
    } else {
      revenueCompositionChart = new Chart(compositionCanvas, {
        type: "doughnut",
        data: {
          labels: compositionLabels,
          datasets: [
            {
              data: compositionData,
              backgroundColor: ["#e4450b", "#0f172a", "#94a3b8"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: "60%",
          plugins: {
            legend: { display: false },
          },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }

  const totalRevenue = duesRevenue + barMonthTotals.revenue + generalMonthTotals.revenue;
  const totalExpense = barMonthTotals.expense + generalMonthTotals.expense;
  const revenueExpenseData = [totalRevenue, totalExpense];

  if (revenueExpenseCanvas) {
    if (revenueExpenseChart) {
      revenueExpenseChart.data.datasets[0].data = revenueExpenseData;
      revenueExpenseChart.update();
    } else {
      revenueExpenseChart = new Chart(revenueExpenseCanvas, {
        type: "bar",
        data: {
          labels: ["Receitas", "Despesas"],
          datasets: [
            {
              data: revenueExpenseData,
              backgroundColor: ["#16a34a", "#e11d48"],
              borderRadius: 8,
              maxBarThickness: 48,
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true },
          },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }

  if (balanceCanvas) {
    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      months.push(competenceMonthsAgo(i));
    }
    const balances = months.map((key) => {
      const dues = sumDuesByMonth(key);
      const barTotalsByMonth = sumBarTotalsByMonth(key);
      const generalTotalsByMonth = sumGeneralTotalsByMonth(key);
      const revenue = dues + barTotalsByMonth.revenue + generalTotalsByMonth.revenue;
      const expense = barTotalsByMonth.expense + generalTotalsByMonth.expense;
      return revenue - expense;
    });
    const labels = months.map((key) => formatCompetence(key));
    if (balanceHistoryChart) {
      balanceHistoryChart.data.labels = labels;
      balanceHistoryChart.data.datasets[0].data = balances;
      balanceHistoryChart.update();
    } else {
      balanceHistoryChart = new Chart(balanceCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              data: balances,
              borderColor: "#e4450b",
              backgroundColor: "rgba(228, 69, 11, 0.15)",
              fill: true,
              tension: 0.3,
              pointRadius: 3,
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true },
          },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }
  }
}

function sumDuesByMonth(monthKey) {
  if (!monthKey) return 0;
  return allPayments
    .filter((item) => isPaidStatusValue(item.status))
    .filter((item) => paymentMonthKey(item) === monthKey)
    .reduce((sum, item) => sum + (item.amount || defaultFee), 0);
}

function sumBarTotalsByMonth(monthKey) {
  const totals = { revenue: 0, expense: 0 };
  if (!monthKey) return totals;
  barTransactions.forEach((tx) => {
    const key = monthKeyFromDate(tx.date || tx.createdAt);
    if (!key || key !== monthKey) return;
    const total = Number(tx.totalValue || 0);
    if (tx.type === "entrada") {
      totals.revenue += total;
    } else {
      totals.expense += total;
    }
  });
  return totals;
}

function sumGeneralTotalsByMonth(monthKey) {
  const totals = { revenue: 0, expense: 0 };
  if (!monthKey) return totals;
  generalTransactions.forEach((tx) => {
    const key = monthKeyFromDate(tx.date || tx.createdAt);
    if (!key || key !== monthKey) return;
    const value = Number(tx.amount || 0);
    const description = (tx.description || "").toString().trim().toLowerCase();
    if (description === "caixa proveniente de 2025") return;
    if (tx.type === "entrada") {
      totals.revenue += value;
    } else {
      totals.expense += value;
    }
  });
  return totals;
}

function updateFocusMonthOptions() {
  if (!focusMonthSelect) {
    focusCompetence = focusCompetence || currentMonthValue();
    return;
  }
  const previousValue = focusMonthSelect.value || "";
  focusMonthSelect.innerHTML = '<option value="">Mês atual</option>';
  const fragment = document.createDocumentFragment();
  const monthOptions = Array.from(new Set([...availableCompetences, ...availableReceiptMonths])).filter(Boolean);
  monthOptions.forEach((competence) => {
    const option = document.createElement("option");
    option.value = competence;
    option.textContent = formatCompetence(competence);
    fragment.appendChild(option);
  });
  focusMonthSelect.appendChild(fragment);
  const current = currentMonthValue();
  let resolved = previousValue || focusCompetence || current;
  if (previousValue && availableCompetences.includes(previousValue)) {
    resolved = previousValue;
  } else if (focusCompetence && availableCompetences.includes(focusCompetence)) {
    resolved = focusCompetence;
  } else if (availableCompetences.includes(current)) {
    resolved = current;
  } else if (availableCompetences.length) {
    resolved = availableCompetences[0];
  } else {
    resolved = current;
  }
  focusCompetence = resolved;
  focusMonthSelect.value = resolved === current ? "" : resolved;
}

function buildPendingCountMap(payments) {
  const map = new Map();
  payments.forEach((item) => {
    if (item.status !== "pendente") return;
    const member = item.memberId ? membersMap.get(item.memberId) : null;
    if (member && normalizeStatusValue(member.status) !== "ativo") return;
    const key = item.memberId || item.memberName || item.id;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

async function persistPendingMembersCount(count) {
  if (!Number.isFinite(count)) return;
  if (!context || !["admin", "financeiro"].includes(context.profile.role)) return;
  if (count === lastPersistedPendingCount) return;
  try {
    await setDoc(doc(db, "settings", "finance"), { pendingMembersCount: count }, { merge: true });
    lastPersistedPendingCount = count;
  } catch (error) {
    console.error("Não foi possível atualizar o contador de pendências financeiras:", error);
  }
}

function isPaymentOverdue(entry, referenceDate = new Date()) {
  if (!entry || String(entry.status || "").toLowerCase() !== "pendente") return false;
  const compDate = competenceToMonthDate(entry.competence);
  if (!compDate) return false;
  const dueDate = new Date(compDate.getFullYear(), compDate.getMonth(), MONTHLY_DUE_DAY);
  const billingStart = new Date(CLUB_START_DATE.getFullYear(), CLUB_START_DATE.getMonth(), 1);
  if (dueDate < billingStart) return false;
  const compareDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  return compareDate.getTime() >= dueDate.getTime();
}

function renderBreakdown() {
  breakdownList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const entries = Object.entries(breakdownData);
  if (!entries.length) {
    breakdownEmpty.classList.remove("hidden");
    return;
  }
  breakdownEmpty.classList.add("hidden");
  entries.forEach(([role, data]) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="flex items-center justify-between">
        <span>${formatRole(role)}</span>
        <span class="text-xs text-slate-500">${data.count} registros</span>
      </div>
      <div class="text-xs text-slate-500">
        Recebido: <span class="text-primary font-semibold">${formatCurrency(data.received)}</span> •
        Pendente: <span class="text-amber-500 font-semibold">${formatCurrency(data.pending)}</span>
      </div>
    `;
    fragment.appendChild(li);
  });
  breakdownList.appendChild(fragment);
}

function renderChart(payments, months) {
  const allCompetences = payments
    .map((item) => item.competence)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const earliestCompetence = allCompetences[0] || currentMonthValue();
  const latestCompetence = competenceMonthsAgo(0);

  const startDate = competenceToMonthDate(earliestCompetence) || new Date();
  const endDate = competenceToMonthDate(latestCompetence) || new Date();
  const minimumStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  minimumStart.setMonth(minimumStart.getMonth() - (months - 1));
  const cursor = new Date(Math.max(startDate.getTime(), minimumStart.getTime()));

  const labels = [];
  const receivedData = [];
  const pendingData = [];
  const isentadoData = [];

  while (cursor <= endDate) {
    const competence = formatCompetenceKeyFromDate(cursor);
    labels.push(formatCompetence(competence));
    const monthly = payments.filter((item) => item.competence === competence);
    receivedData.push(
      monthly.filter((item) => item.status === "pago").reduce((sum, item) => sum + (item.amount || defaultFee), 0),
    );
    pendingData.push(
      monthly
        .filter((item) => item.status === "pendente")
        .reduce((sum, item) => sum + (item.amount || defaultFee), 0),
    );
    isentadoData.push(
      monthly
        .filter((item) => item.status === "isentado")
        .reduce((sum, item) => sum + (item.amount || defaultFee), 0),
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const ctx = document.getElementById("finance-chart");
  if (!ctx) return;
  if (financeChart) {
    financeChart.data.labels = labels;
    financeChart.data.datasets[0].data = receivedData;
    financeChart.data.datasets[1].data = pendingData;
    financeChart.data.datasets[2].data = isentadoData;
    financeChart.update();
    return;
  }
  financeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Recebido",
          data: receivedData,
          borderColor: "#ff2626",
          backgroundColor: "rgba(255, 38, 38, 0.18)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Pendente",
          data: pendingData,
          borderColor: "#0b0b0f",
          backgroundColor: "rgba(11, 11, 15, 0.18)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Isentado",
          data: isentadoData,
          borderColor: "#9ca3af",
          backgroundColor: "rgba(156, 163, 175, 0.18)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (value) => `R$ ${Number(value).toFixed(0)}`,
          },
        },
      },
    },
  });
}

function renderPendingTable() {
  const term = pendingSearch?.value || "";
  const tokens = getSearchTokens(term);
  const hasSearch = tokens.length > 0;
  pendingTableBody.innerHTML = "";
  pendingPaymentsMap = new Map();
  const fragment = document.createDocumentFragment();

  const latestResolvedByMember = new Map();
  allPayments
    .filter((item) => item.memberId && normalizeStatusValue(item.status) === "pago")
    .forEach((item) => {
      const key = item.memberId || item.memberName;
      const existing = latestResolvedByMember.get(key);
      if (!existing) {
        latestResolvedByMember.set(key, item);
        return;
      }
      const existingDate = competenceToMonthDate(existing.competence) || new Date(0);
      const currentDate = competenceToMonthDate(item.competence) || new Date(0);
      if (currentDate > existingDate) {
        latestResolvedByMember.set(key, item);
      }
    });

  const grouped = new Map();
  pendingPayments.forEach((item) => {
    const key = item.memberId || item.memberName || item.id;
    const group = grouped.get(key) || {
      memberId: item.memberId || null,
      memberName: item.memberName || "Sócio",
      memberRole: item.memberRole || "socio",
      entries: [],
    };
    group.entries.push(item);
    grouped.set(key, group);
    pendingPaymentsMap.set(item.id, item);
  });

  grouped.forEach((group, key) => {
    const latestResolved = latestResolvedByMember.get(key);
    if (!latestResolved) return;
    const alreadyHas = group.entries.some(
      (entry) => normalizeCompetenceValue(entry.competence) === normalizeCompetenceValue(latestResolved.competence),
    );
    if (!alreadyHas) {
      group.entries.push(latestResolved);
    }
  });

  membersIndex.forEach((member) => {
    const name = member.name || "";
    if (!name) return;
    if (hasSearch && !matchesSearchTokens(name, tokens)) return;
    const key = member.id || member.name;
    if (!key || grouped.has(key)) return;
    const latestResolved =
      latestResolvedByMember.get(member.id) || latestResolvedByMember.get(member.name);
    grouped.set(key, {
      memberId: member.id || null,
      memberName: member.name || "Sócio",
      memberRole: member.role || "socio",
      entries: latestResolved ? [latestResolved] : [],
    });
  });

  const filteredGroups = Array.from(grouped.values()).filter((group) => {
    if (!tokens.length) return true;
    const matchesName = matchesSearchTokens(group.memberName || "", tokens);
    const matchesEntries = group.entries.some((entry) => {
      const competence = entry.competence || "";
      const notes = entry.notes || "";
      return matchesSearchTokens(competence, tokens) || matchesSearchTokens(notes, tokens);
    });
    return matchesName || matchesEntries;
  });

  if (!filteredGroups.length) {
    pendingEmptyState.classList.remove("hidden");
    return;
  }
  pendingEmptyState.classList.add("hidden");

  filteredGroups
    .sort((a, b) => (a.memberName || "").localeCompare(b.memberName || "", "pt-BR"))
    .forEach((group, index) => {
      const serial = index + 1;
    const memberRecord =
      (group.memberId ? membersMap.get(group.memberId) : null) ||
      membersIndex.find((member) => member.name === group.memberName) ||
      null;
    const isInactiveByStatus = memberRecord ? normalizeStatusValue(memberRecord.status) !== "ativo" : false;
    const isInactive = isInactiveByStatus;
    const sortedEntries = group.entries.slice().sort((a, b) => b.competence.localeCompare(a.competence));
    const mostRecent = sortedEntries[0];
    const memberKey = group.memberId || group.memberName;
    const pendingEntries = isInactive ? [] : group.entries.filter((entry) => entry.status === "pendente");
    const totalAmount = pendingEntries.reduce((sum, entry) => sum + (entry.amount || defaultFee), 0);
    const pendingCount = isInactive ? 0 : pendingCountByMember.get(memberKey) || pendingEntries.length;
    const previousMonthKey = competenceMonthsAgo(1);
    const paymentKey = group.memberId || group.memberName;
    const baselineCompetence = CLUB_START_COMPETENCE;
    const joinDate = memberRecord ? parseDateString(memberRecord.joinDate) : null;
    const firstCompetenceByJoin =
      joinDate && !Number.isNaN(joinDate.getTime())
        ? `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, "0")}`
        : baselineCompetence;
    const firstAllowedCompetence =
      firstCompetenceByJoin > baselineCompetence ? firstCompetenceByJoin : baselineCompetence;
    const shouldChargePreviousMonth =
      previousMonthKey && previousMonthKey >= firstAllowedCompetence;
    const previousMonthEntries = allPayments.filter((entry) => {
      const entryKey = entry.memberId || entry.memberName;
      if (!entryKey || entryKey !== paymentKey) return false;
      return normalizeCompetenceValue(entry.competence) === previousMonthKey;
    });
    const previousMonthPaid = previousMonthEntries.some((entry) => {
      const status = normalizeStatusValue(entry.status);
      return status === "pago" || status === "isentado";
    });
    const previousMonthPending = previousMonthEntries.some(
      (entry) => normalizeStatusValue(entry.status) === "pendente",
    );
    const previousMonthMissing = previousMonthEntries.length === 0;
    const hasPreviousMonthOutstanding =
      !isInactive &&
      shouldChargePreviousMonth &&
      !previousMonthPaid &&
      (previousMonthPending || previousMonthMissing);
    const needsPreviousMonthRow =
      hasPreviousMonthOutstanding &&
      !pendingEntries.some(
        (entry) => normalizeCompetenceValue(entry.competence) === previousMonthKey,
      );
    const adjustedPendingCount = hasPreviousMonthOutstanding
      ? Math.max(2, pendingCount)
      : pendingCount;
    const adjustedTotalAmount = hasPreviousMonthOutstanding && needsPreviousMonthRow
      ? totalAmount + defaultFee
      : totalAmount;
      const overdueEntries = pendingEntries.filter((entry) => isPaymentOverdue(entry));
      const overdueCount = overdueEntries.length;
      const oldestOverdue = overdueEntries.length ? overdueEntries[overdueEntries.length - 1] : null;
      const severeDelay = overdueCount >= 2;
      const warningDelay = !severeDelay && overdueCount === 1;
      const summaryRow = document.createElement("tr");
      summaryRow.className = `text-sm ${
        isInactive
          ? "bg-slate-100 text-slate-500"
          : pendingCount === 0
          ? "bg-emerald-50/70 text-emerald-700"
          : severeDelay
            ? "bg-rose-50/80 text-rose-700"
            : warningDelay
              ? "bg-amber-50/80 text-amber-700"
              : "hover:bg-slate-50"
      }`;
    summaryRow.dataset.member = memberKey;
    const memberName = (group.memberName || "").trim();
    const warningBadge = !isInactive && severeDelay
      ? `<span class="ml-2 inline-flex items-center rounded-full bg-rose-100 px-2 py-[2px] text-[10px] font-semibold uppercase text-rose-600">${overdueCount} vencidas</span>`
      : !isInactive && warningDelay
      ? `<span class="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-[2px] text-[10px] font-semibold uppercase text-amber-600">1 vencida</span>`
      : "";
    summaryRow.innerHTML = `
  <td class="px-4 py-3 font-medium flex items-center gap-2">
    <span class="text-slate-400">${serial}.</span>
    <span class="ml-1 inline-flex items-center gap-2 max-w-full ${isInactive ? "text-slate-500" : hasPreviousMonthOutstanding ? "text-rose-600" : pendingCount === 0 ? "text-emerald-700" : ""}">
      <span class="finance-pending-name" title="${memberName}">${memberName}</span>
      ${warningBadge}
    </span>
  </td>
  <td class="px-4 py-3">${isInactive ? "Inativo" : adjustedPendingCount > 0 ? `${adjustedPendingCount} pendências` : "Não há pendências"}</td>
  <td class="px-4 py-3 text-right">${adjustedPendingCount > 0 ? formatCurrency(adjustedTotalAmount) : "—"}</td>
  <td class="px-4 py-3">${formatCompetence(mostRecent?.competence)}</td>
  <td class="py-3 pr-6 text-right whitespace-nowrap">
        <div class="flex justify-end pr-1">
          <button
            type="button"
            data-action="toggle-details"
            data-target="${memberKey}"
            class="px-3 py-1 text-xs rounded-md border border-slate-200 hover:border-primary transition-colors duration-150 hover:bg-primary hover:text-white"
          >
            Detalhar
          </button>
    </div>
  </td>
`;

      fragment.appendChild(summaryRow);
      fitTextToSingleLine(summaryRow.querySelector(".finance-pending-name"));

      const detailRow = document.createElement("tr");
      detailRow.className = "hidden";
      detailRow.dataset.target = memberKey;
      const detailEntries = sortedEntries.slice();
      if (needsPreviousMonthRow) {
        detailEntries.push({
          id: `synthetic:${memberKey}:${previousMonthKey}`,
          memberId: group.memberId || null,
          memberName: group.memberName,
          memberRole: group.memberRole,
          competence: previousMonthKey,
          status: "pendente",
          amount: defaultFee,
          synthetic: true,
        });
      }
      detailEntries.sort((a, b) => (b.competence || "").localeCompare(a.competence || ""));

      const detailRows = detailEntries
        .map((entry) => {
          const isOverdue = isPaymentOverdue(entry);
          const normalizedStatus = normalizeStatusValue(entry.status);
          const isPaid = normalizedStatus === "pago";
          const isIsentado = normalizedStatus === "isentado";
          const actionContent = isPaid
            ? `<span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-[6px] text-[11px] font-semibold text-emerald-700 border border-emerald-200">Pago</span>`
            : isIsentado
            ? `<span class="inline-flex items-center rounded-full bg-slate-100 px-3 py-[6px] text-[11px] font-semibold text-slate-600 border border-slate-200">Isento</span>`
            : `<button
                  type="button"
                  data-action="receive"
                  data-id="${entry.id}"
                  class="px-3 py-1 text-[11px] rounded-md border border-slate-200 hover:border-primary"
                >
                  Registrar pagamento
                </button>`;
          return `
            <tr class="${isOverdue ? "bg-rose-50/70 text-rose-700" : ""}">
              <td class="px-3 py-2 align-top" style="width: 13%; min-width: 80px;">${formatCompetence(entry.competence)}</td>
              <td class="px-3 py-2 align-top" style="width: 11%; min-width: 80px;">${formatCurrency(entry.amount || defaultFee)}</td>
              <td class="pl-3 pr-2 py-2 align-top" style="width: 20%; min-width: 120px;">${formatDateTime(entry.updatedAt)}</td>
              <td class="px-3 py-2 text-slate-600 leading-5 align-top break-words" style="width: 20%; min-width: 120px; max-width: 160px;">${
                entry.notes || "--"
              }</td>
              <td class="px-3 py-2 text-right align-top whitespace-nowrap" style="width: 18%; min-width: 120px;">
                ${actionContent}
              </td>
            </tr>
          `;
        })
        .join("");
      detailRow.innerHTML = `
  <td colspan="5" class="p-0">
    <div class="space-y-2 px-1 pb-2">
      ${
        severeDelay
          ? `<div class="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-md">
                Atenção: 2 meses em atraso (desde ${oldestOverdue ? formatCompetence(oldestOverdue.competence) : "o primeiro mês em aberto"}). Regularize para evitar penalidades.
              </div>`
          : warningDelay
          ? `<div class="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
                Mensalidade vencida desde ${oldestOverdue ? formatCompetence(oldestOverdue.competence) : "o último mês"}. Regularize o pagamento.
              </div>`
          : ""
      }
      <div class="overflow-x-auto">
        <table class="min-w-full text-[13px]">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
            <th class="px-3 py-2 text-left" style="width: 13%; min-width: 80px;">Competência</th>
              <th class="px-3 py-2 text-left" style="width: 11%; min-width: 80px;">Valor</th>
              <th class="pl-3 pr-2 py-2 text-left" style="width: 20%; min-width: 120px;">Atualização</th>
            <th class="px-3 py-2 text-left" style="width: 20%; min-width: 120px; max-width: 160px;">Observação</th>
            <th class="px-3 py-2 text-center" style="width: 18%; min-width: 120px;">Ações</th>
          </tr>
        </thead>
          <tbody class="divide-y divide-slate-100">
            ${detailRows}
          </tbody>
        </table>
      </div>
    </div>
  </td>
`;

      fragment.appendChild(detailRow);
    });

  pendingTableBody.appendChild(fragment);
}

function collectMembersForAutoInactivity(payments, referenceCompetence = currentMonthValue()) {
  const candidates = new Map();
  const previousMonth = competenceMonthsAgo(1);
  const secondPreviousMonth = competenceMonthsAgo(2);
  if (!previousMonth || !secondPreviousMonth) return candidates;
  const statusByKey = new Map();
  (payments || []).forEach((entry) => {
    if (!entry?.memberId || !entry?.competence) return;
    statusByKey.set(`${entry.memberId}|${entry.competence}`, normalizeStatusValue(entry.status));
  });
  membersIndex.forEach((member) => {
    if (!member?.id) return;
    if (normalizeStatusValue(member.status) !== "ativo") return;
    if (normalizeRoleValue(member.role) !== "socio") return;
    const firstChargeCompetence = resolveFirstChargeCompetence(member);
    if (!firstChargeCompetence || secondPreviousMonth < firstChargeCompetence) return;
    const previousStatus = statusByKey.get(`${member.id}|${previousMonth}`) || "";
    const secondPreviousStatus = statusByKey.get(`${member.id}|${secondPreviousMonth}`) || "";
    if (previousStatus !== "pendente" || secondPreviousStatus !== "pendente") return;
    candidates.set(member.id, {
      memberId: member.id,
      memberName: member.name || "Sócio",
      referenceCompetence,
      overdueCompetences: [secondPreviousMonth, previousMonth],
    });
  });
  return candidates;
}

async function syncMembersAutoInactivity(candidates) {
  if (!candidates?.size) return;
  if (!context || !["admin", "financeiro"].includes(context.profile.role)) return;
  const syncJobs = [];
  candidates.forEach((details, memberId) => {
    const key = `${memberId}:${details.referenceCompetence}`;
    if (autoInactivitySyncInFlight.has(key) || autoInactivitySynced.has(key)) return;
    const member = membersMap.get(memberId);
    if (!member || normalizeStatusValue(member.status) !== "ativo") return;
    autoInactivitySyncInFlight.add(key);
    syncJobs.push((async () => {
      try {
        const [firstOverdue, secondOverdue] = details.overdueCompetences || [];
        const reason = `${AUTO_INACTIVITY_REASON_TAG} Inativado automaticamente por inadimplência (${formatCompetence(firstOverdue)} e ${formatCompetence(secondOverdue)} em aberto).`;
        await Promise.all([
          setDoc(doc(db, "members", memberId), {
            status: "inativo",
            exitReason: reason,
            updatedAt: serverTimestamp(),
            updatedBy: context.user.uid,
            updatedByName: context.profile.name || "Sistema",
          }, { merge: true }),
          addDoc(collection(db, "members", memberId, "history"), {
            status: "inativo",
            reason,
            source: "finance:auto-inadimplencia",
            referenceCompetence: details.referenceCompetence,
            overdueCompetences: details.overdueCompetences || [],
            createdAt: serverTimestamp(),
            createdBy: context.user.uid,
            createdByName: context.profile.name || "Sistema",
          }),
        ]);
        autoInactivitySynced.add(key);
      } catch (error) {
        console.error(`Não foi possível atualizar a inatividade automática do sócio ${memberId}:`, error);
      } finally {
        autoInactivitySyncInFlight.delete(key);
      }
    })());
  });
  if (syncJobs.length) {
    await Promise.all(syncJobs);
  }
}

async function registerGeneralTransaction() {
  if (!generalTransactionDateInput || !generalTransactionTypeSelect || !generalTransactionAmountInput) return;
  const dateValue = normalizeDateInput(generalTransactionDateInput.value.trim());
  const type = generalTransactionTypeSelect.value;
  const category = generalTransactionCategorySelect?.value || "outros";
  const description = generalTransactionDescriptionInput?.value.trim() || "";
  const amount = parseCurrency(generalTransactionAmountInput.value);
  const notes = generalTransactionNotesInput?.value.trim() || "";
  const receiptFile = generalTransactionReceiptInput?.files?.[0] || null;

  if (!dateValue || !type || !category || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Dados inválidos");
  }

  if (receiptFile && receiptFile.size > MAX_RECEIPT_SIZE_BYTES) {
    throw new Error("O comprovante deve ter no máximo 10 MB.");
  }
  if (receiptFile && !isAllowedReceiptFile(receiptFile)) {
    throw new Error("Envie um comprovante em PDF ou imagem.");
  }

  let uploadedAttachment = null;
  try {
    if (receiptFile) {
      const safeName = receiptFile.name.replace(/\s+/g, "_");
      const storagePath = `finance/receipts/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, storagePath);
      if (window.setFeedback) {
        window.setFeedback(generalTransactionFeedback, "Enviando comprovante... 0%", "info");
      }
      if (uploadBytesResumable && window.setFeedback) {
        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, receiptFile, {
            contentType: receiptFile.type || "application/octet-stream",
          });
          task.on(
            "state_changed",
            (snapshot) => {
              const progress = snapshot.totalBytes
                ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                : 0;
              window.setFeedback(generalTransactionFeedback, `Enviando comprovante... ${progress}%`, "info");
            },
            reject,
            resolve,
          );
        });
      } else {
        await uploadBytes(storageRef, receiptFile, {
          contentType: receiptFile.type || "application/octet-stream",
        });
      }
      const downloadURL = await getDownloadURL(storageRef);
      if (window.setFeedback) {
        window.setFeedback(generalTransactionFeedback, "Comprovante enviado.", "success");
        setTimeout(() => window.setFeedback(generalTransactionFeedback, "", "info"), 2500);
      }
      uploadedAttachment = {
        url: downloadURL,
        path: storageRef.fullPath,
        name: receiptFile.name,
        contentType: receiptFile.type || "application/octet-stream",
        size: receiptFile.size || null,
        uploadedAt: serverTimestamp(),
      };
    }

    const payload = {
      date: dateValue,
      type,
      category,
      description,
      amount,
      notes,
      createdAt: serverTimestamp(),
      createdBy: context.user.uid,
      createdByName: context.profile.name,
    };
    if (uploadedAttachment) {
      payload.attachment = uploadedAttachment;
    }

    await addDoc(collection(db, "generalTransactions"), payload);
  } catch (error) {
    if (uploadedAttachment?.path) {
      deleteObject(ref(storage, uploadedAttachment.path)).catch(() => {});
    }
    throw error;
  } finally {
    if (generalTransactionReceiptInput) {
      generalTransactionReceiptInput.value = "";
      updateReceiptLabel();
    }
  }
}

function renderGeneralSummary() {
  if (!generalSummaryRevenue || !generalSummaryExpense || !generalSummaryBalance) return;
  const duesRevenue = aggregateTotals?.revenue || 0;
  let extraRevenue = 0;
  let expense = 0;
  generalTransactions.forEach((tx) => {
    const value = Number(tx.amount || 0);
    if (tx.type === "entrada") {
      extraRevenue += value;
    } else {
      expense += value;
    }
  });
  const totalRevenue = duesRevenue + extraRevenue;
  generalTotals = { revenue: extraRevenue, expense };
  generalSummaryRevenue.textContent = formatCurrency(totalRevenue);
  generalSummaryExpense.textContent = formatCurrency(expense);
  generalSummaryBalance.textContent = formatCurrency(totalRevenue - expense);
  if (generalSummaryDues) {
    generalSummaryDues.textContent = formatCurrency(duesRevenue);
  }
  updateOverallTotals();
  updatePreviousMonthBalance();
}

function buildGeneralMovementsList() {
  const items = [];

  generalTransactions.forEach((tx) => {
    items.push({
      id: `general:${tx.id}`,
      date: tx.date || tx.createdAt || null,
      type: tx.type === "entrada" ? "Entrada" : "Saída",
      category: formatGeneralCategory(tx.category),
      description: tx.description || "--",
      amount: Number(tx.amount || 0),
      notes: tx.notes || "--",
      attachment: tx.attachment || null,
      source: "general",
    });
  });

  allPayments
    .filter((item) => normalizeStatusValue(item.status) === "pago")
    .forEach((item) => {
      const competence = normalizeCompetenceValue(item.competence);
      const paymentDate = item.updatedAt || item.createdAt || null;
      items.push({
        id: `payment:${item.docId || item.id || ""}`,
        date: paymentDate || competenceToMonthDate(competence),
        type: "Entrada",
        category: "Mensalidade",
        description: `Mensalidade • ${item.memberName || "Sócio"} • ${competence ? formatCompetence(competence) : "--"}`,
        amount: Number(item.amount || defaultFee),
        notes: item.notes || "Mensalidade recebida",
        attachment: null,
        source: "payment",
        docId: item.docId || item.id || "",
        memberId: item.memberId || "",
        competence: competence || "",
        memberName: item.memberName || "",
      });
    });

  return items;
}

function updateGeneralTransactionsFilterOptions(items) {
  if (!generalTransactionsMonthSelect) return;
  const months = Array.from(
    new Set(
      items
        .map((item) => monthKeyFromDate(item.date))
        .filter((key) => key && key >= "2026-01"),
    ),
  ).sort((a, b) => b.localeCompare(a));
  const current = currentMonthValue();
  if (current >= "2026-01" && !months.includes(current)) {
    months.unshift(current);
  }

  const previousValue = generalTransactionsMonthSelect.value || "";
  generalTransactionsMonthSelect.innerHTML = '<option value="">Todos</option>';
  const fragment = document.createDocumentFragment();
  months.forEach((monthKey) => {
    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = formatCompetence(monthKey);
    fragment.appendChild(option);
  });
  generalTransactionsMonthSelect.appendChild(fragment);

  if (previousValue === "") {
    generalTransactionsMonthSelect.value = "";
    generalTransactionsMonthKey = "";
    return;
  }

  let resolved = previousValue || generalTransactionsMonthKey || current;
  if (resolved && months.includes(resolved)) {
    generalTransactionsMonthSelect.value = resolved;
  } else if (months.includes(current)) {
    generalTransactionsMonthSelect.value = current;
    resolved = current;
  } else {
    generalTransactionsMonthSelect.value = "";
    resolved = "";
  }
  generalTransactionsMonthKey = resolved;
}

function renderGeneralTransactions(errorMessage = "") {
  if (!generalTransactionsTbody || !generalTransactionsEmpty) return;
  generalTransactionsTbody.innerHTML = "";
  if (errorMessage) {
    generalTransactionsEmpty.textContent = errorMessage;
  } else {
    generalTransactionsEmpty.textContent = "Nenhuma movimentação registrada.";
  }
  const items = buildGeneralMovementsList();
  updateGeneralTransactionsFilterOptions(items);
  const targetMonth = generalTransactionsMonthKey || "";
  const filteredItems = items.filter((item) => {
    const key = monthKeyFromDate(item.date);
    if (!key || key < "2026-01") return false;
    return targetMonth ? key === targetMonth : true;
  });
  if (!filteredItems.length) {
    generalTransactionsEmpty.classList.remove("hidden");
    return;
  }
  generalTransactionsEmpty.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  filteredItems
    .sort((a, b) => {
      const aTime = parseDateInput(a.date)?.getTime() || 0;
      const bTime = parseDateInput(b.date)?.getTime() || 0;
      return bTime - aTime;
    })
    .forEach((tx) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-slate-50 text-sm";
    row.innerHTML = `
      <td class="px-4 py-3">
        ${
          ["admin", "financeiro"].includes(context.profile.role)
            ? tx.source === "general"
              ? `<button data-action="delete-general" data-id="${tx.id.replace("general:", "")}" class="inline-flex items-center justify-center text-rose-500 hover:text-rose-600" aria-label="Excluir lançamento" title="Excluir">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                </svg>
              </button>`
              : `<button data-action="delete-payment" data-doc-id="${tx.docId || ""}" data-member-id="${tx.memberId || ""}" data-competence="${tx.competence || ""}" data-member-name="${tx.memberName || ""}" class="inline-flex items-center justify-center text-rose-500 hover:text-rose-600" aria-label="Excluir pagamento" title="Excluir">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                </svg>
              </button>`
            : "--"
        }
      </td>
      <td class="px-4 py-3">${formatDate(tx.date)}</td>
      <td class="px-4 py-3">${tx.type}</td>
      <td class="px-4 py-3">${tx.category}</td>
      <td class="px-4 py-3 text-slate-600">${tx.description || "--"}</td>
      <td class="px-4 py-3">${formatCurrency(tx.amount || 0)}</td>
      <td class="px-4 py-3 text-slate-500">
        ${tx.notes || "--"}
        ${
          tx.attachment?.url
            ? `<div><a href="${tx.attachment.url}" target="_blank" rel="noopener" class="text-xs font-semibold text-primary hover:text-secondary">Comprovante</a></div>`
            : ""
        }
      </td>
    `;
    fragment.appendChild(row);
  });
  generalTransactionsTbody.appendChild(fragment);
}

function formatGeneralCategory(category) {
  const map = {
    operacional: "Operacional",
    event: "Evento",
    evento: "Evento",
    infraestrutura: "Infraestrutura",
    servico: "Serviços",
    joia: "Jóia",
    outros: "Outros",
  };
  return map[category] || "Outros";
}

function updateOverallTotals() {
  if (!overallRevenueLabel || !overallExpenseLabel || !overallBalanceLabel) return;
  const legacyCarryOver = getLegacyCarryOverTotal();
  const currentMonthKey = currentMonthValue();
  const otherEntriesThisMonth = generalTransactions
    .filter((tx) => tx.type === "entrada")
    .filter((tx) => monthKeyFromDate(tx.date || tx.createdAt) === currentMonthKey)
    .filter((tx) => {
      const desc = (tx?.description || "").toString().trim().toLowerCase();
      return desc !== "caixa proveniente de 2025";
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalRevenue = (aggregateTotals.revenue || 0) + (generalTotals.revenue || 0);
  const totalExpense = generalTotals.expense;
  overallRevenueLabel.textContent = formatCurrency(otherEntriesThisMonth);
  overallExpenseLabel.textContent = formatCurrency(totalExpense);
  overallBalanceLabel.textContent = formatCurrency(totalRevenue - totalExpense);
  if (barBalanceLabel) {
    const barBalance = (barTotals.revenue || 0) - (barTotals.expense || 0);
    barBalanceLabel.textContent = formatCurrency(barBalance);
  }
}

function enrichPayments(basePayments) {
  const paymentMap = new Map();
  const results = [];

  // 🔹 Normaliza os payments existentes
  basePayments.forEach((payment) => {
    if (!payment.memberId || !payment.competence) return;

    const compDate = competenceToMonthDate(payment.competence);
    const memberRecord = membersMap.get(payment.memberId);

    // 🔒 Ignora mensalidades anteriores à data de entrada real
    if (memberRecord) {
      const firstAllowedDate = resolveFirstChargeDate(memberRecord);
      if (compDate && firstAllowedDate && compDate < firstAllowedDate) {
        return;
      }
    }

    const key = `${payment.memberId}|${payment.competence}`;
    const normalized = {
      ...payment,
      id: key,
      docId: payment.docId || "",
      amount: Number(payment.amount || defaultFee),
    };

    paymentMap.set(key, normalized);
    results.push(normalized);
  });

  // 🔹 Se não houver sócios indexados, retorna o que já tem
  if (!membersIndex.length) {
    return results.sort((a, b) => a.competence.localeCompare(b.competence));
  }

  const currentCompetence = currentMonthValue();
  const targetCompetence = focusCompetence || currentCompetence;

  // 🔹 Gera mensalidades esperadas por sócio
  membersIndex
    .filter((member) => shouldCharge(member))
    .forEach((member) => {
      // 🗓️ Determina o limite mínimo e máximo de geração
      const endLimit = new Date(); // até o mês atual
      const expectedCompetences = generateExpectedCompetences(
        member,
        [currentCompetence, targetCompetence],
        endLimit
      );

      expectedCompetences.forEach((competence) => {
        const key = `${member.id}|${competence}`;
        if (paymentMap.has(key)) return; // já existe pagamento

        const fee = Number(member.monthlyFee || defaultFee);
        const compDate = competenceToMonthDate(competence);
        const dueDate = compDate
          ? new Date(compDate.getFullYear(), compDate.getMonth(), 12)
          : new Date();

        // 🔧 Ignora competências anteriores ao início oficial de cobrança
        const inicioMensalidades = new Date(CLUB_START_DATE.getFullYear(), CLUB_START_DATE.getMonth(), 1);
        if (compDate && compDate < inicioMensalidades) return;

        const status = "pendente";

        // Cria o entry sintético da mensalidade pendente
        const synthetic = {
          id: key,
          docId: "",
          memberId: member.id,
          memberName: member.name || "Sócio",
          memberRole: member.role || "visitante",
          competence,
          status,
          notes: "Vencimento no dia 12.",
          amount: fee,
          updatedAt: Timestamp.fromDate(dueDate),
          synthetic: true,
        };

        paymentMap.set(key, synthetic);
        results.push(synthetic);
      });
    });

  // 🔹 Retorna ordenado e com valores numéricos garantidos
  return results
    .sort((a, b) => a.competence.localeCompare(b.competence))
    .map((payment) => ({
      ...payment,
      amount: Number(payment.amount || defaultFee),
    }));
}

function renderMemberOptions(preselectId = "") {
  if (!paymentMemberSelect) return;
  const previous = preselectId || paymentMemberSelect.value;
  paymentMemberSelect.innerHTML = '<option value="">Selecione um sócio</option>';
  const fragment = document.createDocumentFragment();
  membersIndex
    .filter((member) => (member.status || "ativo") === "ativo" && member.role !== "crianca")
    .forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = `${member.name} • ${formatRole(member.role)}`;
      fragment.appendChild(option);
    });
  paymentMemberSelect.appendChild(fragment);
  if (previous && membersMap.has(previous)) {
    paymentMemberSelect.value = previous;
  } else {
    paymentMemberSelect.value = "";
  }
  updatePaymentMemberSummary(paymentMemberSelect.value, { forceAmount: !previous });
}

function updatePaymentMemberSummary(memberId, { forceAmount = false } = {}) {
  if (!paymentMemberSummary) return;
  if (!memberId) {
    paymentMemberSummary.textContent = "Selecione um sócio para carregar o valor da mensalidade.";
    if (paymentAmountInput) {
      paymentAmountInput.value = formatCurrencyInputValue(defaultFee);
    }
    return;
  }
  const member = membersMap.get(memberId);
  if (!member) {
    paymentMemberSummary.textContent = "Não foi possível carregar os data do sócio.";
    return;
  }
  const fee = Number.isFinite(member.monthlyFee) ? member.monthlyFee : defaultFee;
  paymentMemberSummary.textContent = `${formatRole(member.role)} • Mensalidade padrão: ${formatCurrency(fee)}`;
  if (paymentAmountInput) {
    const current = parseCurrency(paymentAmountInput.value);
    const usePreset =
      forceAmount ||
      !Number.isFinite(current) ||
      current <= 0 ||
      Math.abs(current - defaultFee) < 0.005;
    if (usePreset) {
      paymentAmountInput.value = formatCurrencyInputValue(fee);
    }
  }
}

function openPaymentDialog(preset = {}) {
  if (!paymentDialog) return;
  resetPaymentForm();
  renderMemberOptions(preset.memberId || "");
  if (preset.memberId) {
    paymentMemberSelect.value = preset.memberId;
    updatePaymentMemberSummary(preset.memberId, { forceAmount: !preset.amount });
  }
  paymentIdInput.value = preset.docId || "";
  lockedCompetence = normalizeCompetenceValue(preset.competence || "");
  if (paymentMonthInput) {
    paymentMonthInput.value = lockedCompetence
      ? currentPaymentDateValue()
      : formatCompetenceForDateInput(preset.competence);
    syncPaymentDateDisplay();
  }
  paymentStatusSelect.value = preset.status || "pago";
  if (preset.amount) {
    paymentAmountInput.value = formatCurrencyInputValue(preset.amount || 0);
  }
  paymentNotesInput.value = preset.notes || "";
  showPaymentFeedback("");
  paymentDialog.showModal();
}

function resetPaymentForm() {
  if (!paymentForm) return;
  paymentForm.reset();
  paymentIdInput.value = "";
  lockedCompetence = "";
  if (paymentMonthInput) {
    paymentMonthInput.value = currentPaymentDateValue();
    syncPaymentDateDisplay();
  }
  paymentStatusSelect.value = "pago";
  if (paymentAmountInput) {
    paymentAmountInput.value = formatCurrencyInputValue(defaultFee);
  }
  paymentNotesInput.value = "";
  showPaymentFeedback("");
  if (paymentMemberSelect) paymentMemberSelect.value = "";
  updatePaymentMemberSummary("", { forceAmount: true });
}

function showPaymentFeedback(message, variant = "") {
  if (!paymentFeedback) return;
  paymentFeedback.classList.remove(
    "hidden",
    "border-green-200",
    "bg-green-50",
    "text-green-700",
    "border-rose-200",
    "bg-rose-50",
    "text-rose-700",
  );
  if (!message) {
    paymentFeedback.textContent = "";
    paymentFeedback.classList.add("hidden");
    return;
  }
  if (variant === "success") {
    paymentFeedback.classList.add("border-green-200", "bg-green-50", "text-green-700");
  } else if (variant === "error") {
    paymentFeedback.classList.add("border-rose-200", "bg-rose-50", "text-rose-700");
  }
  paymentFeedback.textContent = message;
}

async function handlePaymentSubmit() {
  const memberId = paymentMemberSelect.value;
  const competenceRaw = paymentMonthInput?.value;
  const competence = lockedCompetence || normalizeCompetenceValue(competenceRaw);
  if (!memberId || !competence) {
    showPaymentFeedback("Selecione o sócio e a competência para continuar.", "error");
    return;
  }
  const status = normalizeStatusValue(paymentStatusSelect.value || "pago");
  const amount = parseCurrency(paymentAmountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showPaymentFeedback("Informe um valor válido para o pagamento.", "error");
    return;
  }
  const notes = paymentNotesInput.value.trim();
  const providedDocId = paymentIdInput.value;
  const existingPayment = findExistingPayment(memberId, competence);
  const existingStatus = normalizeStatusValue(existingPayment?.status);
  const isEditingExisting = Boolean(
    providedDocId &&
      existingPayment?.docId &&
      providedDocId === existingPayment.docId
  );
  if (existingPayment && existingStatus === "pago" && status === "pago" && !isEditingExisting) {
    showPaymentFeedback(
      "Esta competência já está marcada como paga para este sócio. Não é possível receber duas vezes.",
      "error",
    );
    paymentIdInput.value = existingPayment.docId || providedDocId || "";
    return;
  }

  const docId = providedDocId || existingPayment?.docId || `${memberId}_${competence}`;
  try {
    await upsertPayment({ memberId, competence, status, amount, notes, docId });
    // Atualiza localmente para refletir de imediato
    const member = membersMap.get(memberId) || {};
    paymentIdInput.value = docId;
    rawPayments = rawPayments
      .filter((p) => !(p.memberId === memberId && normalizeCompetenceValue(p.competence) === competence))
      .concat([
        {
          memberId,
          memberName: member.name || "Sócio",
          memberRole: member.role || "visitante",
          competence,
          status,
          amount,
          notes,
          docId,
          updatedAt: new Date().toISOString(),
          updatedBy: context.user?.uid || null,
          updatedByName: context.profile?.name || null,
        },
      ]);
    showPaymentFeedback("Registro salvo com sucesso.", "success");
    setTimeout(() => paymentDialog.close(), 500);
    refreshFinanceData();
  } catch (error) {
    console.error(error);
    showPaymentFeedback("Não foi possível salvar o entry. Tente novamente.", "error");
  }
}

function findExistingPayment(memberId, competence) {
  const normalizedCompetence = normalizeCompetenceValue(competence);
  return (
    rawPayments
      .filter(
        (payment) =>
          payment.memberId === memberId && normalizeCompetenceValue(payment.competence) === normalizedCompetence,
      )
      .sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))[0] || null
  );
}

async function upsertPayment({ memberId, competence, status, amount, notes, docId = "" }) {
  const member = membersMap.get(memberId) || {};
  const fee = Number.isFinite(amount) && amount > 0 ? amount : Number(member.monthlyFee || defaultFee);
  const paymentDocId = docId || `${memberId}_${competence}`;
  const payload = {
    memberId,
    memberName: member.name || "Sócio",
    memberRole: member.role || "visitante",
    competence,
    status,
    notes,
    amount: fee,
    updatedAt: serverTimestamp(),
    updatedBy: context.user?.uid || null,
    updatedByName: context.profile?.name || null,
  };
  await Promise.all([
    setDoc(doc(db, "payments", paymentDocId), payload, { merge: true }),
    setDoc(doc(db, "members", memberId, "payments", competence), payload, { merge: true }),
  ]);
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value.toMillis) {
    try {
      return value.toMillis();
    } catch (error) {
      // fall through
    }
  }
  if (value.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date?.getTime())) return date.getTime();
  }
  const parsed = parseDateInput(value);
  return parsed ? parsed.getTime() : 0;
}

async function exportActiveMembers() {
  const targetCompetence = currentMonthValue();
  let paymentsData = rawPayments || [];
  if (!paymentsData.length) {
    const paymentsSnap = await getDocs(
      query(collection(db, "payments"), where("competence", "==", targetCompetence)),
    );
    paymentsData = paymentsSnap.docs.map((docSnap) => ({ docId: docSnap.id, ...docSnap.data() }));
  }
  const statusPriority = (value) => {
    const normalized = normalizeStatusValue(value);
    if (normalized.startsWith("pago") || normalized === "quitado") return 3;
    if (normalized.includes("isento") || normalized === "isentado") return 2;
    return 1;
  };
  const statusLabel = (value) => {
    const normalized = normalizeStatusValue(value);
    if (normalized.startsWith("pago") || normalized === "quitado") return "Pago";
    if (normalized.includes("isento") || normalized === "isentado") return "Isentado";
    return "Pendente";
  };
  const paymentsByMember = new Map();
  paymentsData
    .filter((payment) => normalizeCompetenceValue(payment.competence) === targetCompetence)
    .forEach((payment) => {
      const memberId = payment.memberId;
      if (!memberId) return;
      const current = paymentsByMember.get(memberId);
      const incomingStatus = normalizeStatusValue(payment.status);
      if (!current || statusPriority(incomingStatus) > statusPriority(current)) {
        paymentsByMember.set(memberId, incomingStatus);
      }
    });
  const membersSnapshot = await getDocs(collection(db, "members"));
  const rows = [["Nome", "Perfil", "Email", "Telefone", "Entrada", "Mensalidade"]];
  membersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((data) => (data.status || "ativo") === "ativo")
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((data) => {
      const paymentStatus = paymentsByMember.get(data.id) || "pendente";
      rows.push([
        data.name,
        formatRole(data.role),
        data.email || "",
        data.phone || "",
        formatDate(data.joinDate),
        statusLabel(paymentStatus),
      ]);
    });
  downloadExcel(rows, "amigosdabola-socios-ativos.xls");
}

function exportPendingPaymentsCsv() {
  const rows = [["Sócio", "Perfil", "Competência", "Valor", "Observação"]];
  pendingPayments.forEach((item) => {
    rows.push([
      item.memberName,
      formatRole(item.memberRole),
      formatCompetence(item.competence),
      formatCurrency(item.amount || defaultFee),
      item.notes || "",
    ]);
  });
  downloadExcel(rows, "amigosdabola-pendencias.xls");
}

async function importFinanceData(file) {
  if (typeof XLSX === "undefined") {
    throw new Error("Biblioteca XLSX não carregada.");
  }
  await ensureMembersCache();
  const supplementalPayments = await loadSupplementalPaymentsMap();
  const workbook = await readWorkbook(file);
  const firstSheet = workbook.SheetNames?.[0];
  if (!firstSheet) {
    throw new Error("Planilha sem abas disponíveis.");
  }
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });
  if (!rows.length) {
    throw new Error("Planilha vazia.");
  }

  const membersByEmail = new Map();
  const membersByName = new Map();
  membersIndex.forEach((member) => {
    const email = (member.email || "").toLowerCase();
    if (email) membersByEmail.set(email, member);
    const normalizedNames = new Set();
    const primaryName = normalizeName(member.name);
    if (primaryName) normalizedNames.add(primaryName);
    if (member.nickname) normalizedNames.add(normalizeName(member.nickname));
    if (member.altName) normalizedNames.add(normalizeName(member.altName));
    normalizedNames.forEach((key) => {
      if (key && !membersByName.has(key)) {
        membersByName.set(key, member);
      }
    });
  });

  const referenceYear = detectReferenceYear(rows);

  let paymentsCreated = 0;
  let membersMatched = 0;
  const unmatched = [];
  const writes = [];

  for (const originalRow of rows) {
    const row = normalizeImportRow(originalRow);
    const candidateName = normalizeName(
      row.get("nome") ||
        row.get("name") ||
        row.get("empty") ||
        row.get("empty1") ||
        row.get("empty2") ||
        "",
    );

    if (
      !candidateName ||
      ["nome", "nome completo", "name", "member", "socio"].includes(candidateName)
    ) {
      const hasContent = Array.from(row.values()).some((value) => String(value || "").trim().length);
      if (!hasContent || candidateName === "nome" || candidateName === "name") {
        continue;
      }
    }

    const emailFromRow = normalizeEmailValue(row.get("email") || row.get("e-mail") || "");
    const provisionalPassword = extractTemporaryPassword(row, originalRow);
    const mustResetFromRow = parseBooleanFlag(row.get("mustresetpassword"));
    const resolvedMustReset =
      typeof mustResetFromRow === "boolean" ? mustResetFromRow : Boolean(provisionalPassword);

    const { member, reason } = resolveMemberForImport(row, { membersByEmail, membersByName });
    if (!member) {
      const fallbackId = normalizeIdentifier(candidateName);
      if (!fallbackId) {
        if (reason && reason !== "linha sem identificação") {
          unmatched.push(reason);
        }
        continue;
      }
      const fallbackMember = {
        id: fallbackId,
        name: candidateName,
        role: row.get("perfil") || row.get("role") || "socio",
        status: (row.get("status") || "ativo").toLowerCase(),
        monthlyFee: parseCurrency(row.get("mensalidade")) || defaultFee,
        joinDate: formatBrazilianDateString(
          row.get("joindate") ||
            row.get("entrada") ||
            row.get("Entrada no clube") ||
            row.get("data de entrada") ||
            "",
        ),
        birthDate: formatBrazilianDateString(
          row.get("birthdate") ||
            row.get("data de nascimento") ||
            row.get("datadenascimento") ||
            row.get("nascimento") ||
            row.get("aniversario") ||
            "",
        ),
        email: emailFromRow || null,
        temporaryPassword: provisionalPassword || null,
        mustResetPassword: resolvedMustReset,
      };
      membersIndex.push(fallbackMember);
      membersMap.set(fallbackMember.id, fallbackMember);
      membersByName.set(normalizeName(fallbackMember.name), fallbackMember);
      if (emailFromRow) {
        membersByEmail.set(emailFromRow, fallbackMember);
      }
      processMemberRow(
        fallbackMember,
        row,
        originalRow,
        referenceYear,
        writes,
        () => {
          paymentsCreated += 1;
        },
        {
          isNew: true,
          normalizedName: candidateName,
          supplementalPayments,
        },
      );
      membersMatched += 1;
      continue;
    }

    processMemberRow(
      member,
      row,
      originalRow,
      referenceYear,
      writes,
      () => {
        paymentsCreated += 1;
      },
      {
        isNew: false,
        normalizedName: candidateName,
        supplementalPayments,
      },
    );
    membersMatched += 1;
    if (emailFromRow) {
      membersByEmail.set(emailFromRow, member);
    }
    membersMap.set(member.id, member);
  }

  if (writes.length) {
    await Promise.all(writes.flat());
  }

  return { paymentsCreated, membersMatched, unmatched };
}

function processMemberRow(member, row, originalRow, referenceYear, writes, onPayment, options = {}) {
  const {
    isNew = false,
    normalizedName = "",
    supplementalPayments = null,
  } = options;
  const memberRef = doc(db, "members", member.id);
  const previousEmail = typeof member.email === "string" ? member.email.trim().toLowerCase() : "";
  const previousTemporaryPassword =
    typeof member.temporaryPassword === "string" ? member.temporaryPassword : "";
  const previousMustReset =
    typeof member.mustResetPassword === "boolean" ? member.mustResetPassword : false;

  const emailFromRow = normalizeEmailValue(row.get("email") || row.get("e-mail") || "");
  const provisionalPassword = extractTemporaryPassword(row, originalRow);
  const mustResetFromRow = parseBooleanFlag(row.get("mustresetpassword"));
  const resolvedMustReset =
    typeof mustResetFromRow === "boolean"
      ? mustResetFromRow
      : provisionalPassword
        ? true
        : previousMustReset;

  if (emailFromRow) {
    member.email = emailFromRow;
  }
  if (provisionalPassword) {
    member.temporaryPassword = provisionalPassword;
  }
  member.mustResetPassword = resolvedMustReset;

  if (isNew) {
    const birthFromRow = formatBrazilianDateString(
      row.get("birthdate") ||
        row.get("data de nascimento") ||
        row.get("datadenascimento") ||
        row.get("nascimento") ||
        row.get("aniversario") ||
        "",
    );
    const initialPayload = {
      name: member.name,
      role: member.role,
      status: member.status || "ativo",
      joinDate:
        member.joinDate ||
        formatBrazilianDateString(
          row.get("joindate") ||
            row.get("entrada") ||
            row.get("Entrada no clube") ||
            row.get("data de entrada") ||
            "",
        ),
      birthDate: birthFromRow || member.birthDate || null,
      monthlyFee: Number.isFinite(member.monthlyFee)
        ? member.monthlyFee
        : parseCurrency(row.get("mensalidade")) || defaultFee,
      email: emailFromRow || previousEmail || null,
      createdAt: serverTimestamp(),
    };
    if (typeof resolvedMustReset === "boolean") {
      initialPayload.mustResetPassword = resolvedMustReset;
    }
    if (provisionalPassword) {
      initialPayload.temporaryPassword = provisionalPassword;
      initialPayload.passwordIssuedAt = serverTimestamp();
    }
    writes.push(setDoc(memberRef, initialPayload, { merge: true }));
    if (emailFromRow) {
      writes.push(
        setDoc(doc(db, "membersByEmail", emailFromRow), { memberId: member.id }, { merge: true }),
      );
    }
  } else {
    const updates = {};
    let emailChanged = false;
    if (emailFromRow && emailFromRow !== previousEmail) {
      updates.email = emailFromRow;
      emailChanged = true;
    }
    if (typeof resolvedMustReset === "boolean" && resolvedMustReset !== previousMustReset) {
      updates.mustResetPassword = resolvedMustReset;
    }
    if (provisionalPassword && provisionalPassword !== previousTemporaryPassword) {
      updates.temporaryPassword = provisionalPassword;
      updates.passwordIssuedAt = serverTimestamp();
    }
    if (Object.keys(updates).length) {
      updates.updatedAt = serverTimestamp();
      updates.updatedBy = context?.user?.uid || null;
      writes.push(setDoc(memberRef, updates, { merge: true }));
    }
    if (emailChanged) {
      writes.push(
        setDoc(doc(db, "membersByEmail", emailFromRow), { memberId: member.id }, { merge: true }),
      );
      if (previousEmail) {
        writes.push(deleteDoc(doc(db, "membersByEmail", previousEmail)));
      }
    }
  }

  const feeValue = parseCurrency(row.get("mensalidade"));
  if (Number.isFinite(feeValue) && feeValue > 0 && feeValue !== member.monthlyFee) {
    member.monthlyFee = feeValue;
    writes.push(setDoc(memberRef, { monthlyFee: feeValue }, { merge: true }));
  }

  const joinValue = formatBrazilianDateString(
    row.get("entrada") ||
      row.get("Entrada no clube") ||
      row.get("joindate") ||
      row.get("data de entrada") ||
      "",
  );
  if (joinValue && joinValue !== member.joinDate) {
    member.joinDate = joinValue;
    writes.push(setDoc(memberRef, { joinDate: joinValue }, { merge: true }));
  }

  const birthValue = formatBrazilianDateString(
    row.get("birthdate") ||
      row.get("data de nascimento") ||
      row.get("datadenascimento") ||
      row.get("nascimento") ||
      row.get("aniversario") ||
      "",
  );
  if (birthValue && birthValue !== member.birthDate) {
    member.birthDate = birthValue;
    writes.push(setDoc(memberRef, { birthDate: birthValue }, { merge: true }));
  }

  const statusValue = String(row.get("status") || "").trim().toLowerCase();
  if (statusValue && statusValue !== (member.status || "")) {
    member.status = statusValue;
    writes.push(setDoc(memberRef, { status: statusValue }, { merge: true }));
  }

  const payments = derivePaymentsFromRow(originalRow, referenceYear);
  const supplementalBucket = resolveSupplementalPaymentsBucket(
    supplementalPayments,
    member,
    row,
    normalizedName,
  );
  if (supplementalBucket) {
    mergeSupplementalPayments(payments, supplementalBucket);
  }
  payments.forEach((payment) => {
    const docId = `${member.id}_${payment.competence}`;
    const amount = Number.isFinite(payment.amount) && payment.amount > 0
      ? payment.amount
      : Number(member.monthlyFee || defaultFee);
    const payload = {
      memberId: member.id,
      memberName: member.name || row.get("nome") || row.get("name") || "Sócio",
      memberRole: member.role || row.get("role") || "visitante",
      competence: payment.competence,
      status: payment.status,
      notes: payment.notes,
      amount,
      updatedAt: serverTimestamp(),
      updatedBy: context?.user?.uid || null,
      updatedByName: context?.profile?.name || null,
    };
    writes.push([
      setDoc(doc(db, "payments", docId), payload, { merge: true }),
      setDoc(doc(db, "members", member.id, "payments", payment.competence), payload, { merge: true }),
    ]);
    onPayment();
  });
}

function normalizeIdentifier(value) {
  const normalized = normalizeName(value);
  if (!normalized) return "";
  return normalized.replace(/[^a-z0-9]/g, "-");
}

function normalizeEmailValue(value) {
  if (!value) return "";
  const fixed = fixEncoding(value);
  return String(fixed).trim().toLowerCase();
}

function parseBooleanFlag(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  const plain = normalized.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (["true", "1", "yes", "sim", "y", "verdadeiro"].includes(plain)) return true;
  if (["false", "0", "no", "nao", "n", "falso"].includes(plain)) return false;
  return null;
}

function extractTemporaryPassword(rowMap, originalRow) {
  const candidates = [
    rowMap.get("temporarypassword"),
    rowMap.get("senhaprovisoria"),
    rowMap.get("senha"),
    originalRow?.temporaryPassword,
    originalRow?.senha,
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const value = String(candidate).trim();
    if (value) return value;
  }
  return "";
}

async function ensureMembersCache() {
  if (membersIndex.length) return;
  const snapshot = await getDocs(collection(db, "members"));
  membersIndex = snapshot.docs.map((docSnap) => {
    const data = { id: docSnap.id, ...docSnap.data() };
    return applyJoinDateOverride(data);
  });
  membersMap = new Map(membersIndex.map((member) => [member.id, member]));
}

function downloadExcel(rows, filename) {
  if (!rows.length) return;
  if (typeof XLSX === "undefined") {
    notify("error", "Biblioteca XLSX não carregada.");
    return;
  }
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");
  const normalized = filename.replace(/\.xls$/i, ".xlsx");
  const fileName = normalized.endsWith(".xlsx") ? normalized : `${normalized}.xlsx`;
  XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
}

async function loadSupplementalPaymentsMap() {
  if (supplementalPaymentsPromise) {
    return supplementalPaymentsPromise;
  }
  if (typeof XLSX === "undefined" || typeof fetch === "undefined") {
    supplementalPaymentsPromise = Promise.resolve(new Map());
    return supplementalPaymentsPromise;
  }
  supplementalPaymentsPromise = (async () => {
    try {
      const response = await fetch("../mensalidades_import.csv", { cache: "no-store" });
      if (!response.ok) {
        return new Map();
      }
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("text") ? await response.text() : await response.arrayBuffer();
      const workbook =
        typeof payload === "string"
          ? XLSX.read(payload, { type: "string" })
          : XLSX.read(payload, { type: "array" });
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName) return new Map();
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
      if (!rows.length) return new Map();
      const referenceYear = detectReferenceYear(rows);
      const store = new Map();
      rows.forEach((originalRow) => {
        const normalizedRow = normalizeImportRow(originalRow);
        const possibleName =
          normalizedRow.get("nome") ||
          normalizedRow.get("name") ||
          normalizedRow.get("apelido") ||
          normalizedRow.get("apelido do clube") ||
          normalizedRow.get("empty") ||
          "";
        const nameKey = normalizeName(possibleName);
        const emailKey = normalizeEmailValue(
          normalizedRow.get("email") || normalizedRow.get("e-mail") || originalRow.email || "",
        );
        if (!nameKey && !emailKey) return;
        const bucket = getOrCreateSupplementalBucket(store, [nameKey, emailKey].filter(Boolean));
        const payments = derivePaymentsFromRow(originalRow, referenceYear);
        payments.forEach((payment) => {
          if (!payment || !payment.competence) return;
          bucket.set(payment.competence, { ...payment });
        });
      });
      return store;
    } catch (error) {
      console.warn("Não foi possível carregar mensalidades complementares:", error);
      return new Map();
    }
  })();
  return supplementalPaymentsPromise;
}

async function loadJoinDateOverrides() {
  if (joinDateOverridesPromise) {
    return joinDateOverridesPromise;
  }
  joinDateOverridesPromise = Promise.resolve(joinDateOverrides);
  return joinDateOverridesPromise;
}

function getOrCreateSupplementalBucket(store, rawKeys) {
  const keys = Array.isArray(rawKeys) ? rawKeys.filter(Boolean) : [];
  if (!keys.length) return new Map();
  let existing = null;
  keys.forEach((key) => {
    if (existing || !key) return;
    existing = store.get(key) || null;
  });
  const bucket = existing || new Map();
  keys.forEach((key) => {
    if (!key) return;
    store.set(key, bucket);
  });
  return bucket;
}

async function readWorkbook(file) {
  const arrayBuffer = await file.arrayBuffer();
  return XLSX.read(arrayBuffer, { type: "array" });
}

function normalizeImportRow(row) {
  const map = new Map();
  Object.entries(row).forEach(([key, value]) => {
    if (!key) return;
    const normalizedKey = normalizeHeader(key);
    map.set(normalizedKey, value);
  });
  return map;
}

function resolveMemberForImport(rowMap, { membersByEmail, membersByName }) {
  const email = String(rowMap.get("email") || rowMap.get("e-mail") || "").trim().toLowerCase();
  if (email && membersByEmail.has(email)) {
    return { member: membersByEmail.get(email) };
  }
  const possibleNames = [
    rowMap.get("nome"),
    rowMap.get("name"),
    rowMap.get("apelido"),
    rowMap.get("apelido do clube"),
    rowMap.get("nickname"),
  ];
  rowMap.forEach((value, key) => {
    if (/^empty\d*$/.test(key) && value) {
      possibleNames.push(value);
    }
  });
  for (const rawName of possibleNames) {
    const normalized = normalizeName(rawName);
    if (normalized && membersByName.has(normalized)) {
      return { member: membersByName.get(normalized) };
    }
  }
  const fallbackName = possibleNames.find((value) => value && String(value).trim());
  const reason = (fallbackName && String(fallbackName).trim()) || email || "linha sem identificação";
  return { member: null, reason };
}

function derivePaymentsFromRow(row, referenceYear) {
  const payments = [];
  const seen = new Set();
  const rawType = row.recordType || row.recordtype || row.tipo || "";
  const normalizedType = typeof rawType === "string" ? normalizeHeader(rawType) : "";

  if (normalizedType === "mensalidade") {
    const competence = parseCompetenceFromLegacyValue(
      row["competencia_mm/aaaa"] ||
        row["competence mm/aaaa"] ||
        row["competence"] ||
        row["competencia_mm_aaaa"] ||
        "",
      referenceYear,
    );
    if (competence) {
      const status = normalizeLegacyPaymentStatus(row["status_pagamento"] || row.status || "");
      const amount = parseCurrency(row.value || row.amount || row["valor pago"] || row["value pago"]);
      const paymentDate = row["pagamento_dd/mm/aaaa"] || row["data_pagamento"] || "";
      const description = row.descricao || row["descricao"] || row.notes || "";
      const paymentForm = row["forma_pagamento"] || row.forma || "";
      const noteParts = [];
      if (paymentDate) noteParts.push(`Pago em ${String(paymentDate).trim()}`);
      if (paymentForm) noteParts.push(`Forma: ${String(paymentForm).trim()}`);
      if (description) noteParts.push(String(description).trim());
      const notes = noteParts
        .map((value) => String(value || "").trim())
        .filter((value, index, array) => value && array.indexOf(value) === index)
        .join(" • ");
      payments.push({
        competence,
        status,
        amount,
        notes,
      });
      seen.add(competence);
    }
  }

  Object.entries(row).forEach(([key, rawValue]) => {
    if (!key) return;
    const trimmedKey = String(key).trim();
    const match = /^payment[: ](\d{4})[-/](\d{2})$/i.exec(trimmedKey);
    if (match) {
      const [_, year, month] = match;
      const competence = `${year}-${month}`;
      const rawText = String(rawValue ?? "").trim();
      if (!rawText) return;
      const status = normalizeLegacyPaymentStatus(rawText);
      const amountKey = `paymentAmount:${year}-${month}`;
      const notesKey = `paymentNotes:${year}-${month}`;
      const amount = parseCurrency(row[amountKey]);
      const notes = row[notesKey] ? String(row[notesKey]).trim() : rawText;
      payments.push({ competence, status, amount, notes });
      seen.add(competence);
      return;
    }

    const monthKey = normalizeHeader(trimmedKey);
    const monthNumber = MONTHS_PT[monthKey];
    if (!monthNumber) return;
    const competence = `${referenceYear}-${String(monthNumber).padStart(2, "0")}`;
    if (seen.has(competence)) return;
    const rawText = String(rawValue || "").trim();
    if (!rawText) return;
    const status = normalizeLegacyPaymentStatus(rawText);
    payments.push({ competence, status, amount: NaN, notes: rawText });
    seen.add(competence);
  });
  return payments;
}

function normalizeLegacyPaymentStatus(value) {
  if (value === undefined || value === null) return "pendente";
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return "pendente";
  if (normalized.includes("isent")) return "isentado";
  if (
    normalized.includes("pago") ||
    normalized.includes("quit") ||
    normalized.includes("receb") ||
    normalized.includes("ok")
  ) {
    return "pago";
  }
  return "pendente";
}

function parseCompetenceFromLegacyValue(value, referenceYear) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const isoMatch = /^(\d{4})[-/](\d{2})$/.exec(raw);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`;
  }
  const reversedMatch = /^(\d{2})[-/](\d{4})$/.exec(raw);
  if (reversedMatch) {
    return `${reversedMatch[2]}-${reversedMatch[1]}`;
  }
  const parsedDate = parseDateString(raw);
  if (parsedDate) {
    return formatCompetenceKeyFromDate(parsedDate);
  }
  const monthToken = normalizeHeader(raw);
  const monthNumber = MONTHS_PT[monthToken];
  if (Number.isFinite(monthNumber)) {
    const year = Number.isFinite(referenceYear) ? referenceYear : new Date().getFullYear();
    return `${year}-${String(monthNumber).padStart(2, "0")}`;
  }
  return "";
}

function resolveSupplementalPaymentsBucket(store, member, rowMap, normalizedName) {
  if (!store || !(store instanceof Map)) return null;
  const keys = new Set();
  if (member) {
    keys.add(normalizeEmailValue(member.email || ""));
    keys.add(normalizeName(member.name || ""));
    keys.add(normalizeName(member.nickname || ""));
    keys.add(normalizeName(member.altName || ""));
  }
  if (rowMap instanceof Map) {
    keys.add(normalizeEmailValue(rowMap.get("email") || rowMap.get("e-mail") || ""));
    keys.add(
      normalizeName(
        rowMap.get("nome") ||
          rowMap.get("name") ||
          rowMap.get("apelido") ||
          rowMap.get("apelido do clube") ||
          "",
      ),
    );
  }
  if (normalizedName) {
    keys.add(normalizedName);
  }
  for (const key of keys) {
    if (!key) continue;
    if (store.has(key)) {
      return store.get(key);
    }
  }
  return null;
}

function mergeSupplementalPayments(primaryPayments, supplementalBucket) {
  if (!Array.isArray(primaryPayments) || !supplementalBucket) return;
  const index = new Map();
  primaryPayments.forEach((payment) => {
    if (!payment || !payment.competence) return;
    index.set(payment.competence, payment);
  });
  supplementalBucket.forEach((supplemental, competence) => {
    if (!competence || !supplemental) return;
    const current = index.get(competence);
    if (current) {
      if ((!current.status || current.status === "pendente") && supplemental.status) {
        current.status = supplemental.status;
      }
      if (
        (!Number.isFinite(current.amount) || current.amount <= 0) &&
        Number.isFinite(supplemental.amount)
      ) {
        current.amount = supplemental.amount;
      }
      if (supplemental.notes) {
        if (!current.notes) {
          current.notes = supplemental.notes;
        } else if (!current.notes.includes(supplemental.notes)) {
          current.notes = `${current.notes} • ${supplemental.notes}`;
        }
      }
      return;
    }
    const clone = {
      competence,
      status: supplemental.status || "pendente",
      amount: supplemental.amount,
      notes: supplemental.notes || "",
    };
    primaryPayments.push(clone);
    index.set(competence, clone);
  });
}

function getJoinDateOverride(member) {
  if (!member || !joinDateOverrides || !joinDateOverrides.size) return "";
  const keys = new Set();
  const register = (value) => {
    if (!value) return;
    const normalized = normalizeName(String(value));
    if (normalized) {
      keys.add(normalized);
    }
  };
  register(member.name);
  register(member.nickname);
  register(member.altName);
  register(member.nameNormalized);
  register(member.normalizedName);
  for (const key of keys) {
    if (joinDateOverrides.has(key)) {
      return joinDateOverrides.get(key);
    }
  }
  return "";
}

function applyJoinDateOverride(member) {
  if (!member) return member;
  const current = member.joinDate;
  const hasJoinDate =
    (typeof current === "string" && current.trim().length) ||
    (current && typeof current === "object");
  if (!hasJoinDate) {
    const override = getJoinDateOverride(member);
    if (override) {
      member.joinDate = override;
    }
  }
  return member;
}

function detectReferenceYear(rows) {
  let candidate = null;
  const sample = rows[0] || {};
  Object.keys(sample).forEach((key) => {
    const match = /(\d{4})/.exec(String(key));
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        candidate = value;
      }
    }
  });
  if (candidate) return candidate;
  const today = new Date();
  return today.getFullYear();
}

const MONTHS_PT = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abr: 4,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
  dez: 12,
};

function normalizeHeader(value) {
  const fixed = fixEncoding(value);
  return String(fixed)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9:\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(value) {
  if (!value) return "";
  const fixed = fixEncoding(value);
  return String(fixed)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fixEncoding(value) {
  if (!value || typeof value !== "string") return value;
  if (!/[ÃÂÕÕÑÂ]/.test(value)) return value;
  try {
    const bytes = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
      bytes[i] = value.charCodeAt(i);
    }
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return decoded;
  } catch (error) {
    return value;
  }
}

function parseCurrency(value) {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function competenceMonthsAgo(offset) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  return formatCompetenceKeyFromDate(date);
}

function formatCompetenceKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getPendingReferenceDate() {
  const today = new Date();
  const reference = new Date(today.getFullYear(), today.getMonth(), 1);
  if (today.getDate() <= 12) {
    reference.setMonth(reference.getMonth() - 1);
  }
  reference.setDate(1);
  return reference;
}

function generateExpectedCompetences(member, additionalCompetences = [], endLimit = null) {
  // 🔹 Determina a data real de entrada do sócio
  const firstDate = resolveFirstChargeDate(member);
  if (!firstDate || isNaN(firstDate)) return [];

  const competences = new Set();
  const today = new Date();

  // 🔹 Define o limite mínimo global (a partir de quando o clube passou a cobrar)
  const inicioMensalidades = new Date(2024, 7, 1); // Agosto/2024 (mês = 7)

  // 🔹 O sócio só começa a ser cobrado no maior entre data de entrada e agosto/2024
  const dataInicioCobranca =
    firstDate > inicioMensalidades ? firstDate : inicioMensalidades;

  // 🔹 Limite máximo (ou today, se não definido)
  const limiteCobranca = endLimit
    ? new Date(endLimit.getFullYear(), endLimit.getMonth(), 1)
    : today;

  // 🔹 Gera competências mensais dentro do intervalo válido
  let cursor = new Date(
    dataInicioCobranca.getFullYear(),
    dataInicioCobranca.getMonth(),
    1
  );

  while (cursor <= limiteCobranca && cursor <= today) {
    const competence = formatCompetenceKeyFromDate(cursor);
    competences.add(competence);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // 🔹 Adiciona competências extras, se estiverem dentro do intervalo
  additionalCompetences.forEach((competence) => {
    const compDate = competenceToMonthDate(competence);
    if (compDate && compDate >= dataInicioCobranca && compDate <= limiteCobranca) {
      competences.add(competence);
    }
  });

  return Array.from(competences).sort((a, b) => a.localeCompare(b));
}


function formatRole(role) {
  const roles = {
    admin: "Administrador",
    diretor: "Diretor",
    tesoureiro: "Tesoureiro",
    financeiro: "Financeiro",
    member: "Sócio",
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

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentPaymentDateValue() {
  const monthValue = currentMonthValue();
  if (!monthValue) return "";
  return `${monthValue}-01`;
}

function formatCompetenceForDateInput(competence) {
  const normalized = normalizeCompetenceValue(competence);
  if (!normalized) return currentPaymentDateValue();
  return `${normalized}-01`;
}

function formatDateForBR(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(date);
  } catch (error) {
    return "";
  }
}

function syncPaymentDateDisplay() {
  if (!paymentMonthInput || !paymentMonthDisplay) return;
  const text = formatDateForBR(paymentMonthInput.value) || "dd/mm/aaaa";
  paymentMonthDisplay.textContent = text;
}

const CHARGEABLE_ROLES = new Set([
  "admin",
  "diretor",
  "imprensa",
  "financeiro",
  "tesoureiro",
  "socio",
  "visitante",
  "crianca",
]);

function normalizeRoleValue(value) {
  return String(value || "visitante").trim().toLowerCase();
}

function shouldCharge(member) {
  const role = normalizeRoleValue(member.role);
  const status = normalizeStatusValue(member.status);
  return CHARGEABLE_ROLES.has(role) && status === "ativo";
}
// 📅 Ponto de partida oficial do clube
const CLUB_START_DATE = new Date(2026, 0, 1); // Janeiro/2026 (mês 0 pois Date é 0-based)
const CLUB_START_COMPETENCE = "2026-01";

// 🔹 Dicionário de nomes de meses (mantém o seu)
const MONTH_ALIASES = {
  jan: 1, janeiro: 1,
  feb: 2, fev: 2, fevereiro: 2,
  mar: 3, marco: 3, março: 3,
  abr: 4, abril: 4,
  apr: 4, may: 5, mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  aug: 8, ago: 8, agosto: 8,
  set: 9, sep: 9, sept: 9, setembro: 9,
  oct: 10, out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dec: 12, dez: 12, dezembro: 12,
};
// 🔧 Função auxiliar para interpretar datas em múltiplos formatos
function parseDateInput(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (raw?.toDate) return raw.toDate();

  if (typeof raw === "string") {
    let parsed = null;

    // 🇧🇷 Formato brasileiro DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [dia, mes, ano] = raw.split("/").map(Number);
      parsed = new Date(ano, mes - 1, dia);
    }
    // ISO (YYYY-MM-DD)
    else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [year, month, day] = raw.slice(0, 10).split("-").map(Number);
      parsed = new Date(year, month - 1, day);
    }
    // Mês abreviado + ano (ex: nov/25 ou nov/2025)
    else if (/^[a-zA-ZçÇãõáéíóúâêô]{3,10}[\\/-]\d{2,4}$/.test(raw.toLowerCase())) {
      const [mesNome, anoBruto] = raw.toLowerCase().split(/[\\/]/);
      const mes = MONTH_ALIASES[mesNome.trim()] || 1;
      const anoNum = Number(anoBruto);
      const ano = anoBruto.length === 2 ? (anoNum >= 70 ? 1900 + anoNum : 2000 + anoNum) : anoNum;
      parsed = new Date(ano, mes - 1, 1);
    }
    // Mês por extenso (ex: agosto/2024)
    else if (/^[a-zA-ZçÇãõáéíóúâêô]{3,10}\/?\d{4}$/.test(raw.toLowerCase())) {
      const [mesNome, ano] = raw.toLowerCase().split("/");
      const mes = MONTH_ALIASES[mesNome.trim()] || 1;
      parsed = new Date(Number(ano), mes - 1, 1);
    }

    return isNaN(parsed) ? null : parsed;
  }

  return null;
}


// 🧠 Determina a data do primeiro mês de cobrança
function resolveFirstChargeDate(member) {
  const baseline = new Date(CLUB_START_DATE.getFullYear(), CLUB_START_DATE.getMonth(), 1);
  return baseline;
}

// 🔢 Determina a competência (AAAA-MM) do primeiro mês de cobrança
function resolveFirstChargeCompetence(member) {
  const firstDate = resolveFirstChargeDate(member);
  if (!firstDate) return CLUB_START_COMPETENCE;

  const year = firstDate.getFullYear();
  const month = String(firstDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

function normalizeYearComponent(value) {
  if (!Number.isFinite(value)) return NaN;
  if (value >= 100) return value;
  const currentYear = new Date().getFullYear();
  const centuryBase = Math.floor(currentYear / 100) * 100;
  return centuryBase + value;
}

function normalizeMonthToken(rawToken) {
  if (!rawToken) return NaN;
  const token = String(rawToken)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!token) return NaN;
  if (/^\d+$/.test(token)) {
    const monthNumber = Number(token);
    if (monthNumber >= 1 && monthNumber <= 12) return monthNumber;
  }
  if (MONTH_ALIASES[token] != null) {
    return MONTH_ALIASES[token];
  }
  const shortToken = token.slice(0, 3);
  return MONTH_ALIASES[shortToken] ?? NaN;
}

function parseDateString(value) {
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
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 5000) {
      const excelDate = excelSerialToDate(numeric);
      if (excelDate) return excelDate;
    }

    const tokens = trimmed.replace(/[.,]/g, " ").split(/[\s/\\-]+/).filter(Boolean);
    if (tokens.length === 2) {
      let [firstToken, secondToken] = tokens;
      let month = normalizeMonthToken(firstToken);
      let year = normalizeYearComponent(Number(secondToken));
      if (!Number.isFinite(month) || !Number.isFinite(year)) {
        month = normalizeMonthToken(secondToken);
        year = normalizeYearComponent(Number(firstToken));
      }
      if (Number.isFinite(month) && Number.isFinite(year)) {
        const tentative = new Date(year, month - 1, 1);
        if (!Number.isNaN(tentative.getTime())) {
          return tentative;
        }
      }
    }

    const isoLikeMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoLikeMatch) {
      const [, year, month, day] = isoLikeMatch;
      const y = normalizeYearComponent(Number(year));
      const m = Number(month);
      const d = Number(day);
      if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
        return new Date(y, m - 1, d);
      }
    }
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [year, month] = trimmed.split("-").map(Number);
      const y = normalizeYearComponent(year);
      const m = Number(month);
      if (!Number.isNaN(y) && !Number.isNaN(m)) {
        return new Date(y, m - 1, 1);
      }
    }
    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime())) return iso;
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      const [aRaw, bRaw, cRaw] = parts;
      const numericA = Number(aRaw);
      const numericB = Number(bRaw);
      const numericC = Number(cRaw);
      const candidates = [];

      const tryPush = (year, month, day) => {
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return;
        const normalizedYear = normalizeYearComponent(year);
        const date = new Date(normalizedYear, month - 1, day);
        if (!Number.isNaN(date.getTime())) {
          candidates.push(date);
        }
      };

      const monthCandidate = normalizeMonthToken(bRaw);
      if (Number.isFinite(monthCandidate) && !Number.isNaN(numericA) && !Number.isNaN(numericC)) {
        tryPush(numericC, monthCandidate, numericA);
      }

      if (!Number.isNaN(numericA) && !Number.isNaN(numericB) && !Number.isNaN(numericC)) {
        tryPush(numericC, numericB, numericA); // dd-mm-yyyy
        tryPush(numericA, numericB, numericC); // yyyy-mm-dd
        tryPush(numericC, numericA, numericB); // mm-dd-yyyy
      }

      if (candidates.length) {
        candidates.sort((dateA, dateB) => dateA.getTime() - dateB.getTime());
        const preferred = candidates.find((date) => date >= CLUB_START_DATE) || candidates[candidates.length - 1];
        return preferred;
      }
    }
  }
  return null;
}



function formatBrazilianDateString(date) {
  if (!date) return "";
  const safeDate = date instanceof Date ? date : parseDateInput(date);
  if (!safeDate || Number.isNaN(safeDate.getTime())) return "";
  const day = String(safeDate.getDate()).padStart(2, "0");
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const year = safeDate.getFullYear();
  return `${day}/${month}/${year}`;
}

function competenceToMonthDate(value) {
  if (!value) return null;
  const [year, month] = value.split("-");
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return null;
  return new Date(y, m - 1, 1);
}

function normalizeDateInput(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsed = parseDateInput(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    if (typeof value === "string") return value.trim();
    return String(value);
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeStatusValue(value) {
  return String(value || "pendente").trim().toLowerCase();
}

function isPaidStatusValue(status) {
  const normalized = normalizeStatusValue(status);
  return normalized.startsWith("pago") || normalized === "quitado";
}

function normalizeAmountValue(value, fallback = 0) {
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
  return Number(fallback) || 0;
}

function normalizeCompetenceValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    const directMatch = /^(\d{4})[-/](\d{1,2})$/.exec(trimmed);
    if (directMatch) {
      const [, year, month] = directMatch;
      return `${year}-${month.padStart(2, "0")}`;
    }
    const monthTextMatch = /^([a-zA-ZçÇãõáéíóúâêô]{3,10})[\\/-]?(\d{2,4})$/.exec(trimmed);
    if (monthTextMatch) {
      const [, monthTextRaw, yearRaw] = monthTextMatch;
      const monthIndex = MONTH_ALIASES[monthTextRaw.toLowerCase()];
      if (monthIndex) {
        const rawYear = Number(yearRaw);
        const year =
          yearRaw.length === 2
            ? (rawYear >= 70 ? 1900 + rawYear : 2000 + rawYear)
            : rawYear;
        return `${year}-${String(monthIndex).padStart(2, "0")}`;
      }
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 5000) {
      const excelDate = excelSerialToDate(numeric);
      if (excelDate) {
        return `${excelDate.getFullYear()}-${String(excelDate.getMonth() + 1).padStart(2, "0")}`;
      }
    }
    const parsed = parseDateInput(trimmed);
    if (parsed) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
    }
    return trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelDate = excelSerialToDate(value);
    if (excelDate) {
      return `${excelDate.getFullYear()}-${String(excelDate.getMonth() + 1).padStart(2, "0")}`;
    }
    const jsDate = new Date(value);
    if (!Number.isNaN(jsDate.getTime())) {
      return `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  if (value?.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  return String(value);
}

function paymentMonthKey(payment) {
  const timestamp = payment?.updatedAt || payment?.createdAt || null;
  const parsed = parseDateInput(timestamp);
  const fallback = parsed || competenceToMonthDate(payment?.competence);
  if (!fallback || Number.isNaN(fallback.getTime())) return "";
  return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyFromDate(value) {
  const parsed = parseDateInput(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(referenceDate = new Date()) {
  if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) return "";
  const base = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  base.setMonth(base.getMonth() - 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

function updatePreviousMonthBalance(referenceDate = new Date()) {
  if (!previousBalanceLabel) return;
  const targetMonth = previousMonthKey(referenceDate);
  if (previousBalanceMonthLabel) {
    previousBalanceMonthLabel.textContent = formatMonthLong(targetMonth);
  }
  if (!targetMonth) {
    previousBalanceLabel.textContent = formatCurrency(0);
    return;
  }
  const targetDate = competenceToMonthDate(targetMonth);
  const initialDate = competenceToMonthDate(INITIAL_PREVIOUS_BALANCE_MONTH);
  if (!targetDate) {
    previousBalanceLabel.textContent = formatCurrency(0);
    return;
  }
  if (targetMonth === INITIAL_PREVIOUS_BALANCE_MONTH) {
    previousBalanceLabel.textContent = formatCurrency(INITIAL_PREVIOUS_BALANCE);
    return;
  }
  const sumMonthNet = (monthKey) => {
    const dues = sumDuesByMonth(monthKey);
    const generalTotals = sumGeneralTotalsByMonth(monthKey);
    const revenue = dues + generalTotals.revenue;
    const expense = generalTotals.expense;
    return revenue - expense;
  };
  if (!initialDate || targetDate < initialDate) {
    previousBalanceLabel.textContent = formatCurrency(sumMonthNet(targetMonth));
    return;
  }
  let running = INITIAL_PREVIOUS_BALANCE;
  const cursor = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() + 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    running += sumMonthNet(key);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  previousBalanceLabel.textContent = formatCurrency(running);
}

function formatCurrencyInputValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = typeof value === "number" ? value : parseCurrency(value);
  if (!Number.isFinite(numeric)) return "";
  return numeric.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getCurrencyDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function applyCurrencyMask(input) {
  if (!input) return;
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  const formatDigits = (digits) => {
    if (!digits) return "";
    const value = Number(digits) / 100;
    if (!Number.isFinite(value)) return "";
    return formatCurrencyInputValue(value);
  };
  const updateValue = () => {
    const digits = getCurrencyDigits(input.value);
    if (!digits) {
      input.value = "";
      return;
    }
    input.value = formatDigits(digits);
  };
  input.addEventListener("input", () => {
    const digits = getCurrencyDigits(input.value);
    if (!digits) {
      input.value = "";
      return;
    }
    input.value = formatDigits(digits);
    try {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    } catch (error) {
      // ignore selection errors
    }
  });
  input.addEventListener("blur", updateValue);
  input.addEventListener("focus", () => {
    requestAnimationFrame(() => {
      try {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      } catch (error) {
        // ignore selection errors
      }
    });
  });
  if (input.value) {
    updateValue();
  }
}

function getDateDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

function formatMaskedDate(digits) {
  if (!digits) return "";
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const segments = [];
  if (day) segments.push(day);
  if (month) segments.push(month);
  if (year) segments.push(year);
  return segments.join("/");
}

function applyDateMask(input) {
  if (!input) return;
  input.type = "text";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.setAttribute("maxlength", "10");

  const updateValue = () => {
    const digits = getDateDigits(input.value);
    input.value = formatMaskedDate(digits);
    return input.value;
  };

  const updateAndResetCursor = () => {
    const formatted = updateValue();
    if (!formatted) return;
    try {
      const end = formatted.length;
      input.setSelectionRange(end, end);
    } catch (error) {
      // ignore selection errors
    }
  };

  input.addEventListener("input", updateAndResetCursor);
  input.addEventListener("blur", updateValue);
  if (input.value) updateValue();
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

window.addEventListener("unload", () => {
  if (membersUnsubscribe) {
    membersUnsubscribe();
  }
  if (generalUnsubscribe) {
    generalUnsubscribe();
  }
  if (barTotalsUnsubscribe) {
    barTotalsUnsubscribe();
  }
  if (paymentsUnsubscribe) {
    paymentsUnsubscribe();
  }
});

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

function formatCompetence(value) {
  if (!value) return "--";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = MONTH_NAMES_PT[monthIndex] || month;
  const shortMonth = monthName.slice(0, 3).toUpperCase();
  const shortYear = String(year).slice(-2);
  return `${shortMonth}/${shortYear}`;
}

function formatMonthLong(value) {
  if (!value) return "--";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = MONTH_NAMES_PT[monthIndex];
  if (!monthName) return value;
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;
}

function formatDate(value) {
  const date = parseDateInput(value);
  if (!date) return value || "";
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(timestamp) {
  const date = parseDateInput(timestamp);
  if (!date) return "--";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fitTextToSingleLine(element, minFontSize = 11) {
  if (!element) return;
  const initialSize = parseFloat(getComputedStyle(element).fontSize) || 13;
  let size = initialSize;
  while (element.scrollWidth > element.clientWidth && size > minFontSize) {
    size -= 0.5;
    element.style.fontSize = `${size}px`;
  }
  // Fallback: keep ellipsis if it still overflows at the minimum size
  if (element.scrollWidth > element.clientWidth) {
    element.style.textOverflow = "ellipsis";
  }
}
function shortenName(name, maxLength = 26) {
  if (!name || typeof name !== "string") return "";
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  const parts = clean.split(" ");
  if (parts.length <= 2) return clean.slice(0, maxLength - 1).trimEnd() + "…";
  const first = parts[0];
  const last = parts[parts.length - 1];
  const middleInitials = parts.slice(1, -1).map((p) => p[0].toUpperCase()).join(" ");
  const shortened = `${first} ${middleInitials} ${last}`;
  if (shortened.length <= maxLength) return shortened;
  return `${first} ${last}`.slice(0, maxLength - 1).trimEnd() + "…";
}
