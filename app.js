const STORAGE_KEY = "burns-checklist-history-v1";

const items = [
  "Feeling sad or down in the dumps",
  "Feeling unhappy or blue",
  "Crying spells or tearfulness",
  "Feeling discouraged",
  "Feeling hopeless",
  "Low self-esteem",
  "Feeling worthless or inadequate",
  "Guilt or shame",
  "Criticizing yourself or blaming others",
  "Difficulty making decisions",
  "Loss of interest in family, friends or colleagues",
  "Loneliness",
  "Spending less time with family or friends",
  "Loss of motivation",
  "Loss of interest in work or other activities",
  "Avoiding work or other activities",
  "Loss of pleasure or satisfaction in life",
  "Feeling tired",
  "Difficulty sleeping or sleeping too much",
  "Decreased or increased appetite",
  "Loss of interest in sex",
  "Worrying about your health",
  "Do you have any suicidal thoughts?",
  "Would you like to end your life?",
  "Do you have a plan for harming yourself?"
];

const optionLabels = [
  "0 - Not at all",
  "1 - Somewhat",
  "2 - Moderately",
  "3 - A lot",
  "4 - Extremely"
];

const checklistForm = document.getElementById("checklistForm");
const totalScoreEl = document.getElementById("totalScore");
const severityEl = document.getElementById("severity");
const historyEl = document.getElementById("history");
const statusBanner = document.getElementById("statusBanner");
const safetyNotice = document.getElementById("safetyNotice");
const saveButton = document.getElementById("saveButton");
const resetButton = document.getElementById("resetButton");
const rowTemplate = document.getElementById("rowTemplate");
const chart = document.getElementById("progressChart");
const chartCtx = chart.getContext("2d");

buildChecklist();
updateStatusBanner();
updateScoreUI();
renderHistory();

checklistForm.addEventListener("change", () => {
  updateScoreUI();
  updateSafetyNotice();
});

saveButton.addEventListener("click", saveCurrentEntry);
resetButton.addEventListener("click", resetForm);

function buildChecklist() {
  items.forEach((text, idx) => {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".item-row");
    row.dataset.item = String(idx + 1);

    fragment.querySelector(".item-number").textContent = String(idx + 1);
    fragment.querySelector(".item-text").textContent = text;

    const optionsWrap = fragment.querySelector(".item-options");
    optionLabels.forEach((labelText, value) => {
      const id = `q${idx + 1}-${value}`;
      const label = document.createElement("label");
      label.className = "option-label";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `q${idx + 1}`;
      input.id = id;
      input.value = String(value);
      if (value === 0) {
        input.checked = true;
      }

      const textNode = document.createElement("span");
      textNode.textContent = labelText;

      label.appendChild(input);
      label.appendChild(textNode);
      optionsWrap.appendChild(label);
    });

    checklistForm.appendChild(fragment);
  });
}

function getCurrentAnswers() {
  const answers = [];
  for (let i = 1; i <= items.length; i += 1) {
    const value = Number(checklistForm.querySelector(`input[name="q${i}"]:checked`)?.value ?? 0);
    answers.push(value);
  }
  return answers;
}

function sum(values) {
  return values.reduce((acc, n) => acc + n, 0);
}

function getSeverity(score) {
  if (score <= 5) return "No depression";
  if (score <= 10) return "Normal but unhappy";
  if (score <= 25) return "Mild depression";
  if (score <= 50) return "Moderate depression";
  if (score <= 75) return "Severe depression";
  return "Extreme depression";
}

function updateScoreUI() {
  const answers = getCurrentAnswers();
  const total = sum(answers);
  totalScoreEl.textContent = String(total);
  severityEl.textContent = getSeverity(total);
}

function updateSafetyNotice() {
  const answers = getCurrentAnswers();
  const suicidalScore = answers[22] + answers[23] + answers[24];

  if (suicidalScore > 0) {
    safetyNotice.classList.remove("hidden");
    safetyNotice.textContent =
      "Important: You indicated some suicidal distress. Please contact a trusted person or professional now. If you might act on these thoughts, call emergency services immediately.";
    return;
  }

  safetyNotice.classList.add("hidden");
  safetyNotice.textContent = "";
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function saveCurrentEntry() {
  const answers = getCurrentAnswers();
  const score = sum(answers);
  const severity = getSeverity(score);

  const now = new Date();
  const thisWeekMonday = startOfWeekMonday(now).toISOString().slice(0, 10);

  const history = getHistory();
  const existingIndex = history.findIndex((entry) => entry.weekStart === thisWeekMonday);

  const entry = {
    id: crypto.randomUUID(),
    dateSaved: now.toISOString(),
    weekStart: thisWeekMonday,
    answers,
    score,
    severity
  };

  if (existingIndex >= 0) {
    history[existingIndex] = entry;
  } else {
    history.push(entry);
  }

  history.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  setHistory(history);
  renderHistory();
  updateStatusBanner();
}

function resetForm() {
  checklistForm.querySelectorAll('input[type="radio"]').forEach((input) => {
    if (input.value === "0") {
      input.checked = true;
    }
  });
  updateScoreUI();
  updateSafetyNotice();
}

function updateStatusBanner() {
  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = dayNames[today.getDay()];

  const monday = startOfWeekMonday(today).toISOString().slice(0, 10);
  const history = getHistory();
  const savedThisWeek = history.some((entry) => entry.weekStart === monday);

  if (today.getDay() === 1 && !savedThisWeek) {
    statusBanner.textContent = `Today is Monday. You have not saved this week's check-in yet.`;
    return;
  }

  if (savedThisWeek) {
    statusBanner.textContent = `Your check-in for this week has been saved. Next reminder day: Monday.`;
    return;
  }

  statusBanner.textContent = `Today is ${todayName}. Your next check-in day is Monday.`;
}

function renderHistory() {
  const history = getHistory();
  historyEl.innerHTML = "";

  if (history.length === 0) {
    historyEl.innerHTML = "<p>No entries saved yet.</p>";
    drawChart([]);
    return;
  }

  const newestFirst = [...history].sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  newestFirst.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const badgeClass = entry.score >= 26 ? "badge-high" : "badge-ok";

    card.innerHTML = `
      <p><strong>Week of ${formatDate(entry.weekStart)}</strong></p>
      <p>Score: <strong>${entry.score}</strong></p>
      <p><span class="badge ${badgeClass}">${entry.severity}</span></p>
      <p>Saved: ${formatDate(entry.dateSaved)}</p>
    `;

    historyEl.appendChild(card);
  });

  drawChart(history);
}

function drawChart(history) {
  const width = chart.width;
  const height = chart.height;
  chartCtx.clearRect(0, 0, width, height);

  chartCtx.fillStyle = "#ffffff";
  chartCtx.fillRect(0, 0, width, height);

  const padding = 30;
  chartCtx.strokeStyle = "#d8ccb5";
  chartCtx.lineWidth = 1;

  chartCtx.beginPath();
  chartCtx.moveTo(padding, padding / 2);
  chartCtx.lineTo(padding, height - padding);
  chartCtx.lineTo(width - padding / 2, height - padding);
  chartCtx.stroke();

  if (history.length === 0) {
    chartCtx.fillStyle = "#645c4d";
    chartCtx.font = "13px Manrope";
    chartCtx.fillText("No history yet", width / 2 - 40, height / 2);
    return;
  }

  const sorted = [...history].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const maxScore = 100;

  const xStep = sorted.length > 1 ? (width - padding * 2) / (sorted.length - 1) : 0;

  chartCtx.strokeStyle = "#0d5c63";
  chartCtx.lineWidth = 2;
  chartCtx.beginPath();

  sorted.forEach((entry, i) => {
    const x = padding + i * xStep;
    const y = height - padding - (entry.score / maxScore) * (height - padding * 1.5);

    if (i === 0) {
      chartCtx.moveTo(x, y);
    } else {
      chartCtx.lineTo(x, y);
    }
  });

  chartCtx.stroke();

  sorted.forEach((entry, i) => {
    const x = padding + i * xStep;
    const y = height - padding - (entry.score / maxScore) * (height - padding * 1.5);

    chartCtx.fillStyle = "#0d5c63";
    chartCtx.beginPath();
    chartCtx.arc(x, y, 3.5, 0, Math.PI * 2);
    chartCtx.fill();

    if (i === sorted.length - 1) {
      chartCtx.fillStyle = "#232018";
      chartCtx.font = "12px Manrope";
      chartCtx.fillText(String(entry.score), x + 8, y - 8);
    }
  });
}
