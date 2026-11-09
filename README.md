# FocusVault - Offline Productivity and Workload Intelligence Desktop Application

FocusVault is a lightweight, completely offline desktop application built to help users organize daily activities, monitor working sessions, track completed tasks, and analyze productivity. 

## Features
- **Task Management:** Create, edit, delete, and track tasks (Pending, In Progress, Completed) with deadlines and priority levels.
- **Focus Timer:** A fully integrated Pomodoro timer that links sessions to specific tasks and tracks your focus time.
- **Analytics Dashboard:** Visual charts showing focus hours over the last 7 days and time spent by task category.
- **Local Data Persistence:** Data is securely stored in JSON format in your local AppData folder. Includes auto-backup and corrupted-file recovery.
- **CSV Export:** Export your Tasks and Sessions to CSV files using native OS dialogs.
- **Settings:** Customize Pomodoro durations and manage application data.

## Technology Stack
- **Electron.js** (Desktop Runtime)
- **TypeScript** (Strongly-typed logic)
- **Node.js** (Backend/File System)
- **HTML5 / CSS3 / Vanilla JS** (Frontend Interface)
- **esbuild** (Bundler)

## Getting Started

### Prerequisites
You need [Node.js](https://nodejs.org/) installed on your computer.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Adijah6838/FocusVault.git