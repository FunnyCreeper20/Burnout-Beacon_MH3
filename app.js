// Gets the form that holds the current wellness-check question.
const form = document.querySelector("#wellness-form");

// Gets the area where each question is rendered one at a time.
const questionStage = document.querySelector("#questionStage");

// Gets the progress text and progress bar.
const progressText = document.querySelector("#progressText");
const progressFill = document.querySelector("#progressFill");

// Gets the validation message and navigation buttons.
const formError = document.querySelector("#formError");
const backButton = document.querySelector("#backButton");
const nextButton = document.querySelector("#nextButton");
const restartButton = document.querySelector("#restartButton");

// Gets the final result screen.
const resultScreen = document.querySelector("#resultScreen");

// Gets all of the places where the final output will be displayed.
const outputs = {
    status: document.querySelector("#resultStatus"),
    scoreValue: document.querySelector("#scoreValue"),
    scoreRing: document.querySelector("#scoreRing"),
    reasons: document.querySelector("#reasonList"),
    recommendations: document.querySelector("#recommendationList"),
    support: document.querySelector("#supportGrid"),
    summary: document.querySelector("#answerSummary")
};

// Defines every question in the wellness check.
const questions = [
    {
        key: "sleepHours",
        label: "How many hours of sleep did you get?",
        type: "number",
        min: 0,
        max: 14,
        // Allows decimal sleep answers like 6.25, 7.5, or 8.75.
        step: "any",
        inputMode: "decimal",
        placeholder: "Example: 7.5",
        helper: "Use your best estimate from last night."
    },
    {
        key: "sleepConsistency",
        label: "Do you go to sleep at the same time? For the same amount of time?",
        type: "choice",
        helper: "Choose the option that best describes your sleep pattern this week.",
        options: [
            // These values are wellness points: higher consistency earns more points.
            { label: "Not at all consistent", value: 10 },
            { label: "Sometimes consistent", value: 5 },
            { label: "Very consistent", value: 1 }
        ]
    },
    {
        key: "deadlines",
        label: "How many major deadlines do you have?",
        type: "number",
        min: 0,
        // No max is set here so students can enter any number of deadlines.
        max: null,
        step: 1,
        inputMode: "numeric",
        placeholder: "Tests, presentations, projects, etc.",
        helper: "Count tests, presentations, projects, performances, or other major due dates."
    },
    {
        key: "stress",
        label: "On a scale of 1-10, how stressed do you feel?",
        type: "scale",
        min: 1,
        max: 10,
        helper: "1 means very calm. 10 means extremely stressed."
    },
    {
        key: "energy",
        label: "On a scale of 1-10, how energetic do you feel?",
        type: "scale",
        min: 1,
        max: 10,
        helper: "1 means drained. 10 means very energized."
    },
    {
        key: "motivation",
        label: "On a scale of 1-10, how motivated are you to do something you want to do?",
        type: "scale",
        min: 1,
        max: 10,
        helper: "This asks about motivation for something you personally care about."
    },
    {
        key: "connected",
        label: "On a scale of 1-10, how connected are you with your friends?",
        type: "scale",
        min: 1,
        max: 10,
        helper: "1 means isolated. 10 means strongly connected."
    }
];

// Stores the user's answers while they move through the questions.
const answers = {};

// Tracks which question is currently visible.
let currentQuestionIndex = 0;

// Defines which score ranges match each final wellness status.
const statusBands = [
    { max: 33, label: "Stable", color: "#2f8f5b" },
    { max: 58, label: "Under Pressure", color: "#d99a22" },
    { max: 78, label: "Strained", color: "#ef6f61" },
    { max: 100, label: "Recovery Mode", color: "#2563eb" }
];

// Score at or above this value will show a prominent "talk to someone" warning.
const TALK_THRESHOLD = 85; // configurable: set to desired threshold (0-100)

// Finds the correct wellness status for the current pressure score.
function getStatus(score) {
    return statusBands.find((band) => score <= band.max) || statusBands[statusBands.length - 1];
}

// Scores sleep as wellness points.
function getSleepPoints(hours) {
    // 1 hour or less earns 0 points.
    if (hours <= 1) {
        return 0;
    }

    // From 1 to 9 hours, points rise steadily from 0 to 10.
    if (hours <= 9) {
        return ((hours - 1) / 8) * 10;
    }

    // From 9 to 12 hours, only a tiny bonus is added.
    if (hours <= 12) {
        return 10 + ((hours - 9) / 3);
    }

    // After 12 hours, no more points are added.
    return 11;
}

// Scores deadline load as wellness points.
function getDeadlinePoints(deadlines) {
    // 0 major tasks earns 10 points.
    if (deadlines <= 0) {
        return 10;
    }

    // 1 to 5 major tasks steadily lowers the score from 10 to 0.
    if (deadlines <= 5) {
        return 10 - (deadlines * 2);
    }

    // Anything after 5 tasks is not included, so it stays at 0 points.
    return 0;
}

// Clears a list and fills it with new bullet points.
function addListItems(list, items) {
    list.innerHTML = "";

    // Creates one list item for each explanation or recommendation.
    items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
    });
}

// Clears and rebuilds the community support cards.
function updateSupport(items) {
    outputs.support.innerHTML = "";

    // Creates a card for each support option.
    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "support-item";
        card.innerHTML = `<b>${item.title}</b><span>${item.text}</span>`;
        outputs.support.appendChild(card);
    });
}

// Creates the HTML for a number input question.
function createNumberQuestion(question, savedAnswer) {
    // Only adds a max attribute when the question actually has an upper limit.
    const maxAttribute = question.max === null ? "" : `max="${question.max}"`;

    // Helps mobile keyboards show the right kind of keypad for decimals or whole numbers.
    const inputModeAttribute = question.inputMode ? `inputmode="${question.inputMode}"` : "";

    return `
        <label class="field question-field">
            <span>${question.label}</span>
            <input id="currentAnswer" type="number" min="${question.min}" ${maxAttribute} step="${question.step}" ${inputModeAttribute} placeholder="${question.placeholder}" value="${savedAnswer ?? ""}" autocomplete="off">
        </label>
    `;
}

// Creates the HTML for a multiple-choice question.
function createChoiceQuestion(question, savedAnswer) {
    const choices = question.options.map((option) => {
        const checked = Number(savedAnswer) === option.value ? "checked" : "";

        return `
            <label class="choice-option">
                <input type="radio" name="currentAnswer" value="${option.value}" ${checked}>
                <span>${option.label}</span>
            </label>
        `;
    }).join("");

    return `
        <fieldset class="choice-group">
            <legend>${question.label}</legend>
            ${choices}
        </fieldset>
    `;
}

// Creates the HTML for a 1-10 scale question.
function createScaleQuestion(question, savedAnswer) {
    const value = savedAnswer ?? 5;

    return `
        <label class="slider-field question-field">
            <div>
                <span>${question.label}</span>
                <output id="scaleOutput">${value}</output>
            </div>
            <input id="currentAnswer" type="range" min="${question.min}" max="${question.max}" value="${value}">
            <div class="scale-labels" aria-hidden="true">
                <span>1</span>
                <span>10</span>
            </div>
        </label>
    `;
}

// Updates the progress text and progress bar.
function updateProgress() {
    const questionNumber = currentQuestionIndex + 1;
    const progressPercent = (questionNumber / questions.length) * 100;

    progressText.textContent = `Question ${questionNumber} of ${questions.length}`;
    progressFill.style.width = `${progressPercent}%`;
}

// Renders the current question into the question card.
function renderQuestion() {
    const question = questions[currentQuestionIndex];
    const savedAnswer = answers[question.key];

    // Clears any old validation message.
    formError.textContent = "";

    // Updates progress and button states.
    updateProgress();
    backButton.disabled = currentQuestionIndex === 0;
    nextButton.textContent = currentQuestionIndex === questions.length - 1 ? "See My Result" : "Next";

    // Chooses the correct input layout for the current question type.
    let inputMarkup = "";
    if (question.type === "number") {
        inputMarkup = createNumberQuestion(question, savedAnswer);
    } else if (question.type === "choice") {
        inputMarkup = createChoiceQuestion(question, savedAnswer);
    } else {
        inputMarkup = createScaleQuestion(question, savedAnswer);
    }

    // Places the question content on the page.
    questionStage.innerHTML = `
        <div class="question-count">Burnout Beacon Check-In</div>
        ${inputMarkup}
        <p class="question-helper">${question.helper}</p>
    `;

    // Keeps the visible number beside range sliders updated while the user drags.
    const rangeInput = questionStage.querySelector('input[type="range"]');
    const scaleOutput = questionStage.querySelector("#scaleOutput");
    if (rangeInput && scaleOutput) {
        rangeInput.addEventListener("input", () => {
            scaleOutput.textContent = rangeInput.value;
        });
    }

    // Focuses the first input for easier keyboard use.
    const firstInput = questionStage.querySelector("input");
    if (firstInput) {
        firstInput.focus();
    }
}

// Reads and validates the answer from the current question.
function getCurrentAnswer() {
    const question = questions[currentQuestionIndex];

    // Number and scale questions both use the #currentAnswer input.
    if (question.type === "number" || question.type === "scale") {
        const input = questionStage.querySelector("#currentAnswer");
        const isEmptyNumber = question.type === "number" && input.value.trim() === "";
        const value = Number(input.value);
        const isAboveMax = question.max !== null && value > question.max;

        // Rejects empty answers, non-number answers, negative values, or values above a real max.
        // Deadline count has no max, so it skips the upper-limit check.
        if (isEmptyNumber || Number.isNaN(value) || value < question.min || isAboveMax) {
            return null;
        }

        return value;
    }

    // Choice questions use the selected radio button.
    const selectedChoice = questionStage.querySelector('input[name="currentAnswer"]:checked');
    return selectedChoice ? Number(selectedChoice.value) : null;
}

// Moves to a question with a fade-out and fade-in transition.
function moveToQuestion(nextIndex) {
    questionStage.classList.add("is-fading");

    // Waits briefly so the fade-out is visible before replacing the question.
    window.setTimeout(() => {
        currentQuestionIndex = nextIndex;
        renderQuestion();
        questionStage.classList.remove("is-fading");
    }, 180);
}

// Builds a short summary of the user's answers for the final result screen.
function updateAnswerSummary() {
    const consistencyText = {
        1: "Not at all consistent",
        5: "Sometimes consistent",
        10: "Very consistent"
    };

    // These summary cards show what the result was based on.
    const summaryItems = [
        ["Sleep", `${answers.sleepHours} hours`],
        ["Sleep pattern", consistencyText[answers.sleepConsistency]],
        ["Deadlines", answers.deadlines],
        ["Stress", `${answers.stress}/10`],
        ["Energy", `${answers.energy}/10`],
        ["Motivation", `${answers.motivation}/10`],
        ["Connectedness", `${answers.connected}/10`]
    ];

    outputs.summary.innerHTML = summaryItems.map(([label, value]) => `
        <div class="summary-item">
            <span>${label}</span>
            <strong>${value}</strong>
        </div>
    `).join("");
}

// Runs the Burnout Beacon rule engine and shows the final result.
function showResults() {
    // Reads the stored answers into short variable names for scoring.
    const sleepHours = answers.sleepHours;
    const sleepConsistency = answers.sleepConsistency;
    const deadlines = answers.deadlines;
    const stress = answers.stress;
    const energy = answers.energy;
    const motivation = answers.motivation;
    const connected = answers.connected;
    const sleepPoints = getSleepPoints(sleepHours);
    const deadlinePoints = getDeadlinePoints(deadlines);
    // Compute pressure score as a weighted sum of normalized 'badness' measures.
    // Each contribution is 0 (no pressure) to 1 (max pressure) and weights sum to 100.
    const maxDeadlines = 12;
    const deadlinesVal = Math.min(Math.max(Number(deadlines) || 0, 0), maxDeadlines);
    const deadlinesNorm = deadlinesVal / maxDeadlines; // 0..1 (more deadlines => worse)

    const stressVal = Math.min(Math.max(Number(stress) || 0, 1), 10);
    const stressNorm = (stressVal - 1) / 9; // 0..1 (1 calm, 10 worst)

    const sleepVal = Math.min(Math.max(Number(sleepHours) || 0, 0), 12);
    const sleepNorm = sleepVal / 12; // 0..1 (more sleep => better)

    // sleepConsistency uses values where 1 = very consistent (best) and 10 = not consistent (worst)
    const sleepConsistencyVal = Math.min(Math.max(Number(sleepConsistency) || 0, 0), 10);
    const sleepConsistencyBad = (sleepConsistencyVal - 1) / 9; // 0..1 (higher => worse)

    const energyBad = (10 - Math.min(Math.max(Number(energy) || 0, 0), 10)) / 9; // 0..1 (higher => worse)
    const motivationBad = (10 - Math.min(Math.max(Number(motivation) || 0, 0), 10)) / 9;
    const connectedBad = (10 - Math.min(Math.max(Number(connected) || 0, 0), 10)) / 9;

    // Weights (sum ~= 100)
    const weights = {
        deadlines: 25,
        stress: 30,
        sleep: 15,
        consistency: 10,
        energy: 10,
        motivation: 6,
        connected: 4
    };

    let score = 0;
    score += deadlinesNorm * weights.deadlines;
    score += stressNorm * weights.stress;
    score += (1 - sleepNorm) * weights.sleep; // less sleep => higher contribution
    score += sleepConsistencyBad * weights.consistency;
    score += energyBad * weights.energy;
    score += motivationBad * weights.motivation;
    score += connectedBad * weights.connected;

    // Small bump if deadline wellness points are low (keeps reasons/recommendations aligned)
    score += (10 - deadlinePoints) * 0.6;

    // Clamp and normalize to 0-100 (0 = best, 100 = worst)
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Converts the numeric score into a status label and color.
    const status = getStatus(score);

    // Updates the final status text, score number, and circular score ring.
    outputs.status.textContent = status.label;
    outputs.scoreValue.textContent = score;
    outputs.scoreRing.style.background = `conic-gradient(${status.color} 0 ${score}%, #e7eeee ${score}% 100%)`;
    outputs.scoreRing.style.setProperty("--score-color", status.color);

    // Creates explanations for why the score changed.
    const reasons = [];
    if (sleepPoints < 4) {
        reasons.push(`Sleep earned ${sleepPoints.toFixed(1)} out of 11 points, which strongly raised pressure.`);
    } else if (sleepPoints < 9) {
        reasons.push(`Sleep earned ${sleepPoints.toFixed(1)} out of 11 points, so recovery may still be limited.`);
    }
    if (sleepConsistency <= 1) {
        reasons.push("Sleep consistency earned 1 out of 10 points because it is not consistent.");
    } else if (sleepConsistency <= 5) {
        reasons.push("Sleep consistency earned 5 out of 10 points because it is only sometimes consistent.");
    }
    if (deadlinePoints === 0 && deadlines >= 5) {
        reasons.push("Deadline load earned 0 out of 10 points because 5 or more major tasks creates high pressure.");
    } else if (deadlinePoints < 10) {
        reasons.push(`Deadline load earned ${deadlinePoints} out of 10 points based on your major tasks.`);
    }
    if (stress >= 7) {
        reasons.push("Stress check-in is high.");
    } else if (stress >= 5) {
        reasons.push("Stress check-in is elevated.");
    }
    if (energy <= 4) {
        reasons.push("Energy is low, which can make recovery and focus harder.");
    }
    if (motivation <= 4) {
        reasons.push("Motivation to do something meaningful is lower than usual.");
    }
    if (connected <= 4) {
        reasons.push("Connectedness with friends is low, so support may be useful.");
    }
    if (reasons.length === 0) {
        reasons.push("Your current answers look close to a stable baseline.");
    }

    // Creates recommendations that match the user's strongest pressure signals.
    const recommendations = [];
    if (deadlinePoints <= 6) {
        recommendations.push("Break the next deadline into one 25-minute starter task and one review block.");
    }
    if (sleepPoints < 9 || sleepConsistency < 10) {
        recommendations.push("Choose a fixed wind-down time tonight and protect your sleep window.");
    }
    if (stress >= 6) {
        recommendations.push("Move one non-essential task out of today and write down the next concrete step.");
    }
    if (energy <= 4) {
        recommendations.push("Schedule a recovery block before another demanding study session.");
    }
    if (connected <= 4) {
        recommendations.push("Message one trusted person or join a structured study space.");
    }
    if (recommendations.length < 3) {
        recommendations.push("Keep tracking check-ins so the system can learn your personal baseline.");
    }

    // Chooses support cards based on workload, connection, and overall score.
    const support = [
        {
            title: deadlines >= 2 ? "Study group" : "Accountability partner",
            text: deadlines >= 2 ? "Find classmates preparing for the same test, presentation, or project." : "Ask one person to check in on your next work block."
        },
        {
            title: connected <= 4 ? "Reconnect" : "Community event",
            text: connected <= 4 ? "Send a low-pressure message to a trusted friend." : "Use a club or campus event as built-in recovery time."
        },
        {
            title: score >= 79 ? "Wellness resource" : "Recovery strategy",
            text: score >= 79 ? "Consider campus counseling or a student wellness center if this pattern continues." : "Take a short walk, meal break, or screen-free reset."
        }
    ];

    // Updates all result sections.
    updateAnswerSummary();
    addListItems(outputs.reasons, reasons);
    addListItems(outputs.recommendations, recommendations.slice(0, 4));
    updateSupport(support);

    // Show a safety / outreach warning if the numeric score crosses the TALK_THRESHOLD.
    try {
        let warning = resultScreen.querySelector('#talkWarning');
        if (!warning) {
            warning = document.createElement('div');
            warning.id = 'talkWarning';
            warning.className = 'safety-warning hidden';
            // Insert warning before the answer summary so it's visible near the top of results.
            outputs.summary.parentNode.insertBefore(warning, outputs.summary);
        }

        if (score >= TALK_THRESHOLD) {
            warning.innerHTML = `
                <strong>Consider talking to someone</strong>
                <p>If your score is ${score}, you may be experiencing elevated pressure. Consider reaching out to a trusted friend, family member, mentor, or your campus counseling center for support. If you feel you may harm yourself or others, contact emergency services immediately.</p>
            `;
            warning.classList.remove('hidden');
        } else {
            warning.classList.add('hidden');
        }
    } catch (e) {
        console.warn('Could not render talk-warning', e);
    }

    // Record this submission into a local 'prev.csv' (stored in localStorage)
    try {
        const csvKey = "prev_csv";
        const headers = ["timestamp","score","sleepHours","sleepConsistency","deadlines","stress","energy","motivation","connected"];
        const now = new Date().toISOString();
        const row = [now, score, sleepHours, sleepConsistency, deadlines, stress, energy, motivation, connected];

        let csv = localStorage.getItem(csvKey);
        if (!csv) {
            csv = headers.join(",") + "\n";
        }
        csv += row.map((v) => String(v).replace(/\r|\n|,/g, " ")).join(",") + "\n";
        localStorage.setItem(csvKey, csv);

        // Offer a download link for prev.csv
        const downloadArea = document.querySelector('#historyDownload');
        if (downloadArea) {
            downloadArea.innerHTML = '';
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'prev.csv';
            a.textContent = 'Download prev.csv';
            a.className = 'button';
            downloadArea.appendChild(a);
        }

        // If there are data rows, render a simple SVG line chart.
        const chartContainer = document.querySelector('#historyChart');
        const historyBlock = document.querySelector('#historyBlock');
        if (chartContainer && historyBlock) {
            const lines = csv.trim().split('\n');
            const data = lines.slice(1).map((r) => {
                const cols = r.split(',');
                return { t: cols[0], score: Number(cols[1]) };
            }).filter(d => !Number.isNaN(d.score));

            if (data.length > 0) {
                historyBlock.style.display = '';
                // Create simple SVG sparkline (responsive)
                const w = 600;
                const h = 120;
                const pad = 20;
                const scores = data.map(d => d.score);
                const min = Math.min(...scores, 0);
                const max = Math.max(...scores, 100);

                const points = data.map((d, i) => {
                    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
                    const y = pad + ((max - d.score) / Math.max(1, max - min)) * (h - pad * 2);
                    return [x, y];
                });

                const pathD = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');

                chartContainer.innerHTML = `
                    <svg viewBox="0 0 ${w} ${h}" width="100%" height="160" role="img" aria-label="Submission history chart">
                        <rect x="0" y="0" width="${w}" height="${h}" fill="transparent"></rect>
                        <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
                        ${points.map((p, i) => `<circle class="history-point" data-index="${i}" data-score="${data[i].score}" data-t="${data[i].t}" cx="${p[0]}" cy="${p[1]}" r="4" fill="#2563eb" style="cursor:pointer"></circle>`).join('')}
                    </svg>
                `;

                // Make container relatively positioned for tooltip placement
                chartContainer.style.position = 'relative';

                // Create tooltip element (reusable)
                let tip = chartContainer.querySelector('.chart-tooltip');
                if (!tip) {
                    tip = document.createElement('div');
                    tip.className = 'chart-tooltip';
                    Object.assign(tip.style, {
                        position: 'absolute',
                        pointerEvents: 'none',
                        background: 'rgba(0,0,0,0.85)',
                        color: '#fff',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        transform: 'translate(-50%, -120%)',
                        display: 'none',
                        zIndex: 20,
                    });
                    chartContainer.appendChild(tip);
                }

                // Attach hover handlers to each point
                const circles = chartContainer.querySelectorAll('.history-point');
                circles.forEach((c) => {
                    c.addEventListener('mouseenter', (ev) => {
                        const scoreVal = c.getAttribute('data-score');
                        const t = c.getAttribute('data-t');
                        // Format timestamp and score for readability
                        let label = t;
                        try {
                            const dt = new Date(t);
                            label = dt.toLocaleString();
                        } catch (e) {
                            // leave raw value
                        }
                        tip.textContent = `${label} — Score: ${Math.round(Number(scoreVal))}`;
                        tip.style.display = '';
                    });
                    c.addEventListener('mousemove', (ev) => {
                        const rect = chartContainer.getBoundingClientRect();
                        const x = ev.clientX - rect.left;
                        const y = ev.clientY - rect.top;
                        tip.style.left = `${x}px`;
                        tip.style.top = `${y}px`;
                    });
                    c.addEventListener('mouseleave', () => {
                        tip.style.display = 'none';
                    });
                });
                // No File System Access: keep storage local (download link above)
            } else {
                historyBlock.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Failed to record prev.csv', e);
    }

    // Hides the question form and reveals the final result screen.
    form.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    progressText.textContent = "Complete";
    progressFill.style.width = "100%";
}

// Handles the Next button and final submit behavior.
form.addEventListener("submit", (event) => {
    event.preventDefault();

    // Reads and validates the current answer.
    const answer = getCurrentAnswer();
    if (answer === null) {
        formError.textContent = "Please answer this question before continuing.";
        return;
    }

    // Saves the current answer using the current question's key.
    const question = questions[currentQuestionIndex];
    answers[question.key] = answer;

    // Shows the final result after the last question.
    if (currentQuestionIndex === questions.length - 1) {
        showResults();
        return;
    }

    // Otherwise, fades into the next question.
    moveToQuestion(currentQuestionIndex + 1);
});

// Handles the Back button.
backButton.addEventListener("click", () => {
    if (currentQuestionIndex > 0) {
        // Saves the current answer before going back, but only if it is valid.
        const answer = getCurrentAnswer();
        if (answer !== null) {
            const question = questions[currentQuestionIndex];
            answers[question.key] = answer;
        }

        moveToQuestion(currentQuestionIndex - 1);
    }
});

// Resets all stored answers and returns the user to the first question.
restartButton.addEventListener("click", () => {
    Object.keys(answers).forEach((key) => {
        delete answers[key];
    });

    currentQuestionIndex = 0;
    resultScreen.classList.add("hidden");
    form.classList.remove("hidden");
    renderQuestion();
});

// Renders the first question as soon as the page loads.
renderQuestion();

// Initialize interactive front-page meter if present
(function initFrontWheel(){
    const meter = document.querySelector('.meter');
    if (!meter) return;
    const strong = meter.querySelector('strong');
    if (!strong) return;

    function setMeterScore(v) {
        const s = Math.max(0, Math.min(100, Math.round(v)));
        strong.textContent = s;
        const status = getStatus(s);
        meter.style.background = `conic-gradient(${status.color} 0 ${s}%, #e7eeee ${s}% 100%)`;
        meter.setAttribute('aria-label', `Pressure score ${s} percent`);
    }

    // Initialize from current text
    setMeterScore(Number(strong.textContent) || 0);
    meter.style.cursor = 'pointer';

    let dragging = false;

    function pointerToScore(clientX, clientY) {
        const r = meter.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const angle = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI; // -180..180
        const percent = ((angle + 90 + 360) % 360) / 360; // 0 at top
        return percent * 100;
    }

    meter.addEventListener('pointerdown', (e) => {
        dragging = true;
        meter.setPointerCapture(e.pointerId);
        setMeterScore(pointerToScore(e.clientX, e.clientY));
    });
    meter.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        setMeterScore(pointerToScore(e.clientX, e.clientY));
    });
    meter.addEventListener('pointerup', (e) => {
        dragging = false;
        try { meter.releasePointerCapture(e.pointerId); } catch (er) {}
    });
    meter.addEventListener('pointercancel', () => { dragging = false; });
    meter.addEventListener('mouseleave', () => { dragging = false; });
})();
