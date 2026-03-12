import { requireAuth, logout as doLogout } from "./auth.js";
import { getFirestoreDb, serverTimestamp } from "./firebase-client.js";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Evita que o navegador restaure rolagem antiga ao recarregar
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const db = getFirestoreDb();

const DEFAULT_TIMER_SECONDS = 15 * 60;
const DEFAULT_LINE_PLAYERS_PER_TEAM = 7;
const LINEUP_SIZE_OPTIONS = new Set([6, 7, 11]);
const TEAM_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MONTH_NAMES = [
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
const ROLE_LABELS = {
  admin: "Administrador",
  diretor: "Diretor",
  imprensa: "Imprensa",
  financeiro: "Financeiro",
  tesoureiro: "Tesoureiro",
  socio: "Sócio",
  visitante: "Visitante",
  crianca: "Criança",
};
const GAMES_EDITOR_ROLES = new Set(["admin", "imprensa"]);

function canEditGames() {
  const role = state.context?.profile?.role || "";
  return GAMES_EDITOR_ROLES.has(role);
}

function notify(type, message) {
  if (window.toast && typeof window.toast[type] === "function") {
    window.toast[type](message);
    return;
  }
  alert(message);
}

function ensureGamesEditor(message = "Somente administradores ou imprensa podem alterar os jogos.") {
  if (canEditGames()) return true;
  notify("error", message);
  return false;
}

const ATTENDANCE_STATUS = {
  PLAYER: "player",
  GOALKEEPER: "goalkeeper",
  SUBSTITUTE: "substitute", // 🆕 Novo status
  SUPPORTER: "supporter",
  ABSENT: "absent",
};

const STORAGE_COLLECTION = "gameDays";
const SCOREBOARD_COLLECTION = "seasonStandings";
const TIMER_STORAGE_KEY = "games:timerState";
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
let audioContext;

const TEAM_COLOR_PALETTE = [
  {
    card: "border-rose-200 bg-rose-50",
    header: "text-rose-700",
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
    button: "hover:border-rose-300 hover:text-rose-600",
  },
  {
    card: "border-blue-200 bg-blue-50",
    header: "text-blue-700",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    button: "hover:border-blue-300 hover:text-blue-600",
  },
  {
    card: "border-emerald-200 bg-emerald-50",
    header: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    button: "hover:border-emerald-300 hover:text-emerald-600",
  },
  {
    card: "border-amber-200 bg-amber-50",
    header: "text-amber-700",
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    button: "hover:border-amber-300 hover:text-amber-600",
  },
  {
    card: "border-indigo-200 bg-indigo-50",
    header: "text-indigo-700",
    badge: "bg-indigo-100 text-indigo-700 border border-indigo-200",
    button: "hover:border-indigo-300 hover:text-indigo-600",
  },
];

function parseDateInput(input) {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === "number") {
    const dateNum = new Date(input);
    return Number.isNaN(dateNum.getTime()) ? null : dateNum;
  }
  if (typeof input === "string") {
    if (DATE_ONLY_REGEX.test(input)) {
      const [year, month, day] = input.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeLinePlayersPerTeam(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !LINEUP_SIZE_OPTIONS.has(parsed)) {
    return DEFAULT_LINE_PLAYERS_PER_TEAM;
  }
  return parsed;
}

function getLinePlayersPerTeam() {
  if (!state.gameState) return DEFAULT_LINE_PLAYERS_PER_TEAM;
  return normalizeLinePlayersPerTeam(state.gameState.linePlayersPerTeam);
}

function getRequiredLinePlayers() {
  return getLinePlayersPerTeam() * 2;
}

const state = {
  context: null,
  members: [],
  membersMap: new Map(),
  membersUnsubscribe: null,
  selectedDate: getTodayKey(),
  gameState: null,
  scoreboardSeason: new Date().getFullYear(),
  scoreboard: { entries: {} },
  scoreboardSeasonPinned: false,
  timer: {
    seconds: DEFAULT_TIMER_SECONDS,
    running: false,
    intervalId: null,
    targetEndAt: null,
    warningPlayed: false,
    endPlayed: false,
    lastWarningSecond: null,
  },
  manualSelection: null,
  drawAnimationTimeout: null,
  seasonRolloverTimeout: null,
};
window.pageState = state;

const elements = {
  navToggle: document.getElementById("games-menu-toggle"),
  drawer: document.getElementById("drawer-menu"),
  drawerBackdrop: document.getElementById("drawer-backdrop"),
  drawerClose: document.getElementById("drawer-close"),
  logoutButtons: Array.from(document.querySelectorAll("[data-logout-button]")),
  roleBadge: document.getElementById("games-user-role"),
  dateDisplay: document.getElementById("game-date-display"),
  dateInput: document.getElementById("game-date-input"),
  dateInputDisplay: document.getElementById("game-date-display-input"),
  datePickerButton: document.getElementById("game-date-picker-button"),
  clearSessionButton: document.getElementById("games-clear-session"),
  attendanceTable: document.getElementById("attendance-table"),
  attendanceTableWrapper: document.getElementById("attendance-table-wrapper"),
  attendancePlayerCount: document.getElementById("attendance-player-count"),
  attendanceGoalkeeperCount: document.getElementById("attendance-goalkeeper-count"),
  attendanceSupporterCount: document.getElementById("attendance-supporter-count"),
  arrivalLineupList: document.getElementById("arrival-lineup-list"),
  goalkeeperQueueList: document.getElementById("goalkeeper-queue-list"),
  goalkeeperQueueCount: document.getElementById("goalkeeper-queue-count"),
  initialDrawButton: document.getElementById("initial-draw-button"),
  initialDrawWrapper: document.getElementById("initial-draw-wrapper"),
  initialDrawAlert: document.getElementById("initial-draw-alert"),
  initialDrawOverlay: document.getElementById("initial-draw-overlay"),
  initialDrawOverlayText: document.getElementById("initial-draw-overlay-text"),
  lineupSizeSelect: document.getElementById("lineup-size-select"),
  lineupSizeNote: document.getElementById("lineup-size-note"),
  teamsContainer: document.getElementById("teams-container"),
  currentMatchLabel: document.getElementById("current-match-label"),
  rotationQueue: document.getElementById("rotation-queue"),
  matchesHistory: document.getElementById("matches-history"),
  matchTimer: document.getElementById("match-timer"),
  timerStart: document.getElementById("timer-start"),
  timerPause: document.getElementById("timer-pause"),
  timerReset: document.getElementById("timer-reset"),
  matchResultForm: document.getElementById("match-result-form"),
  matchScoreA: document.getElementById("match-score-a"),
  matchScoreB: document.getElementById("match-score-b"),
  matchResultFeedback: document.getElementById("match-result-feedback"),
  rotationWinner: document.getElementById("rotation-winner"),
  matchNotes: document.getElementById("match-notes"),
  scoreboardSeasonLabel: document.getElementById("scoreboard-season-label"),
  scoreboardExport: document.getElementById("scoreboard-export"),
  scoreboardTable: document.getElementById("scoreboard-table"),
  scoreboardModal: document.getElementById("scoreboard-modal"),
  scoreboardModalClose: document.getElementById("scoreboard-modal-close"),
  scoreboardForm: document.getElementById("scoreboard-form"),
  scoreboardFeedback: document.getElementById("scoreboard-feedback"),
  scoreboardFormTitle: document.getElementById("scoreboard-form-title"),
  scoreboardMemberId: document.getElementById("scoreboard-member-id"),
  scoreboardPresence: document.getElementById("scoreboard-presence"),
  scoreboardWin: document.getElementById("scoreboard-win"),
  scoreboardDraw: document.getElementById("scoreboard-draw"),
  scoreboardGoal: document.getElementById("scoreboard-goal"),
  scoreboardYellow: document.getElementById("scoreboard-yellow"),
  scoreboardRed: document.getElementById("scoreboard-red"),
  scoreboardSearch: document.getElementById("scoreboard-search"),
  scoreboardSeasonSelect: document.getElementById("scoreboard-season-select"),
  manualPlayerDialog: document.getElementById("manual-player-dialog"),
  manualPlayerForm: document.getElementById("manual-player-form"),
  manualPlayerTitle: document.getElementById("manual-player-title"),
  manualPlayerDescription: document.getElementById("manual-player-description"),
  manualPlayerSelect: document.getElementById("manual-player-select"),
  manualPlayerFeedback: document.getElementById("manual-player-feedback"),
  manualPlayerSubmit: document.getElementById("manual-player-submit"),
  manualPlayerCancel: document.querySelector("[data-action='cancel-manual-player']"),
};

const loadingFlags = { members: false, scoreboard: false, gameState: false };

function setPageLoading(isLoading) {
  document.body.classList.toggle("page-loading", isLoading);
}

function updatePageLoading() {
  const done = Object.values(loadingFlags).every(Boolean);
  setPageLoading(!done);
}

setupDrawerMenu();
setupCollapsibleSections();
setupPublicNavMemory();
attachBaseListeners();
elements.scoreboardSearch?.addEventListener("input", debounce(() => renderScoreboardTable(), 250));
elements.scoreboardSeasonSelect?.addEventListener("change", async (event) => {
  const year = Number(event.target.value);
  if (!year) return;
  state.scoreboardSeasonPinned = true;
  await loadScoreboard(year);
});
window.addEventListener("beforeunload", () => cacheTimerState());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    cacheTimerState();
  } else {
    ensureScoreboardSeasonIsCurrent();
  }
});

(async function init() {
  setPageLoading(true);
  try {
    state.context = await requireAuth({
      allowedRoles: ["admin", "diretor", "imprensa", "financeiro", "tesoureiro", "socio", "visitante", "crianca"],
    });
    if (elements.roleBadge) {
      elements.roleBadge.textContent = getUserHeaderLabel(state.context.profile);
      elements.roleBadge.classList.remove("hidden");
    }
    populateSeasonSelect();
    await loadMembers();
    await loadScoreboard(state.scoreboardSeason);
    loadingFlags.scoreboard = true;
    updatePageLoading();
    scheduleSeasonRolloverCheck();
    await loadGameState(state.selectedDate);
    loadingFlags.gameState = true;
    updatePageLoading();
    updateDateUI();
    renderAll();
  } catch (error) {
    console.error("Erro ao iniciar página de jogos:", error);
    if (elements.matchResultFeedback) {
      elements.matchResultFeedback.textContent = "Não foi possível carregar os dados. Recarregue a página.";
    }
    loadingFlags.members = true;
    loadingFlags.scoreboard = true;
    loadingFlags.gameState = true;
    updatePageLoading();
  }
})();

function attachBaseListeners() {
  elements.logoutButtons.forEach((button) => {
    button?.addEventListener("click", async () => {
      elements.logoutButtons.forEach((btn) => {
        btn.disabled = true;
        btn.classList.add("opacity-60", "pointer-events-none");
      });
      await doLogout();
      window.location.href = "index.html";
    });
  });

  elements.clearSessionButton?.addEventListener("click", () => {
    if (isSelectedDateInPast()) {
      notify("error", "Sessões de datas passadas não podem ser limpas.");
      return;
    }
    if (!ensureGamesEditor("Somente administradores ou imprensa podem limpar a sessão.")) return;
    clearGameSession();
  });

  elements.dateInput?.addEventListener("change", async (event) => {
    const selected = event.target.value;
    if (!selected) return;
    if (selected === state.selectedDate) return;
    cacheTimerState();
    resetGameDayView(selected);
    await loadGameState(selected);
    updateDateUI();
    renderAll();
  });

  elements.dateInputDisplay?.addEventListener("input", (event) => {
    event.target.value = formatDateInputMask(event.target.value);
  });

  elements.dateInputDisplay?.addEventListener("blur", async (event) => {
    const raw = event.target.value;
    if (!raw) return;
    const parsed = parseBrazilianDate(raw);
    if (!parsed) {
      notify("error", "Data inválida. Use o formato dd/mm/aaaa.");
      updateDateUI();
      return;
    }
    const nextDateKey = formatDateKey(parsed);
    if (nextDateKey === state.selectedDate) return;
    cacheTimerState();
    resetGameDayView(nextDateKey);
    await loadGameState(nextDateKey);
    updateDateUI();
    renderAll();
  });

  elements.datePickerButton?.addEventListener("click", () => {
    if (!elements.dateInput) return;
    if (typeof elements.dateInput.showPicker === "function") {
      elements.dateInput.showPicker();
      return;
    }
    elements.dateInput.focus();
  });

  elements.initialDrawButton?.addEventListener("click", () => {
    if (!ensureGamesEditor("Somente administradores ou imprensa podem realizar o sorteio inicial.")) return;
    handleInitialDraw();
  });

  elements.lineupSizeSelect?.addEventListener("change", (event) => {
    if (!ensureGamesEditor("Somente administradores ou imprensa podem alterar o formato do sorteio.")) {
      updateLineupConfigUI();
      return;
    }
    if (!state.gameState) return;
    if (state.gameState.initialDrawDone) {
      updateLineupConfigUI();
      return;
    }
    const selected = normalizeLinePlayersPerTeam(event.target.value);
    if (state.gameState.linePlayersPerTeam === selected) return;
    state.gameState.linePlayersPerTeam = selected;
    persistGameState();
    renderAll();
  });

  elements.teamsContainer?.addEventListener("click", (event) => {
    if (!canEditGames()) return;
    const button = event.target.closest("[data-team-action]");
    if (!button) return;
    const teamId = button.dataset.teamId;
    const action = button.dataset.teamAction;
    if (!teamId || !action) return;
    if (action === "add-player") {
      openManualPlayerDialog({ mode: "add", teamId });
      return;
    }
    if (action === "substitute-player") {
      const memberId = button.dataset.memberId;
      if (!memberId) return;
      openManualPlayerDialog({ mode: "substitute", teamId, memberId });
    }
  });

  elements.matchResultForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ensureGamesEditor("Somente administradores ou imprensa podem registrar o resultado da partida.")) return;
    await handleMatchResultSubmission();
  });

  elements.timerStart?.addEventListener("click", () => {
    if (!canEditGames()) return;
    startTimer();
  });
  elements.timerPause?.addEventListener("click", () => {
    if (!canEditGames()) return;
    pauseTimer();
  });
  elements.timerReset?.addEventListener("click", () => {
    if (!canEditGames()) return;
    resetTimer();
  });

  elements.scoreboardExport?.addEventListener("click", () => exportScoreboard());

  elements.scoreboardTable?.addEventListener("click", (event) => {
    if (!canEditGames()) return;
    const button = event.target.closest("[data-edit-scoreboard]");
    if (!button) return;
    const memberId = button.dataset.editScoreboard;
    openScoreboardModal(memberId);
  });

  elements.scoreboardModalClose?.addEventListener("click", () => closeScoreboardModal());
  elements.scoreboardModal?.addEventListener("click", (event) => {
    if (event.target === elements.scoreboardModal) {
      closeScoreboardModal();
    }
  });

  elements.scoreboardForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ensureGamesEditor("Somente administradores ou imprensa podem atualizar a pontuação.")) return;
    await saveScoreboardEntry();
  });

  elements.attendanceTable?.addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-attendance-action]");
    if (!trigger) return;
    event.preventDefault();
    if (!canEditGames()) {
      notify("error", "Somente administradores ou imprensa podem atualizar as presenças.");
      renderAttendanceTable();
      return;
    }
    if (trigger.disabled) return;
    const memberId = trigger.dataset.member;
    const status = trigger.dataset.status;
    if (!memberId || !status) return;
    const currentStatus = state.gameState?.presences?.[memberId]?.status || ATTENDANCE_STATUS.ABSENT;
    const nextStatus = currentStatus === status ? ATTENDANCE_STATUS.ABSENT : status;
    const anchorTop = (trigger.closest("tr") || trigger.closest("tbody"))?.getBoundingClientRect()?.top ?? null;
    try {
      await updateMemberStatus(memberId, nextStatus, { anchorTop });
    } catch (error) {
      console.error("Erro ao atualizar status de presença:", error);
    }
  });

  elements.manualPlayerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleManualPlayerSubmit();
  });
  elements.manualPlayerCancel?.addEventListener("click", () => closeManualPlayerDialog());
  elements.manualPlayerDialog?.addEventListener("close", () => resetManualPlayerDialog());
  elements.attendanceSearch = document.getElementById("attendance-search");

  elements.attendanceSearch?.addEventListener("input", debounce(() => {
    renderAttendanceTable();
  }, 250));

}

async function clearGameSession() {
  if (!canEditGames()) return;
  const selectedDate = state.selectedDate;
  if (!selectedDate) return;
  const confirmed = window.confirm(
    "Deseja realmente limpar a sessão desta data? As presenças serão mantidas, mas sorteios, partidas e filas serão reiniciados.",
  );
  if (!confirmed) return;

  const trigger = elements.clearSessionButton;
  if (trigger) {
    trigger.disabled = true;
  }

  stopDrawAnimation();

  const freshState = createDefaultGameState(selectedDate);
  if (state.gameState?.linePlayersPerTeam) {
    freshState.linePlayersPerTeam = normalizeLinePlayersPerTeam(state.gameState.linePlayersPerTeam);
  }

  try {
    state.gameState = freshState;
    state.initialDrawReady = false;
    state.initialDrawHighlightShown = false;
    ensureGoalkeeperQueue();
    applyGoalkeeperAssignments();
    resetTimer(true);
    renderAll();

    const clearedAt = serverTimestamp();
    await setDoc(
      doc(db, STORAGE_COLLECTION, selectedDate),
      {
        ...freshState,
        updatedAt: clearedAt,
        clearedAt,
      },
      { merge: false },
    );

    if (elements.matchResultFeedback) {
      elements.matchResultFeedback.textContent = "Sessão de jogos limpa com sucesso.";
    }
  } catch (error) {
    console.error("Não foi possível limpar a sessão de jogos:", error);
    if (elements.matchResultFeedback) {
      elements.matchResultFeedback.textContent = "Não foi possível limpar a sessão. Tente novamente.";
    }
    try {
      await loadGameState(selectedDate);
      renderAll();
    } catch (restoreError) {
      console.error("Falha ao recarregar estado após erro ao limpar sessão:", restoreError);
    }
  } finally {
    if (trigger) {
      trigger.disabled = false;
    }
  }
}

function setupDrawerMenu() {
  if (!elements.navToggle || !elements.drawer || !elements.drawerBackdrop) return;
  const srLabel = elements.navToggle.querySelector(".sr-only");

  const setOpen = (open) => {
    elements.navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    elements.drawer.dataset.open = open ? "true" : "false";
    elements.drawerBackdrop.dataset.open = open ? "true" : "false";
    elements.drawer.setAttribute("aria-hidden", open ? "false" : "true");
    elements.drawerBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
    if (srLabel) srLabel.textContent = open ? "Fechar navegação" : "Abrir navegação";
    document.body.classList.toggle("overflow-hidden", open);
  };

  elements.navToggle.addEventListener("click", () => {
    const isOpen = elements.drawer.dataset.open === "true";
    setOpen(!isOpen);
  });

  elements.drawerBackdrop.addEventListener("click", () => setOpen(false));
  elements.drawerClose?.addEventListener("click", () => setOpen(false));
  elements.drawer.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  setOpen(false);
}

function resetGameDayView(dateKey) {
  stopDrawAnimation();
  closeManualPlayerDialog();
  state.manualSelection = null;
  state.selectedDate = dateKey;
  state.gameState = createDefaultGameState(dateKey);
  state.initialDrawReady = false;
  state.initialDrawHighlightShown = false;
  resetTimer(true);
  if (elements.matchResultFeedback) {
    elements.matchResultFeedback.textContent = "";
  }
  renderAll();
}

function setupCollapsibleSections() {
  document.querySelectorAll("[data-collapse-toggle]").forEach((button) => {
    const targetId = button.dataset.collapseToggle;
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    const label = button.querySelector("[data-collapse-label]");
    const chevron = button.querySelector("[data-icon='chevron']");

    const setCollapsed = (collapsed) => {
      if (collapsed) {
        target.classList.add("hidden");
        if (label) label.textContent = "Mostrar";
        if (chevron) chevron.setAttribute("transform", "rotate(180 12 12)");
      } else {
        target.classList.remove("hidden");
        if (label) label.textContent = "Ocultar";
        if (chevron) chevron.removeAttribute("transform");
      }
    };

    button.addEventListener("click", () => {
      const collapsed = !target.classList.contains("hidden");
      setCollapsed(collapsed);
    });

    const defaultState = (button.dataset.collapseDefault || "closed").toLowerCase();
    if (defaultState === "open") {
      setCollapsed(false);
    } else if (defaultState === "closed") {
      setCollapsed(true);
    }
  });
}

function setupPublicNavMemory() {
  const publicNavLinks = document.querySelectorAll("a[data-public-nav]");
  publicNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
      try {
        sessionStorage.setItem("admin:returnPath", window.location.pathname);
      } catch (error) {
        console.warn("Não foi possível registrar a última rota da área restrita.", error);
      }
    });
  });
}

async function loadMembers() {
  if (state.membersUnsubscribe) {
    state.membersUnsubscribe();
  }
  const membersQuery = query(collection(db, "members"), orderBy("name", "asc"));
  state.membersUnsubscribe = onSnapshot(
    membersQuery,
       (snapshot) => {
      state.members = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      state.membersMap = new Map(state.members.map((member) => [member.id, member]));
      // re-render simples, sem mexer no scroll da página
      renderAttendanceTable();
      renderScoreboardTable();
      renderTeams();
      loadingFlags.members = true;
      updatePageLoading();
    },

    (error) => {
      console.error("Erro ao carregar sócios:", error);
      loadingFlags.members = true;
      updatePageLoading();
    },
  );
}

async function loadGameState(dateKey) {
  await pauseTimer();
  state.selectedDate = dateKey;
  const docRef = doc(db, STORAGE_COLLECTION, dateKey);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const stored = snapshot.data();
    state.gameState = normalizeGameState(stored);
  } else {
    const freshState = createDefaultGameState(dateKey);
    state.gameState = freshState;
    await setDoc(docRef, {
      ...freshState,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  if (!Array.isArray(state.gameState.goalkeeperQueue)) {
    state.gameState.goalkeeperQueue = [];
  }
  state.initialDrawReady = Boolean(state.gameState.initialDrawDone);
  state.initialDrawHighlightShown = Boolean(state.gameState.initialDrawDone);
  ensureGoalkeeperQueue();
  applyGoalkeeperAssignments();
  restoreTimerState();
  renderMatchTimer();
}

function populateSeasonSelect() {
  const select = elements.scoreboardSeasonSelect;
  if (!select) return;
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= currentYear - 4; year -= 1) {
    years.push(year);
  }
  select.innerHTML = "";
  const fragment = document.createDocumentFragment();
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    fragment.appendChild(option);
  });
  select.appendChild(fragment);
  const currentValue = String(state.scoreboardSeason || currentYear);
  if (years.includes(Number(currentValue))) {
    select.value = currentValue;
  }
}

async function loadScoreboard(season) {
  state.scoreboardSeason = season;
  if (elements.scoreboardSeasonLabel) {
    elements.scoreboardSeasonLabel.textContent = season;
  }
  populateSeasonSelect();
  if (elements.scoreboardSeasonSelect) {
    elements.scoreboardSeasonSelect.value = String(season);
  }
  const docRef = doc(db, SCOREBOARD_COLLECTION, String(season));
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const stored = snapshot.data() || {};
    const rawEntries = stored.entries || {};
    const normalizedEntries = {};
    Object.entries(rawEntries).forEach(([memberId, entry]) => {
      normalizedEntries[memberId] = buildScoreboardEntry(entry);
    });
    state.scoreboard = {
      ...stored,
      entries: normalizedEntries,
    };
  } else {
    state.scoreboard = { season, entries: {} };
  }
  renderScoreboardTable();
}

function scheduleSeasonRolloverCheck() {
  if (state.seasonRolloverTimeout) {
    clearTimeout(state.seasonRolloverTimeout);
  }
  const now = new Date();
  const nextYearStart = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 5);
  const delay = Math.max(1000, nextYearStart.getTime() - now.getTime());
  state.seasonRolloverTimeout = window.setTimeout(async () => {
    const changed = await ensureScoreboardSeasonIsCurrent();
    if (!changed) {
      scheduleSeasonRolloverCheck();
    }
  }, delay);
}

async function ensureScoreboardSeasonIsCurrent() {
  const currentYear = new Date().getFullYear();
  if (state.scoreboardSeason === currentYear) {
    await ensureSeasonDocument(currentYear);
    return false;
  }
  if (state.scoreboardSeasonPinned) {
    await ensureSeasonDocument(currentYear);
    return false;
  }
  await resetScoreboardSeason(currentYear);
  scheduleSeasonRolloverCheck();
  return true;
}

async function resetScoreboardSeason(newSeason) {
  state.scoreboardSeason = newSeason;
  state.scoreboardSeasonPinned = false;
  state.scoreboard = { season: newSeason, entries: {} };
  if (elements.scoreboardSeasonLabel) {
    elements.scoreboardSeasonLabel.textContent = newSeason;
  }
  renderScoreboardTable();

  const docRef = doc(db, SCOREBOARD_COLLECTION, String(newSeason));
  try {
    await setDoc(
      docRef,
      {
        season: newSeason,
        entries: {},
        updatedAt: serverTimestamp(),
        resetAt: serverTimestamp(),
      },
      { merge: false },
    );
  } catch (error) {
    console.error("Não foi possível reiniciar a pontuação anual:", error);
  }
  await loadScoreboard(newSeason);
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function ensureSeasonDocument(season) {
  const docRef = doc(db, SCOREBOARD_COLLECTION, String(season));
  try {
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) return false;
    await setDoc(
      docRef,
      {
        season,
        entries: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        resetAt: serverTimestamp(),
      },
      { merge: false },
    );
    return true;
  } catch (error) {
    console.error("Não foi possível garantir a temporada atual:", error);
    return false;
  }
}

function renderAll() {
  updateLineupConfigUI();
  updateDateUI();
  renderAttendanceTable();
  renderTeams();
  renderMatchSummary();
  renderMatchesHistory();
  renderScoreboardTable();
}

function updateLineupConfigUI() {
  if (!state.gameState) return;
  const perTeam = getLinePlayersPerTeam();
  const total = perTeam * 2;
  if (elements.lineupSizeSelect) {
    elements.lineupSizeSelect.value = String(perTeam);
    elements.lineupSizeSelect.disabled = Boolean(state.gameState.initialDrawDone);
  }
  if (elements.lineupSizeNote) {
    elements.lineupSizeNote.textContent = state.gameState.initialDrawDone
      ? "Formato travado após o sorteio."
      : "Defina antes do sorteio.";
  }
  document.querySelectorAll("[data-lineup-total]").forEach((node) => {
    node.textContent = total;
  });
}

function updateDateUI() {
  if (elements.dateDisplay) {
    elements.dateDisplay.textContent = formatFullDate(state.selectedDate);
  }
  if (elements.dateInput) {
    elements.dateInput.value = state.selectedDate;
  }
  if (elements.dateInputDisplay) {
    elements.dateInputDisplay.value = "";
  }
  updateClearSessionAvailability();
}

function updateClearSessionAvailability() {
  if (!elements.clearSessionButton) return;
  const isPastDate = isSelectedDateInPast();
  elements.clearSessionButton.setAttribute("aria-disabled", isPastDate ? "true" : "false");
  elements.clearSessionButton.classList.toggle("opacity-60", isPastDate);
  elements.clearSessionButton.classList.toggle("cursor-not-allowed", isPastDate);
  elements.clearSessionButton.title = isPastDate ? "Sessões de datas passadas não podem ser limpas." : "";
}

function isSelectedDateInPast() {
  const todayKey = getTodayKey();
  return state.selectedDate < todayKey;
}

function formatDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateToBrazilian(input) {
  const date = parseDateInput(input);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseBrazilianDate(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  if (Number.isNaN(candidate.getTime())) return null;
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }
  return candidate;
}

function formatDateInputMask(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function renderAttendanceTable() {
  if (!elements.attendanceTable || !state.gameState) return;
  const wrapper = elements.attendanceTableWrapper;
  const scrollState = wrapper ? { top: wrapper.scrollTop, left: wrapper.scrollLeft } : null;

  const presences = state.gameState.presences || {};

  let playerCount = 0;
  let goalkeeperCount = 0;
  let supporterCount = 0;

  // 🔎 Campo de busca (ignora maiúsculas/minúsculas e acentos)
  const rawSearchTerm = elements.attendanceSearch?.value || "";
  const tokens = getSearchTokens(rawSearchTerm);
  const filteredMembers = state.members.filter((member) => {
    if (!tokens.length) return true;
    const name = `${member.name || ""} ${member.nickname || ""}`;
    return matchesSearchTokens(name, tokens);
  });

  const rows = filteredMembers
    .map((member, index) => {
      const attendance = presences[member.id] || null;
      const status = attendance?.status || ATTENDANCE_STATUS.ABSENT;
      const position = index + 1;

      // Contadores
      if (status === ATTENDANCE_STATUS.PLAYER && !state.gameState.discardedPlayers.includes(member.id)) {
        playerCount += 1;
      } else if (status === ATTENDANCE_STATUS.GOALKEEPER) {
        goalkeeperCount += 1;
      } else if (status === ATTENDANCE_STATUS.SUPPORTER) {
        supporterCount += 1;
      }

      const arrivalAt = attendance?.arrivalAt ? formatTime(new Date(attendance.arrivalAt)) : "--";
      const groupName = `status-${member.id}`;
      const isDiscarded = state.gameState.discardedPlayers.includes(member.id);
      const rowClasses = isDiscarded ? "bg-secondary/5 text-secondary/60" : "";

      // ⚙️ Presença (toggle), Goleiro e Torcida
      const statusButtons = [
        [ATTENDANCE_STATUS.PLAYER, "Presença"],
        [ATTENDANCE_STATUS.GOALKEEPER, "Goleiro"],
        [ATTENDANCE_STATUS.SUPPORTER, "Torcida"],
      ]
        .map(([value, label]) =>
          renderStatusRadio(groupName, member.id, value, label, status === value, isDiscarded),
        )
        .join("");

      return `
        <tr class="${rowClasses}">
          <td class="px-4 py-3 text-center text-xs font-semibold text-secondary/70">${String(position).padStart(2, "0")}</td>
          <td class="px-4 py-3">
            <div class="font-medium text-secondary">${member.name || member.nickname || "Sem nome"}</div>
            ${member.status === "desligado" ? '<div class="text-xs text-secondary/60">Desligado</div>' : ""}
          </td>
          <td class="px-4 py-3 text-sm">
            <div class="flex flex-wrap gap-2">
              ${statusButtons}
            </div>
          </td>
          <td class="px-4 py-3 text-xs text-secondary/60">${arrivalAt}</td>
        </tr>
      `;
    })
    .filter(Boolean)
    .join("");

  elements.attendanceTable.innerHTML =
    rows ||
    `
    <tr>
      <td class="px-4 py-4 text-center text-sm text-secondary/60" colspan="4">
        Nenhum sócio encontrado${rawSearchTerm ? ` para "${rawSearchTerm}"` : ""}.
      </td>
    </tr>
  `;

  // Contadores e sorteio
  // Sorteio não força destaque ao atingir o limite de atletas
  if (elements.initialDrawButton) {
    elements.initialDrawButton.classList.remove("hidden");
    elements.initialDrawButton.disabled = state.gameState.initialDrawDone;
    elements.initialDrawButton.classList.remove("animate-pulse", "ring-4", "ring-primary/60");
  }
  if (elements.initialDrawAlert) {
    elements.initialDrawAlert.classList.add("hidden");
  }
  if (elements.attendancePlayerCount)
    elements.attendancePlayerCount.textContent = playerCount;
  if (elements.attendanceGoalkeeperCount)
    elements.attendanceGoalkeeperCount.textContent = goalkeeperCount;
  if (elements.attendanceSupporterCount)
    elements.attendanceSupporterCount.textContent = supporterCount;

  renderArrivalLineup(presences);

  // Restaura apenas a rolagem do container (evita saltos na página)
  requestAnimationFrame(() => {
    if (wrapper && scrollState) {
      try {
        wrapper.scrollTop = scrollState.top;
        wrapper.scrollLeft = scrollState.left;
      } catch (error) {}
    }
  });
}


function renderArrivalLineup(presences) {
  if (!elements.arrivalLineupList) return;
  const confirmedPlayers = Object.entries(presences)
    .filter(([memberId, record]) => {
      if (!record) return false;
      if (record.status !== ATTENDANCE_STATUS.PLAYER) return false;
      return !state.gameState?.discardedPlayers?.includes?.(memberId);
    })
    .sort((a, b) => {
      const aTime = resolveMillis(a[1].arrivalAt) ?? Infinity;
      const bTime = resolveMillis(b[1].arrivalAt) ?? Infinity;
      if (aTime === bTime) return 0;
      return aTime - bTime;
    })
    .map(([memberId, record], index) => {
      const member = state.membersMap.get(memberId);
      const name = member ? member.name || member.nickname || "Sem nome" : "Sócio removido";
      const arrivalLabel = record.arrivalAt ? formatTime(new Date(record.arrivalAt)) : "--";
      const position = index + 1;
      return `
        <li class="flex items-center justify-between gap-3 rounded-lg border border-secondary/10 bg-white px-3 py-2 text-sm text-secondary">
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-secondary/5 px-2 py-1 text-xs font-semibold text-secondary/70">${String(position).padStart(2, "0")}</span>
            <span class="font-medium">${name}</span>
          </div>
          <span class="text-xs text-secondary/60">${arrivalLabel}</span>
        </li>
      `;
    });
  elements.arrivalLineupList.innerHTML =
    confirmedPlayers.length > 0
      ? confirmedPlayers.join("")
      : '<li class="text-secondary/60">Nenhum atleta confirmado até o momento.</li>';
  renderGoalkeeperQueue();
}

function renderGoalkeeperQueue() {
  if (!elements.goalkeeperQueueList) return;
  const queue = state.gameState?.goalkeeperQueue || [];
  if (elements.goalkeeperQueueCount) {
    elements.goalkeeperQueueCount.textContent = `${queue.length} goleiro${queue.length === 1 ? "" : "s"}`;
  }
  if (!queue.length) {
    elements.goalkeeperQueueList.innerHTML = '<li class="text-secondary/60">Nenhum goleiro cadastrado na fila.</li>';
    return;
  }
  const presences = state.gameState?.presences || {};
  const items = queue
    .map((memberId, index) => {
      const member = state.membersMap.get(memberId);
      const name = member ? member.name || member.nickname || "Sem nome" : "Sócio removido";
      const arrivalAt = presences[memberId]?.arrivalAt;
      const arrivalLabel = arrivalAt ? formatTime(new Date(arrivalAt)) : "--";
      return `
        <li class="flex items-center justify-between gap-3 rounded-lg border border-secondary/10 bg-white px-3 py-2 text-sm text-secondary">
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-secondary/5 px-2 py-1 text-xs font-semibold text-secondary/70">${String(index + 1).padStart(2, "0")}</span>
            <span class="font-medium">${name}</span>
          </div>
          <span class="text-xs text-secondary/60">${arrivalLabel}</span>
        </li>
      `;
    })
    .join("");
  elements.goalkeeperQueueList.innerHTML = items;
}

function refreshAttendanceCounts(presences) {
  let playerCount = 0;
  let goalkeeperCount = 0;
  let supporterCount = 0;

  Object.entries(presences || {}).forEach(([memberId, record]) => {
    if (!record) return;
    if (state.gameState?.discardedPlayers?.includes?.(memberId)) return;
    if (record.status === ATTENDANCE_STATUS.PLAYER) playerCount += 1;
    if (record.status === ATTENDANCE_STATUS.GOALKEEPER) goalkeeperCount += 1;
    if (record.status === ATTENDANCE_STATUS.SUPPORTER) supporterCount += 1;
  });

  if (elements.attendancePlayerCount)
    elements.attendancePlayerCount.textContent = playerCount;
  if (elements.attendanceGoalkeeperCount)
    elements.attendanceGoalkeeperCount.textContent = goalkeeperCount;
  if (elements.attendanceSupporterCount)
    elements.attendanceSupporterCount.textContent = supporterCount;
}

function updateAttendanceRow(memberId, newStatus) {
  if (!elements.attendanceTable) return false;
  const button =
    elements.attendanceTable.querySelector(
      `[data-attendance-action][data-member="${memberId}"][data-status="${newStatus}"]`,
    ) ||
    elements.attendanceTable.querySelector(`[data-attendance-action][data-member="${memberId}"]`);
  if (!button) return false;

  const row = button.closest("tr");
  if (!row) return false;

  const groupButtons = row.querySelectorAll(`[data-attendance-action][data-member="${memberId}"]`);
  groupButtons.forEach((el) => {
    const isActive = el.dataset.status === newStatus;
    updateAttendanceButtonState(el, isActive);
  });

  const presenceRecord = state.gameState?.presences?.[memberId];
  const arrivalCell = row.querySelector("td:last-child");
  if (arrivalCell) {
    arrivalCell.textContent = presenceRecord?.arrivalAt
      ? formatTime(new Date(presenceRecord.arrivalAt))
      : "--";
  }
  return true;
}



function startDrawAnimation() {
  elements.initialDrawOverlay?.classList.remove("hidden");
  if (elements.initialDrawOverlayText) {
    elements.initialDrawOverlayText.textContent = "Sorteando times...";
  }
  if (elements.initialDrawButton) {
    elements.initialDrawButton.disabled = true;
  }
}

function stopDrawAnimation() {
  if (state.drawAnimationTimeout) {
    clearTimeout(state.drawAnimationTimeout);
    state.drawAnimationTimeout = null;
  }
  elements.initialDrawOverlay?.classList.add("hidden");
  if (elements.initialDrawButton && !state.gameState?.initialDrawDone) {
    elements.initialDrawButton.disabled = false;
  }
  renderGoalkeeperQueue();
}

function getMemberName(memberId) {
  const member = state.membersMap.get(memberId);
  if (!member) return "Sócio removido";
  return member.name || member.nickname || "Sem nome";
}

function findTeamForPlayer(memberId) {
  if (!state.gameState || !memberId) return null;
  for (const teamId of state.gameState.teamOrder) {
    const team = state.gameState.teams?.[teamId];
    if (!team) continue;
    if ((team.players || []).some((player) => player.memberId === memberId)) {
      return teamId;
    }
  }
  return null;
}

function removePlayerFromTeam(teamId, memberId, { markDiscarded = false } = {}) {
  if (!state.gameState || !teamId || !memberId) return false;
  const team = state.gameState.teams?.[teamId];
  if (!team || !Array.isArray(team.players)) return false;
  const previousLength = team.players.length;
  team.players = team.players.filter((player) => player.memberId !== memberId);
  const removed = team.players.length !== previousLength;
  if (removed) {
    if (markDiscarded) {
      state.gameState.discardedPlayers = Array.from(
        new Set([...state.gameState.discardedPlayers, memberId]),
      );
    } else {
      state.gameState.discardedPlayers = state.gameState.discardedPlayers.filter((id) => id !== memberId);
    }
  }
  return removed;
}

function addPlayerToTeam(teamId, memberId) {
  if (!state.gameState || !teamId || !memberId) return false;
  const team = state.gameState.teams?.[teamId];
  if (!team) return false;
  const alreadyInTeam = (team.players || []).some((player) => player.memberId === memberId);
  if (alreadyInTeam) return false;
  const presence = state.gameState.presences?.[memberId] || {};
  const arrivalAt = presence.arrivalAt || Date.now();
  assignNextPlayer(team, { memberId, arrivalAt });
  state.gameState.discardedPlayers = state.gameState.discardedPlayers.filter((id) => id !== memberId);
  return true;
}
function buildManualCandidateList({ excludeTeamId, excludeMemberId, role } = {}) {
  if (!state || !state.gameState) return [];

  const { teams, goalkeeperQueue = [] } = state.gameState;

  // 🧩 1️⃣ Sócios que já estão jogando (goleiros e linha)
  const inGameMembers = new Set();
  Object.values(teams).forEach((team) => {
    if (team.goalkeeperId) inGameMembers.add(team.goalkeeperId);
    (team.players || []).forEach((p) => inGameMembers.add(p.memberId));
  });

  // 🧩 2️⃣ Goleiros em espera (fila de goleiros)
  const waitingGoalkeepers = goalkeeperQueue
    .map((id) => state.membersMap.get(id))
    .filter(Boolean)
    .map((m) => ({
      id: m.id,
      name: m.name || m.nickname || "Sem nome",
      role: "goalkeeper",
      teamName: "Fila de Goleiros",
    }));

  // 🧩 3️⃣ Jogadores livres (presentes, mas não jogando)
  const availablePlayers = state.members
    .filter((member) => {
      if (excludeMemberId && member.id === excludeMemberId) return false;
      if (inGameMembers.has(member.id)) return false; // já está jogando
      const presence = state.gameState.presences?.[member.id];
      return presence && presence.status !== ATTENDANCE_STATUS.ABSENT;
    })
    .map((m) => ({
      id: m.id,
      name: m.name || m.nickname || "Sem nome",
      role: "player",
      teamName: "Disponível",
    }));

  // 🧩 4️⃣ Jogadores de outros times (para permitir substituição cruzada)
  const playersFromOtherTeams = [];
  Object.entries(teams).forEach(([teamId, team]) => {
    if (teamId === excludeTeamId) return;
    const teamName = `Time ${teamId}`;
    (team.players || []).forEach((p) => {
      const member = state.membersMap.get(p.memberId);
      if (!member || member.id === excludeMemberId) return;
      playersFromOtherTeams.push({
        id: member.id,
        name: member.name || member.nickname || "Sem nome",
        role: "player",
        teamName,
      });
    });
  });

  // 🧩 5️⃣ Se for substituição de goleiro, prioriza goleiros (fila ou livres)
  let allCandidates = [...waitingGoalkeepers, ...availablePlayers, ...playersFromOtherTeams];
  if (role === "goalkeeper") {
    allCandidates = allCandidates.filter((c) => c.role === "goalkeeper" || c.teamName === "Fila de Goleiros");
  }

  // 🧩 6️⃣ Remove duplicados e ordena
  const unique = new Map();
  allCandidates.forEach((c) => {
    if (!unique.has(c.id)) unique.set(c.id, c);
  });

  return Array.from(unique.values());
}


function formatManualCandidateLabel(candidate) {
  if (!candidate) return "";
  if (!candidate.currentTeam) return `${candidate.name} — Disponível`;
  const suffix = candidate.isLastLoser ? " (derrota)" : "";
  return `${candidate.name} — Time ${candidate.currentTeam}${suffix}`;
}

function openManualPlayerDialog(context) {
  if (!elements.manualPlayerDialog || !elements.manualPlayerSelect || !elements.manualPlayerTitle) return;
  resetManualPlayerDialog();

  state.manualSelection = context;

  if (context.mode === "add") {
    elements.manualPlayerTitle.textContent = `Adicionar atleta ao Time ${context.teamId}`;
    if (elements.manualPlayerDescription) {
      elements.manualPlayerDescription.textContent =
        "Escolha um atleta já confirmado para completar o time. Jogadores removidos da lista de espera não aparecem aqui.";
    }
  } else {
    const outgoingName = getMemberName(context.memberId);
    elements.manualPlayerTitle.textContent = `Substituir ${outgoingName} no Time ${context.teamId}`;
    if (elements.manualPlayerDescription) {
      elements.manualPlayerDescription.textContent =
        "Selecione o atleta que assumirá a vaga. Selecione jogadores disponíveis ou de outros times (como o time derrotado).";
    }
  }

  const candidates =
    context.mode === "add"
      ? buildManualCandidateList({ excludeTeamId: context.teamId })
      : buildManualCandidateList({
          excludeTeamId: context.teamId,
          excludeMemberId: context.memberId,
          role: context.mode === "substitute-goalkeeper" ? "goalkeeper" : undefined, // ✅ para incluir goleiros corretamente
        });

  if (candidates.length) {
    const fragment = document.createDocumentFragment();
    candidates.forEach((candidate) => {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = formatManualCandidateLabel(candidate);
      fragment.appendChild(option);
    });
    elements.manualPlayerSelect.innerHTML = "";
    elements.manualPlayerSelect.appendChild(fragment);
    elements.manualPlayerSelect.disabled = false;
    if (elements.manualPlayerFeedback) {
      elements.manualPlayerFeedback.textContent =
        candidates.some((candidate) => candidate.isLastLoser)
          ? 'Jogadores do time derrotado aparecem destacados como "derrota".'
          : "";
    }
    if (elements.manualPlayerSubmit) {
      elements.manualPlayerSubmit.disabled = false;
    }
  } else {
    elements.manualPlayerSelect.innerHTML = "";
    elements.manualPlayerSelect.disabled = true;
    if (elements.manualPlayerFeedback) {
      elements.manualPlayerFeedback.textContent =
        "Não há atletas disponíveis para esta ação. Ajuste as presenças ou libere alguém de outro time.";
    }
    if (elements.manualPlayerSubmit) {
      elements.manualPlayerSubmit.disabled = true;
    }
  }

  // ✅ Adiciona listener de envio (resolve o erro de undefined)
  const form = elements.manualPlayerDialog.querySelector("form");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const newMemberId = elements.manualPlayerSelect.value;
      if (!newMemberId) {
        notify("info", "Selecione um atleta para continuar.");
        return;
      }

      // Chama a função de substituição com contexto completo
      await handleManualPlayerSubmit({
        teamId: context.teamId,
        memberId: context.memberId,
        newMemberId,
        mode: context.mode,
      });
    };
  }

  if (!elements.manualPlayerDialog.open) {
    elements.manualPlayerDialog.showModal();
  }
}
async function handleManualPlayerSubmit({ teamId, memberId, newMemberId, mode }) {
  if (!ensureGamesEditor("Somente administradores ou imprensa podem alterar a formação dos times.")) return;
  if (!state || !state.gameState) return;

  const team = state.gameState.teams[teamId];
  if (!team) return;

  // ➕ Caso 0: adicionar atleta ao time
  if (mode === "add") {
    // Evita duplicar atleta em outro time
    removeMemberFromOtherTeams(newMemberId, teamId);
    const alreadyThere = (team.players || []).some((p) => p.memberId === newMemberId);
    if (!alreadyThere) {
      const arrivalAt = state.gameState.presences?.[newMemberId]?.arrivalAt || Date.now();
      team.players = [...(team.players || []), { memberId: newMemberId, role: "line", arrivalAt }];
    }
  }

  // ⚙️ Caso 1: substituição normal de jogador de linha
  if (mode === "substitute" || !mode) {
    const playerIndex = (team.players || []).findIndex((p) => p.memberId === memberId);
    if (playerIndex === -1) {
      console.warn("Jogador para substituição não encontrado.");
      return;
    }

    // Remove o atleta escolhido de outros times (linhas ou goleiro) antes de inserir aqui
    removeMemberFromOtherTeams(newMemberId, teamId);

    // Substitui o jogador no time
    team.players[playerIndex].memberId = newMemberId;
  }

  // 🧤 Caso 2: substituição de goleiro
  else if (mode === "substitute-goalkeeper") {
    const oldGoalkeeper = team.goalkeeperId;
    const newGoalkeeper = newMemberId;

    if (oldGoalkeeper === newGoalkeeper) {
      notify("info", "O goleiro selecionado já está escalado neste time.");
      return;
    }

    // Remove o novo goleiro de qualquer posição em outros times
    removeMemberFromOtherTeams(newGoalkeeper, teamId);

    // 1️⃣ Atualiza o goleiro no time (novo entra)
    team.goalkeeperId = newGoalkeeper;

    // 2️⃣ Pega o próximo da fila (se houver)
    const queue = state.gameState.goalkeeperQueue || [];
    const nextInQueue = queue.find((id) => id !== oldGoalkeeper && id !== newGoalkeeper);

    // 3️⃣ Atualiza a fila:
    // - o novo goleiro vai para o fim (ele acabou de jogar)
    // - o goleiro que entrou é removido da posição antiga
    // - o antigo goleiro (oldGoalkeeper) vai para o fim da fila
    const updatedQueue = queue.filter(
      (id) => id !== newGoalkeeper && id !== oldGoalkeeper
    );

    if (oldGoalkeeper) updatedQueue.push(oldGoalkeeper);
    if (newGoalkeeper) updatedQueue.push(newGoalkeeper);

    state.gameState.goalkeeperQueue = Array.from(new Set(updatedQueue));

    // 4️⃣ Caso o Claudio (novo goleiro) tenha vindo de outro time:
    //    o time anterior dele deve receber o próximo goleiro da fila
    if (nextInQueue) {
      // Descobre de qual time o novo goleiro veio
      const previousTeamEntry = Object.entries(state.gameState.teams).find(
        ([, t]) => t.goalkeeperId === newGoalkeeper && t.id !== teamId
      );
      if (previousTeamEntry) {
        const [previousTeamId, previousTeam] = previousTeamEntry;
        console.log(
          `[Reposição automática] ${getMemberName(nextInQueue)} assumiu como goleiro no ${previousTeamId}`
        );
        previousTeam.goalkeeperId = nextInQueue;
      }
    }

    console.log(
      `[Troca de goleiros] ${getMemberName(newGoalkeeper)} entrou no lugar de ${getMemberName(oldGoalkeeper)} no time ${teamId}`
    );
  }

  // 💾 Atualiza o estado global e re-renderiza
  persistGameState();
  renderTeams();
  renderGoalkeeperQueue();

  // Fecha o modal (se existir)
  if (typeof closeManualPlayerDialog === "function") {
    closeManualPlayerDialog();
  }
}





function closeManualPlayerDialog() {
  if (!elements.manualPlayerDialog) return;
  if (elements.manualPlayerDialog.open) {
    elements.manualPlayerDialog.close();
  } else {
    resetManualPlayerDialog();
  }
}

function resetManualPlayerDialog() {
  state.manualSelection = null;
  elements.manualPlayerForm?.reset();
  if (elements.manualPlayerSelect) {
    elements.manualPlayerSelect.innerHTML = "";
    elements.manualPlayerSelect.disabled = false;
  }
  if (elements.manualPlayerFeedback) {
    elements.manualPlayerFeedback.textContent = "";
  }
  if (elements.manualPlayerSubmit) {
    elements.manualPlayerSubmit.disabled = false;
  }
}

const ATTENDANCE_BUTTON_BASE_CLASSES =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition";
const ATTENDANCE_BUTTON_ACTIVE_CLASSES = "border-primary bg-primary/10 text-primary";
const ATTENDANCE_BUTTON_INACTIVE_CLASSES = "border-secondary/20 bg-white text-secondary hover:border-primary/40";
const ATTENDANCE_BUTTON_DISABLED_CLASSES = "opacity-60 cursor-not-allowed";

function renderStatusRadio(group, memberId, value, label, checked, disabled) {
  const finalClasses = `${ATTENDANCE_BUTTON_BASE_CLASSES} ${
    checked ? ATTENDANCE_BUTTON_ACTIVE_CLASSES : ATTENDANCE_BUTTON_INACTIVE_CLASSES
  } ${disabled ? ATTENDANCE_BUTTON_DISABLED_CLASSES : ""}`;
  const labelText = checked && value === ATTENDANCE_STATUS.PLAYER ? "Desmarcar" : label;
  return `
    <button
      type="button"
      data-attendance-action
      data-member="${memberId}"
      data-status="${value}"
      name="${group}"
      class="${finalClasses}"
      aria-pressed="${checked ? "true" : "false"}"
      ${disabled ? "disabled" : ""}
    >
      <span data-attendance-label>${labelText}</span>
    </button>
  `;
}

function updateAttendanceButtonState(button, isActive) {
  if (!button) return;
  button.classList.remove(...ATTENDANCE_BUTTON_ACTIVE_CLASSES.split(" "));
  button.classList.remove(...ATTENDANCE_BUTTON_INACTIVE_CLASSES.split(" "));
  button.classList.remove(...ATTENDANCE_BUTTON_DISABLED_CLASSES.split(" "));
  button.classList.add(...ATTENDANCE_BUTTON_BASE_CLASSES.split(" "));
  button.classList.add(
    ...(isActive ? ATTENDANCE_BUTTON_ACTIVE_CLASSES : ATTENDANCE_BUTTON_INACTIVE_CLASSES).split(" "),
  );
  if (button.disabled) {
    button.classList.add(...ATTENDANCE_BUTTON_DISABLED_CLASSES.split(" "));
  }
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
  const labelSpan = button.querySelector("[data-attendance-label]");
  if (labelSpan) {
    if (button.dataset.status === ATTENDANCE_STATUS.PLAYER) {
      labelSpan.textContent = isActive ? "Desmarcar" : "Presença";
    } else {
      labelSpan.textContent = labelSpan.textContent || "";
    }
  }
}

function renderTeams() {
  if (!elements.teamsContainer || !state.gameState) return;

  const { teams, teamOrder } = state.gameState;
  const firstNameCounts = computeFirstNameCounts(state.members);
  if (!teamOrder.length) {
    elements.teamsContainer.innerHTML = `
      <div class="rounded-xl border border-secondary/10 bg-secondary/5 px-4 py-6 text-center text-sm text-secondary/70">
        Nenhum time disponível. Confirme presenças para começar.
      </div>
    `;
    return;
  }

  const cards = teamOrder.map((teamId) => renderTeamCard(teams[teamId], firstNameCounts));
  elements.teamsContainer.innerHTML = cards.join("");
}


function renderTeamCard(team, firstNameCounts) {
  if (!team) return "";

  const { id, players = [], goalkeeperId } = team;
  const teamIndex = state.gameState.teamOrder.indexOf(id);
  const palette = TEAM_COLOR_PALETTE[teamIndex % TEAM_COLOR_PALETTE.length];

  // 🧤 Goleiro
  const goalkeeper = goalkeeperId ? state.membersMap.get(goalkeeperId) : null;
  const goalkeeperName = goalkeeper ? formatShortName(goalkeeper, firstNameCounts) : "Sem goleiro";
  const goalkeeperFullName = goalkeeper ? goalkeeper.name || goalkeeper.nickname || "Sem nome" : "Sem goleiro";

  // Verifica foto no campo "photo" ou "photoUrl"
  const goalkeeperPhoto = goalkeeper?.photo || goalkeeper?.photoUrl || "";

  // Avatar pequeno (foto ou inicial)
  const goalkeeperAvatar = goalkeeperPhoto
    ? `<img src="${goalkeeperPhoto}" alt="${goalkeeperName}" loading="lazy"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        class="h-6 w-6 rounded-full object-cover border border-secondary/20" />
       <div class="hidden h-6 w-6 rounded-full bg-secondary/10 items-center justify-center text-[10px] font-semibold text-secondary">
        ${goalkeeperName.charAt(0).toUpperCase()}
       </div>`
    : `<div class="h-6 w-6 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-semibold text-secondary">
        ${goalkeeperName.charAt(0).toUpperCase()}
      </div>`;

  const goalkeeperReplacements = buildManualCandidateList({
    excludeTeamId: id,
    excludeMemberId: goalkeeperId,
  });
  const goalkeeperButtonDisabled = !goalkeeperReplacements.length;
  const goalkeeperButtonTooltip = goalkeeperButtonDisabled
    ? "Nenhum atleta disponível para substituir o goleiro agora."
    : "Selecionar um atleta para substituir o goleiro.";

  const goalkeeperSection = `
    <div class="flex w-full flex-wrap items-center gap-3 rounded-lg border border-secondary/10 bg-white px-3 py-2">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        ${goalkeeperAvatar}
        <p class="text-sm font-medium text-secondary truncate" title="${goalkeeperFullName}">${goalkeeperName}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full border border-secondary/20 px-3 py-1 text-xs font-medium transition shrink-0 ${
          goalkeeperButtonDisabled
            ? "text-secondary/40 cursor-not-allowed"
            : "text-secondary hover:border-primary/40"
        }"
        data-team-action="substitute-goalkeeper"
        data-team-id="${id}"
        data-member-id="${goalkeeperId || ""}"
        ${goalkeeperButtonDisabled ? "disabled" : ""}
        title="${goalkeeperButtonTooltip}"
      >
        Substituir
      </button>
    </div>
  `;

  // 👟 Jogadores de linha com avatar + botão
  const linePlayers = players.filter((player) => player.role === "line");
  const totalPlayers = linePlayers.length;
  const targetCount = getLinePlayersPerTeam();
  const buttonBase =
    "inline-flex items-center gap-1 rounded-full border border-secondary/20 px-3 py-1 text-xs font-medium transition";

  const playerItems = linePlayers
    .sort((a, b) => (a.arrivalAt || 0) - (b.arrivalAt || 0))
    .map((entry) => {
      const member = state.membersMap.get(entry.memberId);
      const name = member ? formatShortName(member, firstNameCounts) : "Jogador removido";
      const fullName = member ? member.name || member.nickname || "Jogador removido" : "Jogador removido";

      // Verifica se há foto no campo "photo" ou "photoUrl"
      const photo = member?.photo || member?.photoUrl || "";

      const avatar = photo
        ? `<img src="${photo}" alt="${name}" loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            class="h-6 w-6 rounded-full object-cover border border-secondary/20" />
           <div class="hidden h-6 w-6 rounded-full bg-secondary/10 items-center justify-center text-[10px] font-semibold text-secondary">
            ${name.charAt(0).toUpperCase()}
           </div>`
        : `<div class="h-6 w-6 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-semibold text-secondary">
            ${name.charAt(0).toUpperCase()}
          </div>`;

      const isDiscarded = state.gameState.discardedPlayers.includes(entry.memberId);
      const replacements = buildManualCandidateList({
        excludeTeamId: id,
        excludeMemberId: entry.memberId,
      });
      const buttonDisabled = isDiscarded || !replacements.length;
      const buttonClasses = buttonDisabled
        ? `${buttonBase} text-secondary/40 cursor-not-allowed`
        : `${buttonBase} text-secondary hover:border-primary/40`;
      const tooltip = buttonDisabled
        ? "Nenhum atleta disponível para substituir agora."
        : "Selecionar um atleta para substituir este jogador.";

      return `
        <li class="flex items-center gap-3 rounded-lg border border-secondary/10 bg-white px-3 py-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
        ${avatar}
            <p class="text-sm font-medium text-secondary truncate" title="${fullName}">${name}</p>
          </div>
          <button
            type="button"
            class="${buttonClasses} shrink-0"
            data-team-action="substitute-player"
            data-team-id="${id}"
            data-member-id="${entry.memberId}"
            ${buttonDisabled ? "disabled" : ""}
            title="${tooltip}"
          >
            Substituir
          </button>
        </li>
      `;
    })
    .join("");

  const remainingCount = Math.max(0, targetCount - totalPlayers);
  const totalPlayersText = `<p class="text-xs text-secondary/60">Jogadores de linha: ${totalPlayers}/${targetCount}</p>`;
  const remainingText = remainingCount
    ? `<p class="text-[11px] text-amber-600">Faltam ${remainingCount} para completar.</p>`
    : `<p class="text-[11px] text-emerald-600">Time completo.</p>`;
  const teamHeader = `
    <div>
      <h3 class="text-lg font-semibold ${palette.header}">Time ${id}</h3>
      ${totalPlayersText}
      ${remainingText}
    </div>
  `;

  const isHomeSide = teamIndex % 2 === 0;
  const headerMarkup = `
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
      <div class="flex items-center gap-3">
        ${teamHeader}
      </div>
      <div class="flex-shrink-0 w-full sm:w-auto">
        ${goalkeeperSection}
      </div>
    </div>
  `;

  const addCandidates = buildManualCandidateList({ excludeTeamId: id });
  const needsPlayers = totalPlayers < targetCount;
  const addButtonEnabled = needsPlayers && addCandidates.length > 0;
  const addButtonTooltip = needsPlayers
    ? addButtonEnabled
      ? "Adicionar um atleta disponível ou realocar de outro time."
      : "Nenhum atleta disponível para completar este time."
    : "";
  const addButtonMarkup = needsPlayers
    ? `
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md border ${
          addButtonEnabled
            ? "border-primary text-primary hover:bg-primary/10"
            : "border-secondary/20 text-secondary/40 cursor-not-allowed"
        } px-3 py-1.5 text-xs font-semibold transition"
        data-team-action="add-player"
        data-team-id="${id}"
        ${addButtonEnabled ? "" : "disabled"}
        title="${addButtonTooltip}"
      >
        Adicionar atleta
      </button>
    `
    : "";

  return `
    <article class="flex flex-col gap-4 rounded-2xl px-4 py-4 shadow-sm ${palette.card}">
      <header class="flex items-center justify-between gap-3">
        ${headerMarkup}
      </header>
      <ul class="space-y-2">${playerItems || `
        <li class="rounded-lg border border-secondary/10 bg-secondary/5 px-3 py-3 text-sm text-secondary/60">
          Sem jogadores de linha.
        </li>`}</ul>
      ${addButtonMarkup ? `<div class="flex justify-end">${addButtonMarkup}</div>` : ""}
    </article>
  `;
}



function renderMatchSummary() {
  if (!elements.currentMatchLabel || !elements.rotationQueue || !state.gameState) return;
  const match = state.gameState.activeMatch;
  updateMatchResultOptions(match);
  updateRotationWinnerOptions(match);
  if (match && match.home && match.away) {
    elements.currentMatchLabel.textContent = `Time ${match.home} x Time ${match.away}`;
  } else {
    elements.currentMatchLabel.textContent = "Aguardando sorteio";
  }
  const queueItems = state.gameState.rotationQueue?.length
    ? state.gameState.rotationQueue
        .map((teamId) => `<li class="rounded-full border border-secondary/20 px-3 py-1">${teamId}</li>`)
        .join("")
    : `<li class="rounded-full border border-secondary/20 px-3 py-1">--</li>`;
  elements.rotationQueue.innerHTML = queueItems;
}

function updateMatchResultOptions(match) {
  if (!elements.matchResultForm) return;
  const homeSpan = elements.matchResultForm.querySelector('[data-match-team="home"]');
  const awaySpan = elements.matchResultForm.querySelector('[data-match-team="away"]');
  const homeRadio = elements.matchResultForm.querySelector('input[name="match-result"][value="win-home"]');
  const awayRadio = elements.matchResultForm.querySelector('input[name="match-result"][value="win-away"]');
  const drawRadio = elements.matchResultForm.querySelector('input[name="match-result"][value="draw"]');
  const hasTeams = Boolean(match && match.home && match.away);
  if (homeSpan) {
    homeSpan.textContent = match?.home ? `Time ${match.home}` : "Time A";
  }
  if (awaySpan) {
    awaySpan.textContent = match?.away ? `Time ${match.away}` : "Time B";
  }
  [homeRadio, awayRadio, drawRadio].forEach((radio) => {
    if (!radio) return;
    radio.disabled = !hasTeams;
    if (!hasTeams) {
      radio.checked = false;
    }
  });
}

function updateRotationWinnerOptions(match) {
  const select = elements.rotationWinner;
  if (!select) return;
  const previous = select.value;
  const options = ['<option value="">Selecione</option>'];
  if (match && match.home && match.away) {
    options.push(
      `<option value="${match.home}">Time ${match.home}</option>`,
      `<option value="${match.away}">Time ${match.away}</option>`,
    );
    select.disabled = false;
  } else {
    select.disabled = true;
  }
  select.innerHTML = options.join("");
  if (!select.disabled && match && [match.home, match.away].includes(previous)) {
    select.value = previous;
  }
}

function renderMatchesHistory() {
  if (!elements.matchesHistory || !state.gameState) return;
  const matches = state.gameState.matches || [];
  if (!matches.length) {
    elements.matchesHistory.innerHTML = `<li class="text-secondary/60">Nenhuma partida registrada ainda.</li>`;
    return;
  }
  const items = matches
    .slice()
    .reverse()
    .map((match) => {
      const {
        id,
        homeTeam,
        awayTeam,
        scoreA,
        scoreB,
        recordedAt,
        rotationWinner,
        notes,
      } = match;
      const when = recordedAt ? formatDateTime(new Date(recordedAt)) : "--";
      const outcome = resolveMatchOutcome(match);
      const summary =
        outcome === "draw"
          ? "Empate"
          : outcome === "home"
            ? `Vitória Time ${homeTeam}`
            : outcome === "away"
              ? `Vitória Time ${awayTeam}`
              : "Resultado indefinido";
      const stayInfo = rotationWinner ? `Permanece: Time ${rotationWinner}` : "";
      const details = notes ? `<p class="text-xs text-secondary/60 mt-1">${notes}</p>` : "";
      return `
        <li class="rounded-lg border border-secondary/10 bg-white px-3 py-3">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary/60">
            <span>#${id}</span>
            <span>${when}</span>
          </div>
          <p class="text-sm font-semibold text-secondary mt-1">Time ${homeTeam} ${scoreA} x ${scoreB} Time ${awayTeam}</p>
          <p class="text-xs text-secondary/70 mt-1">${summary}${stayInfo ? ` • ${stayInfo}` : ""}</p>
          ${details}
        </li>
      `;
    })
    .join("");
  elements.matchesHistory.innerHTML = items;
}

function resolveMatchOutcome(match) {
  if (!match) return null;
  const type = match.resultType;
  if (type === "draw") return "draw";
  if (type === "win-a" || type === "win-home") return "home";
  if (type === "win-b" || type === "win-away") return "away";
  const scoreA = Number(match.scoreA);
  const scoreB = Number(match.scoreB);
  if (!Number.isNaN(scoreA) && !Number.isNaN(scoreB)) {
    if (scoreA > scoreB) return "home";
    if (scoreB > scoreA) return "away";
    return "draw";
  }
  return null;
}

function hasTeamPlayed(teamId) {
  if (!state.gameState || !teamId) return false;
  return (state.gameState.matches || []).some(
    (match) => match.homeTeam === teamId || match.awayTeam === teamId,
  );
}

function enqueueTeamAfterNotPlayed(teamId) {
  if (!state.gameState || !teamId) return;
  const queue = Array.isArray(state.gameState.rotationQueue) ? state.gameState.rotationQueue.slice() : [];
  const sanitized = queue.filter((id) => id && id !== teamId);
  const lastUnplayedIndex = sanitized.reduce(
    (acc, id, index) => (!hasTeamPlayed(id) ? index : acc),
    -1,
  );
  const insertIndex = lastUnplayedIndex >= 0 ? lastUnplayedIndex + 1 : sanitized.length;
  sanitized.splice(insertIndex, 0, teamId);
  state.gameState.rotationQueue = sanitized;
}

function ensureUpcomingTeamsComplete(match, fallbackDonorId) {
  if (!state.gameState || !match) return;
  const teamIds = [match.home, match.away].filter(Boolean);
  teamIds.forEach((teamId) => ensureTeamHasMinimumPlayers(teamId, fallbackDonorId));
}

function ensureTeamHasMinimumPlayers(teamId, donorTeamId) {
  if (!state.gameState || !teamId) return;
  const team = state.gameState.teams?.[teamId];
  if (!team) return;
  const targetCount = getLinePlayersPerTeam();
  const countPlayers = () => (team.players || []).filter((player) => player.role === "line").length;
  while (countPlayers() < targetCount) {
    const available = getUnassignedPlayers();
    if (available.length) {
      assignNextPlayer(team, available.shift());
      continue;
    }
    break;
  }
}

function renderScoreboardTable() {
  if (!elements.scoreboardTable) return;
  const entries = state.scoreboard?.entries || {};
  const rawSearchTerm = elements.scoreboardSearch?.value || "";
  const tokens = getSearchTokens(rawSearchTerm);
  const filteredMembers = state.members.filter((member) => {
    if (!tokens.length) return true;
    const name = `${member.name || ""} ${member.nickname || ""}`.trim();
    return matchesSearchTokens(name, tokens);
  });
  const rows = filteredMembers
    .map((member, index) => {
      const entry = buildScoreboardEntry(entries[member.id] || {});
      const position = index + 1;
      return `
        <tr data-member-id="${member.id}">
          <td class="px-4 py-3 text-center text-xs font-semibold text-secondary/70">${String(position).padStart(2, "0")}</td>
          <td class="px-4 py-3 text-sm font-medium text-secondary">${member.name || member.nickname || "Sem nome"}</td>
          <td class="px-4 py-3 text-center text-sm text-secondary/70" data-scoreboard-presence>${entry.presence}</td>
          <td class="px-4 py-3 text-center text-sm text-secondary/70">${entry.win}</td>
          <td class="px-4 py-3 text-center text-sm text-secondary/70">${entry.draw}</td>
          <td class="px-4 py-3 text-center text-sm text-secondary/70">${entry.goal}</td>
          <td class="px-4 py-3 text-center text-sm text-secondary/70">${entry.yellow}</td>
          <td class="px-4 py-3 text-center text-sm text-secondary/70">${entry.red}</td>
          <td class="px-4 py-3 text-center text-sm font-semibold text-secondary" data-scoreboard-total>${entry.total}</td>
          <td class="px-4 py-3 text-right">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full border border-secondary/30 px-3 py-1 text-xs font-medium text-secondary hover:border-primary/50 hover:text-primary transition"
              data-edit-scoreboard="${member.id}"
            >
              Editar
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
  if (rows) {
    elements.scoreboardTable.innerHTML = rows;
    return;
  }
  const emptyMessage = tokens.length
    ? `Nenhum atleta encontrado para "${rawSearchTerm}".`
    : "Nenhum atleta encontrado.";
  elements.scoreboardTable.innerHTML = `<tr><td class="px-4 py-4 text-center text-sm text-secondary/60" colspan="10">${emptyMessage}</td></tr>`;
}

async function updateScoreboardAttendance(memberId, isPresent) {
  if (!memberId || !state.scoreboardSeason) return;
  const entries = state.scoreboard.entries || {};
  const previous = entries[memberId] ? buildScoreboardEntry(entries[memberId]) : buildScoreboardEntry();
  const presenceValue = isPresent ? 1 : 0;
  if (previous.presence === presenceValue) {
    return;
  }
  const updated = buildScoreboardEntry({
    ...previous,
    presence: presenceValue,
  });
  state.scoreboard.entries = {
    ...state.scoreboard.entries,
    [memberId]: updated,
  };
  if (!updateScoreboardPresenceRow(memberId, updated)) {
    renderScoreboardTable();
  }
  const docRef = doc(db, SCOREBOARD_COLLECTION, String(state.scoreboardSeason));
  try {
    await setDoc(
      docRef,
      {
        season: state.scoreboardSeason,
        updatedAt: serverTimestamp(),
        entries: {
          [memberId]: updated,
        },
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Não foi possível atualizar presença na pontuação anual:", error);
    state.scoreboard.entries = {
      ...state.scoreboard.entries,
      [memberId]: previous,
    };
    if (!updateScoreboardPresenceRow(memberId, previous)) {
      renderScoreboardTable();
    }
  }
}

function isPresenceStatus(status) {
  return [
    ATTENDANCE_STATUS.PLAYER,
    ATTENDANCE_STATUS.GOALKEEPER,
    ATTENDANCE_STATUS.SUPPORTER,
  ].includes(status);
}

function updateScoreboardPresenceRow(memberId, entry) {
  if (!elements.scoreboardTable) return false;
  const row = elements.scoreboardTable.querySelector(`tr[data-member-id="${memberId}"]`);
  if (!row) return false;
  const normalized = buildScoreboardEntry(entry);
  const presenceCell = row.querySelector("[data-scoreboard-presence]");
  const totalCell = row.querySelector("[data-scoreboard-total]");
  if (presenceCell) {
    presenceCell.textContent = normalized.presence;
  }
  if (totalCell) {
    totalCell.textContent = normalized.total;
  }
  return true;
}

function getTeamParticipants(teamId) {
  if (!state.gameState || !teamId) return [];
  const team = state.gameState.teams?.[teamId];
  if (!team) return [];
  const ids = new Set();
  (team.players || []).forEach((player) => {
    if (player?.memberId) {
      ids.add(player.memberId);
    }
  });
  if (team.goalkeeperId) {
    ids.add(team.goalkeeperId);
  }
  return Array.from(ids);
}

async function applyMatchResultToScoreboard(record, participants) {
  if (!record || !participants || !state.scoreboardSeason) return;
  const docRef = doc(db, SCOREBOARD_COLLECTION, String(state.scoreboardSeason));
  const currentEntries = state.scoreboard?.entries || {};
  if (!state.gameState.participationLog) {
    state.gameState.participationLog = {};
  }
  const deltas = new Map();
  const registerDelta = (memberId, field, value) => {
    if (!memberId || !field || !value) return;
    const entry = deltas.get(memberId) || { win: 0, draw: 0 };
    entry[field] += value;
    deltas.set(memberId, entry);
  };
  const outcome = resolveMatchOutcome(record);
  const isEligible = (memberId) => {
    const presence = state.gameState?.presences?.[memberId];
    if (!presence) return false;
    return presence.status === ATTENDANCE_STATUS.PLAYER || presence.status === ATTENDANCE_STATUS.GOALKEEPER;
  };
  const hasPlayedBefore = (memberId) => {
    const count = Number(state.gameState.participationLog?.[memberId] || 0);
    return count > 0;
  };
  const allParticipants = new Set([...(participants.home || []), ...(participants.away || [])]);

  if (outcome === "home") {
    (participants.home || [])
      .filter(isEligible)
      .forEach((memberId) => {
        if (!hasPlayedBefore(memberId)) registerDelta(memberId, "win", 1);
      });
  } else if (outcome === "away") {
    (participants.away || [])
      .filter(isEligible)
      .forEach((memberId) => {
        if (!hasPlayedBefore(memberId)) registerDelta(memberId, "win", 1);
      });
  } else if (outcome === "draw") {
    (participants.home || [])
      .filter(isEligible)
      .forEach((memberId) => {
        if (!hasPlayedBefore(memberId)) registerDelta(memberId, "draw", 1);
      });
    (participants.away || [])
      .filter(isEligible)
      .forEach((memberId) => {
        if (!hasPlayedBefore(memberId)) registerDelta(memberId, "draw", 1);
      });
  }

  allParticipants.forEach((memberId) => {
    if (!isEligible(memberId)) return;
    const currentParticipation = Number(state.gameState.participationLog?.[memberId] || 0);
    state.gameState.participationLog[memberId] = currentParticipation + 1;
  });

  if (!deltas.size) return;

  const updatedEntries = {};
  deltas.forEach((delta, memberId) => {
    const current = currentEntries[memberId] || {};
    const presence = Number(current.presence || 0);
    const wins = Number(current.win || current.wins || 0) + (delta.win || 0);
    const draws = Number(current.draw || 0) + (delta.draw || 0);
    const goals = Number(current.goal || current.goals || 0);
    const yellow = Number(current.yellow || current.yellowCards || 0);
    const red = Number(current.red || current.redCards || 0);
    updatedEntries[memberId] = buildScoreboardEntry({
      ...current,
      presence,
      win: wins,
      draw: draws,
      goal: goals,
      yellow,
      red,
    });
  });

  state.scoreboard.entries = {
    ...state.scoreboard.entries,
    ...updatedEntries,
  };
  renderScoreboardTable();
  try {
    const payload = {
      season: state.scoreboardSeason,
      updatedAt: serverTimestamp(),
      entries: {},
    };
    Object.entries(updatedEntries).forEach(([memberId, entry]) => {
      payload.entries[memberId] = entry;
    });
    await setDoc(
      docRef,
      payload,
      { merge: true },
    );
  } catch (error) {
    console.error("Erro ao registrar pontuação no Firestore:", error);
  }
}

function renderMatchTimer() {
  if (!elements.matchTimer) return;
  elements.matchTimer.textContent = formatSeconds(state.timer.seconds);
  if (elements.timerStart) {
    elements.timerStart.disabled = state.timer.running || !canStartMatch();
  }
  if (elements.timerPause) {
    elements.timerPause.disabled = !state.timer.running;
  }
}

async function updateMemberStatus(memberId, newStatus, scrollAnchor = {}) {
  if (!canEditGames()) return;
  if (!state.gameState) return;
  const presences = state.gameState.presences || {};
  const previous = presences[memberId] || { status: ATTENDANCE_STATUS.ABSENT };
  if (previous.status === newStatus) return;
  const wasPresent = isPresenceStatus(previous.status);
  const willBePresent = isPresenceStatus(newStatus);
  const presenceDelta = willBePresent === wasPresent ? 0 : (willBePresent ? 1 : -1);
  const now = Date.now();
  const updated = { ...presences };
  const entry = { ...previous, status: newStatus, updatedAt: now };
  if (willBePresent && !entry.arrivalAt) {
    entry.arrivalAt = now;
  }
  if (newStatus !== ATTENDANCE_STATUS.PLAYER) {
    removePlayerFromTeams(memberId);
    state.gameState.discardedPlayers = state.gameState.discardedPlayers.filter((id) => id !== memberId);
  }
  if (newStatus !== ATTENDANCE_STATUS.GOALKEEPER) {
    removeGoalkeeperAssignment(memberId);
  }
  if (newStatus === ATTENDANCE_STATUS.ABSENT) {
    delete entry.arrivalAt;
  }
  updated[memberId] = entry;
  await updateScoreboardAttendance(memberId, willBePresent);
  state.gameState.presences = updated;
  persistGameState();
  syncAssignments();
  renderAfterPresenceChange(memberId, newStatus, scrollAnchor);
}

function removePlayerFromTeams(memberId) {
  if (!state.gameState) return;
  const { teams } = state.gameState;
  Object.values(teams).forEach((team) => {
    team.players = (team.players || []).filter((player) => player.memberId !== memberId);
  });
}

function removeGoalkeeperAssignment(memberId) {
  if (!state.gameState) return;
  const { teams } = state.gameState;
  Object.values(teams).forEach((team) => {
    if (team.goalkeeperId === memberId) {
      team.goalkeeperId = null;
    }
  });
}

function removeMemberFromOtherTeams(memberId, keepTeamId) {
  if (!state.gameState || !memberId) return;
  const { teams } = state.gameState;
  Object.entries(teams).forEach(([teamId, team]) => {
    if (!team || teamId === keepTeamId) return;
    team.players = (team.players || []).filter((player) => player.memberId !== memberId);
    if (team.goalkeeperId === memberId) {
      team.goalkeeperId = null;
    }
  });
}

function handleInitialDraw() {
  if (!ensureGamesEditor("Somente administradores ou imprensa podem realizar o sorteio inicial.")) return;
  if (!state.gameState) return;
  if (state.drawAnimationTimeout) {
    elements.matchResultFeedback.textContent = "Aguarde, o sorteio está em andamento.";
    return;
  }
  if (state.gameState.initialDrawDone) {
    elements.matchResultFeedback.textContent = "O sorteio inicial já foi realizado para este dia.";
    return;
  }
  const requiredPlayers = getRequiredLinePlayers();
  const presences = state.gameState.presences || {};
  const eligiblePlayers = Object.entries(presences)
    .filter(([memberId, record]) => {
      const status = record.status;
      if (status !== ATTENDANCE_STATUS.PLAYER) return false;
      if (state.gameState.discardedPlayers.includes(memberId)) return false;
      return true;
    })
    .map(([memberId, record]) => ({ memberId, arrivalAt: record.arrivalAt || Date.now() }))
    .sort((a, b) => (a.arrivalAt || 0) - (b.arrivalAt || 0));
  if (eligiblePlayers.length < requiredPlayers) {
    elements.matchResultFeedback.textContent = `São necessários ${requiredPlayers} atletas de linha confirmados para o sorteio.`;
    return;
  }
  elements.matchResultFeedback.textContent = "Sorteando times...";
  startDrawAnimation();
  state.drawAnimationTimeout = setTimeout(() => {
    try {
      performInitialDraw(eligiblePlayers);
      elements.matchResultFeedback.textContent = "Sorteio realizado com sucesso! Boa partida.";
    } catch (error) {
      console.error("Erro ao realizar sorteio inicial:", error);
      elements.matchResultFeedback.textContent = "Não foi possível concluir o sorteio. Tente novamente.";
    } finally {
      stopDrawAnimation();
    }
  }, 2500);
}

function performInitialDraw(eligiblePlayers) {
  if (!state.gameState || !Array.isArray(eligiblePlayers)) {
    throw new Error("Lista de atletas elegíveis inválida para sorteio.");
  }
  const perTeam = getLinePlayersPerTeam();
  const requiredPlayers = perTeam * 2;
  if (eligiblePlayers.length < requiredPlayers) {
    throw new Error("Lista de atletas elegíveis inválida para sorteio.");
  }
  const initialGroup = eligiblePlayers.slice(0, requiredPlayers);
  const remainingGroup = eligiblePlayers.slice(requiredPlayers);
  const shuffled = shuffle(initialGroup);
  const teamAPlayers = shuffled.slice(0, perTeam);
  const teamBPlayers = shuffled.slice(perTeam, requiredPlayers);

  state.gameState.teams.A.players = teamAPlayers.map((player) => ({
    memberId: player.memberId,
    role: "line",
    arrivalAt: player.arrivalAt,
    assignedAt: Date.now(),
  }));
  state.gameState.teams.B.players = teamBPlayers.map((player) => ({
    memberId: player.memberId,
    role: "line",
    arrivalAt: player.arrivalAt,
    assignedAt: Date.now(),
  }));

  state.gameState.initialDrawDone = true;
  state.gameState.activeMatch = { home: "A", away: "B", startedAt: null };
  state.gameState.rotationQueue = [];
  state.gameState.currentChampion = null;
  state.gameState.championMatchCount = 0;

  applyGoalkeeperAssignments();
  distributeRemainingPlayers(remainingGroup);
  persistGameState();
  renderAll();
  resetTimer(true);
}

function distributeRemainingPlayers(queue) {
  if (!state.gameState) return;
  const availableQueue = Array.isArray(queue) ? queue.slice() : getUnassignedPlayers();
  while (availableQueue.length) {
    const team = findTeamNeedingPlayer();
    if (!team) {
      const createdTeam = createNextTeam();
      if (!createdTeam) break;
      pushTeamToQueue(createdTeam.id);
      assignNextPlayer(createdTeam, availableQueue.shift());
    } else {
      assignNextPlayer(team, availableQueue.shift());
    }
  }
}

function getUnassignedPlayers() {
  if (!state.gameState) return [];
  const presences = state.gameState.presences || {};
  const assignedIds = new Set();
  Object.values(state.gameState.teams).forEach((team) => {
    (team.players || []).forEach((player) => assignedIds.add(player.memberId));
  });
  return Object.entries(presences)
    .filter(([memberId, record]) => {
      if (state.gameState.discardedPlayers.includes(memberId)) return false;
      if (record.status !== ATTENDANCE_STATUS.PLAYER) return false;
      return !assignedIds.has(memberId);
    })
    .map(([memberId, record]) => ({
      memberId,
      arrivalAt: record.arrivalAt || Date.now(),
    }))
    .sort((a, b) => (a.arrivalAt || 0) - (b.arrivalAt || 0));
}

function findTeamNeedingPlayer() {
  if (!state.gameState) return null;
  const targetCount = getLinePlayersPerTeam();
  for (const teamId of state.gameState.teamOrder) {
    const team = state.gameState.teams[teamId];
    if (!team) continue;
    if (team.players.filter((player) => player.role === "line").length < targetCount) {
      return team;
    }
  }
  return null;
}

function createNextTeam() {
  if (!state.gameState) return null;
  const usedLetters = new Set(state.gameState.teamOrder);
  const letter = TEAM_LETTERS.find((id) => !usedLetters.has(id));
  if (!letter) return null;
  const newTeam = createTeam(letter);
  state.gameState.teamOrder.push(letter);
  state.gameState.teams[letter] = newTeam;
  if (state.gameState.initialDrawDone) {
    state.gameState.rotationQueue.push(letter);
  }
  return newTeam;
}

function assignNextPlayer(team, candidate) {
  if (!team || !candidate) return;
  team.players = team.players || [];
  team.players.push({
    memberId: candidate.memberId,
    role: "line",
    arrivalAt: candidate.arrivalAt,
    assignedAt: Date.now(),
  });
}

function pushTeamToQueue(teamId) {
  if (!state.gameState) return;
  if (["A", "B"].includes(teamId)) return;
  if (!state.gameState.rotationQueue.includes(teamId)) {
    state.gameState.rotationQueue.push(teamId);
  }
}

function moveTeamToEnd(teamId) {
  if (!state.gameState || !teamId) return;
  const order = state.gameState.teamOrder || [];
  const index = order.indexOf(teamId);
  if (index === -1) return;
  order.splice(index, 1);
  order.push(teamId);
}

function applyGoalkeeperAssignments() {
  if (!state.gameState) return;
  ensureGoalkeeperQueue();
  const presences = state.gameState.presences || {};
  const isValidKeeper = (id) =>
    Boolean(
      id &&
        presences[id] &&
        presences[id].status === ATTENDANCE_STATUS.GOALKEEPER &&
        !state.gameState.discardedPlayers.includes(id),
    );

  // Fila atual, apenas goleiros válidos
  const queue = (state.gameState.goalkeeperQueue || []).filter(isValidKeeper);
  const available = [...queue];
  const assignedThisRound = [];

  state.gameState.teamOrder.forEach((teamId) => {
    const team = state.gameState.teams[teamId];
    if (!team) return;
    const current = isValidKeeper(team.goalkeeperId) ? team.goalkeeperId : null;

    if (current && available.includes(current)) {
      // Mantém goleiro atual e remove da lista de disponíveis
      team.goalkeeperId = current;
      const idx = available.indexOf(current);
      if (idx >= 0) available.splice(idx, 1);
      assignedThisRound.push(current);
      return;
    }

    // Se não há goleiro válido, pega o próximo da fila
    const next = available.shift() || null;
    team.goalkeeperId = next;
    if (next) assignedThisRound.push(next);
  });

  // Reconstrói a fila: goleiros atribuídos seguem a ordem que estavam na fila,
  // seguidos dos que sobraram (espera).
  state.gameState.goalkeeperQueue = [...assignedThisRound, ...available];
}

function handleSubstitution(teamId, memberId) {
  if (!state.gameState) return;
  if (!["A", "B"].includes(teamId)) {
    elements.matchResultFeedback.textContent = "As substituições automáticas estão disponíveis apenas para os times A e B.";
    return;
  }
  const teamAorB = state.gameState.teams[teamId];
  const teamC = state.gameState.teams.C;
  if (!teamC) {
    elements.matchResultFeedback.textContent = "Não há jogadores no Time C para realizar a substituição.";
    return;
  }
  const candidate = (teamC.players || []).find((player) => player.role === "line");
  if (!candidate) {
    elements.matchResultFeedback.textContent = "O Time C não possui jogadores disponíveis para substituição.";
    return;
  }
  teamAorB.players = (teamAorB.players || []).filter((player) => player.memberId !== memberId);
  teamAorB.players.push({
    memberId: candidate.memberId,
    role: "line",
    arrivalAt: candidate.arrivalAt,
    assignedAt: Date.now(),
  });
  teamC.players = (teamC.players || []).filter((player) => player.memberId !== candidate.memberId);
  state.gameState.discardedPlayers = Array.from(new Set([...state.gameState.discardedPlayers, memberId]));
  distributeRemainingPlayers();
  persistGameState();
  renderTeams();
  renderAttendanceTable();
  elements.matchResultFeedback.textContent = "Substituição realizada. Jogador do Time C assumiu a vaga.";
}

async function handleMatchResultSubmission() {
  if (!ensureGamesEditor("Somente administradores ou imprensa podem registrar o resultado da partida.")) return;
  if (!state.gameState) return;
  const match = state.gameState.activeMatch;
  if (!match || !match.home || !match.away) {
    elements.matchResultFeedback.textContent = "Defina os times do jogo antes de registrar o resultado.";
    return;
  }
  const scoreA = Number(elements.matchScoreA?.value || 0);
  const scoreB = Number(elements.matchScoreB?.value || 0);
  const resultRadio = elements.matchResultForm.querySelector("input[name='match-result']:checked");
  let resultType = "";
  if (resultRadio) {
    switch (resultRadio.value) {
      case "win-home":
        resultType = "win-a";
        break;
      case "win-away":
        resultType = "win-b";
        break;
      default:
        resultType = resultRadio.value;
        break;
    }
  }
  const rotationWinner = elements.rotationWinner?.value || "";
  if (!rotationWinner) {
    elements.matchResultFeedback.textContent = "Escolha o time que permanecerá para a rotação.";
    return;
  }
  const participantsSnapshot = {
    home: getTeamParticipants(match.home),
    away: getTeamParticipants(match.away),
  };
  const matchId = (state.gameState.matches?.length || 0) + 1;
  const record = {
    id: matchId,
    homeTeam: match.home,
    awayTeam: match.away,
    scoreA,
    scoreB,
    resultType,
    rotationWinner,
    notes: elements.matchNotes?.value?.trim() || "",
    recordedAt: Date.now(),
  };
  state.gameState.matches = [...(state.gameState.matches || []), record];
  try {
    await applyMatchResultToScoreboard(record, participantsSnapshot);
  } catch (error) {
    console.error("Erro ao atualizar pontuação anual:", error);
  }
  processRotation(record);
  persistGameState();
  renderMatchesHistory();
  renderMatchSummary();
  renderTeams();
  resetTimer(true);
  elements.matchResultFeedback.textContent = "Partida registrada com sucesso.";
  elements.matchResultForm.reset();
}

function processRotation(record) {
  if (!state.gameState) return;
  const activeMatch = state.gameState.activeMatch || {};
  const winner = record.rotationWinner || null;
  const loser = winner === activeMatch.home ? activeMatch.away : activeMatch.home;

  const queue = Array.isArray(state.gameState.rotationQueue) ? state.gameState.rotationQueue : [];
  const filteredQueue = queue.filter((id) => id !== winner && id !== loser);
  state.gameState.rotationQueue = filteredQueue;
  state.gameState.lastLoserTeam = loser || null;

  if (loser) {
    enqueueTeamAfterNotPlayed(loser);
    moveTeamToEnd(loser);
  }

  if (state.gameState.currentChampion && state.gameState.currentChampion === winner) {
    state.gameState.championMatchCount += 1;
  } else {
    state.gameState.currentChampion = winner;
    state.gameState.championMatchCount = 1;
  }
  let championStays = true;
  if (state.gameState.championMatchCount >= 2 && winner) {
    enqueueTeamAfterNotPlayed(winner);
    state.gameState.currentChampion = null;
    state.gameState.championMatchCount = 0;
    championStays = false;
  }

  const nextField = [];
  if (championStays && winner) {
    nextField.push(winner);
  }

  while (nextField.length < 2 && state.gameState.rotationQueue.length) {
    const nextTeam = state.gameState.rotationQueue.shift();
    if (!nextTeam) break;
    if (!nextField.includes(nextTeam)) {
      nextField.push(nextTeam);
    }
  }

  if (nextField.length < 2) {
    state.gameState.activeMatch = { home: nextField[0] || null, away: null };
  } else {
    state.gameState.activeMatch = { home: nextField[0], away: nextField[1], startedAt: null };
  }
  ensureUpcomingTeamsComplete(state.gameState.activeMatch, loser);
}

function syncAssignments() {
  if (!state.gameState) return;
  const presences = state.gameState.presences || {};
  Object.values(state.gameState.teams).forEach((team) => {
    team.players = (team.players || []).filter((player) => {
      const presence = presences[player.memberId];
      if (!presence) return false;
      if (state.gameState.discardedPlayers.includes(player.memberId)) return false;
      return presence.status === ATTENDANCE_STATUS.PLAYER;
    });
  });
  applyGoalkeeperAssignments();
  if (state.gameState.initialDrawDone) {
    const queue = getUnassignedPlayers();
    distributeRemainingPlayers(queue);
  }
  persistGameState();
}

function startTimer() {
  if (state.timer.running || !canStartMatch()) return;
  if (state.timer.seconds <= 0) {
    state.timer.seconds = DEFAULT_TIMER_SECONDS;
  }
  state.timer.targetEndAt = Date.now() + state.timer.seconds * 1000;
  state.timer.warningPlayed = false;
  state.timer.endPlayed = false;
  state.timer.lastWarningSecond = null;
  startTimerInterval();
}

function startTimerInterval() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
  }
  state.timer.running = true;
  state.timer.intervalId = setInterval(handleTimerTick, 250);
  renderMatchTimer();
  cacheTimerState();
}

function handleTimerTick() {
  if (!state.timer.running || state.timer.targetEndAt == null) return;
  const remaining = Math.max(0, Math.round((state.timer.targetEndAt - Date.now()) / 1000));
  if (remaining !== state.timer.seconds) {
    state.timer.seconds = remaining;
    renderMatchTimer();
    cacheTimerState();
  }
  if (remaining > 0 && remaining <= 10 && state.timer.lastWarningSecond !== remaining) {
    playBeep({ frequency: 1200, duration: 180, volume: 0.22 });
    state.timer.lastWarningSecond = remaining;
  }
  if (remaining <= 0) {
    if (state.timer.intervalId) {
      clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
    }
    state.timer.running = false;
    state.timer.targetEndAt = null;
    state.timer.seconds = 0;
    renderMatchTimer();
    clearTimerStateStorage();
    elements.matchResultFeedback.textContent = "Tempo encerrado! Registre o resultado da partida.";
    if (!state.timer.endPlayed) {
      playBeep({ frequency: 660, duration: 300, volume: 0.28 });
      setTimeout(() => playBeep({ frequency: 520, duration: 450, volume: 0.32 }), 320);
      state.timer.endPlayed = true;
    }
  }
}

function pauseTimer() {
  if (!state.timer.running) return;
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  if (state.timer.targetEndAt != null) {
    state.timer.seconds = Math.max(0, Math.round((state.timer.targetEndAt - Date.now()) / 1000));
  }
  state.timer.running = false;
  state.timer.targetEndAt = null;
  cacheTimerState();
  renderMatchTimer();
}

function resetTimer(silent = false) {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  state.timer.running = false;
  state.timer.targetEndAt = null;
  state.timer.seconds = DEFAULT_TIMER_SECONDS;
  state.timer.warningPlayed = false;
  state.timer.endPlayed = false;
  state.timer.lastWarningSecond = null;
  if (!silent) {
    elements.matchResultFeedback.textContent = "";
  }
  clearTimerStateStorage();
  renderMatchTimer();
}

function canStartMatch() {
  if (!state.gameState) return false;
  const match = state.gameState.activeMatch;
  return Boolean(match && match.home && match.away);
}

function getActiveMatchKey() {
  const match = state.gameState?.activeMatch;
  if (!match || !match.home || !match.away) return null;
  return { home: match.home, away: match.away };
}

function cacheTimerState() {
  try {
    const matchKey = getActiveMatchKey();
    if (!matchKey) {
      clearTimerStateStorage();
      return;
    }
    const remaining = state.timer.running && state.timer.targetEndAt
      ? Math.max(0, Math.round((state.timer.targetEndAt - Date.now()) / 1000))
      : state.timer.seconds;
    const payload = {
      dateKey: state.selectedDate,
      match: matchKey,
      running: state.timer.running,
      remaining,
      targetEndAt: state.timer.running && state.timer.targetEndAt ? state.timer.targetEndAt : null,
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Não foi possível salvar o estado do cronômetro.", error);
  }
}

function clearTimerStateStorage() {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (error) {
    console.warn("Não foi possível limpar o estado do cronômetro.", error);
  }
}

function restoreTimerState() {
  const matchKey = getActiveMatchKey();
  if (!matchKey) {
    resetTimer(true);
    clearTimerStateStorage();
    return;
  }
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY));
  } catch (error) {
    stored = null;
  }
  if (!stored || stored.dateKey !== state.selectedDate) {
    resetTimer(true);
    clearTimerStateStorage();
    return;
  }
  if (!stored.match || stored.match.home !== matchKey.home || stored.match.away !== matchKey.away) {
    resetTimer(true);
    clearTimerStateStorage();
    return;
  }
  let remaining = Number(stored.remaining) || DEFAULT_TIMER_SECONDS;
  if (stored.running && stored.targetEndAt) {
    remaining = Math.max(0, Math.round((stored.targetEndAt - Date.now()) / 1000));
  }
  if (remaining <= 0) {
    resetTimer(true);
    clearTimerStateStorage();
    return;
  }
  state.timer.seconds = remaining;
  renderMatchTimer();
  state.timer.warningPlayed = false;
  state.timer.endPlayed = false;
  state.timer.lastWarningSecond = null;
  if (stored.running) {
    state.timer.targetEndAt = Date.now() + remaining * 1000;
    startTimerInterval();
  } else {
    state.timer.running = false;
    state.timer.targetEndAt = null;
    cacheTimerState();
  }
}

function openScoreboardModal(memberId) {
  if (!canEditGames()) return;
  const member = state.membersMap.get(memberId);
  if (!member || !elements.scoreboardModal) return;
  const entry = state.scoreboard.entries?.[memberId] || {};
  elements.scoreboardMemberId.value = memberId;
  elements.scoreboardFormTitle.textContent = `Pontuação • ${member.name || member.nickname || "Sem nome"}`;
  elements.scoreboardPresence.value = Number(entry.presence || 0);
  elements.scoreboardWin.value = Number(entry.win || entry.wins || 0);
  elements.scoreboardDraw.value = Number(entry.draw || 0);
  elements.scoreboardGoal.value = Number(entry.goal || entry.goals || 0);
  elements.scoreboardYellow.value = Number(entry.yellow || entry.yellowCards || 0);
  elements.scoreboardRed.value = Number(entry.red || entry.redCards || 0);
  elements.scoreboardFeedback.textContent = "";
  elements.scoreboardModal.classList.remove("hidden");
  elements.scoreboardModal.setAttribute("aria-hidden", "false");
}

function closeScoreboardModal() {
  if (!elements.scoreboardModal) return;
  elements.scoreboardModal.classList.add("hidden");
  elements.scoreboardModal.setAttribute("aria-hidden", "true");
}

async function saveScoreboardEntry() {
  if (!ensureGamesEditor("Somente administradores ou imprensa podem atualizar a pontuação.")) return;
  if (!elements.scoreboardMemberId) return;
  const memberId = elements.scoreboardMemberId.value;
  if (!memberId) return;
  const submitButton = elements.scoreboardForm?.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;
  if (elements.scoreboardFeedback) elements.scoreboardFeedback.textContent = "Salvando...";
  const parseField = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, num);
  };
  const presence = parseField(elements.scoreboardPresence.value);
  const wins = parseField(elements.scoreboardWin.value);
  const draws = parseField(elements.scoreboardDraw.value);
  const goals = parseField(elements.scoreboardGoal.value);
  const yellow = parseField(elements.scoreboardYellow.value);
  const red = parseField(elements.scoreboardRed.value);
  const entry = buildScoreboardEntry({ presence, win: wins, draw: draws, goal: goals, yellow, red });
  const docRef = doc(db, SCOREBOARD_COLLECTION, String(state.scoreboardSeason));
  try {
    const snapshot = await getDoc(docRef);
    const currentEntries = snapshot.exists() ? snapshot.data()?.entries || {} : {};
    const updatedEntries = {
      ...currentEntries,
      [memberId]: entry,
    };
    await setDoc(
      docRef,
      {
        season: state.scoreboardSeason,
        entries: updatedEntries,
        updatedAt: serverTimestamp(),
      },
      { merge: false },
    );
    state.scoreboard.entries = updatedEntries;
    renderScoreboardTable();
    if (elements.scoreboardFeedback) elements.scoreboardFeedback.textContent = "Pontuação atualizada.";
    setTimeout(() => {
      closeScoreboardModal();
    }, 600);
  } catch (error) {
    console.error("Erro ao salvar pontuação:", error);
    if (elements.scoreboardFeedback)
      elements.scoreboardFeedback.textContent = "Não foi possível salvar. Verifique conexão e permissões.";
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function exportScoreboard() {
  const entries = state.scoreboard?.entries || {};
  const rows = [["Atleta", "Presença", "Vitória", "Empate", "Gol", "Amarelo", "Vermelho", "Total"]];
  state.members.forEach((member) => {
    const entry = buildScoreboardEntry(entries[member.id] || {});
    rows.push([
      member.name || member.nickname || "Sem nome",
      entry.presence,
      entry.win,
      entry.draw,
      entry.goal,
      entry.yellow,
      entry.red,
      entry.total,
    ]);
  });
  const csvContent = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pontuacao-${state.scoreboardSeason}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function persistGameState() {
  if (!state.gameState) return;
  const docRef = doc(db, STORAGE_COLLECTION, state.selectedDate);
  const payload = {
    ...state.gameState,
    updatedAt: serverTimestamp(),
  };
  setDoc(docRef, payload, { merge: false }).catch((error) => {
    console.error("Não foi possível salvar estado de jogos:", error);
  });
}

function createDefaultGameState(dateKey) {
  return {
    dateKey,
    presences: {},
    initialDrawDone: false,
    linePlayersPerTeam: DEFAULT_LINE_PLAYERS_PER_TEAM,
    teams: {
      A: createTeam("A"),
      B: createTeam("B"),
    },
    teamOrder: ["A", "B"],
    discardedPlayers: [],
    rotationQueue: [],
    activeMatch: { home: null, away: null, startedAt: null },
    currentChampion: null,
    championMatchCount: 0,
    matches: [],
    goalkeeperQueue: [],
    lastLoserTeam: null,
    participationLog: {},
  };
}

function createTeam(id) {
  return {
    id,
    players: [],
    goalkeeperId: null,
  };
}

function normalizeGameState(stored) {
  const base = createDefaultGameState(stored.dateKey || state.selectedDate);
  return {
    ...base,
    ...stored,
    linePlayersPerTeam: normalizeLinePlayersPerTeam(stored.linePlayersPerTeam),
    teams: {
      ...base.teams,
      ...(stored.teams || {}),
    },
    discardedPlayers: Array.isArray(stored.discardedPlayers) ? stored.discardedPlayers : [],
    rotationQueue: Array.isArray(stored.rotationQueue) ? stored.rotationQueue : [],
    matches: Array.isArray(stored.matches) ? stored.matches : [],
    goalkeeperQueue: Array.isArray(stored.goalkeeperQueue) ? stored.goalkeeperQueue : [],
    lastLoserTeam: stored.lastLoserTeam || null,
    participationLog: stored.participationLog || {},
  };
}

function computeFirstNameCounts(members = []) {
  const counts = new Map();
  members.forEach((member) => {
    const first = extractFirstName(member);
    if (!first) return;
    counts.set(first, (counts.get(first) || 0) + 1);
  });
  return counts;
}

function extractFirstName(member) {
  if (!member) return "";
  const base = String(member.nickname || member.name || "").trim();
  if (!base) return "";
  return base.split(/\s+/)[0];
}

function formatShortName(member, firstNameCounts = new Map()) {
  if (!member) return "Sem nome";
  const rawName = String(member.nickname || member.name || "").trim() || "Sem nome";
  const parts = rawName.split(/\s+/).filter(Boolean);
  const first = parts[0] || rawName;
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const isDuplicate = firstNameCounts.get(first) > 1;
  if (isDuplicate && last && last.toLowerCase() !== first.toLowerCase()) {
    return `${first} ${last}`;
  }
  return first;
}

function renderMatchTimerOnce() {
  renderMatchTimer();
}

function resolveMillis(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === "object") {
    if (typeof value.toMillis === "function") {
      return value.toMillis();
    }
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    }
    if (typeof value.seconds === "number") {
      const millis = value.seconds * 1000 + (value.nanoseconds || 0) / 1_000_000;
      return Number.isFinite(millis) ? millis : null;
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateScoreTotal({ presence = 0, wins = 0, draws = 0, goals = 0, yellow = 0, red = 0 }) {
  return presence + wins * 3 + draws + goals - yellow - red * 3;
}

function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn("Áudio não suportado:", error);
      return null;
    }
  }
  return audioContext;
}

function playBeep({ frequency = 880, duration = 400, volume = 0.25 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gainNode.gain.value = volume;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  const now = ctx.currentTime;
  oscillator.start(now);
  oscillator.stop(now + duration / 1000);
}

function buildScoreboardEntry(rawEntry = {}) {
  const extras = { ...rawEntry };
  delete extras.presence;
  delete extras.win;
  delete extras.wins;
  delete extras.draw;
  delete extras.goal;
  delete extras.goals;
  delete extras.yellow;
  delete extras.yellowCards;
  delete extras.red;
  delete extras.redCards;
  delete extras.total;
  const presence = Math.max(0, Number(rawEntry?.presence || 0));
  const wins = Math.max(0, Number(rawEntry?.win ?? rawEntry?.wins ?? 0));
  const draws = Math.max(0, Number(rawEntry?.draw || 0));
  const goals = Math.max(0, Number(rawEntry?.goal ?? rawEntry?.goals ?? 0));
  const yellow = Math.max(0, Number(rawEntry?.yellow ?? rawEntry?.yellowCards ?? 0));
  const red = Math.max(0, Number(rawEntry?.red ?? rawEntry?.redCards ?? 0));
  const total = calculateScoreTotal({ presence, wins, draws, goals, yellow, red });
  return { ...extras, presence, win: wins, draw: draws, goal: goals, yellow, red, total };
}

function shuffle(array) {
  const cloned = array.slice();
  const randomIndex = (maxExclusive) => {
    const max = Math.max(1, maxExclusive);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const maxUint32 = 0xffffffff;
      const limit = maxUint32 - (maxUint32 % max);
      const buffer = new Uint32Array(1);
      let value = 0;
      do {
        window.crypto.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  };
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function ensureGoalkeeperQueue() {
  if (!state.gameState) return;
  const presences = state.gameState.presences || {};
  const queue = Array.isArray(state.gameState.goalkeeperQueue) ? state.gameState.goalkeeperQueue.slice() : [];
  const deduped = [];
  const seen = new Set();
  queue.forEach((memberId) => {
    if (seen.has(memberId)) return;
    const record = presences[memberId];
    if (!record || record.status !== ATTENDANCE_STATUS.GOALKEEPER || state.gameState.discardedPlayers.includes(memberId)) return;
    seen.add(memberId);
    deduped.push(memberId);
  });
  Object.entries(presences)
    .filter(([memberId, record]) => record.status === ATTENDANCE_STATUS.GOALKEEPER && !state.gameState.discardedPlayers.includes(memberId) && !seen.has(memberId))
    .sort((a, b) => (resolveMillis(a[1].arrivalAt) ?? 0) - (resolveMillis(b[1].arrivalAt) ?? 0))
    .forEach(([memberId]) => {
      seen.add(memberId);
      deduped.push(memberId);
    });
  state.gameState.goalkeeperQueue = deduped;
}

function rotateGoalkeepersAfterMatch(match) {
  if (!state.gameState || !match) return;
  const queue = Array.isArray(state.gameState.goalkeeperQueue) ? state.gameState.goalkeeperQueue : [];
  const teams = state.gameState.teams || {};
  [match.home, match.away].forEach((teamId) => {
    if (!teamId) return;
    const goalkeeperId = teams[teamId]?.goalkeeperId;
    if (!goalkeeperId) return;
    const index = queue.indexOf(goalkeeperId);
    if (index >= 0) {
      queue.splice(index, 1);
      queue.push(goalkeeperId);
    }
  });
  state.gameState.goalkeeperQueue = queue;
}

function reorderTeamsForDisplay() {
  if (!state.gameState) return;
  const { teamOrder = [], rotationQueue = [], activeMatch = {} } = state.gameState;
  const ordered = [];
  const push = (id) => {
    if (!id || ordered.includes(id)) return;
    ordered.push(id);
  };
  push(activeMatch.home);
  push(activeMatch.away);
  rotationQueue.forEach(push);
  teamOrder.forEach(push);
  state.gameState.teamOrder = ordered;
}

function formatFullDate(input) {
  const date = parseDateInput(input) || parseDateInput(new Date());
  if (!date) return "--";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

function formatDateTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "--";
  const datePart = formatFullDate(date);
  const timePart = formatTime(date);
  return `${datePart} às ${timePart}`;
}

function formatTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "--";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatRole(role) {
  const key = String(role || "").toLowerCase().trim();
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  if (!key) return "Perfil";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// Scroll helpers removidos; mantemos apenas restauração de scroll interno onde necessário.

function renderAfterPresenceChange(memberId, newStatus, scrollAnchor = {}) {
  const presences = state.gameState?.presences || {};
  const wrapper = elements.attendanceTableWrapper;
  const wrapperScroll = wrapper ? wrapper.scrollTop : null;

  const rowUpdated = updateAttendanceRow(memberId, newStatus);
  refreshAttendanceCounts(presences);
  renderArrivalLineup(presences);

  renderTeams();
  renderMatchSummary();

  // Se a linha não estava na tela (ex. filtrada), garante consistência geral
  if (!rowUpdated) {
    renderAttendanceTable();
  }

  // Restaura a rolagem interna da tabela de presenças
  requestAnimationFrame(() => {
    if (wrapper && wrapperScroll != null) {
      wrapper.scrollTop = wrapperScroll;
    }
  });
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTokens(value) {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function matchesSearchTokens(target, tokens) {
  if (!tokens.length) return true;
  const normalizedTarget = normalizeSearchText(target);
  return tokens.some((token) => normalizedTarget.includes(token));
}

function getUserHeaderLabel(profile) {
  if (!profile) return "";
  const rawName = String(profile.name || "").trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : "Usuário";
  const roleLabel = formatRole(profile.role);
  return `${firstName} (${roleLabel})`;
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

renderMatchTimerOnce();

// 🔥 Adiciona o listener global de ações de time
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-team-action]");
  if (!target) return;

  const action = target.dataset.teamAction;
  const teamId = target.dataset.teamId;
  const memberId = target.dataset.memberId;

  switch (action) {
    case "add-player":
      if (typeof openManualPlayerDialog === "function") {
        openManualPlayerDialog({ teamId, mode: "add" });
      }
      break;

    case "substitute-player":
      if (typeof openManualPlayerDialog === "function") {
        openManualPlayerDialog({ teamId, memberId, mode: "substitute" });
      }
      break;

    // 🧤 Novo caso: substituição de goleiro
    case "substitute-goalkeeper":
      if (typeof openManualPlayerDialog === "function") {
        openManualPlayerDialog({ teamId, memberId, mode: "substitute-goalkeeper" });
      }
      break;

    default:
      console.warn("Ação de time desconhecida:", action);
      break;
  }
});
