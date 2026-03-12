import { login, onAuthChange, logout as doLogout } from "./auth.js";
import { getFirestoreDb, serverTimestamp, getFirebaseStorage, getFirebaseAuth } from "./firebase-client.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
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

const navToggleButton =
  document.getElementById("index-menu-toggle") || document.getElementById("noticias-menu-toggle");
const headerMenu =
  document.getElementById("index-header-menu") || document.getElementById("noticias-header-menu");
const drawer = document.getElementById("drawer-menu");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerClose = document.getElementById("drawer-close");
const loginTriggers = document.querySelectorAll("[data-action='open-login']");
const loginDialog = document.getElementById("login-dialog");
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginFeedback = document.getElementById("login-feedback");
const loginPasswordToggle = document.getElementById("login-password-toggle");
const loginForgotLink = document.getElementById("login-forgot-link");
const loginRegisterLink = document.getElementById("login-create-account");
const resetDialog = document.getElementById("reset-dialog");
const resetForm = document.getElementById("reset-form");
const resetEmailInput = document.getElementById("reset-email");
const resetFeedback = document.getElementById("reset-feedback");
const resetBackToLogin = document.getElementById("reset-back-to-login");
const logoutButtons = Array.from(document.querySelectorAll("[data-logout-button]"));
const userRoleBadge = document.getElementById("index-user-role");
const newsList = document.getElementById("news-list");
const newsEmptyState = document.getElementById("news-empty");
const newsDialog = document.getElementById("news-dialog");
const newsForm = document.getElementById("news-form");
const newsIdInput = document.getElementById("news-id");
const newsDialogTitle = newsDialog?.querySelector("h3");
const newsMediaInput = document.getElementById("news-media");
const newsMediaNameLabel = document.getElementById("news-media-name");
const newsMediaFeedback = document.getElementById("news-media-feedback");
const newNewsBtn = document.getElementById("new-news-btn");
const blogList = document.getElementById("blog-list");
const blogEmptyState = document.getElementById("blog-empty");
const blogDialog = document.getElementById("blog-dialog");
const blogForm = document.getElementById("blog-form");
const blogIdInput = document.getElementById("blog-id");
const blogDialogTitle = blogDialog?.querySelector("h3");
const blogMediaInput = document.getElementById("blog-media");
const blogMediaNameLabel = document.getElementById("blog-media-name");
const blogMediaFeedback = document.getElementById("blog-media-feedback");
const newBlogBtn = document.getElementById("new-blog-btn");
const addEventBtn = document.getElementById("add-event-btn");
const articleDialog = document.getElementById("article-dialog");
const articleDialogTitle = document.getElementById("article-dialog-title");
const articleDialogDate = document.getElementById("article-dialog-date");
const articleDialogMedia = document.getElementById("article-dialog-media");
const articleDialogContent = document.getElementById("article-dialog-content");
const articleDialogRelated = document.getElementById("article-dialog-related");
const articleDialogRelatedTitle = document.getElementById("article-dialog-related-title");
const articleDialogRelatedList = document.getElementById("article-dialog-related-list");
const articleDialogClose = document.getElementById("article-dialog-close");
const eventsList = document.getElementById("events-list");
const eventsEmptyState = document.getElementById("events-empty");
const eventDialog = document.getElementById("event-dialog");
const eventForm = document.getElementById("event-form");
const eventIdInput = document.getElementById("event-id");
const eventNameInput = document.getElementById("event-name");
const eventDateInput = document.getElementById("event-date");
const eventTimeInput = document.getElementById("event-time");
const eventDetailsInput = document.getElementById("event-details");
const eventArenaInput = document.getElementById("event-arena");
const eventFormTitle = document.getElementById("event-form-title");
const sociosCountLabel = document.getElementById("socios-count");
const copyright = document.getElementById("copyright-year");
const pendingAlertCard = document.getElementById("pending-alert");
const pendingAlertMonth = document.getElementById("pending-alert-month");
const pendingAlertNames = document.getElementById("pending-alert-names");
const pendingAlertCount = document.getElementById("pending-alert-count");
const pendingAlertCurrentRuleMonth = document.getElementById("pending-alert-current-rule-month");
const pendingAlertNextRuleMonth = document.getElementById("pending-alert-next-rule-month");
const heroIntro = document.getElementById("hero-intro");
const feedbackDialog = document.getElementById("feedback-dialog");
const feedbackDialogMessage = document.getElementById("feedback-dialog-message");
let pageLoadingResolved = false;

function setPageLoading(isLoading) {
  document.body.classList.toggle("page-loading", isLoading);
}

function resolvePageLoading() {
  if (pageLoadingResolved) return;
  pageLoadingResolved = true;
  setPageLoading(false);
}

function notify(type, message) {
  if (window.toast && typeof window.toast[type] === "function") {
    window.toast[type](message);
    return;
  }
  alert(message);
}
const publicNavLinks = document.querySelectorAll("a[data-public-nav]");
const restrictedNavItems = document.querySelectorAll("[data-auth-only]");
const contentEditorRoles = new Set(["admin", "imprensa"]);
const eventEditorRoles = new Set(["admin", "diretor"]);
const birthdaySpotlight = document.getElementById("birthday-spotlight");
const birthdayList = document.getElementById("birthday-list");
const birthdaySubtitle = document.getElementById("birthday-subtitle");
const DEFAULT_MEDIA_LABEL = "Nenhum arquivo selecionado";
const MAX_MEDIA_SIZE_BYTES = 16 * 1024 * 1024;
const LOGOUT_DESKTOP_BREAKPOINT = 768;

const PASSWORD_TOGGLE_ICONS = {
  hidden: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  `,
  visible: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10 10 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94m4-1.5A9.79 9.79 0 0 1 12 5c7 0 11 7 11 7a21.6 21.6 0 0 1-2.31 3.41" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  `,
};

function buildPasswordToggleContent(icon, label) {
  return `
    ${icon}
    <span class="sr-only">${label}</span>
  `;
}

function setPasswordToggleState(button, isVisible) {
  if (!button) return;
  button.dataset.state = isVisible ? "visible" : "hidden";
  const label = isVisible ? "Ocultar senha" : "Mostrar senha";
  button.setAttribute("aria-label", label);
  button.innerHTML = buildPasswordToggleContent(
    isVisible ? PASSWORD_TOGGLE_ICONS.visible : PASSWORD_TOGGLE_ICONS.hidden,
    label,
  );
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

let newsDocs = [];
let blogDocs = [];
let eventsDocs = [];
let eventsUnsubscribe = null;
let sociosUnsubscribe = null;
let currentProfile = null;
let currentUser = null;
let membersCache = new Map();
const memberFetchPromises = new Map();
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
bindState("newsDocs", () => newsDocs, (value) => { newsDocs = value; });
bindState("blogDocs", () => blogDocs, (value) => { blogDocs = value; });
bindState("eventsDocs", () => eventsDocs, (value) => { eventsDocs = value; });
bindState("eventsUnsubscribe", () => eventsUnsubscribe, (value) => { eventsUnsubscribe = value; });
bindState("sociosUnsubscribe", () => sociosUnsubscribe, (value) => { sociosUnsubscribe = value; });
bindState("currentProfile", () => currentProfile, (value) => { currentProfile = value; });
bindState("currentUser", () => currentUser, (value) => { currentUser = value; });
bindState("membersCache", () => membersCache, (value) => { membersCache = value; });

function init() {
  setPageLoading(true);
  setupResponsiveMenu();
  registerLoginFlows();
  configureAuthObservers();
  attachNewsListeners();
  attachBlogListeners();
  attachEventListeners();
  setupArticleDialog();
  if (copyright) {
    copyright.textContent = new Date().getFullYear();
  }
  loadNews();
  loadBlogs();
  ensureEventsListener();
  loadSociosCount();
  loadBirthdaySpotlight();
  loadPendingPaymentsAlert();
}

function setupResponsiveMenu() {
  if (drawer && drawerBackdrop && navToggleButton) {
    if (navToggleButton.dataset.menuInitialized) return;
    navToggleButton.dataset.menuInitialized = "drawer";
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
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) setOpen(false);
    });

    setOpen(false);
    return;
  }

  if (!navToggleButton || !headerMenu) return;
  if (navToggleButton.dataset.menuInitialized) return;
  navToggleButton.dataset.menuInitialized = "default";
  const srLabel = navToggleButton.querySelector(".sr-only");

  const setMenuState = (expanded) => {
    navToggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (srLabel) srLabel.textContent = expanded ? "Fechar navegação" : "Abrir navegação";
    if (expanded) {
      headerMenu.classList.remove("hidden");
    } else if (window.innerWidth < 768) {
      headerMenu.classList.add("hidden");
    }
  };

  navToggleButton.addEventListener("click", () => {
    const expanded = navToggleButton.getAttribute("aria-expanded") === "true";
    setMenuState(!expanded);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      headerMenu.classList.remove("hidden");
      navToggleButton.setAttribute("aria-expanded", "false");
      if (srLabel) srLabel.textContent = "Abrir navegação";
    } else if (navToggleButton.getAttribute("aria-expanded") === "false") {
      headerMenu.classList.add("hidden");
    }
  });

  if (window.innerWidth >= 768) {
    headerMenu.classList.remove("hidden");
    navToggleButton.setAttribute("aria-expanded", "false");
    if (srLabel) srLabel.textContent = "Abrir navegação";
  } else {
    setMenuState(false);
  }
}

function registerLoginFlows() {
  loginTriggers.forEach((trigger) => {
    if (trigger.dataset.labelAnon) trigger.textContent = trigger.dataset.labelAnon;
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      if (trigger.dataset.state === "authenticated") {
        let redirect = "dashboard.html";
        try {
          const stored = sessionStorage.getItem("admin:returnPath");
          if (stored) {
            redirect = stored;
            sessionStorage.removeItem("admin:returnPath");
          }
        } catch (error) {
          console.warn("Não foi possível recuperar a rota anterior da área restrita.", error);
        }
        window.location.href = redirect;
        return;
      }
      if (!loginDialog) return;
      setLoginFeedback("", "info");
      if (loginForm) loginForm.reset();
      if (loginPasswordInput) loginPasswordInput.type = "password";
      setPasswordToggleState(loginPasswordToggle, false);
      loginDialog.showModal();
    });
  });

  logoutButtons.forEach((button) => {
    button?.addEventListener("click", async () => {
      logoutButtons.forEach((btn) => {
        btn.disabled = true;
        btn.classList.add("opacity-60", "pointer-events-none");
      });
      try {
        await doLogout();
      } catch (error) {
        console.error("Erro ao encerrar sessão:", error);
      } finally {
        window.location.href = "index.html";
      }
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setLoginFeedback("", "info");
      const email = (loginEmailInput?.value || "").trim();
      const password = (loginPasswordInput?.value || "").trim();
      if (!email || !password) {
        setLoginFeedback("Informe email e senha para continuar.", "error");
        (loginEmailInput || loginPasswordInput)?.focus();
        return;
      }
      const normalizedEmail = email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setLoginFeedback("Informe um email válido.", "error");
        loginEmailInput?.focus();
        return;
      }
      try {
        await login(normalizedEmail, password);
        loginDialog.close();
        window.location.href = "dashboard.html";
      } catch (error) {
        setLoginFeedback(translateAuthError(error), "error");
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setResetFeedback("", "info");
      await handlePasswordResetRequest(resetEmailInput?.value, {
        setFeedback: setResetFeedback,
        focusInput: () => resetEmailInput?.focus(),
      });
    });
  }

  resetEmailInput?.addEventListener("input", () => {
    setResetFeedback("", "info");
  });

  const closeButtons = document.querySelectorAll("button[data-action='close']");
  closeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      if (dialog?.open) dialog.close();
    });
  });
}

function updateMediaLabel(input, label) {
  if (!input || !label) return;
  const file = input.files?.[0] || null;
  label.textContent = file ? file.name : DEFAULT_MEDIA_LABEL;
}

function attachNewsListeners() {
  if (!newNewsBtn || !newsForm || !newsDialog) return;
  newNewsBtn.addEventListener("click", () => {
    if (!canManageContent()) {
      notify("error", "Você não tem permissão para publicar notícias.");
      return;
    }
    resetNewsForm();
    if (newsDialogTitle) newsDialogTitle.textContent = "Nova notícia";
    newsDialog.showModal();
  });

  newsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = newsForm["news-title"].value.trim();
    const content = newsForm["news-content"].value.trim();
    const mediaFile = newsMediaInput?.files?.[0] || null;
    if (!title || !content) {
      notify("info", "Preencha o título e o conteúdo da notícia.");
      return;
    }
    const newsId = newsIdInput?.value;
    const existing = newsId ? newsDocs.find((item) => item.id === newsId) : null;
    try {
      let uploadedMedia = null;
      if (mediaFile) {
        uploadedMedia = await uploadMediaFile(mediaFile, "news", newsMediaFeedback);
      } else if (window.setFeedback) {
        window.setFeedback(newsMediaFeedback, "", "info");
      }
      const timestamp = serverTimestamp();
      const payload = {
        title,
        content,
      };
      if (newsId) {
        payload.updatedAt = timestamp;
      } else {
        payload.publishedAt = timestamp;
      }
      if (uploadedMedia) {
        payload.mediaUrl = uploadedMedia.url;
        payload.mediaPath = uploadedMedia.path;
        payload.mediaType = uploadedMedia.type;
      }
      if (newsId) {
        await updateDoc(doc(db, "news", newsId), payload);
        if (uploadedMedia && existing?.mediaPath && existing.mediaPath !== uploadedMedia.path) {
          await deleteMediaFile(existing.mediaPath);
        }
      } else {
        await addDoc(collection(db, "news"), {
          ...payload,
          mediaUrl: uploadedMedia?.url || null,
          mediaPath: uploadedMedia?.path || null,
          mediaType: uploadedMedia?.type || null,
        });
      }
      newsDialog.close();
      resetNewsForm();
      showFeedback(newsId ? "Notícia atualizada com sucesso." : "Notícia publicada com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar notícia:", error);
      notify("error", "Não foi possível salvar a notícia.");
    }
  });

  newsMediaInput?.addEventListener("change", () => {
    updateMediaLabel(newsMediaInput, newsMediaNameLabel);
    if (window.setFeedback) window.setFeedback(newsMediaFeedback, "", "info");
  });
  newsDialog.addEventListener("close", resetNewsForm);
  newsList?.addEventListener("click", handleNewsAction);
}

function attachBlogListeners() {
  if (!newBlogBtn || !blogForm || !blogDialog) return;
  newBlogBtn.addEventListener("click", () => {
    if (!canManageContent()) {
      notify("error", "Você não tem permissão para publicar no blog.");
      return;
    }
    resetBlogForm();
    if (blogDialogTitle) blogDialogTitle.textContent = "Nova publicação";
    blogDialog.showModal();
  });

  blogForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = blogForm["blog-title"].value.trim();
    const content = blogForm["blog-content"].value.trim();
    const mediaFile = blogMediaInput?.files?.[0] || null;
    if (!title || !content) {
      notify("info", "Preencha o título e o conteúdo do blog.");
      return;
    }
    const blogId = blogIdInput?.value;
    const existing = blogId ? blogDocs.find((item) => item.id === blogId) : null;
    try {
      let uploadedMedia = null;
      if (mediaFile) {
        uploadedMedia = await uploadMediaFile(mediaFile, "blog", blogMediaFeedback);
      } else if (window.setFeedback) {
        window.setFeedback(blogMediaFeedback, "", "info");
      }
      const timestamp = serverTimestamp();
      const payload = {
        title,
        content,
      };
      if (blogId) {
        payload.updatedAt = timestamp;
      } else {
        payload.publishedAt = timestamp;
      }
      if (uploadedMedia) {
        payload.mediaUrl = uploadedMedia.url;
        payload.mediaPath = uploadedMedia.path;
        payload.mediaType = uploadedMedia.type;
      }
      if (blogId) {
        await updateDoc(doc(db, "blogPosts", blogId), payload);
        if (uploadedMedia && existing?.mediaPath && existing.mediaPath !== uploadedMedia.path) {
          await deleteMediaFile(existing.mediaPath);
        }
      } else {
        await addDoc(collection(db, "blogPosts"), {
          ...payload,
          mediaUrl: uploadedMedia?.url || null,
          mediaPath: uploadedMedia?.path || null,
          mediaType: uploadedMedia?.type || null,
        });
      }
      blogDialog.close();
      resetBlogForm();
      showFeedback(blogId ? "Publicação atualizada com sucesso." : "Publicação criada com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar publicação:", error);
      notify("error", "Não foi possível salvar a publicação.");
    }
  });

  blogMediaInput?.addEventListener("change", () => {
    updateMediaLabel(blogMediaInput, blogMediaNameLabel);
    if (window.setFeedback) window.setFeedback(blogMediaFeedback, "", "info");
  });
  blogDialog.addEventListener("close", resetBlogForm);
  blogList?.addEventListener("click", handleBlogAction);
}

function setupArticleDialog() {
  if (!articleDialog) return;
  articleDialogClose?.addEventListener("click", () => {
    if (articleDialog.open) articleDialog.close();
  });
  articleDialog.addEventListener("click", (event) => {
    const link = event.target.closest("[data-article-id]");
    if (!link) return;
    const id = link.dataset.articleId;
    const type = link.dataset.articleType || "news";
    const source = type === "blog" ? blogDocs : newsDocs;
    const item = source.find((entry) => entry.id === id);
    if (item) {
      openArticleModal(item, type);
    }
  });
}

function attachEventListeners() {
  if (!addEventBtn || !eventDialog || !eventForm) return;
  addEventBtn.addEventListener("click", () => {
    if (!canManageEvents()) {
      notify("error", "Você não tem permissão para registrar eventos.");
      return;
    }
    resetEventForm();
    eventDialog.showModal();
  });

  eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = eventNameInput.value.trim();
    const eventDate = eventDateInput?.value || "";
    const timeValue = eventTimeInput?.value || "";
    const details = eventDetailsInput.value.trim();
    const arenaValue = eventArenaInput?.value.trim() || null;
    if (!title) {
      notify("info", "Informe o título do evento.");
      return;
    }
    if (!eventDate) {
      notify("info", "Selecione a data do evento.");
      eventDateInput?.focus();
      return;
    }
    const eventId = eventIdInput?.value;
    try {
      const legacyScheduleLabel = buildLegacyEventTimeLabel(timeValue);
      const payload = {
        name: title,
        eventDate,
        eventTime: timeValue || null,
        when: legacyScheduleLabel || null,
        details: details || null,
        arena: arenaValue,
        updatedAt: serverTimestamp(),
      };
      if (eventId) {
        await updateDoc(doc(db, "events", eventId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "events"), payload);
      }
      eventDialog.close();
      resetEventForm();
      showFeedback(eventId ? "Evento atualizado com sucesso." : "Evento cadastrado com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar evento:", error);
      notify("error", "Não foi possível salvar o evento.");
    }
  });

  eventDialog.addEventListener("close", resetEventForm);
  eventsList?.addEventListener("click", handleEventAction);
}

function loadNews() {
  if (!newsList) return;
  const newsQuery = query(collection(db, "news"), orderBy("publishedAt", "desc"), limit(6));
  onSnapshot(
    newsQuery,
    (snapshot) => {
      newsDocs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      renderNews();
      resolvePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar notícias:", error);
      resolvePageLoading();
    },
  );
}

function loadBlogs() {
  if (!blogList) return;
  const blogQuery = query(collection(db, "blogPosts"), orderBy("publishedAt", "desc"), limit(6));
  onSnapshot(
    blogQuery,
    (snapshot) => {
      blogDocs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      renderBlogs();
      resolvePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar posts:", error);
      resolvePageLoading();
    },
  );
}

function ensureEventsListener() {
  if (!eventsList || eventsUnsubscribe) return;
  const eventsQuery = query(collection(db, "events"), orderBy("updatedAt", "desc"));
  eventsUnsubscribe = onSnapshot(
    eventsQuery,
    (snapshot) => {
      eventsDocs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      renderEvents();
      resolvePageLoading();
    },
    (error) => {
      console.error("Erro ao carregar eventos:", error);
      if (eventsEmptyState) {
        eventsEmptyState.classList.remove("hidden");
        eventsEmptyState.textContent = "Não foi possível carregar os eventos.";
      }
      resolvePageLoading();
    },
  );
}

function loadSociosCount() {
  if (!sociosCountLabel || sociosUnsubscribe) return;
  const membersQuery = query(collection(db, "members"));
  sociosUnsubscribe = onSnapshot(
    membersQuery,
    (snapshot) => {
      const activeMembers = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((data) => normalizeMemberStatus(data.status) === "ativo");
      sociosCountLabel.textContent = activeMembers.length;
      resolvePageLoading();
    },
    () => {
      sociosCountLabel.textContent = "--";
      resolvePageLoading();
    },
  );
}

function loadPendingPaymentsAlert() {
  if (!pendingAlertCard || !pendingAlertNames || !pendingAlertMonth || !pendingAlertCount) return;
  const today = new Date();
  const targetCompetence = dateToCompetence(today);
  const nextCompetence = getNextCompetence(targetCompetence);
  const targetMonthName = formatMonthName(targetCompetence);
  const nextMonthName = formatMonthName(nextCompetence);
  if (pendingAlertCurrentRuleMonth) pendingAlertCurrentRuleMonth.textContent = targetMonthName;
  if (pendingAlertNextRuleMonth) pendingAlertNextRuleMonth.textContent = nextMonthName;

  const setHeroLayout = (hasPending) => {
    if (!heroIntro) return;
    const showClasses = hasPending ? ["md:row-start-2", "md:order-3"] : ["md:row-start-1", "md:order-1"];
    const hideClasses = hasPending ? ["md:row-start-1", "md:order-1"] : ["md:row-start-2", "md:order-3"];
    heroIntro.classList.remove(...hideClasses);
    heroIntro.classList.add(...showClasses);
  };

  if (today.getDate() < 25) {
    pendingAlertCard.classList.add("hidden");
    pendingAlertCount.textContent = "";
    setHeroLayout(false);
    return;
  }
  pendingAlertMonth.textContent = targetMonthName;

  let membersList = [];
  let paymentsIndex = new Map();

  const updateAlert = () => {
    const activeMembers = membersList.filter(
      (member) => normalizeMemberStatus(member.status) === "ativo",
    );
    const pendingNames = activeMembers
      .filter((member) => {
        const entry = paymentsIndex.get(member.id);
        if (!entry) return true;
        return !isResolvedPaymentStatus(entry.status);
      })
      .map((member) => member.name || member.email || "Sócio sem nome")
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    if (!pendingNames.length) {
      pendingAlertCard.classList.add("hidden");
      pendingAlertNames.textContent = "";
      pendingAlertCount.textContent = "";
      setHeroLayout(false);
      return;
    }

    pendingAlertCard.classList.remove("hidden");
    setHeroLayout(true);
    pendingAlertCount.textContent = `Total de pendentes: ${pendingNames.length}`;
    pendingAlertNames.innerHTML = "";
    pendingNames.forEach((name, index) => {
      const span = document.createElement("span");
      span.textContent = name;
      span.className = "transition hover:text-rose-700";
      pendingAlertNames.appendChild(span);
      if (index < pendingNames.length - 1) {
        pendingAlertNames.appendChild(document.createTextNode(", "));
      }
    });
  };

  onSnapshot(
    query(collection(db, "members")),
    (snapshot) => {
      membersList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      updateAlert();
    },
    (error) => {
      console.error("Erro ao carregar sócios pendentes:", error);
      pendingAlertCard.classList.add("hidden");
      setHeroLayout(false);
    },
  );

  onSnapshot(
    query(collection(db, "payments"), where("competence", "==", targetCompetence)),
    (snapshot) => {
      paymentsIndex = new Map();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const memberId = data.memberId;
        if (!memberId) return;
        const existing = paymentsIndex.get(memberId);
        const status = normalizeStatusKey(data.status);
        if (!existing || resolveStatusPriority(status) >= resolveStatusPriority(existing.status)) {
          paymentsIndex.set(memberId, { status });
        }
      });
      updateAlert();
    },
    (error) => {
      console.error("Erro ao carregar pagamentos pendentes:", error);
      pendingAlertCard.classList.add("hidden");
      setHeroLayout(false);
    },
  );
}

function loadBirthdaySpotlight() {
  if (!birthdaySpotlight || !birthdayList) return;
  const membersQuery = query(collection(db, "members"));
  onSnapshot(
    membersQuery,
    (snapshot) => {
      membersCache = new Map(snapshot.docs.map((docSnap) => [docSnap.id, { id: docSnap.id, ...docSnap.data() }]));
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();
      const celebrants = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((member) => normalizeMemberStatus(member.status) === "ativo")
        .map((member) => ({ member, birth: normalizeBirthDate(member.birthDate) }))
        .filter(({ birth }) => birth && birth.month === currentMonth && birth.day === currentDay)
        .map(({ member }) => member);

      birthdayList.innerHTML = "";
      const fragment = document.createDocumentFragment();
      if (!celebrants.length) {
        setBirthdayLayout(0);
        birthdaySpotlight.classList.add("hidden");
        if (birthdaySubtitle) {
          birthdaySubtitle.textContent =
            "Nenhum aniversariante registrado para hoje. Assim que houver, destacaremos por aqui.";
        }
        return;
      }

      celebrants.forEach((member) => {
        const displayName = getPreferredFirstName(member);
        const card = document.createElement("article");
        card.className =
          "flex w-full flex-col items-center gap-2 rounded-xl border border-primary/15 bg-white px-4 py-4 shadow-sm text-center hover:-translate-y-0.5 hover:shadow transition";

        const avatar = document.createElement("div");
        avatar.className =
          "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/5 text-sm font-semibold text-primary/80";
        if (member.photoUrl) {
          const img = document.createElement("img");
          img.src = member.photoUrl;
          img.alt = `Foto de ${member.name || "sócio"}`;
          img.className = "h-full w-full object-cover";
          avatar.appendChild(img);
        } else {
          const fallback = (displayName || member.name || "Sócio").trim().charAt(0).toUpperCase() || "A";
          avatar.textContent = fallback;
        }

        const nameEl = document.createElement("p");
        nameEl.className = "text-sm font-semibold text-secondary";
        nameEl.textContent = displayName || member.name || "Sócio";

        card.appendChild(avatar);
        card.appendChild(nameEl);
        fragment.appendChild(card);
      });
      birthdayList.appendChild(fragment);

      setBirthdayLayout(celebrants.length);

      if (birthdaySubtitle) {
        if (celebrants.length === 1) {
          const celebrantName = celebrants[0].name || "nosso sócio";
          birthdaySubtitle.textContent = `Deseje parabéns ao ${celebrantName} e incentive-o a celebrar com a família Amigos da Bola!`;
        } else {
          const highlighted = formatCelebrantNames(celebrants.map((member) => member.name).filter(Boolean));
          if (highlighted) {
            birthdaySubtitle.textContent = `Deseje parabéns aos aniversariantes ${highlighted} e incentive-os a celebrar com a família Amigos da Bola!`;
          } else {
            birthdaySubtitle.textContent =
              "Deseje parabéns aos aniversariantes e incentive-os a celebrar com a família Amigos da Bola!";
          }
        }
      }

      birthdaySpotlight.classList.remove("hidden");
    },
    (error) => {
      console.error("Erro ao carregar aniversariantes:", error);
      birthdayList.innerHTML = "";
      birthdaySpotlight?.classList.add("hidden");
    },
  );
}

function dateToCompetence(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthName(competence) {
  const [year, month] = (competence || "").split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long" });
}

function getNextCompetence(competence) {
  const [year, month] = (competence || "").split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  const nextDate = new Date(year, month, 1);
  return dateToCompetence(nextDate);
}

function normalizeMemberStatus(value) {
  return String(value || "ativo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeStatusKey(value) {
  return String(value || "pendente")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isResolvedPaymentStatus(status) {
  const normalized = normalizeStatusKey(status);
  if (normalized.startsWith("pago") || normalized === "quitado") return true;
  if (normalized.includes("isento") || normalized === "isentado") return true;
  return normalized === "liberado";
}

function resolveStatusPriority(status) {
  const normalized = normalizeStatusKey(status);
  if (normalized.startsWith("pago") || normalized === "quitado") return 3;
  if (normalized.includes("isento") || normalized === "isentado") return 2;
  if (normalized === "pendente") return 1;
  return 0;
}

function ensureMemberCached(memberId) {
  if (!memberId) return Promise.resolve(null);
  if (membersCache.has(memberId)) return Promise.resolve(membersCache.get(memberId));
  if (memberFetchPromises.has(memberId)) return memberFetchPromises.get(memberId);
  const promise = (async () => {
    try {
      const snapshot = await getDoc(doc(db, "members", memberId));
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        membersCache.set(memberId, data);
        return data;
      }
    } catch (error) {
      console.warn("Não foi possível carregar sócio do ranking:", error);
    }
    return null;
  })().finally(() => {
    memberFetchPromises.delete(memberId);
  });
  memberFetchPromises.set(memberId, promise);
  return promise;
}

function getFirstName(name = "Sócio") {
  const trimmed = String(name || "Sócio").trim();
  if (!trimmed) return "Sócio";
  const [first] = trimmed.split(/\s+/);
  return first || "Sócio";
}

function getPreferredFirstName(member = {}) {
  const nicknameFirst = getFirstName(member.nickname || "");
  if (nicknameFirst && nicknameFirst !== "Sócio") return nicknameFirst;
  const nameFirst = getFirstName(member.name || "");
  if (nameFirst && nameFirst !== "Sócio") return nameFirst;
  return "Sócio";
}

function getLastName(member = {}) {
  const source = String(member.name || member.nickname || "").trim();
  if (!source) return "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return "";
  return parts[parts.length - 1];
}

function setBirthdayLayout(count) {
  if (!birthdayList) return;
  birthdayList.classList.remove(
    "grid-cols-1",
    "sm:grid-cols-1",
    "sm:grid-cols-2",
    "md:grid-cols-1",
    "md:grid-cols-2",
    "md:grid-cols-3",
    "place-items-center",
    "justify-items-center",
    "max-w-3xl",
    "max-w-5xl",
    "mx-auto",
    "ml-auto",
    "mr-0",
    "justify-end",
    "justify-items-stretch",
    "pl-0",
    "md:pl-52",
    "lg:pl-52",
  );
  if (count === 1) {
    birthdayList.classList.add(
      "grid-cols-1",
      "sm:grid-cols-1",
      "md:grid-cols-1",
      "max-w-3xl",
      "mx-auto",
      "justify-items-center",
    );
  } else if (count >= 2) {
    birthdayList.classList.add(
      "grid-cols-1",
      "sm:grid-cols-2",
      "md:grid-cols-2",
      "max-w-5xl",
      "mx-auto",
      "justify-items-stretch",
    );
  }
}

function renderNews() {
  if (!newsList) return;
  newsList.innerHTML = "";
  if (!newsDocs.length) {
    if (newsEmptyState) newsEmptyState.classList.remove("hidden");
    return;
  }
  newsEmptyState?.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  newsDocs.forEach((news) => {
    const article = document.createElement("article");
    article.className = "rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-3";
    const mediaMarkup = buildMediaMarkup(news.mediaUrl, news.mediaType, news.title);
    const actions = canManageContent()
      ? `<div class="flex flex-wrap items-center gap-2 pt-2">
          <button type="button" class="text-xs font-semibold text-primary hover:text-secondary transition" data-action="edit-news" data-id="${news.id}">
            Editar
          </button>
          <button type="button" class="text-xs font-semibold text-rose-500 hover:text-rose-600 transition" data-action="delete-news" data-id="${news.id}">
            Excluir
          </button>
        </div>`
      : "";
    const safeContent = (news.content || "").trim();
    const summaryBlock = `
      <div class="space-y-2">
        <button
          type="button"
          class="article-snippet text-left w-full text-sm text-slate-700 hover:text-primary transition"
          data-action="open-news-modal"
          data-id="${news.id}"
        >
          <span class="article-snippet-text">${escapeHtml(safeContent)}</span>
          <span class="article-snippet-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </span>
        </button>
      </div>
    `;
    const headerBlock = `
      <div class="text-xs uppercase tracking-wide text-slate-500">${formatDate(news.publishedAt)}</div>
      <h3 class="text-lg font-semibold text-primary">${news.title}</h3>
    `;
    article.innerHTML = `
      ${headerBlock}
      ${mediaMarkup}
      ${summaryBlock}
      ${actions}
    `;
    fragment.appendChild(article);
  });
  newsList.appendChild(fragment);
}

function renderBlogs() {
  if (!blogList) return;
  blogList.innerHTML = "";
  if (!blogDocs.length) {
    if (blogEmptyState) blogEmptyState.classList.remove("hidden");
    return;
  }
  blogEmptyState?.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  blogDocs.forEach((blog) => {
    const article = document.createElement("article");
    article.className =
      "rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-3";
    const safeContent = (blog.content || "").trim();
    const mediaMarkup = buildMediaMarkup(blog.mediaUrl, blog.mediaType, blog.title);
    const actions = canManageContent()
      ? `<div class="flex flex-wrap items-center gap-2 pt-2">
          <button type="button" class="text-xs font-semibold text-primary hover:text-secondary transition" data-action="edit-blog" data-id="${blog.id}">
            Editar
          </button>
          <button type="button" class="text-xs font-semibold text-rose-500 hover:text-rose-600 transition" data-action="delete-blog" data-id="${blog.id}">
            Excluir
          </button>
        </div>`
      : "";
    article.innerHTML = `
      <div class="text-xs uppercase tracking-wide text-slate-500">${formatDate(blog.publishedAt)}</div>
      <h3 class="text-lg font-semibold text-secondary">${blog.title}</h3>
      ${mediaMarkup}
      <div class="space-y-2">
        <button
          type="button"
          class="article-snippet text-left w-full text-sm text-slate-700 hover:text-primary transition"
          data-action="open-blog-modal"
          data-id="${blog.id}"
        >
          <span class="article-snippet-text">${escapeHtml(safeContent)}</span>
          <span class="article-snippet-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </span>
        </button>
      </div>
      ${actions}
    `;
    fragment.appendChild(article);
  });
  blogList.appendChild(fragment);
}

function openArticleModal(article, type = "news") {
  if (!articleDialog) return;
  const isBlog = type === "blog";
  const title = article?.title || (isBlog ? "Publicação do blog" : "Notícia do clube");
  const publishedAt = formatDate(article?.publishedAt);
  if (articleDialogTitle) articleDialogTitle.textContent = title;
  if (articleDialogDate) articleDialogDate.textContent = publishedAt;
  if (articleDialogContent) {
    articleDialogContent.textContent = article?.content || "Sem conteúdo disponível.";
  }
  if (articleDialogMedia) {
    articleDialogMedia.innerHTML = buildMediaMarkup(article?.mediaUrl, article?.mediaType, title);
    articleDialogMedia.classList.toggle("hidden", !article?.mediaUrl);
  }

  if (articleDialogRelated && articleDialogRelatedList) {
    const relatedSource = (isBlog ? blogDocs : newsDocs).filter((item) => item.id !== article?.id);
    articleDialogRelatedList.innerHTML = "";
    if (!relatedSource.length) {
      articleDialogRelated.classList.add("hidden");
    } else {
      if (articleDialogRelatedTitle) {
        articleDialogRelatedTitle.textContent = isBlog ? "Outras publicações do blog" : "Outras notícias";
      }
      const fragment = document.createDocumentFragment();
      relatedSource.slice(0, 4).forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.articleId = item.id;
        button.dataset.articleType = isBlog ? "blog" : "news";
        button.className =
          "flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-primary hover:bg-primary/5";
        button.innerHTML = `
          <span class="mt-2 h-2 w-2 rounded-full bg-primary shrink-0"></span>
          <div class="min-w-0 space-y-1">
            <p class="text-[11px] uppercase tracking-wide text-slate-500">${formatDate(item.publishedAt)}</p>
            <p class="text-sm font-semibold text-secondary" style="-webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.title || (isBlog ? "Publicação" : "Notícia")}
            </p>
          </div>
        `;
        fragment.appendChild(button);
      });
      articleDialogRelatedList.appendChild(fragment);
      articleDialogRelated.classList.remove("hidden");
    }
  }

  articleDialog.showModal();
}

function renderEvents() {
  if (!eventsList) return;
  eventsList.innerHTML = "";
  const upcomingEvents = eventsDocs
    .filter(isUpcomingEvent)
    .sort((a, b) => compareUpcomingEvents(a, b));
  if (!upcomingEvents.length) {
    if (eventsEmptyState) {
      eventsEmptyState.textContent = "Nenhum evento futuro cadastrado.";
      eventsEmptyState.classList.remove("hidden");
    }
    return;
  }
  eventsEmptyState?.classList.add("hidden");
  const fragment = document.createDocumentFragment();
  const [featuredEvent, ...otherEvents] = upcomingEvents;
  fragment.appendChild(createEventListItem(featuredEvent, { variant: "featured" }));
  otherEvents.forEach((eventItem) => {
    fragment.appendChild(createEventListItem(eventItem));
  });
  eventsList.appendChild(fragment);
}

function createEventListItem(eventItem, { variant = "default" } = {}) {
  const li = document.createElement("li");
  const name = escapeHtml(eventItem?.name || "Evento do clube");
  const detailsRaw = (eventItem?.details || "").trim();
  const safeDetails = escapeHtml(detailsRaw);
  const locationRaw = eventItem?.arena || "A definir";
  const location = escapeHtml(locationRaw);
  const badge = escapeHtml(formatUpcomingEventDate(eventItem));
  const timeRaw = formatEventTimeDisplay(eventItem);
  const timeDisplay = escapeHtml(timeRaw);
  const fullDateRaw = formatFullEventDate(eventItem?.eventDate);
  const fullDate = escapeHtml(fullDateRaw);
  const actions = buildEventActionsMarkup(eventItem, variant);

  if (variant === "featured") {
    li.className =
      "relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#ff4d4d] to-[#ff6b6b] text-white px-6 py-7 shadow-2xl";
    li.innerHTML = `
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)] pointer-events-none"></div>
      <div class="relative space-y-6">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <span class="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
            <span class="h-2 w-2 rounded-full bg-white"></span>
            ${badge}
          </span>
          <span class="text-sm font-semibold text-white/90">${timeDisplay}</span>
        </div>
        <div class="space-y-3">
          <h3 class="text-2xl md:text-3xl font-bold leading-snug">${name}</h3>
          ${detailsRaw ? `<p class="text-sm text-white/90 whitespace-pre-line">${safeDetails}</p>` : ""}
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-white/80">
          <span>Local: <strong class="font-semibold text-white">${location}</strong></span>
          ${fullDateRaw ? `<span>${fullDate}</span>` : ""}
        </div>
        ${actions}
      </div>
    `;
    return li;
  }

  li.className =
    "rounded-2xl border border-primary/15 bg-white/95 shadow-lg shadow-primary/10 px-5 py-4 space-y-3 backdrop-blur-sm";
  li.innerHTML = `
    <div class="flex items-center justify-between gap-3">
      <span class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        <span class="h-2 w-2 rounded-full bg-primary"></span>
        ${badge}
      </span>
      <span class="text-xs font-medium text-secondary/70">${timeDisplay}</span>
    </div>
    <div class="space-y-2">
      <h3 class="text-lg font-semibold text-secondary">${name}</h3>
      ${detailsRaw ? `<p class="text-sm leading-relaxed text-secondary/80 whitespace-pre-line">${safeDetails}</p>` : ""}
    </div>
    <p class="text-xs font-medium text-secondary/70 uppercase tracking-wide">
      Local: <span class="text-secondary">${location}</span>
    </p>
    ${actions}
  `;
  return li;
}

function buildEventActionsMarkup(eventItem, variant = "default") {
  if (!canManageEvents() || !eventItem?.id) return "";
  const editClasses =
    variant === "featured"
      ? "text-xs font-semibold text-white/90 hover:text-white transition"
      : "text-xs font-semibold text-primary hover:text-secondary transition";
  const deleteClasses =
    variant === "featured"
      ? "text-xs font-semibold text-white/80 hover:text-white transition"
      : "text-xs font-semibold text-rose-500 hover:text-rose-600 transition";
  const alignment = variant === "featured" ? "justify-start text-white/85" : "justify-end text-secondary/80";
  return `
    <div class="flex items-center ${alignment} gap-3 pt-3">
      <button type="button" class="${editClasses}" data-action="edit-event" data-id="${eventItem.id}">
        Editar
      </button>
      <button type="button" class="${deleteClasses}" data-action="delete-event" data-id="${eventItem.id}">
        Excluir
      </button>
    </div>
  `;
}

async function handleNewsAction(event) {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (!action) return;
  if (action === "open-news-modal") {
    const newsItem = newsDocs.find((item) => item.id === target.dataset.id);
    if (newsItem) {
      openArticleModal(newsItem, "news");
    }
    return;
  }
  if (!canManageContent()) {
    notify("error", "Você não tem permissão para alterar notícias.");
    return;
  }
  const id = target.dataset.id;
  if (!id) return;
  if (action === "edit-news") {
    startNewsEdit(id);
    return;
  }
  if (action === "delete-news") {
    if (!confirm("Deseja realmente excluir esta notícia?")) return;
    const existing = newsDocs.find((item) => item.id === id);
    try {
      await deleteDoc(doc(db, "news", id));
      if (existing?.mediaPath) {
        await deleteMediaFile(existing.mediaPath);
      }
    } catch (error) {
      console.error("Erro ao excluir notícia:", error);
      notify("error", "Não foi possível excluir a notícia.");
    }
  }
}

async function handleBlogAction(event) {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (!action) return;
  if (action === "open-blog-modal") {
    const blogItem = blogDocs.find((item) => item.id === target.dataset.id);
    if (blogItem) {
      openArticleModal(blogItem, "blog");
    }
    return;
  }
  if (!canManageContent()) {
    notify("error", "Você não tem permissão para alterar publicações do blog.");
    return;
  }
  const id = target.dataset.id;
  if (!action || !id) return;
  if (action === "edit-blog") {
    startBlogEdit(id);
    return;
  }
  if (action === "delete-blog") {
    if (!confirm("Deseja realmente excluir esta publicação?")) return;
    const existing = blogDocs.find((item) => item.id === id);
    try {
      await deleteDoc(doc(db, "blogPosts", id));
      if (existing?.mediaPath) {
        await deleteMediaFile(existing.mediaPath);
      }
    } catch (error) {
      console.error("Erro ao excluir publicação:", error);
      notify("error", "Não foi possível excluir a publicação.");
    }
  }
}

function handleEventAction(event) {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  if (!canManageEvents()) {
    notify("error", "Você não tem permissão para alterar eventos.");
    return;
  }
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;
  if (action === "edit-event") {
    startEventEdit(id);
    return;
  }
  if (action === "delete-event") {
    if (!confirm("Deseja realmente excluir este evento?")) return;
    deleteDoc(doc(db, "events", id)).catch((error) => {
      console.error("Erro ao excluir evento:", error);
      notify("error", "Não foi possível excluir o evento.");
    });
  }
}

function startNewsEdit(id) {
  if (!newsForm || !newsDialog) return;
  const existing = newsDocs.find((item) => item.id === id);
  if (!existing) {
    notify("error", "Não foi possível localizar a notícia selecionada.");
    return;
  }
  newsIdInput.value = id;
  newsForm["news-title"].value = existing.title || "";
  newsForm["news-content"].value = existing.content || "";
  if (newsMediaInput) newsMediaInput.value = "";
  if (newsDialogTitle) newsDialogTitle.textContent = "Editar notícia";
  newsDialog.showModal();
}

function startBlogEdit(id) {
  if (!blogForm || !blogDialog) return;
  const existing = blogDocs.find((item) => item.id === id);
  if (!existing) {
    notify("error", "Não foi possível localizar a publicação selecionada.");
    return;
  }
  blogIdInput.value = id;
  blogForm["blog-title"].value = existing.title || "";
  blogForm["blog-content"].value = existing.content || "";
  if (blogMediaInput) blogMediaInput.value = "";
  if (blogDialogTitle) blogDialogTitle.textContent = "Editar publicação";
  blogDialog.showModal();
}

function startEventEdit(id) {
  if (!eventForm || !eventDialog) return;
  const existing = eventsDocs.find((item) => item.id === id);
  if (!existing) {
    notify("error", "Não foi possível localizar o evento selecionado.");
    return;
  }
  if (eventIdInput) eventIdInput.value = id;
  if (eventNameInput) eventNameInput.value = existing.name || "";
  if (eventTimeInput) {
    eventTimeInput.value = existing.eventTime || deriveTimeFromLegacyLabel(existing.when) || "";
  }
  if (eventDetailsInput) eventDetailsInput.value = existing.details || "";
  if (eventArenaInput) eventArenaInput.value = existing.arena || "";
  if (eventDateInput) eventDateInput.value = existing.eventDate || "";
  if (eventFormTitle) eventFormTitle.textContent = "Editar evento";
  eventDialog.showModal();
}

function buildMediaMarkup(url, declaredType, title = "") {
  if (!url) return "";
  const type = declaredType || inferMediaTypeFromUrl(url);
  if (type === "video") {
    return `
      <div class="media-frame overflow-hidden rounded-xl border border-slate-200 bg-black/80">
        <video controls preload="metadata" class="media-element" crossorigin="anonymous">
          <source src="${url}" />
          Seu navegador não suporta reprodução de vídeo.
        </video>
      </div>
    `;
  }
  return `
    <figure class="media-frame overflow-hidden rounded-xl border border-slate-200">
      <img src="${url}" alt="${escapeHtml(title || "Imagem do clube")}" class="media-image" loading="lazy" />
    </figure>
  `;
}

function validateMediaFile(file, feedbackElement) {
  if (!file) return true;
  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    if (window.setFeedback) {
      window.setFeedback(feedbackElement, "O arquivo deve ter no máximo 16 MB.", "error");
    }
    return false;
  }
  if (file.type && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
    return true;
  }
  const lowerName = (file.name || "").toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm", ".mkv"];
  const isAllowed = allowedExtensions.some((ext) => lowerName.endsWith(ext));
  if (!isAllowed && window.setFeedback) {
    window.setFeedback(feedbackElement, "Envie uma imagem ou vídeo válido.", "error");
  }
  return isAllowed;
}

async function uploadMediaFile(file, folder, feedbackElement) {
  if (!file) return null;
  if (!validateMediaFile(file, feedbackElement)) {
    throw new Error("Arquivo inválido.");
  }
  const safeFolder = folder || "uploads";
  const normalizedName = normalizeFileName(file.name || "arquivo");
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const path = `${safeFolder}/${uniqueSuffix}_${normalizedName}`;
  const storageRef = ref(storage, path);
  if (window.setFeedback) {
    window.setFeedback(feedbackElement, "Enviando arquivo... 0%", "info");
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
          window.setFeedback(feedbackElement, `Enviando arquivo... ${progress}%`, "info");
        },
        reject,
        resolve,
      );
    });
  } else {
    await uploadBytes(storageRef, file);
  }
  const url = await getDownloadURL(storageRef);
  if (window.setFeedback) {
    window.setFeedback(feedbackElement, "Arquivo enviado com sucesso.", "success");
    setTimeout(() => window.setFeedback(feedbackElement, "", "info"), 2500);
  }
  return {
    url,
    path,
    type: detectMediaType(file, path),
  };
}

async function deleteMediaFile(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") {
      console.warn("Não foi possível remover o arquivo do storage:", error);
    }
  }
}

function detectMediaType(file, fallbackName = "") {
  const mime = file?.type || "";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";
  return inferMediaTypeFromUrl(fallbackName || file?.name || "");
}

function inferMediaTypeFromUrl(url) {
  if (!url) return "image";
  const cleanUrl = url.split("?")[0];
  const extension = cleanUrl.split(".").pop()?.toLowerCase() || "";
  if (["mp4", "mov", "m4v", "webm", "ogg"].includes(extension)) {
    return "video";
  }
  return "image";
}

function normalizeFileName(name) {
  return name
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();
}

function escapeHtml(value) {
  return (value || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showFeedback(message) {
  if (!feedbackDialog || !feedbackDialogMessage) return;
  feedbackDialogMessage.textContent = message;
  feedbackDialog.showModal();
}

function resetNewsForm() {
  if (newsForm) newsForm.reset();
  if (newsIdInput) newsIdInput.value = "";
  if (newsMediaInput) newsMediaInput.value = "";
  if (newsDialogTitle) newsDialogTitle.textContent = "Nova notícia";
  updateMediaLabel(newsMediaInput, newsMediaNameLabel);
  if (window.setFeedback) window.setFeedback(newsMediaFeedback, "", "info");
}

function resetBlogForm() {
  if (blogForm) blogForm.reset();
  if (blogIdInput) blogIdInput.value = "";
  if (blogMediaInput) blogMediaInput.value = "";
  if (blogDialogTitle) blogDialogTitle.textContent = "Nova publicação";
  updateMediaLabel(blogMediaInput, blogMediaNameLabel);
  if (window.setFeedback) window.setFeedback(blogMediaFeedback, "", "info");
}

function resetEventForm() {
  if (eventForm) eventForm.reset();
  if (eventIdInput) eventIdInput.value = "";
  if (eventFormTitle) eventFormTitle.textContent = "Novo evento";
  if (eventArenaInput) eventArenaInput.value = "";
  if (eventDateInput) eventDateInput.value = "";
  if (eventTimeInput) eventTimeInput.value = "";
  if (eventDetailsInput) eventDetailsInput.value = "";
}

function isUpcomingEvent(eventItem) {
  if (!eventItem) return false;
  const date = parseDateInput(eventItem.eventDate);
  if (date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() >= today.getTime();
  }
  return true;
}

function compareUpcomingEvents(a, b) {
  return getComparableEventDate(a) - getComparableEventDate(b);
}

function getComparableEventDate(eventItem) {
  const date = parseDateInput(eventItem.eventDate);
  if (date) return date.getTime();
  if (eventItem.updatedAt?.toDate) return eventItem.updatedAt.toDate().getTime();
  if (eventItem.createdAt?.toDate) return eventItem.createdAt.toDate().getTime();
  return Number.MAX_SAFE_INTEGER;
}

function formatUpcomingEventDate(eventItem) {
  const badge = formatEventBadgeLabel(eventItem.eventDate);
  if (badge) return badge;
  if (eventItem.when) return eventItem.when;
  return "Data a definir";
}

function formatEventTimeDisplay(eventItem) {
  if (eventItem?.eventTime) {
    const label = formatEventTimeLabel(eventItem.eventTime);
    if (label) return label;
  }
  if (eventItem?.when) {
    const derived = deriveTimeFromLegacyLabel(eventItem.when);
    if (derived) {
      const formatted = formatEventTimeLabel(derived);
      if (formatted) return formatted;
    }
    return eventItem.when;
  }
  return "Horário a definir";
}

function formatFullEventDate(value) {
  const date = parseDateInput(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatEventBadgeLabel(value) {
  const date = parseDateInput(value);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatEventTimeLabel(timeValue) {
  if (!timeValue) return "";
  const [hourRaw, minuteRaw = "00"] = timeValue.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return "";
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return "";
  if (minute === 0) {
    return `${String(hour).padStart(2, "0")}h`;
  }
  return `${String(hour).padStart(2, "0")}h${String(minute).padStart(2, "0")}`;
}

function buildLegacyEventTimeLabel(timeValue) {
  const label = formatEventTimeLabel(timeValue);
  return label || "";
}

function deriveTimeFromLegacyLabel(label = "") {
  if (!label) return "";
  const sanitized = label.replace(/\s+/g, "").toLowerCase();
  const detailedMatches = Array.from(sanitized.matchAll(/(\d{1,2})(?:h|:)(\d{2})?/g));
  let hour;
  let minute;
  if (detailedMatches.length) {
    const [, hourGroup, minuteGroup] = detailedMatches[detailedMatches.length - 1];
    hour = Number(hourGroup);
    minute = Number(minuteGroup ?? "00");
  } else {
    const fallback = sanitized.match(/(\d{1,2})h?$/);
    if (!fallback) return "";
    hour = Number(fallback[1]);
    minute = 0;
  }
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return "";
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDate(value) {
  const date = parseDateInput(value);
  if (!date) return "--";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split("/").map(Number);
      return new Date(year, month - 1, day);
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (value?.toDate) {
    const parsed = value.toDate();
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function translateAuthError(error) {
  if (!error?.code) return "Não foi possível entrar. Confira os dados e tente novamente.";
  const map = {
    "auth/user-not-found": "Usuário não encontrado. Confira o email digitado.",
    "auth/wrong-password": "Senha inválida. Tente novamente.",
    "auth/invalid-email": "Formato de email inválido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns instantes antes de tentar novamente.",
  };
  return map[error.code] || "Não foi possível entrar. Confira os dados e tente novamente.";
}

function translateResetError(error) {
  if (!error?.code) return "Não foi possível enviar o email de redefinição. Tente novamente.";
  const map = {
    "auth/missing-email": "Informe um email válido antes de solicitar a redefinição.",
    "auth/invalid-email": "O email informado não é válido.",
    "auth/user-not-found": "Não encontramos um usuário com esse email.",
    "auth/too-many-requests": "Muitas tentativas recentes. Aguarde um pouco e tente novamente.",
  };
  return map[error.code] || "Não foi possível enviar o email de redefinição. Tente novamente.";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handlePasswordResetRequest(rawEmail, { setFeedback, focusInput } = {}) {
  const email = (rawEmail || "").trim().toLowerCase();
  if (!email) {
    setFeedback?.("Informe seu email antes de solicitar a redefinição.", "error");
    focusInput?.();
    return;
  }
  if (!EMAIL_REGEX.test(email)) {
    setFeedback?.("Informe um email válido.", "error");
    focusInput?.();
    return;
  }
  setFeedback?.(`Enviando instruções para ${email}...`, "info");
  try {
    const auth = getFirebaseAuth();
    if (auth.languageCode !== "pt-BR") auth.languageCode = "pt-BR";
    await sendPasswordResetEmail(auth, email);
    setFeedback?.(
      `Enviamos um email para ${email} com as instruções de redefinição. Se não encontrar, verifique a caixa de spam e marque como "Não é spam" para futuras mensagens.`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setFeedback?.(translateResetError(error), "error");
  }
}

function setLoginFeedback(message = "", variant = "info") {
  if (!loginFeedback) return;
  if (window.setFeedback) {
    window.setFeedback(loginFeedback, message, variant);
    return;
  }
  const classes = {
    error: "text-xs text-rose-600",
    success: "text-xs text-green-600",
    info: "text-xs text-slate-500",
  };
  loginFeedback.className = classes[variant] || classes.info;
  loginFeedback.textContent = message;
}

function setResetFeedback(message = "", variant = "info") {
  if (!resetFeedback) return;
  if (window.setFeedback) {
    window.setFeedback(resetFeedback, message, variant);
    return;
  }
  const classes = {
    error: "text-xs text-rose-600",
    success: "text-xs text-green-600",
    info: "text-xs text-slate-500",
  };
  resetFeedback.className = classes[variant] || classes.info;
  resetFeedback.textContent = message;
}

init();

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
    button.disabled = !shouldShow;
  });
}

window.addEventListener("resize", () => {
  syncLogoutButtons(Boolean(currentUser));
});

function configureAuthObservers() {
  onAuthChange((user, profile) => {
    currentUser = user;
    currentProfile = profile;
    loginTriggers.forEach((trigger) => {
      if (user && profile) {
        trigger.dataset.state = "authenticated";
        if (trigger.dataset.labelAuth) trigger.textContent = trigger.dataset.labelAuth;
        trigger.classList.add("hidden");
        trigger.disabled = true;
      } else {
        trigger.dataset.state = "anonymous";
        if (trigger.dataset.labelAnon) trigger.textContent = trigger.dataset.labelAnon;
        trigger.classList.remove("hidden");
        trigger.disabled = false;
      }
    });
    syncLogoutButtons(Boolean(user));
    toggleRestrictedNav(Boolean(user && profile));
    if (userRoleBadge) {
      const shouldDisplayRole = Boolean(user && profile);
      userRoleBadge.textContent = shouldDisplayRole ? getUserHeaderLabel(profile) : "";
      userRoleBadge.classList.toggle("hidden", !shouldDisplayRole);
      userRoleBadge.classList.toggle("inline-flex", shouldDisplayRole);
      userRoleBadge.classList.toggle("items-center", shouldDisplayRole);
    }
    toggleEditorialControls();
  });
}

function toggleEditorialControls() {
  const canContent = canManageContent();
  const canEvents = canManageEvents();
  toggleControl(newNewsBtn, canContent);
  toggleControl(newBlogBtn, canContent);
  toggleControl(addEventBtn, canEvents);
  renderNews();
  renderBlogs();
  renderEvents();
}

function toggleRestrictedNav(isAuthenticated) {
  restrictedNavItems.forEach((item) => {
    item.classList.toggle("hidden", !isAuthenticated);
    item.toggleAttribute("aria-hidden", !isAuthenticated);
  });
}

function toggleControl(element, enabled) {
  if (!element) return;
  element.classList.toggle("hidden", !enabled);
  element.toggleAttribute("aria-hidden", !enabled);
  element.disabled = !enabled;
}

function canManageContent() {
  return !!currentProfile && contentEditorRoles.has(currentProfile.role);
}

function canManageEvents() {
  return !!currentProfile && eventEditorRoles.has(currentProfile.role);
}

function normalizeBirthDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { month: value.getMonth() + 1, day: value.getDate() };
  }
  if (typeof value === "string") {
    const normalized = value.trim();
    const parts = normalized.split(/[\/-]/).map((part) => Number(part));
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      const [a, b, c] = parts;
      if (normalized.includes("/")) {
        return { day: a, month: b };
      }
      return { month: b, day: c };
    }
  }
  if (value?.toDate) {
    const date = value.toDate();
    if (!Number.isNaN(date.getTime())) {
      return { month: date.getMonth() + 1, day: date.getDate() };
    }
  }
  return null;
}

function formatRole(value) {
  const roles = {
    admin: "Administrador",
    diretor: "Diretor",
    financeiro: "Financeiro",
    tesoureiro: "Tesoureiro",
    imprensa: "Imprensa",
    socio: "Sócio",
    visitante: "Visitante",
    crianca: "Criança",
  };
  const key = String(value || "").toLowerCase().trim();
  if (roles[key]) return roles[key];
  if (!key) return "Sócio";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function getUserHeaderLabel(profile) {
  if (!profile) return "";
  const rawName = String(profile.name || "").trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : "Usuário";
  const roleLabel = formatRole(profile.role);
  return `${firstName} (${roleLabel})`;
}

function formatCelebrantNames(rawNames = []) {
  const names = rawNames.map((name) => (name || "").trim()).filter(Boolean);
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  const head = names.slice(0, -1).join(", ");
  const last = names[names.length - 1];
  return `${head} e ${last}`;
}

function toggleBlogContent(button) {
  const targetId = button.dataset.target;
  if (!targetId) return;
  const content = document.getElementById(targetId);
  if (!content) return;
  const isCollapsed = content.dataset.collapsed !== "false";
  content.dataset.collapsed = isCollapsed ? "false" : "true";
  button.textContent = isCollapsed ? "Mostrar menos" : "Leia mais";
}




const staticContact = {
  whatsapp: "(18) 99801-9407",
  email: "contato@amigosdabola.club",
  address: "Rodovia Marechal Rondom Km 614 - Guaraçaí - SP",
};

function enforceStaticContact() {
  Object.entries(staticContact).forEach(([key, value]) => {
    const node = document.getElementById(`contact-${key}`);
    if (node) node.textContent = value;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enforceStaticContact);
} else {
  enforceStaticContact();
}
setPasswordToggleState(loginPasswordToggle, false);
loginPasswordToggle?.addEventListener("click", () => {
  if (!loginPasswordInput) return;
  const reveal = loginPasswordInput.type === "password";
  loginPasswordInput.type = reveal ? "text" : "password";
  setPasswordToggleState(loginPasswordToggle, reveal);
});

loginRegisterLink?.addEventListener("click", () => {
  if (loginDialog?.open) loginDialog.close();
  window.location.href = "register.html";
});

loginForgotLink?.addEventListener("click", async () => {
  const email = (loginEmailInput?.value || "").trim().toLowerCase();
  if (resetDialog && typeof resetDialog.showModal === "function") {
    if (loginDialog?.open) loginDialog.close();
    if (resetEmailInput) resetEmailInput.value = email;
    setResetFeedback("", "info");
    setLoginFeedback("", "info");
    resetDialog.showModal();
    if (resetEmailInput) {
      if (resetEmailInput.value) {
        resetEmailInput.select();
      } else {
        resetEmailInput.focus();
      }
    }
    return;
  }

  // Fallback caso o modal dedicado não exista
  await handlePasswordResetRequest(email, {
    setFeedback: setLoginFeedback,
    focusInput: () => loginEmailInput?.focus(),
  });
});
