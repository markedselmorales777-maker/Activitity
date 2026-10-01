const STUDENT = "Mark Morales";

const TASKS = [
  {
    title: "Say hello",
    desc: "Use print() to show the text Hello, World! on the console.",
    hint: "print(\"...\") shows text.",
    starter: "# Write your code below\n",
    check: out => out.trim() === "Hello, World!"
  },
  {
    title: "Use a variable",
    desc: "Create a variable called name that holds \"Mark\", then print Welcome, Mark using that variable.",
    hint: "Join text with +  or use an f-string.",
    starter: "name = \n",
    check: (out, code) => out.trim() === "Welcome, Mark" && /name\s*=/.test(code)
  },
  {
    title: "Count to five",
    desc: "Use a for loop to print the numbers 1 to 5, each on its own line.",
    hint: "range(1, 6) gives 1 through 5.",
    starter: "for i in \n",
    check: out => out.trim().split(/\r?\n/).map(s => s.trim()).join(",") === "1,2,3,4,5"
  }
];

let current = 0;
let pyodide = null;
let editor = null;
const saved = TASKS.map(t => t.starter);
const done = TASKS.map(() => false);

const $ = id => document.getElementById(id);

/* ---------- Task UI ---------- */
function renderSteps() {
  $("steps").innerHTML = TASKS.map((_, i) =>
    `<span class="step ${i === current ? "active" : ""} ${done[i] ? "done" : ""}">${i + 1}</span>`
  ).join("");
}

function loadTask(i) {
  current = i;
  const t = TASKS[i];
  $("task-count").textContent = `Task ${i + 1} of ${TASKS.length}`;
  $("task-title").textContent = t.title;
  $("task-desc").textContent = t.desc;
  $("task-hint").textContent = "Hint: " + t.hint;
  $("console").textContent = "Output appears here.";
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("next").hidden = true;
  setCode(saved[i]);
  renderSteps();
}

function getCode() { return editor ? editor.getValue() : $("fallback").value; }
function setCode(v) { editor ? editor.setValue(v) : ($("fallback").value = v); }

/* ---------- Editor ---------- */
function startEditor() {
  const fallback = () => {
    $("editor").innerHTML = '<textarea id="fallback" spellcheck="false"></textarea>';
    loadTask(current);
  };
  if (typeof require === "undefined") return fallback();
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
  require(["vs/editor/editor.main"], () => {
    editor = monaco.editor.create($("editor"), {
      value: TASKS[0].starter, language: "python", theme: "vs",
      fontSize: 15, minimap: { enabled: false }, automaticLayout: true
    });
    loadTask(current);
  }, fallback);
}

/* ---------- Python ---------- */
async function startPython() {
  try {
    pyodide = await loadPyodide();
    $("status").textContent = "Python ready";
    $("run").disabled = false;
  } catch (e) {
    $("status").textContent = "Python failed to load. Check your internet connection.";
  }
}

async function runAndCheck() {
  if (!pyodide) return;
  const code = getCode();
  saved[current] = code;
  let out = "";
  pyodide.setStdout({ batched: s => (out += s + "\n") });
  pyodide.setStderr({ batched: s => (out += s + "\n") });
  $("run").disabled = true;
  try {
    await pyodide.runPythonAsync(code);
  } catch (e) {
    out += String(e.message || e).split("\n").slice(-3).join("\n");
    show(out, "Your code has an error. Read the message above and try again.", false);
    return;
  }
  const ok = TASKS[current].check(out, code);
  show(out, ok ? "Correct. Task complete." : "The output is not what the task asks for. Try again.", ok);
  if (ok) {
    done[current] = true;
    renderSteps();
    if (current < TASKS.length - 1) {
      $("next").hidden = false;
    } else {
      setTimeout(() => ($("passed").hidden = false), 700);
    }
  }
}

function show(out, msg, ok) {
  $("console").textContent = out || "(no output)";
  $("feedback").textContent = msg;
  $("feedback").className = "feedback " + (ok ? "ok" : "bad");
  $("run").disabled = false;
}

/* ---------- Splitter ---------- */
(function () {
  const bar = $("splitter"), left = document.querySelector(".editor-pane"), box = $("workspace");
  let drag = false;
  bar.addEventListener("pointerdown", e => { drag = true; bar.setPointerCapture(e.pointerId); });
  bar.addEventListener("pointerup", () => (drag = false));
  bar.addEventListener("pointermove", e => {
    if (!drag) return;
    const r = box.getBoundingClientRect();
    const pct = Math.min(80, Math.max(25, ((e.clientX - r.left) / r.width) * 100));
    left.style.width = pct + "%";
  });
})();

/* ---------- Song screen ---------- */
const audio = $("audio");

/* ---------- Wiring ---------- */
$("run").addEventListener("click", runAndCheck);
$("next").addEventListener("click", () => loadTask(current + 1));
$("to-song").addEventListener("click", () => {
  $("passed").hidden = true;
  $("song").hidden = false;
  audio.currentTime = 0;
  audio.play().catch(() => {});
});
document.querySelector(".card h1").textContent = `Congratulations, ${STUDENT}`;

renderSteps();
startEditor();
startPython();