import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { Task, UserSettings, Session } from '../shared/types';

const dataPath = path.join(app.getPath('userData'), 'focusvault-data.json');
const backupPath = path.join(app.getPath('userData'), 'focusvault-backup.json');

const defaultSettings: UserSettings = {
  theme: 'dark', pomodoroWork: 25, pomodoroShortBreak: 5, pomodoroLongBreak: 15, autoBackup: true
};

function loadData() {
  if (!fs.existsSync(dataPath)) {
    return { tasks: [], settings: defaultSettings, sessions: [] }; 
  }
  try {
    const raw = fs.readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.settings) parsed.settings = defaultSettings;
    if (!parsed.sessions) parsed.sessions = [];
    return parsed;
  } catch (e) {
    console.error("Corrupted JSON file, attempting to load backup...");
    if (fs.existsSync(backupPath)) {
      try { return JSON.parse(fs.readFileSync(backupPath, 'utf-8')); } catch(err) {}
    }
    return { tasks: [], settings: defaultSettings, sessions: [] }; 
  }
}

function saveData(data: any) {
  // Auto-backup before saving new data
  if (fs.existsSync(dataPath)) {
    fs.copyFileSync(dataPath, backupPath);
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getTasks(): Task[] { return loadData().tasks || []; }
export function saveTasks(tasks: Task[]) { const d = loadData(); d.tasks = tasks; saveData(d); }
export function getSettings(): UserSettings { return loadData().settings; }
export function saveSettings(settings: UserSettings) { const d = loadData(); d.settings = settings; saveData(d); }

export function saveSession(session: Session) {
  const d = loadData();
  d.sessions.push(session);
  saveData(d);
}

export function getSessions(): Session[] {
  return loadData().sessions || [];
}

export function resetAllData() {
  saveData({ tasks: [], settings: defaultSettings, sessions: [] });
}
