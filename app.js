const STORAGE_KEY = "protein-counter-state-v1";

const presets = [
  { name: "プロテイン", grams: 24, calories: 120, image: "assets/protein.svg", accent: "mint" },
  { name: "オイコス", grams: 10, calories: 92, image: "assets/oikos.svg", accent: "blue" },
  { name: "プロテインバー", grams: 15, calories: 200, image: "assets/protein-bar.svg", accent: "brown" },
  { name: "ヨーグルト", grams: 4, calories: 65, image: "assets/plain-yogurt.svg", accent: "cream" },
  { name: "ツナ缶", grams: 13, calories: 70, image: "assets/tuna.svg", accent: "blue" },
  { name: "牛乳", grams: 7, calories: 138, image: "assets/milk.svg", accent: "gray" },
  { name: "チーズ", grams: 7, calories: 80, image: "assets/cheese.svg", accent: "yellow" },
  { name: "ゆで卵", grams: 6, calories: 76, image: "assets/egg.svg", accent: "yellow" },
  { name: "鶏むね", grams: 30, calories: 165, image: "assets/chicken.svg", accent: "salmon" },
  { name: "ギリシャヨーグルト", grams: 10, calories: 100, image: "assets/yogurt.svg", accent: "blue" },
  { name: "豆腐", grams: 12, calories: 90, image: "assets/tofu.svg", accent: "gray" },
  { name: "納豆", grams: 8, calories: 100, image: "assets/natto.svg", accent: "tan" },
];

const state = loadState();
let selectedDate = toDateKey(new Date());
let lastDeleted = null;

const elements = {
  dateLabel: document.querySelector("#date-label"),
  prevDay: document.querySelector("#prev-day"),
  nextDay: document.querySelector("#next-day"),
  todayButton: document.querySelector("#today-button"),
  totalProtein: document.querySelector("#total-protein"),
  totalCalories: document.querySelector("#total-calories"),
  goalProtein: document.querySelector("#goal-protein"),
  goalPercent: document.querySelector("#goal-percent"),
  progressBar: document.querySelector("#progress-bar"),
  goalRing: document.querySelector(".goal-ring"),
  presetButtons: document.querySelector("#preset-buttons"),
  customForm: document.querySelector("#custom-form"),
  customName: document.querySelector("#custom-name"),
  customAmount: document.querySelector("#custom-amount"),
  customCalories: document.querySelector("#custom-calories"),
  undoButton: document.querySelector("#undo-button"),
  clearDay: document.querySelector("#clear-day"),
  logTitle: document.querySelector("#log-title"),
  logList: document.querySelector("#log-list"),
  emptyLog: document.querySelector("#empty-log"),
  goalInput: document.querySelector("#goal-input"),
};

renderPresets();
bindEvents();
render();

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      goal: Number(parsed?.goal) || 100,
      days: parsed?.days && typeof parsed.days === "object" ? parsed.days : {},
    };
  } catch {
    return { goal: 100, days: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.prevDay.addEventListener("click", () => shiftDay(-1));
  elements.nextDay.addEventListener("click", () => shiftDay(1));
  elements.todayButton.addEventListener("click", () => {
    selectedDate = toDateKey(new Date());
    render();
  });

  elements.customForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const grams = Number(elements.customAmount.value);
    if (!Number.isFinite(grams) || grams <= 0) return;

    addEntry({
      name: elements.customName.value.trim() || "手入力",
      grams: Math.round(grams),
      calories: parseOptionalNumber(elements.customCalories.value),
    });
    elements.customName.value = "";
    elements.customAmount.value = "";
    elements.customCalories.value = "";
    elements.customAmount.blur();
  });

  elements.undoButton.addEventListener("click", () => {
    if (!lastDeleted) return;
    ensureDay(lastDeleted.date).push(lastDeleted.entry);
    lastDeleted = null;
    saveState();
    render();
  });

  elements.clearDay.addEventListener("click", () => {
    const entries = getDayEntries();
    if (entries.length === 0) return;
    if (!window.confirm("この日の記録をすべて削除しますか？")) return;
    state.days[selectedDate] = [];
    lastDeleted = null;
    saveState();
    render();
  });

  elements.goalInput.addEventListener("change", () => {
    const goal = Number(elements.goalInput.value);
    if (!Number.isFinite(goal) || goal <= 0) {
      elements.goalInput.value = state.goal;
      return;
    }
    state.goal = Math.round(goal);
    saveState();
    render();
  });

  elements.logList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;
    deleteEntry(button.dataset.deleteId);
  });
}

function renderPresets() {
  elements.presetButtons.innerHTML = "";
  for (const preset of presets) {
    const button = document.createElement("button");
    button.className = `preset-button preset-button--${preset.accent}`;
    button.type = "button";
    button.innerHTML = `
      <span class="preset-image">
        <img src="${preset.image}" alt="" aria-hidden="true" />
      </span>
      <span class="preset-copy">
        <strong>${preset.name}</strong>
        <span class="preset-values">
          <span>${preset.grams}g</span>
          <small>${preset.calories} kcal</small>
        </span>
      </span>
    `;
    button.addEventListener("click", () => addEntry(preset));
    elements.presetButtons.append(button);
  }
}

function render() {
  const entries = getDayEntries();
  const total = entries.reduce((sum, entry) => sum + entry.grams, 0);
  const totalCalories = entries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
  const percent = state.goal > 0 ? Math.round((total / state.goal) * 100) : 0;
  const cappedPercent = Math.min(percent, 100);

  elements.dateLabel.textContent = formatDateLabel(selectedDate);
  elements.totalProtein.textContent = total;
  elements.totalCalories.textContent = totalCalories;
  elements.goalProtein.textContent = state.goal;
  elements.goalInput.value = state.goal;
  elements.goalPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${cappedPercent}%`;
  elements.goalRing.style.setProperty("--goal-angle", `${cappedPercent * 3.6}deg`);
  elements.nextDay.disabled = selectedDate === toDateKey(new Date());
  elements.undoButton.disabled = !lastDeleted;
  elements.clearDay.disabled = entries.length === 0;
  elements.logTitle.textContent = selectedDate === toDateKey(new Date()) ? "今日の記録" : "この日の記録";

  renderLog(entries);
}

function renderLog(entries) {
  elements.logList.innerHTML = "";
  elements.emptyLog.hidden = entries.length > 0;

  entries
    .slice()
    .reverse()
    .forEach((entry) => {
      const item = document.createElement("li");
      item.className = "log-item";
      const calories = entry.calories ? ` · ${entry.calories} kcal` : "";
      item.innerHTML = `
        <div class="log-name">${escapeHtml(entry.name)}</div>
        <div class="log-meta">${entry.grams}g${calories} · ${entry.time}</div>
        <button class="delete-entry" type="button" data-delete-id="${entry.id}" aria-label="${escapeHtml(entry.name)}を削除">×</button>
      `;
      elements.logList.append(item);
    });
}

function addEntry(preset) {
  const entry = {
    id: crypto.randomUUID(),
    name: preset.name,
    grams: preset.grams,
    calories: preset.calories,
    time: new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
  };
  ensureDay(selectedDate).push(entry);
  lastDeleted = null;
  saveState();
  render();
}

function parseOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number);
}

function deleteEntry(id) {
  const entries = getDayEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  const [entry] = entries.splice(index, 1);
  lastDeleted = { date: selectedDate, entry };
  saveState();
  render();
}

function shiftDay(amount) {
  const date = parseDateKey(selectedDate);
  date.setDate(date.getDate() + amount);
  const today = toDateKey(new Date());
  selectedDate = toDateKey(date) > today ? today : toDateKey(date);
  render();
}

function ensureDay(dateKey) {
  if (!Array.isArray(state.days[dateKey])) {
    state.days[dateKey] = [];
  }
  return state.days[dateKey];
}

function getDayEntries() {
  return ensureDay(selectedDate);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(dateKey) {
  const today = toDateKey(new Date());

  if (dateKey === today) return "今日";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseDateKey(dateKey));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}
