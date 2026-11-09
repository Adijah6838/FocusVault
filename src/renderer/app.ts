import { Task, TaskPriority, UserSettings, Session } from '../shared/types';

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      getTasks: () => Promise<Task[]>;
      saveTasks: (tasks: Task[]) => Promise<boolean>;
      getSettings: () => Promise<UserSettings>;
      saveSettings: (settings: UserSettings) => Promise<boolean>;
      saveSession: (session: Session) => Promise<boolean>;
      getSessions: () => Promise<Session[]>;
      exportData: (type: 'tasks' | 'sessions') => Promise<{success: boolean, message: string}>;
      resetData: () => Promise<boolean>;
    }
  }
}

let tasks: Task[] = [];
let currentSettings: UserSettings;
let timeLeft = 25 * 60;
let timerInterval: number | null = null;
let sessionStartTime: Date | null = null;

const statusDiv = document.getElementById('status-message') as HTMLElement;
const taskForm = document.getElementById('task-form') as HTMLFormElement;
const taskList = document.getElementById('task-list') as HTMLElement;
const timerDisplay = document.getElementById('timer-display') as HTMLElement;
const historyList = document.getElementById('history-list') as HTMLElement;
const timerTaskSelect = document.getElementById('timer-task-select') as HTMLSelectElement;

document.addEventListener('DOMContentLoaded', async () => {
  
  // --- 1. HOOK UP RESET BUTTON FIRST (BEFORE ANYTHING CAN CRASH) ---
  const btnResetData = document.getElementById('btn-reset-data') as HTMLButtonElement;
  if (btnResetData) {
    btnResetData.addEventListener('click', async () => {
      const confirmReset = window.confirm("Are you sure you want to reset ALL data? This cannot be undone.");
      if (confirmReset) {
        try {
          await window.api.resetData();
          alert("All data has been reset.");
          window.location.reload();
        } catch (err) {
          alert("Error resetting data.");
        }
      }
    });
  }

  // --- 2. LOAD DATA ---
  try {
    const response = await window.api.ping();
    statusDiv.innerHTML = `✅ ${response}`;
    statusDiv.style.color = '#4caf50';
    currentSettings = await window.api.getSettings();
    timeLeft = currentSettings.pomodoroWork * 60;
    updateTimerDisplay();
    await loadTasks();
  } catch (error) {
    statusDiv.innerHTML = `❌ Error: Could not connect to backend.`;
    statusDiv.style.color = '#f44336';
  }
  
  // --- 3. SETUP UI ---
  setupNavigation();
  setupTimer();
  setupSettings();
});

// --- NAVIGATION ---
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const views = document.querySelectorAll('.view');
  navLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).dataset.target;
      navLinks.forEach(l => l.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      (e.target as HTMLElement).classList.add('active');
      document.getElementById(`view-${target}`)?.classList.add('active');
      
      if (target === 'history') await loadHistory();
      if (target === 'analytics') await loadAnalytics();
    });
  });
}

// --- ANALYTICS ---
async function loadAnalytics() {
  const sessions = await window.api.getSessions();
  
  const weeklyChart = document.getElementById('weekly-chart')!;
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const dailyMinutes: Record<string, number> = {};
  last7Days.forEach(day => dailyMinutes[day] = 0);

  sessions.forEach(s => {
    const dayStr = new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short' });
    if (dailyMinutes[dayStr] !== undefined) {
      dailyMinutes[dayStr] += s.durationMinutes;
    }
  });

  const maxMins = Math.max(...Object.values(dailyMinutes), 1); 
  weeklyChart.innerHTML = '';

  last7Days.forEach(day => {
    const mins = dailyMinutes[day];
    const heightPct = (mins / maxMins) * 100;
    const wrapper = document.createElement('div');
    wrapper.className = 'bar-wrapper';
    wrapper.innerHTML = `
      <div class="bar" style="height: ${heightPct}%" title="${mins} mins"></div>
      <span class="bar-label">${day}</span>
    `;
    weeklyChart.appendChild(wrapper);
  });

  const categoryChart = document.getElementById('category-chart')!;
  const categoryMinutes: Record<string, number> = {};

  sessions.forEach(s => {
    const task = tasks.find(t => t.id === s.taskId);
    const cat = task ? task.category : 'General';
    categoryMinutes[cat] = (categoryMinutes[cat] || 0) + s.durationMinutes;
  });

  const totalMins = Object.values(categoryMinutes).reduce((a, b) => a + b, 0);
  categoryChart.innerHTML = '';

  if (totalMins === 0) {
    categoryChart.innerHTML = '<p class="empty-state">No session data yet.</p>';
    return;
  }

  Object.entries(categoryMinutes).sort((a,b) => b[1] - a[1]).forEach(([cat, mins]) => {
    const pct = (mins / totalMins) * 100;
    const row = document.createElement('div');
    row.className = 'category-row';
    row.innerHTML = `
      <div class="category-info"><span>${cat}</span> <span>${mins} mins</span></div>
      <div class="category-bar-bg">
        <div class="category-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    categoryChart.appendChild(row);
  });
}

// --- HISTORY ---
async function loadHistory() {
  const sessions = await window.api.getSessions();
  if (sessions.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No sessions completed yet.</p>';
    return;
  }
  historyList.innerHTML = '';
  sessions.slice().reverse().forEach(session => {
    const date = new Date(session.startTime).toLocaleString();
    const task = tasks.find(t => t.id === session.taskId);
    const taskTitle = task ? task.title : 'General Focus';
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <div class="task-info">
        <h4>${taskTitle}</h4>
        <div class="task-meta">
          <span>🕒 ${date}</span>
          <span>⏱️ ${session.durationMinutes} mins</span>
        </div>
      </div>
    `;
    historyList.appendChild(div);
  });
}

// --- TIMER ---
function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  timerDisplay.innerText = `${m}:${s}`;
}

function setupTimer() {
  const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
  const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

  btnStart.addEventListener('click', () => {
    if (timerInterval) return;
    if (timeLeft === currentSettings.pomodoroWork * 60) {
      sessionStartTime = new Date();
    }
    btnStart.style.display = 'none';
    btnPause.style.display = 'block';
    
    timerInterval = window.setInterval(async () => {
      if (timeLeft > 0) { 
        timeLeft--; 
        updateTimerDisplay(); 
      } 
      else { 
        clearInterval(timerInterval!); 
        timerInterval = null; 
        if (sessionStartTime) {
          const selectedTaskId = timerTaskSelect.value;
          await window.api.saveSession({
            id: crypto.randomUUID(),
            taskId: selectedTaskId ? selectedTaskId : null,
            startTime: sessionStartTime.toISOString(),
            endTime: new Date().toISOString(),
            durationMinutes: currentSettings.pomodoroWork
          });
          sessionStartTime = null;
          alert("Great job! Focus session saved.");
        }
        btnPause.style.display = 'none';
        btnStart.style.display = 'block';
        timeLeft = currentSettings.pomodoroWork * 60;
        updateTimerDisplay();
      }
    }, 1000);
  });

  btnPause.addEventListener('click', () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    btnPause.style.display = 'none';
    btnStart.style.display = 'block';
  });

  btnReset.addEventListener('click', () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    sessionStartTime = null;
    timeLeft = currentSettings.pomodoroWork * 60;
    updateTimerDisplay();
    btnPause.style.display = 'none';
    btnStart.style.display = 'block';
  });
}

// --- SETTINGS & EXPORT ---
function setupSettings() {
  const setWork = document.getElementById('set-work') as HTMLInputElement;
  const setShort = document.getElementById('set-short') as HTMLInputElement;
  const btnSave = document.getElementById('btn-save-settings') as HTMLButtonElement;
  const saveStatus = document.getElementById('save-status') as HTMLElement;
  
  const btnExportTasks = document.getElementById('btn-export-tasks') as HTMLButtonElement;
  const btnExportSessions = document.getElementById('btn-export-sessions') as HTMLButtonElement;

  if (!setWork || !setShort) return;

  setWork.value = currentSettings.pomodoroWork.toString();
  setShort.value = currentSettings.pomodoroShortBreak.toString();

  btnSave.addEventListener('click', async () => {
    currentSettings.pomodoroWork = parseInt(setWork.value);
    currentSettings.pomodoroShortBreak = parseInt(setShort.value);
    await window.api.saveSettings(currentSettings);
    timeLeft = currentSettings.pomodoroWork * 60;
    updateTimerDisplay();
    saveStatus.style.display = 'inline';
    setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
  });

  btnExportTasks.addEventListener('click', async () => {
    try {
      const res = await window.api.exportData('tasks');
      alert(res.message);
    } catch (e) { alert("Error exporting tasks."); }
  });

  btnExportSessions.addEventListener('click', async () => {
    try {
      const res = await window.api.exportData('sessions');
      alert(res.message);
    } catch (e) { alert("Error exporting sessions."); }
  });
}

// --- TASKS ---
async function loadTasks() {
  tasks = await window.api.getTasks();
  renderTasks();
}

async function saveData() {
  await window.api.saveTasks(tasks);
  renderTasks();
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = (document.getElementById('task-title') as HTMLInputElement).value;
  const category = (document.getElementById('task-category') as HTMLInputElement).value;
  const priority = (document.getElementById('task-priority') as HTMLSelectElement).value as TaskPriority;
  const deadline = (document.getElementById('task-deadline') as HTMLInputElement).value;

  const newTask: Task = {
    id: crypto.randomUUID(), title, description: '', category, priority, 
    status: 'Pending', createdAt: new Date().toISOString(), deadline, completedAt: null
  };

  tasks.push(newTask);
  await saveData();
  taskForm.reset();
});

async function deleteTask(id: string) {
  const confirm = window.confirm("Are you sure you want to delete this task?");
  if (confirm) {
    tasks = tasks.filter(t => t.id !== id);
    await saveData();
  }
}

async function updateTaskStatus(id: string, newStatus: Task['status']) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    task.completedAt = newStatus === 'Completed' ? new Date().toISOString() : null;
    await saveData();
  }
}

function renderTasks() {
  document.getElementById('stat-total')!.innerText = tasks.length.toString();
  document.getElementById('stat-pending')!.innerText = tasks.filter(t => t.status === 'Pending').length.toString();
  document.getElementById('stat-inprogress')!.innerText = tasks.filter(t => t.status === 'In Progress').length.toString();
  document.getElementById('stat-completed')!.innerText = tasks.filter(t => t.status === 'Completed').length.toString();

  const currentSelection = timerTaskSelect.value;
  timerTaskSelect.innerHTML = '<option value="">General Focus (No Task)</option>';
  tasks.filter(t => t.status !== 'Completed').forEach(task => {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.innerText = `${task.title} (${task.category})`;
    timerTaskSelect.appendChild(opt);
  });
  if (currentSelection) timerTaskSelect.value = currentSelection;

  if (tasks.length === 0) {
    taskList.innerHTML = '<p class="empty-state">No tasks yet. Create one above!</p>';
    return;
  }

  taskList.innerHTML = '';
  tasks.forEach(task => {
    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <div class="task-info">
        <h4>${task.title}</h4>
        <div class="task-meta">
          <span>📁 ${task.category}</span>
          <span>🔥 ${task.priority}</span>
          <span>📅 ${task.deadline}</span>
        </div>
      </div>
      <div class="task-actions">
        <select class="status-select" data-id="${task.id}">
          <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${task.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
        <button class="btn-delete" data-id="${task.id}">Delete</button>
      </div>
    `;

    div.querySelector('.btn-delete')?.addEventListener('click', () => deleteTask(task.id));
    const select = div.querySelector('.status-select') as HTMLSelectElement;
    select.addEventListener('change', () => updateTaskStatus(task.id, select.value as Task['status']));
    taskList.appendChild(div);
  });
}
