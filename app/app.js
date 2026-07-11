import { formatDuration } from "./format.js";
import { parseQuestions, readQuestionFile } from "./questionParser.js";
import { buildAttemptStats, toCsv } from "./stats.js";

const PAUSE_LIMIT_MS = 15 * 60 * 1000;
const STORAGE_KEY = "answerpace.questions";

const sampleQuestions = [
  "Discuss the role of ethics in public administration.",
  "Examine the significance of federalism in India's governance structure.",
  "Critically analyse the impact of climate change on Indian agriculture.",
  "Evaluate the importance of citizen charters in improving service delivery.",
];

const elements = {
  homeView: document.querySelector("#homeView"),
  testView: document.querySelector("#testView"),
  resultsView: document.querySelector("#resultsView"),
  questionFile: document.querySelector("#questionFile"),
  startButton: document.querySelector("#startButton"),
  loadSampleButton: document.querySelector("#loadSampleButton"),
  fileStatus: document.querySelector("#fileStatus"),
  progressLabel: document.querySelector("#progressLabel"),
  totalTimer: document.querySelector("#totalTimer"),
  questionTimer: document.querySelector("#questionTimer"),
  pauseBadge: document.querySelector("#pauseBadge"),
  questionText: document.querySelector("#questionText"),
  pausePanel: document.querySelector("#pausePanel"),
  pauseCountdown: document.querySelector("#pauseCountdown"),
  pauseButton: document.querySelector("#pauseButton"),
  continueButton: document.querySelector("#continueButton"),
  nextButton: document.querySelector("#nextButton"),
  summaryGrid: document.querySelector("#summaryGrid"),
  resultsTable: document.querySelector("#resultsTable"),
  downloadCsvButton: document.querySelector("#downloadCsvButton"),
  restartButton: document.querySelector("#restartButton"),
  retryButton: document.querySelector("#retryButton"),
};

const state = {
  questions: [],
  currentIndex: 0,
  completedTimesMs: [],
  currentQuestionMs: 0,
  activeStartedAt: null,
  pauseUsed: false,
  paused: false,
  pauseStartedAt: null,
  pauseAccumulatedMs: 0,
  pauseTimeoutId: null,
  tickerId: null,
  latestStats: null,
};

bootstrap();

function bootstrap() {
  restoreQuestions();
  bindEvents();
  renderHomeStatus();
}

function bindEvents() {
  elements.questionFile.addEventListener("change", handleFileUpload);
  elements.startButton.addEventListener("click", startTest);
  elements.loadSampleButton.addEventListener("click", loadSample);
  elements.pauseButton.addEventListener("click", pauseTest);
  elements.continueButton.addEventListener("click", resumeTest);
  elements.nextButton.addEventListener("click", goToNextQuestion);
  elements.downloadCsvButton.addEventListener("click", downloadCsv);
  elements.restartButton.addEventListener("click", backToHome);
  elements.retryButton.addEventListener("click", startTest);
}

async function handleFileUpload(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  elements.fileStatus.textContent = "Reading file...";
  elements.startButton.disabled = true;

  try {
    const questions = await readQuestionFile(file);
    if (questions.length === 0) {
      throw new Error("No questions were found in this file.");
    }

    setQuestions(questions);
    elements.fileStatus.textContent = `${questions.length} question${questions.length === 1 ? "" : "s"} loaded from ${file.name}.`;
  } catch (error) {
    state.questions = [];
    elements.fileStatus.textContent = error.message;
  }

  renderHomeStatus();
}

function loadSample() {
  setQuestions(sampleQuestions);
  elements.fileStatus.textContent = `${sampleQuestions.length} sample questions loaded.`;
  renderHomeStatus();
}

function setQuestions(questions) {
  state.questions = questions;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

function restoreQuestions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (Array.isArray(saved) && saved.every((item) => typeof item === "string")) {
      state.questions = saved;
    }
  } catch {
    state.questions = [];
  }
}

function renderHomeStatus() {
  elements.startButton.disabled = state.questions.length === 0;
  if (state.questions.length > 0 && elements.fileStatus.textContent === "No question file loaded.") {
    elements.fileStatus.textContent = `${state.questions.length} question${state.questions.length === 1 ? "" : "s"} ready.`;
  }
}

function startTest() {
  if (state.questions.length === 0) {
    return;
  }

  clearTimers();
  state.currentIndex = 0;
  state.completedTimesMs = [];
  state.currentQuestionMs = 0;
  state.activeStartedAt = performance.now();
  state.pauseUsed = false;
  state.paused = false;
  state.pauseStartedAt = null;
  state.pauseAccumulatedMs = 0;
  state.latestStats = null;

  showView("test");
  renderQuestion();
  startTicker();
}

function renderQuestion() {
  const isLastQuestion = state.currentIndex === state.questions.length - 1;
  elements.progressLabel.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length}`;
  elements.questionText.textContent = state.questions[state.currentIndex];
  elements.nextButton.textContent = isLastQuestion ? "Finish" : "Next";
  elements.pauseButton.disabled = state.pauseUsed || state.paused;
  elements.pauseBadge.textContent = state.pauseUsed ? "Pause used" : "Pause available";
  updateTimers();
}

function goToNextQuestion() {
  if (state.paused) {
    return;
  }

  closeActiveQuestionSlice();
  state.completedTimesMs[state.currentIndex] = state.currentQuestionMs;

  if (state.currentIndex === state.questions.length - 1) {
    finishTest();
    return;
  }

  state.currentIndex += 1;
  state.currentQuestionMs = 0;
  state.activeStartedAt = performance.now();
  renderQuestion();
}

function pauseTest() {
  if (state.pauseUsed || state.paused) {
    return;
  }

  closeActiveQuestionSlice();
  state.pauseUsed = true;
  state.paused = true;
  state.pauseStartedAt = performance.now();
  elements.pausePanel.classList.remove("hidden");
  elements.pauseButton.disabled = true;
  elements.nextButton.disabled = true;
  state.pauseTimeoutId = window.setTimeout(resumeTest, PAUSE_LIMIT_MS);
  updateTimers();
}

function resumeTest() {
  if (!state.paused) {
    return;
  }

  state.pauseAccumulatedMs += performance.now() - state.pauseStartedAt;
  state.paused = false;
  state.pauseStartedAt = null;
  state.activeStartedAt = performance.now();
  window.clearTimeout(state.pauseTimeoutId);
  elements.pausePanel.classList.add("hidden");
  elements.nextButton.disabled = false;
  renderQuestion();
}

function finishTest() {
  clearTimers();
  const stats = buildAttemptStats(state.questions, state.completedTimesMs, state.pauseAccumulatedMs);
  state.latestStats = stats;
  renderResults(stats);
  showView("results");
}

function closeActiveQuestionSlice() {
  if (state.activeStartedAt === null) {
    return;
  }

  state.currentQuestionMs += performance.now() - state.activeStartedAt;
  state.activeStartedAt = null;
}

function startTicker() {
  state.tickerId = window.setInterval(updateTimers, 250);
  updateTimers();
}

function clearTimers() {
  window.clearInterval(state.tickerId);
  window.clearTimeout(state.pauseTimeoutId);
  state.tickerId = null;
  state.pauseTimeoutId = null;
}

function updateTimers() {
  const currentMs = getCurrentQuestionMs();
  const totalMs = state.completedTimesMs.reduce((sum, value) => sum + value, 0) + currentMs;
  elements.totalTimer.textContent = formatDuration(totalMs, { includeHours: true });
  elements.questionTimer.textContent = `This question: ${formatDuration(currentMs)}`;

  if (state.paused) {
    const elapsedPause = performance.now() - state.pauseStartedAt;
    const remaining = Math.max(0, PAUSE_LIMIT_MS - elapsedPause);
    elements.pauseCountdown.textContent = formatDuration(remaining);
  }
}

function getCurrentQuestionMs() {
  if (state.activeStartedAt === null) {
    return state.currentQuestionMs;
  }

  return state.currentQuestionMs + performance.now() - state.activeStartedAt;
}

function renderResults(stats) {
  const fastest = stats.fastestIndex >= 0 ? `Q${stats.fastestIndex + 1}` : "N/A";
  const slowest = stats.slowestIndex >= 0 ? `Q${stats.slowestIndex + 1}` : "N/A";

  const cards = [
    ["Total Time", formatDuration(stats.totalMs, { includeHours: true })],
    ["Average", formatDuration(stats.averageMs, { includeHours: true })],
    ["Median", formatDuration(stats.medianMs, { includeHours: true })],
    ["Questions", String(stats.questionCount)],
    ["Fastest", fastest],
    ["Slowest", slowest],
    ["Above Average", String(stats.overAverageCount)],
    ["Pause", formatDuration(stats.pauseMs, { includeHours: true })],
  ];

  elements.summaryGrid.innerHTML = cards
    .map(([label, value]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  elements.resultsTable.innerHTML = stats.rows
    .map(
      (row) => `
        <tr>
          <td>${row.index + 1}</td>
          <td>${escapeHtml(row.question)}</td>
          <td>${formatDuration(row.timeMs, { includeHours: true })}</td>
        </tr>
      `,
    )
    .join("");
}

function downloadCsv() {
  if (!state.latestStats) {
    return;
  }

  const csv = toCsv(state.latestStats, formatDuration);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  anchor.href = url;
  anchor.download = `answerpace-report-${timestamp}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function backToHome() {
  clearTimers();
  elements.pausePanel.classList.add("hidden");
  elements.nextButton.disabled = false;
  showView("home");
  renderHomeStatus();
}

function showView(view) {
  elements.homeView.classList.toggle("hidden", view !== "home");
  elements.testView.classList.toggle("hidden", view !== "test");
  elements.resultsView.classList.toggle("hidden", view !== "results");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
