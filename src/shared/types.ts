export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  deadline: string;
  completedAt: string | null;
}

export interface Session {
  id: string;
  taskId: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  pomodoroWork: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  autoBackup: boolean;
}

export interface DashboardStatistics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalProductiveTime: number;
}