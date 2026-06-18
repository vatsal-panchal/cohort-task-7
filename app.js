const STORAGE_KEY = "domExplorerTasks_v2";
const THEME_KEY = "domExplorerTheme_v2";

let tasks = loadTasks();
let selectedId = null;

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { 
    return []; 
  }
}

const saveTasks = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
const generateId = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskCategorySelect = document.getElementById("taskCategory");
const formError = document.getElementById("formError");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const listCount = document.getElementById("listCount");
const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const filterStatus = document.getElementById("filterStatus");
const clearAllBtn = document.getElementById("clearAllBtn");
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statCompleted = document.getElementById("statCompleted");
const statCategories = document.getElementById("statCategories");

const railLinks = document.querySelectorAll(".rail-link");
const views = document.querySelectorAll(".view");

railLinks.forEach(link => {
  link.addEventListener("click", () => {
    railLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    const target = link.getAttribute("data-view");
    views.forEach(v => v.classList.toggle("active", v.id === `view-${target}`));
  });
});

const lightBtn = document.getElementById("lightBtn");
const darkBtn = document.getElementById("darkBtn");
const themeAttrEcho = document.getElementById("themeAttrEcho");
const root = document.documentElement;

const applyTheme = theme => {
  root.setAttribute("data-theme", theme);
  root.dataset.theme = theme;
  document.body.classList.toggle("is-dark", theme === "dark");
  lightBtn.classList.toggle("active", theme === "light");
  darkBtn.classList.toggle("active", theme === "dark");
  lightBtn.setAttribute("aria-checked", theme === "light");
  darkBtn.setAttribute("aria-checked", theme === "dark");
  themeAttrEcho.textContent = `data-theme="${theme}"`;
  localStorage.setItem(THEME_KEY, theme);
};

lightBtn.addEventListener("click", () => applyTheme("light"));
darkBtn.addEventListener("click", () => applyTheme("dark"));

const initTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "dark" ? "dark" : "light");
};

const buildTaskCard = task => {
  const li = document.createElement("li");
  li.className = "task-card";
  if (task.id === selectedId) li.classList.add("selected");

  li.setAttribute("data-id", task.id);
  li.setAttribute("data-status", task.status);
  li.setAttribute("data-category", task.category);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.status === "completed";
  checkbox.setAttribute("data-action", "toggle");
  checkbox.setAttribute("aria-label", "Mark task complete");

  const main = document.createElement("div");
  main.className = "task-main";
  main.setAttribute("data-action", "inspect");

  const title = document.createElement("p");
  title.className = "task-title";
  title.appendChild(document.createTextNode(task.title));

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "badge";
  categoryBadge.appendChild(document.createTextNode(capitalize(task.category)));

  const statusBadge = document.createElement("span");
  statusBadge.className = `badge status-${task.status}`;
  statusBadge.appendChild(document.createTextNode(capitalize(task.status)));

  meta.append(categoryBadge, statusBadge);
  main.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const editBtn = iconButton("edit", editIconSVG());
  const deleteBtn = iconButton("delete", deleteIconSVG());
  deleteBtn.classList.add("danger");
  actions.append(editBtn, deleteBtn);

  li.append(checkbox, main, actions);
  return li;
};

const iconButton = (action, svgMarkup) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn";
  btn.setAttribute("data-action", action);
  btn.setAttribute("aria-label", `${capitalize(action)} task`);
  btn.innerHTML = svgMarkup;
  return btn;
};

const editIconSVG = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const deleteIconSVG = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';

const render = () => {
  const query = searchInput.value.trim().toLowerCase();
  const catFilter = filterCategory.value;
  const statusFilter = filterStatus.value;

  const visible = tasks.filter(t => {
    const matchesQuery = t.title.toLowerCase().includes(query);
    const matchesCat = catFilter === "all" || t.category === catFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesQuery && matchesCat && matchesStatus;
  });

  taskList.replaceChildren();

  if (visible.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    const fragment = document.createDocumentFragment();
    visible.forEach(task => fragment.appendChild(buildTaskCard(task)));
    taskList.appendChild(fragment);
  }

  listCount.textContent = `${visible.length} ${visible.length === 1 ? "task" : "tasks"}`;
  updateStats();
  refreshInspector();
  refreshAttrView();
};

const updateStats = () => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const pending = total - completed;
  const categories = new Set(tasks.map(t => t.category)).size;
  statTotal.textContent = total;
  statPending.textContent = pending;
  statCompleted.textContent = completed;
  statCategories.textContent = categories;
};

taskForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) {
    formError.classList.add("show");
    taskTitleInput.focus();
    return;
  }
  formError.classList.remove("show");

  const newTask = { id: generateId(), title, category: taskCategorySelect.value, status: "pending" };
  tasks.push(newTask);
  saveTasks();
  selectedId = newTask.id;
  render();
  taskTitleInput.value = "";
  taskTitleInput.focus();
});

taskTitleInput.addEventListener("input", () => {
  if (formError.classList.contains("show") && taskTitleInput.value.trim()) formError.classList.remove("show");
});

taskList.addEventListener("click", e => {
  const card = e.target.closest(".task-card");
  if (!card) return;
  const id = card.getAttribute("data-id");
  const actionEl = e.target.closest("[data-action]");
  const action = actionEl ? actionEl.getAttribute("data-action") : null;

  if (action === "delete") removeTask(id, card);
  else if (action === "edit") enterEditMode(card, id);
  else if (action === "inspect") { selectedId = id; render(); }
});

taskList.addEventListener("change", e => {
  if (e.target.matches('input[type="checkbox"][data-action="toggle"]')) {
    const card = e.target.closest(".task-card");
    toggleComplete(card.getAttribute("data-id"));
  }
});

const toggleComplete = id => {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === "completed" ? "pending" : "completed";
  saveTasks();
  render();
};

const removeTask = (id, card) => {
  tasks = tasks.filter(t => t.id !== id);
  if (selectedId === id) selectedId = null;
  saveTasks();
  if (card && card.remove) card.remove();
  render();
};

const enterEditMode = (card, id) => {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const titleEl = card.querySelector(".task-title");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "task-edit-input";
  input.value = task.title;

  titleEl.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const commit = () => {
    const newTitle = input.value.trim() || task.title;
    task.title = newTitle;
    saveTasks();
    render();
  };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") render();
  });
  input.addEventListener("blur", commit);
};

searchInput.addEventListener("input", render);
filterCategory.addEventListener("change", render);
filterStatus.addEventListener("change", render);

clearAllBtn.addEventListener("click", () => {
  if (tasks.length === 0) return;
  if (!confirm("Delete all tasks? This can't be undone.")) return;
  tasks = [];
  selectedId = null;
  saveTasks();
  render();
});

const inspectorEmpty = document.getElementById("inspectorEmpty");
const inspectorNode = document.getElementById("inspectorNode");
const inspectorPill = document.getElementById("inspectorPill");

const refreshInspector = () => {
  const el = taskList.querySelector(`.task-card[data-id="${selectedId}"]`);
  if (!el) {
    inspectorEmpty.style.display = "block";
    inspectorNode.style.display = "none";
    inspectorPill.textContent = "no selection";
    return;
  }
  inspectorEmpty.style.display = "none";
  inspectorNode.style.display = "block";
  inspectorPill.textContent = `#${el.getAttribute("data-id").slice(-6)}`;

  document.getElementById("nodeTag").textContent = el.tagName.toLowerCase();
  document.getElementById("nodeClass").textContent = el.className;

  document.getElementById("attrId").textContent = el.getAttribute("data-id");
  setStatusVal("attrStatus", el.getAttribute("data-status"));
  document.getElementById("attrCategory").textContent = el.getAttribute("data-category") || "(removed)";

  document.getElementById("dsId").textContent = el.dataset.id;
  setStatusVal("dsStatus", el.dataset.status);
  document.getElementById("dsCategory").textContent = el.dataset.category || "(removed)";
};

const setStatusVal = (elId, value) => {
  const node = document.getElementById(elId);
  node.textContent = value;
  node.classList.remove("ok", "pending");
  node.classList.add(value === "completed" ? "ok" : "pending");
};

const attrTableBody = document.getElementById("attrTableBody");
const attrConsole = document.getElementById("attrConsole");
const btnHasAttr = document.getElementById("btnHasAttr");
const btnRemoveAttr = document.getElementById("btnRemoveAttr");
const btnRestoreAttr = document.getElementById("btnRestoreAttr");

const getSelectedEl = () => selectedId ? taskList.querySelector(`.task-card[data-id="${selectedId}"]`) : null;

const refreshAttrView = () => {
  const el = getSelectedEl();
  attrTableBody.replaceChildren();

  if (!el) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "desc";
    td.appendChild(document.createTextNode("Select a task from the Tasks view to inspect it."));
    tr.appendChild(td);
    attrTableBody.appendChild(tr);
    return;
  }

  const rows = [
    ["data-id", "getAttribute('data-id')", el.getAttribute("data-id")],
    ["data-status", "dataset.status", el.dataset.status],
    ["data-category", "getAttribute('data-category')", el.getAttribute("data-category") || "null (removed)"]
  ];

  rows.forEach(r => {
    const tr = document.createElement("tr");
    [r[0], r[1], r[2]].forEach((val, i) => {
      const td = document.createElement("td");
      if (i === 0) { 
        td.appendChild(document.createTextNode(val)); 
      } else { 
        const code = document.createElement("code"); 
        code.appendChild(document.createTextNode(String(val))); 
        td.appendChild(code); 
      }
      tr.appendChild(td);
    });
    attrTableBody.appendChild(tr);
  });
};

const logAttr = message => {
  const line = document.createElement("div");
  line.className = "line";
  line.appendChild(document.createTextNode(message));
  attrConsole.appendChild(line);
  attrConsole.scrollTop = attrConsole.scrollHeight;
  while (attrConsole.children.length > 8) attrConsole.removeChild(attrConsole.firstChild);
};

btnHasAttr.addEventListener("click", () => {
  const el = getSelectedEl();
  if (!el) { logAttr("No task selected."); return; }
  logAttr(`hasAttribute('data-status') → ${el.hasAttribute("data-status")}`);
});

btnRemoveAttr.addEventListener("click", () => {
  const el = getSelectedEl();
  if (!el) { logAttr("No task selected."); return; }
  el.removeAttribute("data-category");
  logAttr(`removeAttribute('data-category') called. hasAttribute now → ${el.hasAttribute("data-category")}`);
  refreshAttrView();
  refreshInspector();
});

btnRestoreAttr.addEventListener("click", () => {
  const el = getSelectedEl();
  if (!el) { logAttr("No task selected."); return; }
  const task = tasks.find(t => t.id === selectedId);
  el.setAttribute("data-category", task ? task.category : "work");
  logAttr(`setAttribute('data-category', '${task ? task.category : "work"}') restored.`);
  refreshAttrView();
  refreshInspector();
});

const propConsole = document.getElementById("propConsole");
const grandparentLayer = document.getElementById("grandparentLayer");
const parentLayer = document.getElementById("parentLayer");
const childBtn = document.getElementById("childBtn");
const bubbleBtn = document.getElementById("bubbleBtn");
const captureBtn = document.getElementById("captureBtn");
const clearLogBtn = document.getElementById("clearLogBtn");

let propMode = null;

const logProp = message => {
  const line = document.createElement("div");
  line.className = "line";
  line.appendChild(document.createTextNode(message));
  propConsole.appendChild(line);
  propConsole.scrollTop = propConsole.scrollHeight;
};

const clearPropConsole = () => propConsole.replaceChildren();

bubbleBtn.addEventListener("click", () => {
  propMode = "bubble";
  clearPropConsole();
  logProp('Mode: bubbling — click "Child Button" to see Child → Parent → Grandparent.');
});

captureBtn.addEventListener("click", () => {
  propMode = "capture";
  clearPropConsole();
  logProp('Mode: capturing — click "Child Button" to see Grandparent → Parent → Child.');
});

clearLogBtn.addEventListener("click", () => {
  propMode = null;
  clearPropConsole();
  logProp("Console cleared.");
});

childBtn.addEventListener("click", () => { if (propMode === "bubble") logProp("Bubbling → Child Button"); }, false);
parentLayer.addEventListener("click", () => { if (propMode === "bubble") logProp("Bubbling → Parent"); }, false);
grandparentLayer.addEventListener("click", () => { if (propMode === "bubble") logProp("Bubbling → Grandparent"); }, false);

grandparentLayer.addEventListener("click", () => { if (propMode === "capture") logProp("Capturing → Grandparent"); }, true);
parentLayer.addEventListener("click", () => { if (propMode === "capture") logProp("Capturing → Parent"); }, true);
childBtn.addEventListener("click", () => { if (propMode === "capture") logProp("Capturing → Child Button"); }, true);

initTheme();
render();