import { requireAuth, logout as doLogout } from "./auth.js";
import { getFirestoreDb, serverTimestamp, getFirebaseStorage } from "./firebase-client.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
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

const navToggleButton = document.getElementById("bar-menu-toggle");
const drawer = document.getElementById("drawer-menu");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerClose = document.getElementById("drawer-close");
const logoutButtons = Array.from(document.querySelectorAll("[data-logout-button]"));
const roleBadge = document.getElementById("bar-user-role");
const barSettingsForm = document.getElementById("bar-settings-form");
const barSettingsFeedback = document.getElementById("bar-settings-feedback");
const barPriceRefriInput = document.getElementById("bar-price-refrigerante");
const barPriceCervejaInput = document.getElementById("bar-price-cerveja");
const barPriceAguaInput = document.getElementById("bar-price-agua");
const barTransactionForm = document.getElementById("bar-transaction-form");
const barTransactionFeedback = document.getElementById("bar-transaction-feedback");
const barTransactionDateInput = document.getElementById("bar-transaction-date");
const barTransactionTypeSelect = document.getElementById("bar-transaction-type");
const barTransactionItemSelect = document.getElementById("bar-transaction-item");
const barTransactionQuantityInput = document.getElementById("bar-transaction-quantity");
const barTransactionUnitInput = document.getElementById("bar-transaction-unit");
const barTransactionTotalInput = document.getElementById("bar-transaction-total");
const barTransactionNotesInput = document.getElementById("bar-transaction-notes");
const barTransactionReceiptInput = document.getElementById("bar-transaction-receipt");
const barTransactionReceiptLabel = document.getElementById("bar-transaction-receipt-label");
const barSummaryRevenue = document.getElementById("bar-summary-revenue");
const barSummaryExpense = document.getElementById("bar-summary-expense");
const barSummaryBalance = document.getElementById("bar-summary-balance");
const barTransactionsTable = document.getElementById("bar-transactions-table");
const barTransactionsTbody = barTransactionsTable ? barTransactionsTable.querySelector("tbody") : null;
const barTransactionsEmpty = document.getElementById("bar-transactions-empty");
const barTransactionsMonthSelect = document.getElementById("bar-transactions-month");
const barDeleteDialog = document.getElementById("bar-delete-transaction-dialog");
const barDeleteForm = document.getElementById("bar-delete-transaction-form");
const barDeleteSummary = document.getElementById("bar-delete-transaction-summary");
const barSummaryDialog = document.getElementById("bar-summary-dialog");
const barSummaryTitle = document.getElementById("bar-summary-title");
const barSummarySubtitle = document.getElementById("bar-summary-subtitle");
const barSummaryDescription = document.getElementById("bar-summary-description");
const barSummaryValue = document.getElementById("bar-summary-value");
const barSummaryEmpty = document.getElementById("bar-summary-empty");
const barSummaryList = document.getElementById("bar-summary-list");
const summaryCards = Array.from(document.querySelectorAll("[data-summary-card]"));
const loadingFlags = { settings: false, transactions: false };

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

let context = null;
let barSettings = { priceRefrigerante: 5, priceCerveja: 5, priceAgua: 3 };
let barTransactions = [];
let barUnsubscribe = null;
let barTransactionsMonthKey = "";
let pendingBarDeletion = null;
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
bindState("barSettings", () => barSettings, (value) => { barSettings = value; });
bindState("barTransactions", () => barTransactions, (value) => { barTransactions = value; });
bindState("barUnsubscribe", () => barUnsubscribe, (value) => { barUnsubscribe = value; });
bindState("loadingFlags", () => loadingFlags, (value) => {
  if (value && typeof value === "object") {
    Object.assign(loadingFlags, value);
  }
});

setupDrawerMenu();

function initializeCurrencyInputs() {
  [barPriceRefriInput, barPriceCervejaInput, barPriceAguaInput, barTransactionUnitInput, barTransactionTotalInput].forEach((input) => {
    applyCurrencyMask(input);
  });
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
    allowedRoles: ["admin", "financeiro", "diretor", "imprensa", "socio", "tesoureiro", "visitante", "crianca"]
  });
    if (roleBadge) {
      roleBadge.textContent = getUserHeaderLabel(context.profile);
      roleBadge.classList.remove("hidden");
    }
  configurePermissions();
  try {
    await loadBarSettings();
  } finally {
    loadingFlags.settings = true;
    updatePageLoading();
  }
  initializeCurrencyInputs();
  updateBarTransactionTotals();
  subscribeBarTransactions();
  attachListeners();
  updateBarReceiptLabel();
})();

function configurePermissions() {
  setFormEnabled(
    barSettingsForm,
    ["admin", "financeiro"].includes(context.profile.role),
    barSettingsFeedback,
    "Somente administradores ou financeiro podem ajustar os preços padrão."
  );
  setFormEnabled(
    barTransactionForm,
    ["admin", "financeiro"].includes(context.profile.role),
    barTransactionFeedback,
    "Apenas administradores ou financeiro podem registrar movimentações."
  );
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
  form.classList.toggle("opacity-60", !enabled);
  form.classList.toggle("pointer-events-none", !enabled);
  if (!enabled && feedbackElement && disabledMessage) {
    if (window.setFeedback) {
      window.setFeedback(feedbackElement, disabledMessage, "info", { persist: true });
    } else {
      feedbackElement.textContent = disabledMessage;
    }
  } else if (feedbackElement && !feedbackElement.dataset.persist) {
    if (window.setFeedback) {
      window.setFeedback(feedbackElement, "", "info");
    } else {
      feedbackElement.textContent = "";
    }
  }
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

  barSettingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!["admin", "financeiro"].includes(context.profile.role)) {
      barSettingsFeedback.textContent = "Somente administradores ou financeiro podem alterar os preços.";
      return;
    }
    try {
      const priceRefrigerante = parseCurrency(barPriceRefriInput?.value || "0");
      const priceCerveja = parseCurrency(barPriceCervejaInput?.value || "0");
      const priceAgua = parseCurrency(barPriceAguaInput?.value || "0");
      if (
        !Number.isFinite(priceRefrigerante) ||
        priceRefrigerante < 0 ||
        !Number.isFinite(priceCerveja) ||
        priceCerveja < 0 ||
        !Number.isFinite(priceAgua) ||
        priceAgua < 0
      ) {
        barSettingsFeedback.textContent = "Informe valores válidos.";
        return;
      }
      await setDoc(
        doc(db, "settings", "bar"),
        { priceRefrigerante, priceCerveja, priceAgua },
        { merge: true },
      );
      barSettings = { priceRefrigerante, priceCerveja, priceAgua };
      if (barPriceRefriInput) {
        barPriceRefriInput.value = formatCurrencyInputValue(priceRefrigerante);
      }
      if (barPriceCervejaInput) {
        barPriceCervejaInput.value = formatCurrencyInputValue(priceCerveja);
      }
      if (barPriceAguaInput) {
        barPriceAguaInput.value = formatCurrencyInputValue(priceAgua);
      }
      barSettingsFeedback.textContent = "Valores atualizados com sucesso.";
      setTimeout(() => (barSettingsFeedback.textContent = ""), 4000);
      updateBarTransactionTotals();
    } catch (error) {
      console.error(error);
      barSettingsFeedback.textContent = "Não foi possível salvar os valores. Tente novamente.";
    }
  });

  barTransactionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!context || !["admin", "financeiro"].includes(context.profile.role)) {
      if (window.setFeedback) {
        window.setFeedback(barTransactionFeedback, "Você não tem permissão para registrar movimentações.", "error");
      } else {
        barTransactionFeedback.textContent = "Você não tem permissão para registrar movimentações.";
      }
      return;
    }
    try {
      await registerBarTransaction();
      if (window.setFeedback) {
        window.setFeedback(barTransactionFeedback, "Movimentação registrada com sucesso.", "success");
        setTimeout(() => window.setFeedback(barTransactionFeedback, "", "info"), 4000);
      } else {
        barTransactionFeedback.textContent = "Movimentação registrada com sucesso.";
        setTimeout(() => (barTransactionFeedback.textContent = ""), 4000);
      }
      barTransactionForm.reset();
      updateBarTransactionTotals();
      resetBarReceiptSelection();
    } catch (error) {
      console.error(error);
      const message = error?.message || "Não foi possível registrar. Verifique os dados e tente novamente.";
      if (window.setFeedback) {
        window.setFeedback(barTransactionFeedback, message, "error");
      } else {
        barTransactionFeedback.textContent = message;
      }
    }
  });

  if (barTransactionQuantityInput) {
    barTransactionQuantityInput.addEventListener("input", updateBarTransactionTotals);
  }
  if (barTransactionUnitInput) {
    barTransactionUnitInput.addEventListener("input", updateBarTransactionTotals);
  }
  barTransactionTypeSelect?.addEventListener("change", handleBarTypeChange);
  barTransactionItemSelect?.addEventListener("change", handleBarItemChange);
  barTransactionReceiptInput?.addEventListener("change", updateBarReceiptLabel);
  barTransactionsMonthSelect?.addEventListener("change", () => {
    barTransactionsMonthKey = barTransactionsMonthSelect.value || "";
    renderBarTransactions();
  });

  barTransactionsTable?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action='delete-bar-transaction']");
    if (!button) return;
    if (!["admin", "financeiro"].includes(context.profile.role)) {
      notify("error", "Somente administradores ou financeiro podem excluir movimentações.");
      return;
    }
    const { id } = button.dataset;
    if (!id) return;
    let summaryText = "Essa ação remove o lançamento do histórico.";
    if (button.closest("tr")) {
      const cells = button.closest("tr").querySelectorAll("td");
      const dateText = (cells[0]?.textContent || "").trim();
      const amountText = (cells[4]?.textContent || "").trim();
      if (amountText || dateText) {
        summaryText = `${amountText || "Valor"}${dateText ? ` • ${dateText}` : ""}`;
      }
    }
    pendingBarDeletion = { id, summaryText };
    if (barDeleteSummary) {
      barDeleteSummary.textContent = summaryText;
    }
    barDeleteDialog?.showModal();
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

  document
    .querySelectorAll("#bar-summary-dialog [data-action='close']")
    .forEach((button) => button.addEventListener("click", () => requestDialogClose(barSummaryDialog)));

  document
    .querySelectorAll("#bar-delete-transaction-dialog [data-action='close']")
    .forEach((button) => button.addEventListener("click", () => requestDialogClose(barDeleteDialog)));

  barDeleteDialog?.addEventListener("close", () => {
    pendingBarDeletion = null;
    if (barDeleteForm) barDeleteForm.reset();
  });

  barDeleteForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingBarDeletion?.id) return;
    const submitButton = barDeleteForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Excluindo...";
    }
    try {
      const docRef = doc(db, "barTransactions", pendingBarDeletion.id);
      const snapshot = await getDoc(docRef);
      let attachmentPath = "";
      if (snapshot.exists()) {
        const data = snapshot.data() || {};
        attachmentPath =
          data.attachment?.path ||
          data.receiptPath ||
          "";
      }
      await deleteDoc(docRef);
      if (attachmentPath) {
        await deleteObject(ref(storage, attachmentPath)).catch(() => {});
      }
      barDeleteDialog?.close();
    } catch (error) {
      console.error("Erro ao excluir movimentação:", error);
      notify("error", "Não foi possível excluir a movimentação.");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Excluir";
      }
    }
  });

  barSummaryDialog?.addEventListener("click", (event) => {
    if (event.target === barSummaryDialog) requestDialogClose(barSummaryDialog);
  });
}

async function loadBarSettings() {
  const docSnap = await getDoc(doc(db, "settings", "bar"));
  if (docSnap.exists()) {
    const data = docSnap.data();
    barSettings = {
      priceRefrigerante: Number(data.priceRefrigerante || 5),
      priceCerveja: Number(data.priceCerveja || 5),
      priceAgua: Number(data.priceAgua || 3),
    };
  } else {
    await setDoc(doc(db, "settings", "bar"), barSettings);
  }
  if (barPriceRefriInput) barPriceRefriInput.value = formatCurrencyInputValue(barSettings.priceRefrigerante);
  if (barPriceCervejaInput) barPriceCervejaInput.value = formatCurrencyInputValue(barSettings.priceCerveja);
  if (barPriceAguaInput) barPriceAguaInput.value = formatCurrencyInputValue(barSettings.priceAgua);
  updateBarTransactionTotals();
}

function subscribeBarTransactions() {
  if (!barTransactionsTable) return;
  if (barUnsubscribe) barUnsubscribe();
  const transactionsRef = collection(db, "barTransactions");
  const transactionsQuery = query(transactionsRef, orderBy("date", "desc"));
  barUnsubscribe = onSnapshot(
    transactionsQuery,
    (snapshot) => {
      barTransactions = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      renderBarSummary();
      renderBarTransactions();
      loadingFlags.transactions = true;
      updatePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar movimentações do bar:", error);
      if (barTransactionsEmpty) {
        barTransactionsEmpty.textContent = "Não foi possível carregar as movimentações.";
        barTransactionsEmpty.classList.remove("hidden");
      }
      loadingFlags.transactions = true;
      updatePageLoading();
    },
  );
}

function updateBarTransactionTotals() {
  if (!barTransactionQuantityInput || !barTransactionUnitInput || !barTransactionTotalInput) return;
  const quantity = parseFloat(barTransactionQuantityInput.value || "0");
  const unit = parseCurrency(barTransactionUnitInput.value);
  const total = Number.isFinite(quantity) && Number.isFinite(unit) ? quantity * unit : 0;
  barTransactionTotalInput.value = formatCurrencyInputValue(total);
}

function updateBarReceiptLabel() {
  if (!barTransactionReceiptLabel) return;
  const name = barTransactionReceiptInput?.files?.[0]?.name || "Nenhum arquivo selecionado";
  barTransactionReceiptLabel.textContent = name;
}

function resetBarReceiptSelection() {
  if (!barTransactionReceiptInput) return;
  barTransactionReceiptInput.value = "";
  updateBarReceiptLabel();
}

function handleBarTypeChange() {
  handleBarItemChange();
}

function handleBarItemChange() {
  if (!barTransactionTypeSelect || !barTransactionItemSelect || !barTransactionUnitInput) return;
  const type = barTransactionTypeSelect.value;
  const item = barTransactionItemSelect.value;
  if (type === "entrada") {
    if (item === "refrigerante") {
      barTransactionUnitInput.value = formatCurrencyInputValue(barSettings.priceRefrigerante || 5);
    } else if (item === "agua") {
      barTransactionUnitInput.value = formatCurrencyInputValue(barSettings.priceAgua || 3);
    } else if (item === "cerveja") {
      barTransactionUnitInput.value = formatCurrencyInputValue(barSettings.priceCerveja || 5);
    }
  }
  updateBarTransactionTotals();
}

async function registerBarTransaction() {
  if (!barTransactionDateInput || !barTransactionTypeSelect || !barTransactionItemSelect) return;
  const dateValue = normalizeDateInput(barTransactionDateInput.value.trim());
  const type = barTransactionTypeSelect.value;
  const item = barTransactionItemSelect.value;
  const quantity = parseFloat(barTransactionQuantityInput.value || "0");
  const unitValue = parseCurrency(barTransactionUnitInput.value);
  let totalValue = parseCurrency(barTransactionTotalInput.value);
  if (!Number.isFinite(unitValue) || unitValue < 0) {
    throw new Error("Dados inválidos");
  }
  if (!Number.isFinite(totalValue) || totalValue <= 0) {
    totalValue = Number.isFinite(quantity) && Number.isFinite(unitValue) ? quantity * unitValue : 0;
  }
  const notes = barTransactionNotesInput.value.trim();

  if (!dateValue || !type || !item || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(totalValue) || totalValue <= 0) {
    throw new Error("Dados inválidos");
  }

  const receiptFile = barTransactionReceiptInput?.files?.[0] || null;
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
      const storagePath = `bar/receipts/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, storagePath);
      if (window.setFeedback) {
        window.setFeedback(barTransactionFeedback, "Enviando comprovante... 0%", "info");
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
              window.setFeedback(barTransactionFeedback, `Enviando comprovante... ${progress}%`, "info");
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
        window.setFeedback(barTransactionFeedback, "Comprovante enviado.", "success");
        setTimeout(() => window.setFeedback(barTransactionFeedback, "", "info"), 2500);
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
      item,
      quantity,
      unitValue,
      totalValue,
      notes,
      createdAt: serverTimestamp(),
      createdBy: context.user.uid,
      createdByName: context.profile.name,
    };
    if (uploadedAttachment) {
      payload.attachment = uploadedAttachment;
    }

    await addDoc(collection(db, "barTransactions"), payload);
  } catch (error) {
    if (uploadedAttachment?.path) {
      deleteObject(ref(storage, uploadedAttachment.path)).catch(() => {});
    }
    throw error;
  } finally {
    resetBarReceiptSelection();
  }
}

function renderBarSummary() {
  if (!barSummaryRevenue || !barSummaryExpense || !barSummaryBalance) return;
  let revenue = 0;
  let expense = 0;
  barTransactions.forEach((tx) => {
    const total = Number(tx.totalValue || 0);
    if (tx.type === "entrada") {
      revenue += total;
    } else {
      expense += total;
    }
  });
  barSummaryRevenue.textContent = formatCurrency(revenue);
  barSummaryExpense.textContent = formatCurrency(expense);
  barSummaryBalance.textContent = formatCurrency(revenue - expense);
}

function openSummaryDialog(type) {
  if (!barSummaryDialog || !barSummaryTitle || !barSummaryDescription || !barSummaryValue) return;
  const accentClasses = ["summary-accent-green", "summary-accent-red", "summary-accent-blue"];
  barSummaryDialog.classList.remove(...accentClasses);
  const accentByType = {
    "bar-revenue": "summary-accent-green",
    "bar-expense": "summary-accent-red",
    "bar-balance": "summary-accent-blue",
  };
  const accentClass = accentByType[type];
  if (accentClass) {
    barSummaryDialog.classList.add(accentClass);
  }

  const definitions = {
    "bar-revenue": {
      title: "Total arrecadado",
      subtitle: "Entradas do bar",
      description: "Detalhamento das entradas registradas no bar.",
      value: barSummaryRevenue?.textContent || "R$ 0,00",
    },
    "bar-expense": {
      title: "Total gasto",
      subtitle: "Saídas do bar",
      description: "Detalhamento das saídas registradas no bar.",
      value: barSummaryExpense?.textContent || "R$ 0,00",
    },
    "bar-balance": {
      title: "Saldo do bar",
      subtitle: "Entradas - saídas",
      description: "Resumo do saldo considerando entradas e saídas do bar.",
      value: barSummaryBalance?.textContent || "R$ 0,00",
    },
  };
  const info = definitions[type] || definitions["bar-revenue"];
  barSummaryTitle.textContent = info.title;
  if (barSummarySubtitle) barSummarySubtitle.textContent = info.subtitle;
  barSummaryDescription.textContent = info.description;
  barSummaryValue.textContent = info.value;
  renderSummaryDetails(type);
  barSummaryDialog.showModal();
}

function renderSummaryDetails(type) {
  if (!barSummaryList || !barSummaryEmpty) return;
  barSummaryList.innerHTML = "";
  const items = [];
  const buildLabel = (tx) => {
    const itemLabel = formatBarItem(tx.item || "outros");
    const quantity = Number(tx.quantity || 0);
    const unitValue = Number(tx.unitValue || 0);
    const details =
      quantity && unitValue ? ` (${quantity} x ${formatCurrency(unitValue)})` : "";
    return `${formatDate(tx.date || tx.createdAt)} • ${itemLabel}${details}`;
  };

  if (type === "bar-revenue") {
    barTransactions
      .filter((tx) => tx.type === "entrada")
      .forEach((tx) => {
        items.push({
          label: buildLabel(tx),
          value: formatCurrency(Number(tx.totalValue || 0)),
        });
      });
  } else if (type === "bar-expense") {
    barTransactions
      .filter((tx) => tx.type !== "entrada")
      .forEach((tx) => {
        items.push({
          label: buildLabel(tx),
          value: formatCurrency(Number(tx.totalValue || 0)),
        });
      });
  } else if (type === "bar-balance") {
    items.push({
      label: "Entradas (total)",
      value: barSummaryRevenue?.textContent || formatCurrency(0),
    });
    barTransactions
      .filter((tx) => tx.type === "entrada")
      .forEach((tx) => {
        items.push({
          label: buildLabel(tx),
          value: formatCurrency(Number(tx.totalValue || 0)),
        });
      });
    items.push({
      label: "Saídas (total)",
      value: barSummaryExpense?.textContent || formatCurrency(0),
    });
    barTransactions
      .filter((tx) => tx.type !== "entrada")
      .forEach((tx) => {
        items.push({
          label: buildLabel(tx),
          value: formatCurrency(Number(tx.totalValue || 0)),
        });
      });
  }

  if (!items.length) {
    barSummaryEmpty.classList.remove("hidden");
    return;
  }
  barSummaryEmpty.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  items.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "flex items-center justify-between gap-3 border border-slate-100 rounded-md px-3 py-2";
    li.innerHTML = `
      <span>${entry.label}</span>
      <span class="font-semibold text-secondary">${entry.value}</span>
    `;
    fragment.appendChild(li);
  });
  barSummaryList.appendChild(fragment);
}

function renderBarTransactions() {
  if (!barTransactionsTbody || !barTransactionsEmpty) return;
  barTransactionsTbody.innerHTML = "";
  updateBarTransactionsFilterOptions();
  const targetMonth = barTransactionsMonthKey || "";
  const filtered = barTransactions.filter((tx) => {
    const key = monthKeyFromDate(tx.date);
    if (!key || key < "2026-01") return false;
    return targetMonth ? key === targetMonth : true;
  });
  if (!filtered.length) {
    barTransactionsEmpty.classList.remove("hidden");
    return;
  }
  barTransactionsEmpty.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  filtered.forEach((tx) => {
    const row = document.createElement("tr");
    row.className = "hover:bg-slate-50 text-sm";
    row.innerHTML = `
      <td class="px-4 py-3">${formatDate(tx.date)}</td>
      <td class="px-4 py-3">${tx.type === "entrada" ? "Entrada" : "Saída"}</td>
      <td class="px-4 py-3 text-slate-600">${formatBarItem(tx.item)}</td>
      <td class="px-4 py-3">${Number(tx.quantity || 0)}</td>
      <td class="px-4 py-3">${formatCurrency(tx.totalValue || 0)}</td>
      <td class="px-4 py-3 text-slate-500">${tx.notes || "--"}</td>
      <td class="px-4 py-3">
        ${
          tx.attachment?.url
            ? `<a href="${tx.attachment.url}" target="_blank" rel="noopener" class="text-xs font-semibold text-primary hover:text-secondary">Ver comprovante</a>`
            : "--"
        }
      </td>
      <td class="px-4 py-3 text-right">
        ${
          ["admin", "financeiro"].includes(context.profile.role)
            ? `<button data-action="delete-bar-transaction" data-id="${tx.id}" class="inline-flex items-center justify-center text-rose-500 hover:text-rose-600" aria-label="Excluir movimentação" title="Excluir">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                </svg>
              </button>`
            : ""
        }
      </td>
    `;
    fragment.appendChild(row);
  });
  barTransactionsTbody.appendChild(fragment);
}

function updateBarTransactionsFilterOptions() {
  if (!barTransactionsMonthSelect) return;
  const months = Array.from(
    new Set(
      barTransactions
        .map((tx) => monthKeyFromDate(tx.date))
        .filter((key) => key && key >= "2026-01"),
    ),
  ).sort((a, b) => b.localeCompare(a));
  const current = currentMonthValue();
  if (current >= "2026-01" && !months.includes(current)) {
    months.unshift(current);
  }

  const previousValue = barTransactionsMonthSelect.value || "";
  barTransactionsMonthSelect.innerHTML = '<option value="">Todos</option>';
  const fragment = document.createDocumentFragment();
  months.forEach((monthKey) => {
    const option = document.createElement("option");
    option.value = monthKey;
    option.textContent = formatCompetence(monthKey);
    fragment.appendChild(option);
  });
  barTransactionsMonthSelect.appendChild(fragment);

  if (previousValue === "") {
    barTransactionsMonthSelect.value = "";
    barTransactionsMonthKey = "";
    return;
  }

  let resolved = previousValue || barTransactionsMonthKey || current;
  if (resolved && months.includes(resolved)) {
    barTransactionsMonthSelect.value = resolved;
  } else if (months.includes(current)) {
    barTransactionsMonthSelect.value = current;
    resolved = current;
  } else {
    barTransactionsMonthSelect.value = "";
    resolved = "";
  }
  barTransactionsMonthKey = resolved;
}

function formatBarItem(item) {
  const labels = {
    refrigerante: "Refrigerante",
    agua: "Água",
    cerveja: "Cerveja lata",
    belisco: "Belisco",
    evento: "Evento especial",
    equipamento: "Equipamento",
    outros: "Outros",
  };
  return labels[item] || item;
}

function formatCurrencyInputValue(value) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = typeof value === "number" ? value : parseCurrency(value);
  if (!Number.isFinite(numeric)) return "";
  return numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value) {
  const date = parseDateInput(value);
  if (!date) return value || "--";
  return date.toLocaleDateString("pt-BR");
}

function monthKeyFromDate(value) {
  const date = parseDateInput(value);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function formatCompetence(value) {
  if (!value) return "--";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = MONTH_NAMES_PT[monthIndex] || month;
  const shortMonth = monthName.slice(0, 3).toUpperCase();
  const shortYear = String(year).slice(-2);
  return `${shortMonth}/${shortYear}`;
}

function formatRole(role) {
  const roles = {
    admin: "Administrador",
    diretor: "Diretor",
    tesoureiro: "Tesoureiro",
    financeiro: "Financeiro",
    socio: "Sócio",
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

window.addEventListener("unload", () => {
  if (barUnsubscribe) barUnsubscribe();
});

function normalizeDateInput(value) {
  if (!value) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return value;
}

function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(value)) {
      const [day, month, year] = value.split(/[./]/).map(Number);
      return new Date(year, month - 1, day);
    }
    const iso = new Date(value);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  if (value?.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}
