import { contextBridge, ipcRenderer } from 'electron';
import { Task, UserSettings, Session } from '../shared/types';

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('app:ping'),
  getTasks: (): Promise<Task[]> => ipcRenderer.invoke('tasks:get'),
  saveTasks: (tasks: Task[]) => ipcRenderer.invoke('tasks:save', tasks),
  getSettings: (): Promise<UserSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: UserSettings) => ipcRenderer.invoke('settings:save', settings),
  saveSession: (session: Session) => ipcRenderer.invoke('sessions:save', session),
  getSessions: (): Promise<Session[]> => ipcRenderer.invoke('sessions:get'),
  exportData: (type: 'tasks' | 'sessions'): Promise<{success: boolean, message: string}> => ipcRenderer.invoke('data:export-csv', type),
  resetData: () => ipcRenderer.invoke('data:reset')
});
