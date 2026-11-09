import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'node:path';
import fs from 'node:fs';
import { getTasks, saveTasks, getSettings, saveSettings, saveSession, getSessions, resetAllData } from './store';
import { Task, UserSettings, Session } from '../shared/types';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, title: "FocusVault", backgroundColor: "#1e1e24",
    webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('app:ping', () => 'Pong! The backend is securely connected.');
ipcMain.handle('tasks:get', () => getTasks());
ipcMain.handle('tasks:save', (_e, tasks: Task[]) => { saveTasks(tasks); return true; });
ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:save', (_e, settings: UserSettings) => { saveSettings(settings); return true; });
ipcMain.handle('sessions:save', (_e, session: Session) => { saveSession(session); return true; });
ipcMain.handle('sessions:get', () => getSessions());

// CSV EXPORT HANDLER
ipcMain.handle('data:export-csv', async (_event, type: 'tasks' | 'sessions') => {
  if (!mainWindow) return { success: false, message: 'Window not found.' };

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export CSV',
    defaultPath: `focusvault-${type}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (canceled || !filePath) return { success: false, message: 'Export cancelled.' };

  try {
    const data = type === 'tasks' ? getTasks() : getSessions();
    const headers = type === 'tasks' 
      ? ['id', 'title', 'category', 'priority', 'status', 'createdAt', 'deadline', 'completedAt']
      : ['id', 'taskId', 'startTime', 'endTime', 'durationMinutes'];

    const escape = (val: any) => {
      const str = String(val ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n') 
        ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => escape((row as any)[h])).join(','))
    ].join('\n');

    fs.writeFileSync(filePath, csvContent, 'utf-8');
    return { success: true, message: 'File exported successfully!' };
  } catch (err) {
    return { success: false, message: 'Failed to write file.' };
  }
});

ipcMain.handle('data:reset', () => {
  resetAllData();
  return true;
});
