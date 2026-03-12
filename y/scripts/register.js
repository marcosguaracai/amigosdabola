import { register as registerUser, logout as signOutIfNeeded } from "./auth.js";
import { getFirebaseAuth, getFirestoreDb, serverTimestamp } from "./firebase-client.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const db = getFirestoreDb();

const form = document.getElementById("register-form");
const feedback = document.getElementById("register-feedback");
const yearLabel = document.getElementById("copyright-year");
const navToggleButton = document.getElementById("register-menu-toggle");
const drawer = document.getElementById("drawer-menu");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerClose = document.getElementById("drawer-close");
let pageLoading = false;
const setPageLoading = (isLoading) => {
  pageLoading = isLoading;
  document.body.classList.toggle("page-loading", isLoading);
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

bindState("pageLoading", () => pageLoading, (value) => {
  pageLoading = value;
  setPageLoading(value);
});

const fields = {
  name: document.getElementById("register-name"),
  email: document.getElementById("register-email"),
  phone: document.getElementById("register-phone"),
  street: document.getElementById("register-street"),
  number: document.getElementById("register-number"),
  noNumber: document.getElementById("register-no-number"),
  city: document.getElementById("register-city"),
  state: document.getElementById("register-state"),
  password: document.getElementById("register-password"),
  confirm: document.getElementById("register-password-confirm"),
  birth: document.getElementById("register-birth"),
  join: document.getElementById("register-join"),
};
const passwordToggle = document.getElementById("register-password-toggle");

if (yearLabel) {
  yearLabel.textContent = new Date().getFullYear();
}
setPageLoading(true);
setupDrawerMenu();

function setFormDisabled(state) {
  if (!form) return;
  const controls = form.querySelectorAll("input, button");
  controls.forEach((control) => {
    control.disabled = state;
  });
  form.classList.toggle("opacity-75", state);
  if (!state && fields.noNumber?.checked && fields.number) {
    fields.number.disabled = true;
    fields.number.classList.add("bg-slate-100", "text-slate-500");
  }
}

function showFeedback(message, tone = "info") {
  if (!feedback) return;
  if (window.setFeedback) {
    window.setFeedback(feedback, message, tone);
    return;
  }
  const colors = {
    info: "text-slate-600",
    error: "text-rose-600",
    success: "text-emerald-600",
  };
  feedback.textContent = message;
  feedback.className = `text-sm ${colors[tone] || colors.info}`;
}

async function ensureMemberProfile(user, payload) {
  const memberDocRef = doc(db, "members", user.uid);
  await setDoc(
    memberDocRef,
    {
      id: user.uid,
      name: payload.name,
      email: user.email,
      phone: payload.phone || "",
      address: payload.address || "",
      addressStreet: payload.street || "",
      addressNumber: payload.number || "",
      addressNoNumber: Boolean(payload.noNumber),
      addressCity: payload.city || "",
      addressState: payload.state || "",
      role: "visitante",
      status: "pendente",
      birthDate: payload.birth,
      joinDate: payload.join,
      birthDateDisplay: payload.birthDisplay,
      joinDateDisplay: payload.joinDisplay,
      profileCompleted: true,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true },
  );
  if (user.email) {
    await setDoc(
      doc(db, "membersByEmail", user.email.toLowerCase()),
      { memberId: user.uid },
      { merge: true },
    );
  }
}

function applyPhoneMask(rawValue = "") {
  const digits = rawValue.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const area = digits.slice(0, 2);
  if (digits.length <= 7) {
    return `(${area}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${area}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return `(${area}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function isValidPhone(value = "") {
  return /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value);
}

fields.phone?.addEventListener("input", (event) => {
  const input = event.target;
  const caret = input.selectionStart;
  const beforeLength = input.value.length;
  const masked = applyPhoneMask(input.value);
  input.value = masked;
  const afterLength = masked.length;
  const diff = afterLength - beforeLength;
  const newCaret = Math.max(0, (caret || 0) + diff);
  input.setSelectionRange(newCaret, newCaret);
});

fields.state?.addEventListener("input", (event) => {
  const input = event.target;
  input.value = input.value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
});

fields.noNumber?.addEventListener("change", (event) => {
  if (!fields.number) return;
  const checked = Boolean(event.target?.checked);
  fields.number.disabled = checked;
  fields.number.classList.toggle("bg-slate-100", checked);
  fields.number.classList.toggle("text-slate-500", checked);
  if (checked) {
    fields.number.value = "";
  } else {
    fields.number.focus();
  }
});

fields.name?.addEventListener("blur", (event) => {
  const target = event.target;
  if (!target) return;
  const normalized = target.value.trim().replace(/\s+/g, " ");
  if (normalized) {
    target.value = normalized.toUpperCase();
  }
});

["birth", "join"].forEach((fieldKey) => {
  const input = fields[fieldKey];
  input?.addEventListener("input", (event) => {
    const target = event.target;
    const caret = target.selectionStart;
    const beforeLength = target.value.length;
    const masked = applyDateMask(target.value);
    target.value = masked;
    const afterLength = masked.length;
    const diff = afterLength - beforeLength;
    const newCaret = Math.max(0, (caret || 0) + diff);
    target.setSelectionRange(newCaret, newCaret);
  });
});

passwordToggle?.addEventListener("click", () => {
  if (!fields.password || !fields.confirm) return;
  const show = fields.password.type === "password";
  const nextType = show ? "text" : "password";
  fields.password.type = nextType;
  fields.confirm.type = nextType;
  passwordToggle.textContent = show ? "Ocultar" : "Mostrar";
  passwordToggle.setAttribute("aria-pressed", String(show));
});

function applyDateMask(rawValue = "") {
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);
  let result = digits;
  if (digits.length > 2 && digits.length <= 4) {
    result = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else if (digits.length > 4) {
    result = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }
  return result;
}

function isValidDateMask(value = "") {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date instanceof Date &&
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function convertDateMaskToIso(value = "") {
  if (!isValidDateMask(value)) return "";
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    !fields.name ||
    !fields.email ||
    !fields.password ||
    !fields.confirm ||
    !fields.street ||
    !fields.number ||
    !fields.noNumber ||
    !fields.city ||
    !fields.state ||
    !fields.birth ||
    !fields.join
  ) {
    showFeedback("Formulário inválido. Atualize a página e tente novamente.", "error");
    return;
  }

  const rawName = fields.name.value.trim();
  const normalizedName = rawName.replace(/\s+/g, " ").trim();
  const name = normalizedName.toUpperCase();
  fields.name.value = name;
  const email = fields.email.value.trim().toLowerCase();
  const phoneMasked = applyPhoneMask(fields.phone?.value || "");
  fields.phone.value = phoneMasked;
  const street = fields.street?.value.trim() || "";
  const numberRaw = fields.number?.value.trim();
  const noNumber = Boolean(fields.noNumber?.checked);
  const city = fields.city?.value.trim() || "";
  const state = (fields.state?.value.trim() || "").toUpperCase();
  fields.state.value = state;
  const displayNumber = noNumber ? "S/N" : (numberRaw || "");
  const storedNumber = noNumber ? "" : (numberRaw || "");
  let fullAddress = street;
  if (displayNumber) {
    fullAddress += `, ${displayNumber}`;
  }
  if (city) {
    fullAddress += ` - ${city}`;
    if (state) {
      fullAddress += `/${state}`;
    }
  } else if (state) {
    fullAddress += ` - ${state}`;
  }
  fullAddress = fullAddress.trim();
  const password = fields.password.value;
  const confirm = fields.confirm.value;
  const birthMasked = applyDateMask(fields.birth.value || "");
  const joinMasked = applyDateMask(fields.join.value || "");
  fields.birth.value = birthMasked;
  fields.join.value = joinMasked;

  if (!name || !email || !password || !birthMasked || !joinMasked || !street || !city || !state) {
    showFeedback("Preencha todos os campos obrigatórios.", "error");
    return;
  }

  if (!noNumber && !storedNumber) {
    showFeedback("Informe o número da residência ou marque \"Sem número\".", "error");
    fields.number?.focus();
    return;
  }

  if (state.length !== 2) {
    showFeedback("Informe a sigla do estado com duas letras.", "error");
    fields.state?.focus();
    return;
  }

  const phoneDigits = phoneMasked.replace(/\D/g, "");
  if (phoneDigits && (phoneDigits.length < 10 || !isValidPhone(phoneMasked))) {
    showFeedback("Informe o telefone no formato (xx) xxxx-xxxx ou (xx) xxxxx-xxxx.", "error");
    fields.phone?.focus();
    return;
  }

  if (password.length < 8) {
    showFeedback("A senha deve ter ao menos 8 caracteres.", "error");
    fields.password.focus();
    return;
  }

  if (password !== confirm) {
    showFeedback("As senhas informadas não conferem.", "error");
    fields.confirm.focus();
    return;
  }

  if (!isValidDateMask(birthMasked)) {
    showFeedback("Informe a data de nascimento no formato dd/mm/aaaa.", "error");
    fields.birth?.focus();
    return;
  }

  if (!isValidDateMask(joinMasked)) {
    showFeedback("Informe a data de ingresso no formato dd/mm/aaaa.", "error");
    fields.join?.focus();
    return;
  }

  const birthIso = convertDateMaskToIso(birthMasked);
  const joinIso = convertDateMaskToIso(joinMasked);

  setFormDisabled(true);
  showFeedback("Criando conta...", "info");

  let userCredential = null;
  try {
    userCredential = await registerUser(email, password);
    const authUser = userCredential.user;
    if (!authUser) throw new Error("Usuário não retornado pelo Firebase.");
    if (name) {
      await updateProfile(authUser, { displayName: name });
    }
    await ensureMemberProfile(authUser, {
      name,
      phone: phoneMasked,
      address: fullAddress,
      street,
      number: storedNumber,
      noNumber,
      city,
      state,
      birth: birthIso,
      join: joinIso,
      birthDisplay: birthMasked,
      joinDisplay: joinMasked,
    });
    showFeedback("Conta criada com sucesso! Redirecionando...", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    const message = translateRegistrationError(error);
    showFeedback(message, "error");
    setFormDisabled(false);
    try {
      if (getFirebaseAuth().currentUser) {
        await signOutIfNeeded();
      }
    } catch (logoutError) {
      console.warn("Não foi possível encerrar a sessão após falha no cadastro.", logoutError);
    }
  }
});

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

function translateRegistrationError(error) {
  if (!error) return "Não foi possível concluir o cadastro. Tente novamente.";
  const map = {
    "auth/email-already-in-use": "Este email já está cadastrado. Tente recuperar a senha.",
    "auth/invalid-email": "O email informado não é válido.",
    "auth/operation-not-allowed": "Cadastro temporariamente indisponível. Contate o administrador.",
    "auth/weak-password": "A senha informada é muito fraca. Utilize pelo menos 8 caracteres.",
  };
  if (error.code && map[error.code]) return map[error.code];
  return "Não foi possível concluir o cadastro. Verifique os dados e tente novamente.";
}

setPageLoading(false);
