# MacCleaner 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款 macOS 磁盘清理 Electron APP，覆盖包管理器缓存清理、Docker 清理、APP 卸载、隐藏目录管理等，支持菜单栏快速操作和完整窗口深度管理。

**Architecture:** Electron 主进程负责文件扫描/命令执行/定时任务，通过 IPC 与 React 渲染进程通信。前端用 Zustand 管理状态，Tailwind CSS 样式。菜单栏和主窗口共享同一状态层。

**Tech Stack:** Electron + TypeScript + React + Vite + Tailwind CSS + Zustand + electron-builder

---

## 文件结构总览

```
cleaner/
├── package.json                          # 项目配置（创建）
├── tsconfig.json                         # TypeScript 配置（创建）
├── tsconfig.node.json                    # Node.js TS 配置（创建）
├── vite.config.ts                        # Vite 配置（创建）
├── electron-builder.json                 # 打包配置（创建）
├── electron/
│   ├── main.ts                           # Electron 入口（创建）
│   ├── preload.ts                        # 预加载脚本（创建）
│   ├── ipc/
│   │   ├── scan.ts                       # 扫描 IPC handler（创建）
│   │   ├── clean.ts                      # 清理 IPC handler（创建）
│   │   ├── uninstall.ts                  # 卸载 IPC handler（创建）
│   │   └── schedule.ts                   # 定时任务 IPC handler（创建）
│   ├── services/
│   │   ├── scanner.ts                    # 核心扫描引擎（创建）
│   │   ├── cleaner.ts                    # 核心清理引擎（创建）
│   │   ├── uninstaller.ts                # 核心卸载引擎（创建）
│   │   └── scheduler.ts                  # 定时调度器（创建）
│   └── data/
│       └── known-hidden-dirs.json        # 已知隐藏目录字典（创建）
├── src/
│   ├── main.tsx                          # React 入口（创建）
│   ├── index.css                         # 全局样式（创建）
│   ├── App.tsx                           # 根组件（创建）
│   ├── components/
│   │   ├── Sidebar.tsx                   # 左侧导航（创建）
│   │   ├── ModuleView.tsx                # 模块通用容器（创建）
│   │   └── SettingsView.tsx              # 设置页（创建）
│   ├── modules/
│   │   ├── Dashboard.tsx                 # 仪表盘（创建）
│   │   ├── BrewModule.tsx                # Brew 清理模块（创建）
│   │   ├── DockerModule.tsx              # Docker 清理模块（创建）
│   │   ├── NpmModule.tsx                 # npm/Node 模块（创建）
│   │   ├── CondaModule.tsx               # Conda/Python 模块（创建）
│   │   ├── SystemCacheModule.tsx         # 系统缓存模块（创建）
│   │   ├── CliToolsModule.tsx            # CLI 工具模块（创建）
│   │   └── DownloadsModule.tsx           # Downloads 模块（创建）
│   ├── features/
│   │   ├── UninstallApps.tsx             # APP 卸载页（创建）
│   │   ├── UninstallCli.tsx              # CLI 卸载页（创建）
│   │   ├── ResidualCleaner.tsx           # 残留清理页（创建）
│   │   └── AiAnalyzer.tsx                # AI 分析组件（创建）
│   ├── hooks/
│   │   ├── useScan.ts                    # 扫描 hook（创建）
│   │   └── useClean.ts                   # 清理 hook（创建）
│   ├── store/
│   │   └── index.ts                      # Zustand 状态管理（创建）
│   ├── lib/
│   │   ├── ipc.ts                        # IPC 类型和工具（创建）
│   │   └── format.ts                     # 格式化函数（创建）
│   └── types/
│       └── index.ts                      # 全局类型定义（创建）
├── resources/
│   └── icon.icns                         # APP 图标（占位）
├── .gitignore                            # Git 忽略规则（创建）
└── index.html                            # HTML 入口（创建）
```

---

## Phase 1: 项目脚手架

**目标:** 搭建 Electron + Vite + React + TypeScript 项目，能运行 `npm run dev` 打开空白窗口。

**文件:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `.gitignore`

### Task 1.1: 创建 package.json

- [ ] **Step 1: 创建必要目录**

```bash
mkdir -p electron/ipc electron/services electron/utils electron/data
mkdir -p src/components src/modules src/features src/hooks src/store src/lib src/types src/utils
mkdir -p resources
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "maccleaner",
  "version": "0.1.0",
  "description": "macOS 磁盘清理工具",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "build:mac": "electron-builder --mac"
  },
  "dependencies": {
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "postcss": "^8.4.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vite-plugin-electron": "^0.28.0",
    "vite-plugin-electron-renderer": "^0.14.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
npm install
```

预期: 无报错，node_modules 创建成功

### Task 1.2: 创建 TypeScript 配置

- [ ] **Step 1: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["electron", "vite.config.ts"]
}
```

### Task 1.3: 创建 Vite 配置

- [ ] **Step 1: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

### Task 1.4: 创建 Electron 主进程

- [ ] **Step 1: 创建 electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ipc: {
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
  },
});
```

- [ ] **Step 2: 创建 electron/main.ts**

```typescript
import { app, BrowserWindow } from 'electron';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
```

### Task 1.5: 创建前端入口

- [ ] **Step 1: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MacCleaner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: 创建 src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: 创建 src/App.tsx**

```typescript
function App() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">MacCleaner</h1>
    </div>
  );
}

export default App;
```

### Task 1.6: 创建 Tailwind 配置和忽略文件

- [ ] **Step 1: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 2: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: 创建 .gitignore**

```
node_modules
dist
dist-electron
out
*.d.ts
.env
.DS_Store
```

### Task 1.7: 验证 Phase 1

- [ ] **Step 1: 运行开发服务器**

```bash
npm run dev
```

预期: Electron 窗口打开，显示 "MacCleaner" 白色大字，背景深色

---

## Phase 2: 核心基础设施

**目标:** 建立类型系统、状态管理、命令执行封装、已知隐藏目录字典。

**文件:**
- Create: `src/types/index.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/ipc.ts`
- Create: `src/store/index.ts`
- Create: `src/utils/execFileNoThrow.ts`
- Create: `electron/data/known-hidden-dirs.json`

### Task 2.1: 定义全局类型

- [ ] **Step 1: 创建 src/types/index.ts**

```typescript
// 模块类型
export type ModuleId =
  | 'brew'
  | 'docker'
  | 'npm'
  | 'conda'
  | 'system-cache'
  | 'cli-tools'
  | 'downloads';

// 扫描结果项
export interface ScanItem {
  name: string;
  path: string;
  size: number;
  type: 'cache' | 'config' | 'data' | 'log' | 'unknown';
  safeToRemove: boolean;
  description?: string;
  children?: ScanItem[];
}

// 模块扫描结果
export interface ModuleScanResult {
  moduleId: ModuleId;
  totalSize: number;
  itemCount: number;
  items: ScanItem[];
  scannedAt: Date;
}

// 清理操作
export interface CleanAction {
  path: string;
  size: number;
  command?: string;
  commandArgs?: string[];
  description: string;
}

// 清理结果
export interface CleanResult {
  success: boolean;
  freedSpace: number;
  errors: string[];
}

// APP 信息
export interface AppInfo {
  name: string;
  path: string;
  bundleId: string;
  size: number;
  iconPath?: string;
  associatedFiles: AssociatedFile[];
}

export interface AssociatedFile {
  path: string;
  type: 'preferences' | 'cache' | 'support' | 'container' | 'savedState' | 'webkit' | 'hiddenDir' | 'binary';
  size: number;
}

// 导航项
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  group: 'clean' | 'uninstall' | 'settings';
}

// 隐藏目录信息
export interface HiddenDirInfo {
  path: string;
  name: string;
  size: number;
  category: 'cache' | 'config' | 'data' | 'protected';
  toolName?: string;
  description?: string;
}

// IPC 事件类型
export interface ProgressEvent {
  moduleId: string;
  progress: number;
  message: string;
}
```

### Task 2.2: 创建格式化工具函数

- [ ] **Step 1: 创建 src/lib/format.ts**

```typescript
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}
```

### Task 2.3: 创建 IPC 通信封装

- [ ] **Step 1: 创建 src/lib/ipc.ts**

```typescript
import type { ModuleId, ModuleScanResult, CleanResult, AppInfo, HiddenDirInfo, CleanAction, ProgressEvent } from '@/types';

declare global {
  interface Window {
    electronAPI: {
      ipc: {
        send: (channel: string, ...args: unknown[]) => void;
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
        on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
      };
    };
  }
}

export async function scanModule(moduleId: ModuleId): Promise<ModuleScanResult> {
  return window.electronAPI.ipc.invoke('scan:module', moduleId) as Promise<ModuleScanResult>;
}

export async function scanAll(): Promise<Record<ModuleId, ModuleScanResult>> {
  return window.electronAPI.ipc.invoke('scan:all') as Promise<Record<ModuleId, ModuleScanResult>>;
}

export async function scanHiddenDirs(): Promise<HiddenDirInfo[]> {
  return window.electronAPI.ipc.invoke('scan:hidden-dirs') as Promise<HiddenDirInfo[]>;
}

export async function safeClean(moduleId: ModuleId): Promise<CleanResult> {
  return window.electronAPI.ipc.invoke('clean:safe', moduleId) as Promise<CleanResult>;
}

export async function advancedClean(moduleId: ModuleId, actions: CleanAction[]): Promise<CleanResult> {
  return window.electronAPI.ipc.invoke('clean:advanced', moduleId, actions) as Promise<CleanResult>;
}

export async function scanApps(): Promise<AppInfo[]> {
  return window.electronAPI.ipc.invoke('scan:apps') as Promise<AppInfo[]>;
}

export async function uninstallApp(appPath: string, associatedPaths: string[], keepUserData: boolean): Promise<CleanResult> {
  return window.electronAPI.ipc.invoke('uninstall:app', appPath, associatedPaths, keepUserData) as Promise<CleanResult>;
}

export async function scanResidual(): Promise<AppInfo[]> {
  return window.electronAPI.ipc.invoke('scan:residual') as Promise<AppInfo[]>;
}

export async function registerSchedule(cron: string): Promise<boolean> {
  return window.electronAPI.ipc.invoke('schedule:register', cron) as Promise<boolean>;
}

export function onProgress(callback: (event: ProgressEvent) => void): () => void {
  return window.electronAPI.ipc.on('events:progress', callback);
}

export function onComplete(callback: (result: CleanResult) => void): () => void {
  return window.electronAPI.ipc.on('events:complete', callback);
}

export function onError(callback: (error: string) => void): () => void {
  return window.electronAPI.ipc.on('events:error', callback);
}

export async function scanCliToolsList(): Promise<unknown[]> {
  return window.electronAPI.ipc.invoke('scan:cli-tools') as Promise<unknown[]>;
}

export async function uninstallCliTool(name: string, source: string): Promise<CleanResult> {
  return window.electronAPI.ipc.invoke('uninstall:cli', name, source) as Promise<CleanResult>;
}
```

### Task 2.4: 创建 Zustand 状态管理

- [ ] **Step 1: 创建 src/store/index.ts**

```typescript
import { create } from 'zustand';
import type { ModuleId, ModuleScanResult, AppInfo, NavItem, HiddenDirInfo, CleanResult } from '@/types';

export interface AppState {
  // 导航
  currentModule: string;
  setCurrentModule: (id: string) => void;

  // 扫描结果
  scanResults: Partial<Record<ModuleId, ModuleScanResult>>;
  hiddenDirs: HiddenDirInfo[];
  apps: AppInfo[];
  residuals: AppInfo[];
  isScanning: boolean;
  scanProgress: number;

  // 操作
  setScanResults: (results: Partial<Record<ModuleId, ModuleScanResult>>) => void;
  setHiddenDirs: (dirs: HiddenDirInfo[]) => void;
  setApps: (apps: AppInfo[]) => void;
  setResiduals: (residuals: AppInfo[]) => void;
  setScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number) => void;

  // 最近清理结果
  lastCleanResult: CleanResult | null;
  setLastCleanResult: (result: CleanResult | null) => void;

  // 总可清理空间
  totalCleanable: number;
}

export const navItems: NavItem[] = [
  // 清理模块
  { id: 'dashboard', label: '仪表盘', icon: '🏠', group: 'clean' },
  { id: 'brew', label: 'Brew 缓存', icon: '🍺', group: 'clean' },
  { id: 'docker', label: 'Docker 清理', icon: '🐳', group: 'clean' },
  { id: 'npm', label: 'npm/Node', icon: '📦', group: 'clean' },
  { id: 'conda', label: 'Conda/Python', icon: '🐍', group: 'clean' },
  { id: 'system-cache', label: '系统缓存', icon: '🗂️', group: 'clean' },
  { id: 'cli-tools', label: 'CLI 工具', icon: '🛠️', group: 'clean' },
  { id: 'downloads', label: 'Downloads', icon: '📥', group: 'clean' },
  // 卸载模块
  { id: 'uninstall-apps', label: '已安装 APP', icon: '📱', group: 'uninstall' },
  { id: 'uninstall-cli', label: 'CLI 工具卸载', icon: '📦', group: 'uninstall' },
  { id: 'residual-clean', label: 'APP 残留清理', icon: '🗑️', group: 'uninstall' },
  // 设置
  { id: 'settings', label: '设置', icon: '⚙️', group: 'settings' },
];

export const useAppStore = create<AppState>((set) => ({
  currentModule: 'dashboard',
  setCurrentModule: (id) => set({ currentModule: id }),

  scanResults: {},
  hiddenDirs: [],
  apps: [],
  residuals: [],
  isScanning: false,
  scanProgress: 0,

  setScanResults: (results) => set({ scanResults: results }),
  setHiddenDirs: (dirs) => set({ hiddenDirs: dirs }),
  setApps: (apps) => set({ apps }),
  setResiduals: (residuals) => set({ residuals }),
  setScanning: (scanning) => set({ isScanning: scanning, scanProgress: scanning ? 0 : 100 }),
  setScanProgress: (progress) => set({ scanProgress: progress }),

  lastCleanResult: null,
  setLastCleanResult: (result) => set({ lastCleanResult: result }),

  get totalCleanable() {
    return Object.values(this.scanResults).reduce(
      (sum, r) => sum + (r?.totalSize ?? 0),
      0,
    );
  },
}));
```

### Task 2.5: 创建命令执行安全封装

- [ ] **Step 1: 创建 src/utils/execFileNoThrow.ts**（此文件在 electron 侧使用，放在 electron/utils/）

实际路径: `electron/utils/execFileNoThrow.ts`

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function execFileNoThrow(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {},
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      maxBuffer: 100 * 1024 * 1024, // 100MB
      timeout: options.timeout ?? 30000,
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { stdout: '', stderr: `命令未找到: ${command}`, exitCode: 127 };
    }
    // 返回错误信息而非抛出
    const stderr = error instanceof Error ? error.message : String(error);
    return { stdout: '', stderr, exitCode: 1 };
  }
}
```

### Task 2.6: 创建已知隐藏目录字典

- [ ] **Step 1: 创建 electron/data/known-hidden-dirs.json**

```json
{
  "cache": [
    { "path": ".npm", "name": "npm 包缓存", "description": "npm install 下载的包缓存" },
    { "path": ".cache", "name": "跨平台应用缓存", "description": "XDG 标准缓存目录" },
    { "path": ".cocoapods", "name": "CocoaPods 缓存", "description": "CocoaPods 下载的依赖" },
    { "path": ".gem", "name": "Ruby gem 缓存", "description": "gem install 下载的包" }
  ],
  "config": [
    { "path": ".claude", "name": "Claude Code", "tool": "claude", "description": "Claude Code 配置和会话" },
    { "path": ".codex", "name": "Codex", "tool": "codex", "description": "Codex CLI 会话缓存" },
    { "path": ".qwen", "name": "Qwen CLI", "tool": "qwen", "description": "Qwen CLI 配置" },
    { "path": ".kube", "name": "Kubernetes", "tool": "kubectl", "description": "k8s 配置和上下文" },
    { "path": ".docker", "name": "Docker", "tool": "docker", "description": "Docker CLI 配置" },
    { "path": ".config", "name": "XDG 配置", "description": "XDG 标准配置目录" },
    { "path": ".vim", "name": "Vim", "description": "Vim 配置和插件" },
    { "path": ".oh-my-zsh", "name": "Oh My Zsh", "description": "Zsh 框架配置" }
  ],
  "data": [
    { "path": ".orbstack", "name": "OrbStack", "tool": "orbstack", "description": "OrbStack 虚拟机数据" },
    { "path": ".krew", "name": "Krew", "tool": "kubectl", "description": "kubectl 插件管理器" },
    { "path": ".folo", "name": "Folo RSS", "tool": "folo", "description": "Folo RSS 阅读器数据" },
    { "path": ".lark-cli", "name": "飞书 CLI", "tool": "lark", "description": "飞书 CLI 配置" },
    { "path": ".local", "name": "XDG 本地数据", "description": "XDG 标准数据目录" },
    { "path": ".nvm", "name": "NVM", "tool": "nvm", "description": "Node.js 版本管理" },
    { "path": ".conda", "name": "Conda", "tool": "conda", "description": "Conda 环境和包" },
    { "path": ".ipython", "name": "IPython", "tool": "python", "description": "IPython 配置和缓存" }
  ],
  "protected": [
    { "path": ".ssh", "name": "SSH", "description": "SSH 密钥和 known_hosts，永远不可删除" },
    { "path": ".gnupg", "name": "GnuPG", "description": "GPG 密钥，永远不可删除" },
    { "path": ".Trash", "name": "废纸篓", "description": "需要通过清空废纸篓操作处理" }
  ]
}
```

### Task 2.7: 验证 Phase 2

- [ ] **Step 1: 检查 TypeScript 编译**

```bash
npx tsc --noEmit
```

预期: 无错误

---

## Phase 3: Shell UI — 侧边栏 + 模块容器 + 菜单栏

**目标:** 构建 APP 整体布局，左侧导航 + 右侧内容区。

**文件:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/ModuleView.tsx`
- Create: `src/App.tsx` (修改)
- Create: `electron/main.ts` (修改 - 添加菜单栏/tray 支持)

### Task 3.1: 创建左侧导航栏

- [ ] **Step 1: 创建 src/components/Sidebar.tsx**

```typescript
import { useAppStore, navItems } from '@/store';

const groupLabels: Record<string, string> = {
  clean: '🧹 清理模块',
  uninstall: '🗑️ 卸载管理',
  settings: '',
};

function Sidebar() {
  const { currentModule, setCurrentModule } = useAppStore();

  const groups = Object.entries(
    navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {}),
  );

  return (
    <div className="flex h-full w-48 flex-col border-r border-gray-700 bg-gray-850 p-3">
      {groups.map(([group, items]) => (
        <div key={group} className={group !== 'clean' ? 'mt-4 border-t border-gray-700 pt-3' : ''}>
          {groupLabels[group] && (
            <div className="mb-1 px-2 text-xs uppercase text-gray-500">{groupLabels[group]}</div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentModule(item.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                currentModule === item.id
                  ? 'bg-purple-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ))}
      {groupLabels.settings && (
        <div className="mt-auto pt-3 border-t border-gray-700">
          <button
            onClick={() => setCurrentModule('settings')}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              currentModule === 'settings'
                ? 'bg-purple-700 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span>⚙️</span>
            <span>设置</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
```

### Task 3.2: 创建模块通用容器

- [ ] **Step 1: 创建 src/components/ModuleView.tsx**

```typescript
import { useAppStore } from '@/store';
import Dashboard from '@/modules/Dashboard';

// 占位组件 — 后续 Phase 会替换为真实模块
function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      <p>{name} 模块开发中...</p>
    </div>
  );
}

function ModuleView() {
  const { currentModule } = useAppStore();

  const moduleMap: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    brew: <Placeholder name="Brew 缓存" />,
    docker: <Placeholder name="Docker 清理" />,
    npm: <Placeholder name="npm/Node" />,
    conda: <Placeholder name="Conda/Python" />,
    'system-cache': <Placeholder name="系统缓存" />,
    'cli-tools': <Placeholder name="CLI 工具" />,
    downloads: <Placeholder name="Downloads" />,
    'uninstall-apps': <Placeholder name="已安装 APP" />,
    'uninstall-cli': <Placeholder name="CLI 工具卸载" />,
    'residual-clean': <Placeholder name="APP 残留清理" />,
    settings: <Placeholder name="设置" />,
  };

  return <div className="flex-1 overflow-auto bg-gray-900 p-6">{moduleMap[currentModule]}</div>;
}

export default ModuleView;
```

### Task 3.3: 更新 App 根组件

- [ ] **Step 1: 修改 src/App.tsx**

```typescript
import Sidebar from '@/components/Sidebar';
import ModuleView from '@/components/ModuleView';

function App() {
  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white">
      <Sidebar />
      <ModuleView />
    </div>
  );
}

export default App;
```

### Task 3.4: 更新 Electron 主进程添加 Tray 支持

- [ ] **Step 1: 修改 electron/main.ts — 添加 tray 和隐藏菜单栏逻辑**

在 `createWindow` 函数前添加:

```typescript
import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('MacCleaner');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 MacCleaner',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}
```

修改 `createWindow`:

```typescript
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}
```

修改 `app.whenReady()`:

```typescript
app.whenReady().then(() => {
  createTray();
  createWindow();
});
```

### Task 3.5: 验证 Phase 3

- [ ] **Step 1: 运行开发服务器**

```bash
npm run dev
```

预期: 窗口显示左侧导航栏 + 右侧内容区，点击导航项切换。菜单栏有 tray 图标。

---

## Phase 4: 仪表盘 + 磁盘信息

**目标:** 实现仪表盘 — 显示磁盘总容量、使用率、各模块可清理空间概览。

**文件:**
- Create: `src/modules/Dashboard.tsx`
- Modify: `electron/main.ts` (添加 `scan:all` IPC handler)
- Create: `electron/services/scanner.ts`

### Task 4.1: 创建扫描服务

- [ ] **Step 1: 创建 electron/services/scanner.ts**

```typescript
import { execFileNoThrow } from '../utils/execFileNoThrow';
import type { ModuleScanResult, ModuleId } from '../types';

export async function getDiskUsage(): Promise<{ total: number; used: number; available: number; percent: number }> {
  const { stdout } = await execFileNoThrow('df', ['-h', '/']);
  const lines = stdout.trim().split('\n');
  if (lines.length < 2) return { total: 0, used: 0, available: 0, percent: 0 };

  const parts = lines[1].split(/\s+/);
  return {
    total: parseSizeStr(parts[1]),
    used: parseSizeStr(parts[2]),
    available: parseSizeStr(parts[3]),
    percent: parseInt(parts[4], 10),
  };
}

function parseSizeStr(size: string): number {
  const match = size.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { '': 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
  return Math.round(value * (multipliers[unit] ?? 1));
}

export async function scanModule(moduleId: ModuleId): Promise<ModuleScanResult> {
  // 占位实现 — 各模块后续实现具体扫描逻辑
  return {
    moduleId,
    totalSize: 0,
    itemCount: 0,
    items: [],
    scannedAt: new Date(),
  };
}

export async function scanAllModules(): Promise<Record<ModuleId, ModuleScanResult>> {
  const moduleIds: ModuleId[] = ['brew', 'docker', 'npm', 'conda', 'system-cache', 'cli-tools', 'downloads'];
  const results: Partial<Record<ModuleId, ModuleScanResult>> = {};

  for (const id of moduleIds) {
    results[id] = await scanModule(id);
  }

  return results as Record<ModuleId, ModuleScanResult>;
}
```

注意: types 需要从 src/types 复制一份到 electron 侧，或者共享。为简化，在 electron/types.ts 创建一份:

- [ ] **Step 2: 创建 electron/types.ts**

```typescript
// 从 src/types/index.ts 复制核心类型（electron 侧需要独立编译）
export type ModuleId =
  | 'brew'
  | 'docker'
  | 'npm'
  | 'conda'
  | 'system-cache'
  | 'cli-tools'
  | 'downloads';

export interface ScanItem {
  name: string;
  path: string;
  size: number;
  type: 'cache' | 'config' | 'data' | 'log' | 'unknown';
  safeToRemove: boolean;
  description?: string;
  children?: ScanItem[];
}

export interface ModuleScanResult {
  moduleId: ModuleId;
  totalSize: number;
  itemCount: number;
  items: ScanItem[];
  scannedAt: Date;
}

export interface CleanAction {
  path: string;
  size: number;
  command?: string;
  commandArgs?: string[];
  description: string;
}

export interface CleanResult {
  success: boolean;
  freedSpace: number;
  errors: string[];
}

export interface AppInfo {
  name: string;
  path: string;
  bundleId: string;
  size: number;
  iconPath?: string;
  associatedFiles: AssociatedFile[];
}

export interface AssociatedFile {
  path: string;
  type: 'preferences' | 'cache' | 'support' | 'container' | 'savedState' | 'webkit' | 'hiddenDir' | 'binary';
  size: number;
}

export interface HiddenDirInfo {
  path: string;
  name: string;
  size: number;
  category: 'cache' | 'config' | 'data' | 'protected';
  toolName?: string;
  description?: string;
}

export interface ProgressEvent {
  moduleId: string;
  progress: number;
  message: string;
}
```

### Task 4.2: 创建扫描 IPC handler

- [ ] **Step 1: 创建 electron/ipc/scan.ts**

```typescript
import { ipcMain } from 'electron';
import { scanAllModules } from '../services/scanner';

export function registerScanHandlers() {
  ipcMain.handle('scan:all', async () => {
    return scanAllModules();
  });

  ipcMain.handle('scan:module', async (_event, moduleId: string) => {
    const { scanModule } = await import('../services/scanner');
    return scanModule(moduleId);
  });
}
```

- [ ] **Step 2: 在 electron/main.ts 中注册 handler**

在 `createTray()` 调用后添加:

```typescript
import { registerScanHandlers } from './ipc/scan';

// 在 app.whenReady().then(() => { ... }) 中:
registerScanHandlers();
```

### Task 4.3: 创建仪表盘组件

- [ ] **Step 1: 创建 src/modules/Dashboard.tsx**

```typescript
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanAll } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { navItems } from '@/store';

function Dashboard() {
  const { scanResults, setScanResults, isScanning, setScanning, setCurrentModule } = useAppStore();

  useEffect(() => {
    // 初始扫描
    if (Object.keys(scanResults).length === 0) {
      handleScan();
    }
  }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const results = await scanAll();
      setScanResults(results);
    } catch (error) {
      console.error('扫描失败:', error);
    } finally {
      setScanning(false);
    }
  }

  const totalCleanable = Object.values(scanResults).reduce(
    (sum, r) => sum + (r?.totalSize ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏠 仪表盘</h1>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isScanning ? '扫描中...' : '重新扫描'}
        </button>
      </div>

      {/* 总览卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-red-500 to-purple-700 p-6">
          <div className="text-3xl font-bold text-white">{formatBytes(totalCleanable)}</div>
          <div className="mt-1 text-sm text-white/70">可清理空间</div>
        </div>
        <div className="rounded-xl bg-gray-800 p-6">
          <div className="text-3xl font-bold text-blue-400">
            {Object.values(scanResults).length > 0 ? '已扫描' : '未扫描'}
          </div>
          <div className="mt-1 text-sm text-gray-400">{Object.keys(scanResults).length} / 7 模块</div>
        </div>
      </div>

      {/* 各模块进度条 */}
      <div className="rounded-xl bg-gray-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-300">各模块可清理空间</h2>
        <div className="space-y-2">
          {navItems
            .filter((item) => item.group === 'clean' && item.id !== 'dashboard')
            .map((item) => {
              const result = scanResults[item.id as keyof typeof scanResults];
              const size = result?.totalSize ?? 0;
              const max = Math.max(totalCleanable, 1);
              const percent = Math.round((size / max) * 100);

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentModule(item.id)}
                  className="flex w-full items-center gap-3 py-1.5 hover:bg-gray-700/50"
                >
                  <span className="w-20 text-left text-sm">{item.icon} {item.label.split(' ')[0]}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-4 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-gray-400">{formatBytes(size)}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
```

### Task 4.4: 验证 Phase 4

- [ ] **Step 1: 运行并检查**

```bash
npm run dev
```

预期: 仪表盘显示，点击"重新扫描"后各模块显示 0 B（因为扫描逻辑还是占位）

---

## Phase 5: 各清理模块（Brew + Docker + npm + Conda）

**目标:** 实现 4 个核心清理模块的扫描和清理逻辑。

**文件:**
- Modify: `electron/services/scanner.ts` (实现各模块扫描)
- Create: `electron/services/cleaner.ts`
- Create: `electron/ipc/clean.ts`
- Create: `src/hooks/useScan.ts`
- Create: `src/hooks/useClean.ts`
- Create: `src/modules/BrewModule.tsx`
- Create: `src/modules/DockerModule.tsx`
- Create: `src/modules/NpmModule.tsx`
- Create: `src/modules/CondaModule.tsx`
- Modify: `src/components/ModuleView.tsx` (导入真实模块)

### Task 5.1: 实现扫描引擎 — 各模块

- [ ] **Step 1: 修改 electron/services/scanner.ts — 替换占位实现**

完整替换文件内容:

```typescript
import { execFileNoThrow } from '../utils/execFileNoThrow';
import type { ModuleId, ModuleScanResult, ScanItem } from '../types';
import { homedir } from 'os';
import { join } from 'path';
import { readdir, stat } from 'fs/promises';

const home = homedir();

export async function scanModule(moduleId: ModuleId): Promise<ModuleScanResult> {
  const scanners: Record<ModuleId, () => Promise<{ items: ScanItem[]; totalSize: number }>> = {
    brew: scanBrew,
    docker: scanDocker,
    npm: scanNpm,
    conda: scanConda,
    'system-cache': scanSystemCache,
    'cli-tools': scanCliTools,
    downloads: scanDownloads,
  };

  const { items, totalSize } = await scanners[moduleId]();
  return {
    moduleId,
    totalSize,
    itemCount: items.length,
    items,
    scannedAt: new Date(),
  };
}

async function scanBrew() {
  // 获取已安装的 brew 包
  const { stdout } = await execFileNoThrow('brew', ['list', '--formula', '--cask']);
  if (!stdout.trim()) return { items: [], totalSize: 0 };

  const packages = stdout.trim().split('\n').filter(Boolean);
  const items: ScanItem[] = [];
  let totalSize = 0;

  for (const pkg of packages.slice(0, 20)) { // 限制数量避免慢
    const { stdout: info } = await execFileNoThrow('brew', ['info', pkg, '--json=v2']);
    try {
      const data = JSON.parse(info);
      const versions = data.formulae?.[0]?.installed_versions ?? [];
      if (versions.length > 1) {
        const oldVersions = versions.slice(0, -1);
        const size = oldVersions.reduce((s: number, v: { installed_size: number }) => s + (v.installed_size ?? 0), 0);
        items.push({
          name: pkg,
          path: `/opt/homebrew/Cellar/${pkg}`,
          size,
          type: 'cache',
          safeToRemove: true,
          description: `旧版本: ${oldVersions.map((v: { version: string }) => v.version).join(', ')}`,
        });
        totalSize += size;
      }
    } catch { /* 跳过解析失败 */ }
  }

  // Homebrew 缓存
  const cachePath = join(home, 'Library/Caches/Homebrew');
  const cacheSize = await getDirSize(cachePath);
  if (cacheSize > 0) {
    items.push({
      name: 'Homebrew 下载缓存',
      path: cachePath,
      size: cacheSize,
      type: 'cache',
      safeToRemove: true,
    });
    totalSize += cacheSize;
  }

  return { items, totalSize };
}

async function scanDocker() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const { stdout } = await execFileNoThrow('docker', ['system', 'df', '--format', '{{json .}}']);
  try {
    const data = JSON.parse(stdout);
    // 悬空镜像
    if (data.Images && data.Images.length > 0) {
      const size = data.Images.reduce((s: number, i: { Size: number }) => s + (i.Size ?? 0), 0);
      items.push({ name: '悬空镜像', path: '', size, type: 'cache', safeToRemove: true });
      totalSize += size;
    }
    // 停止的容器
    if (data.Containers && data.Containers.length > 0) {
      const size = data.Containers.reduce((s: number, c: { Size: number }) => s + (c.Size ?? 0), 0);
      items.push({ name: '已停止容器', path: '', size, type: 'data', safeToRemove: false });
      totalSize += size;
    }
    // Volume
    if (data.Volumes && data.Volumes.length > 0) {
      const size = data.Volumes.reduce((s: number, v: { Size: number }) => s + (v.Size ?? 0), 0);
      items.push({ name: '未使用 Volume', path: '', size, type: 'data', safeToRemove: false });
      totalSize += size;
    }
    // Build cache
    if (data['Build Cache']) {
      items.push({ name: 'Build Cache', path: '', size: data['Build Cache'], type: 'cache', safeToRemove: true });
      totalSize += data['Build Cache'];
    }
  } catch { /* Docker 未运行或输出格式变化 */ }

  return { items, totalSize };
}

async function scanNpm() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  // npm cache
  const npmCachePath = join(home, '.npm');
  const npmCacheSize = await getDirSize(npmCachePath);
  items.push({
    name: 'npm 缓存',
    path: npmCachePath,
    size: npmCacheSize,
    type: 'cache',
    safeToRemove: true,
  });
  totalSize += npmCacheSize;

  // nvm 旧版本
  const nvmPath = join(home, '.nvm', 'versions', 'node');
  try {
    const versions = await readdir(nvmPath);
    const { stdout: current } = await execFileNoThrow('node', ['--version']);
    const currentVersion = current.trim().replace('v', '');

    for (const v of versions) {
      if (v !== currentVersion) {
        const vSize = await getDirSize(join(nvmPath, v));
        items.push({
          name: `Node.js ${v} (旧版本)`,
          path: join(nvmPath, v),
          size: vSize,
          type: 'cache',
          safeToRemove: false,
          description: `当前使用 ${currentVersion}`,
        });
        totalSize += vSize;
      }
    }
  } catch { /* nvm 未安装 */ }

  return { items, totalSize };
}

async function scanConda() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  // conda 环境
  const envsPaths = [
    join(home, '.conda', 'envs'),
    join(home, 'dev', 'miniconda3', 'envs'),
  ];

  for (const envPath of envsPaths) {
    try {
      const envs = await readdir(envPath);
      for (const env of envs) {
        const envSize = await getDirSize(join(envPath, env));
        items.push({
          name: `Conda: ${env}`,
          path: join(envPath, env),
          size: envSize,
          type: 'data',
          safeToRemove: false,
        });
        totalSize += envSize;
      }
    } catch { /* 路径不存在 */ }
  }

  // pip cache
  const pipCachePaths = [
    join(home, 'Library', 'Caches', 'pip'),
    join(home, '.cache', 'pip'),
  ];
  for (const pipPath of pipCachePaths) {
    const pipSize = await getDirSize(pipPath);
    if (pipSize > 0) {
      items.push({ name: 'pip 缓存', path: pipPath, size: pipSize, type: 'cache', safeToRemove: true });
      totalSize += pipSize;
    }
  }

  return { items, totalSize };
}

async function scanSystemCache() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const cachePaths = [
    join(home, 'Library', 'Caches'),
    join(home, 'Library', 'Logs'),
    join(home, '.cache'),
  ];

  for (const cachePath of cachePaths) {
    try {
      const dirs = await readdir(cachePath);
      for (const dir of dirs.slice(0, 30)) { // 限制数量
        const dirPath = join(cachePath, dir);
        const dirSize = await getDirSize(dirPath);
        if (dirSize > 10 * 1024 * 1024) { // 只显示 > 10MB 的
          items.push({
            name: dir,
            path: dirPath,
            size: dirSize,
            type: 'cache',
            safeToRemove: true,
          });
          totalSize += dirSize;
        }
      }
    } catch { /* 路径不存在 */ }
  }

  items.sort((a, b) => b.size - a.size);
  return { items, totalSize };
}

async function scanCliTools() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const knownCliDirs: Record<string, string> = {
    'Claude Code': join(home, '.claude'),
    'Codex': join(home, '.codex'),
    'Qwen CLI': join(home, '.qwen'),
    'Kubernetes': join(home, '.kube'),
    'Krew': join(home, '.krew'),
    '飞书 CLI': join(home, '.lark-cli'),
    'Folo RSS': join(home, '.folo'),
  };

  for (const [name, dirPath] of Object.entries(knownCliDirs)) {
    const size = await getDirSize(dirPath);
    if (size > 0) {
      items.push({ name, path: dirPath, size, type: 'config', safeToRemove: false });
      totalSize += size;
    }
  }

  return { items, totalSize };
}

async function scanDownloads() {
  const items: ScanItem[] = [];
  let totalSize = 0;

  const downloadsPath = join(home, 'Downloads');
  try {
    const files = await readdir(downloadsPath);
    for (const file of files) {
      const filePath = join(downloadsPath, file);
      const fileStat = await stat(filePath);
      if (fileStat.isFile() && fileStat.size > 10 * 1024 * 1024) { // > 10MB
        items.push({
          name: file,
          path: filePath,
          size: fileStat.size,
          type: 'unknown',
          safeToRemove: false,
        });
        totalSize += fileStat.size;
      }
    }
  } catch { /* 路径不存在 */ }

  items.sort((a, b) => b.size - a.size);
  return { items, totalSize };
}

async function getDirSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execFileNoThrow('du', ['-sb', dirPath]);
    return parseInt(stdout.split('\t')[0], 10) || 0;
  } catch {
    return 0;
  }
}

export async function scanAllModules(): Promise<Record<ModuleId, ModuleScanResult>> {
  const moduleIds: ModuleId[] = ['brew', 'docker', 'npm', 'conda', 'system-cache', 'cli-tools', 'downloads'];
  const results: Partial<Record<ModuleId, ModuleScanResult>> = {};

  for (const id of moduleIds) {
    results[id] = await scanModule(id);
  }

  return results as Record<ModuleId, ModuleScanResult>;
}
```

### Task 5.2: 实现清理引擎

- [ ] **Step 1: 创建 electron/services/cleaner.ts**

```typescript
import { execFileNoThrow } from '../utils/execFileNoThrow';
import type { ModuleId, CleanResult, CleanAction } from '../types';
import { unlink, rm } from 'fs/promises';
import { existsSync } from 'fs';

export async function safeClean(moduleId: ModuleId): Promise<CleanResult> {
  const cleaners: Record<ModuleId, () => Promise<CleanResult>> = {
    brew: cleanBrew,
    docker: cleanDocker,
    npm: cleanNpm,
    conda: cleanConda,
    'system-cache': cleanSystemCache,
    'cli-tools': () => Promise.resolve({ success: true, freedSpace: 0, errors: [] }),
    downloads: () => Promise.resolve({ success: true, freedSpace: 0, errors: [] }),
  };

  return cleaners[moduleId]();
}

export async function advancedClean(moduleId: ModuleId, actions: CleanAction[]): Promise<CleanResult> {
  let freedSpace = 0;
  const errors: string[] = [];

  for (const action of actions) {
    if (action.command && action.commandArgs) {
      const { stderr } = await execFileNoThrow(action.command, action.commandArgs);
      if (stderr && !stderr.includes('No such')) {
        errors.push(stderr);
      }
    } else if (action.path && existsSync(action.path)) {
      try {
        await rm(action.path, { recursive: true, force: true });
        freedSpace += action.size;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  return { success: errors.length === 0, freedSpace, errors };
}

async function cleanBrew(): Promise<CleanResult> {
  const { stdout } = await execFileNoThrow('brew', ['cleanup']);
  return { success: true, freedSpace: 0, errors: stdout.includes('Error') ? [stdout] : [] };
}

async function cleanDocker(): Promise<CleanResult> {
  const { stderr } = await execFileNoThrow('docker', ['image', 'prune', '-f']);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}

async function cleanNpm(): Promise<CleanResult> {
  const { stderr } = await execFileNoThrow('npm', ['cache', 'clean', '--force']);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}

async function cleanConda(): Promise<CleanResult> {
  const { stderr } = await execFileNoThrow('conda', ['clean', '--all', '-y']);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}

async function cleanSystemCache(): Promise<CleanResult> {
  // 安全清理：只删除已知缓存目录
  return { success: true, freedSpace: 0, errors: [] };
}
```

### Task 5.3: 注册清理 IPC handler

- [ ] **Step 1: 创建 electron/ipc/clean.ts**

```typescript
import { ipcMain } from 'electron';
import { safeClean, advancedClean } from '../services/cleaner';
import type { ModuleId, CleanAction } from '../types';

export function registerCleanHandlers() {
  ipcMain.handle('clean:safe', async (_event, moduleId: ModuleId) => {
    return safeClean(moduleId);
  });

  ipcMain.handle('clean:advanced', async (_event, moduleId: ModuleId, actions: CleanAction[]) => {
    return advancedClean(moduleId, actions);
  });
}
```

- [ ] **Step 2: 在 electron/main.ts 中注册**

```typescript
import { registerCleanHandlers } from './ipc/clean';

// 在 app.whenReady() 中:
registerCleanHandlers();
```

### Task 5.4: 创建扫描和清理 hook

- [ ] **Step 1: 创建 src/hooks/useScan.ts**

```typescript
import { useCallback } from 'react';
import { useAppStore } from '@/store';
import { scanModule as ipcScanModule } from '@/lib/ipc';
import type { ModuleId } from '@/types';

export function useScan() {
  const { setScanResults, setScanning } = useAppStore();

  const scanOne = useCallback(async (moduleId: ModuleId) => {
    const result = await ipcScanModule(moduleId);
    setScanResults((prev) => ({ ...prev, [moduleId]: result }));
    return result;
  }, [setScanResults]);

  return { scanOne };
}
```

- [ ] **Step 2: 创建 src/hooks/useClean.ts**

```typescript
import { useCallback } from 'react';
import { useAppStore } from '@/store';
import { safeClean, advancedClean } from '@/lib/ipc';
import type { ModuleId, CleanAction, CleanResult } from '@/types';

export function useClean() {
  const { setLastCleanResult, setScanResults } = useAppStore();

  const doSafeClean = useCallback(async (moduleId: ModuleId): Promise<CleanResult> => {
    const result = await safeClean(moduleId);
    setLastCleanResult(result);
    // 清理后重新扫描
    const { scanModule } = await import('@/lib/ipc');
    const newResult = await scanModule(moduleId);
    setScanResults((prev) => ({ ...prev, [moduleId]: newResult }));
    return result;
  }, [setLastCleanResult, setScanResults]);

  const doAdvancedClean = useCallback(async (moduleId: ModuleId, actions: CleanAction[]): Promise<CleanResult> => {
    const result = await advancedClean(moduleId, actions);
    setLastCleanResult(result);
    return result;
  }, [setLastCleanResult]);

  return { doSafeClean, doAdvancedClean };
}
```

### Task 5.5: 创建 Brew 模块组件

- [ ] **Step 1: 创建 src/modules/BrewModule.tsx**

```typescript
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';

function BrewModule() {
  const { scanResults, setScanning } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['brew'];

  useEffect(() => {
    handleScan();
  }, []);

  async function handleScan() {
    setScanning(true);
    try {
      await scanModule('brew');
    } finally {
      setScanning(false);
    }
  }

  async function handleClean() {
    setScanning(true);
    try {
      await doSafeClean('brew');
    } finally {
      setScanning(false);
    }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🍺 Brew 缓存</h1>
        <button
          onClick={handleClean}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
        >
          ⚡ 安全清理
        </button>
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-gray-800 p-4">
          <div className="text-sm text-gray-400">已安装包数</div>
          <div className="text-2xl font-bold">{result.itemCount}</div>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <div className="text-sm text-gray-400">旧版本残留</div>
          <div className="text-2xl font-bold text-yellow-400">
            {result.items.filter((i) => i.description).length}
          </div>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <div className="text-sm text-gray-400">可清理空间</div>
          <div className="text-2xl font-bold text-green-400">{formatBytes(result.totalSize)}</div>
        </div>
      </div>

      {/* 文件列表 */}
      {result.items.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="pb-2 text-left">包名</th>
              <th className="pb-2 text-left">详情</th>
              <th className="pb-2 text-right">占用</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-yellow-400">{item.description ?? '-'}</td>
                <td className="py-2 text-right">{formatBytes(item.size)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500">没有可清理的旧版本</p>
      )}
    </div>
  );
}

export default BrewModule;
```

### Task 5.6: 创建 Docker / npm / Conda 模块

结构与 BrewModule 类似，按各自扫描结果展示。为节省篇幅，创建简化版：

- [ ] **Step 1: 创建 src/modules/DockerModule.tsx**

```typescript
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';

function DockerModule() {
  const { scanResults, setScanning } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['docker'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('docker'); }
    finally { setScanning(false); }
  }

  async function handleClean() {
    setScanning(true);
    try { await doSafeClean('docker'); }
    finally { setScanning(false); }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  const danglingItems = result.items.filter(i => i.name.includes('悬空') || i.name.includes('Build'));
  const advancedItems = result.items.filter(i => !danglingItems.includes(i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🐳 Docker 清理</h1>
        <div className="flex gap-2">
          <button onClick={handleClean} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700">
            ⚡ 安全清理
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-lg bg-gray-800 p-3">
            <div className="text-xs text-gray-400">{item.name}</div>
            <div className="text-lg font-bold">{formatBytes(item.size)}</div>
          </div>
        ))}
      </div>

      {/* 安全清理项 */}
      {danglingItems.length > 0 && (
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="mb-2 text-sm font-semibold text-green-400">🟢 可安全清理</h3>
          {danglingItems.map((item, i) => (
            <div key={i} className="flex justify-between py-1 text-sm">
              <span>{item.name}</span>
              <span>{formatBytes(item.size)}</span>
            </div>
          ))}
        </div>
      )}

      {/* 高级清理项 */}
      {advancedItems.length > 0 && (
        <div className="rounded-lg bg-gray-800 p-4">
          <h3 className="mb-2 text-sm font-semibold text-orange-400">🟠 需要确认</h3>
          {advancedItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" className="rounded" />
              <span>{item.name}</span>
              <span className="text-gray-400">{formatBytes(item.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DockerModule;
```

- [ ] **Step 2: 创建 src/modules/NpmModule.tsx**

```typescript
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';

function NpmModule() {
  const { scanResults, setScanning } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['npm'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('npm'); }
    finally { setScanning(false); }
  }

  async function handleClean() {
    setScanning(true);
    try { await doSafeClean('npm'); }
    finally { setScanning(false); }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 npm / Node.js</h1>
        <button onClick={handleClean} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700">
          ⚡ 清理 npm 缓存
        </button>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between border-b border-gray-700 py-3 last:border-0">
            <div>
              <div className="font-medium">{item.name}</div>
              {item.description && <div className="text-xs text-gray-400">{item.description}</div>}
            </div>
            <div className="text-right">
              <div className="font-bold">{formatBytes(item.size)}</div>
              <div className="text-xs text-gray-400">{item.safeToRemove ? '可安全清理' : '需确认'}</div>
            </div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有可清理项</p>}
      </div>
    </div>
  );
}

export default NpmModule;
```

- [ ] **Step 3: 创建 src/modules/CondaModule.tsx**

```typescript
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import { useClean } from '@/hooks/useClean';

function CondaModule() {
  const { scanResults, setScanning } = useAppStore();
  const { doSafeClean } = useClean();
  const result = scanResults['conda'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('conda'); }
    finally { setScanning(false); }
  }

  async function handleClean() {
    setScanning(true);
    try { await doSafeClean('conda'); }
    finally { setScanning(false); }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🐍 Conda / Python</h1>
        <button onClick={handleClean} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700">
          ⚡ 清理缓存
        </button>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between border-b border-gray-700 py-3 last:border-0">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-400">{item.path}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{formatBytes(item.size)}</div>
              <div className="text-xs text-gray-400">{item.safeToRemove ? '可安全清理' : '环境(需确认)'}</div>
            </div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有可清理项</p>}
      </div>
    </div>
  );
}

export default CondaModule;
```

### Task 5.7: 更新 ModuleView 导入真实模块

- [ ] **Step 1: 修改 src/components/ModuleView.tsx**

```typescript
import { useAppStore } from '@/store';
import Dashboard from '@/modules/Dashboard';
import BrewModule from '@/modules/BrewModule';
import DockerModule from '@/modules/DockerModule';
import NpmModule from '@/modules/NpmModule';
import CondaModule from '@/modules/CondaModule';

function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center text-gray-500">
      <p>{name} 模块开发中...</p>
    </div>
  );
}

function ModuleView() {
  const { currentModule } = useAppStore();

  const moduleMap: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    brew: <BrewModule />,
    docker: <DockerModule />,
    npm: <NpmModule />,
    conda: <CondaModule />,
    'system-cache': <Placeholder name="系统缓存" />,
    'cli-tools': <Placeholder name="CLI 工具" />,
    downloads: <Placeholder name="Downloads" />,
    'uninstall-apps': <Placeholder name="已安装 APP" />,
    'uninstall-cli': <Placeholder name="CLI 工具卸载" />,
    'residual-clean': <Placeholder name="APP 残留清理" />,
    settings: <Placeholder name="设置" />,
  };

  return <div className="flex-1 overflow-auto bg-gray-900 p-6">{moduleMap[currentModule]}</div>;
}

export default ModuleView;
```

### Task 5.8: 验证 Phase 5

- [ ] **Step 1: 运行并测试各模块**

```bash
npm run dev
```

预期: 点击各模块能看到扫描结果（如果有对应工具的话），Brew/Docker/npm/conda 按钮可执行清理。

---

## Phase 6: 剩余清理模块 + 系统缓存 + Downloads

**目标:** 实现系统缓存、CLI 工具、Downloads 模块。

**文件:**
- Create: `src/modules/SystemCacheModule.tsx`
- Create: `src/modules/CliToolsModule.tsx`
- Create: `src/modules/DownloadsModule.tsx`
- Modify: `src/components/ModuleView.tsx`

### Task 6.1: 创建系统缓存模块

- [ ] **Step 1: 创建 src/modules/SystemCacheModule.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { scanModule, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { CleanAction } from '@/types';

function SystemCacheModule() {
  const { scanResults, setScanning, setScanResults } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const result = scanResults['system-cache'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('system-cache'); }
    finally { setScanning(false); }
  }

  async function handleClean() {
    const actions: CleanAction[] = result!.items
      .filter((item) => selected.has(item.path))
      .map((item) => ({
        path: item.path,
        size: item.size,
        description: item.name,
      }));

    if (actions.length === 0) return;

    setScanning(true);
    try {
      await advancedClean('system-cache', actions);
      await handleScan(); // 重新扫描
    } finally {
      setScanning(false);
      setSelected(new Set());
    }
  }

  function toggleSelect(path: string) {
    const next = new Set(selected);
    next.has(path) ? next.delete(path) : next.add(path);
    setSelected(next);
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗂️ 系统缓存</h1>
        <button
          onClick={handleClean}
          disabled={selected.size === 0}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
        >
          清理选中 ({selected.size})
        </button>
      </div>

      <p className="text-sm text-gray-400">缓存删除后应用会自动重建，不影响数据</p>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div
            key={i}
            className="flex cursor-pointer items-center gap-3 border-b border-gray-700 py-3 last:border-0 hover:bg-gray-700/50"
            onClick={() => toggleSelect(item.path)}
          >
            <input type="checkbox" checked={selected.has(item.path)} onChange={() => {}} className="rounded" />
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-400">{item.path}</div>
            </div>
            <div className="font-bold">{formatBytes(item.size)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemCacheModule;
```

### Task 6.2: 创建 CLI 工具模块

- [ ] **Step 1: 创建 src/modules/CliToolsModule.tsx**

```typescript
import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

function CliToolsModule() {
  const { scanResults, setScanning } = useAppStore();
  const result = scanResults['cli-tools'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('cli-tools'); }
    finally { setScanning(false); }
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🛠️ CLI 工具</h1>
        <button onClick={handleScan} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
          重新扫描
        </button>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between border-b border-gray-700 py-3 last:border-0">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-gray-400">{item.path}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">{formatBytes(item.size)}</div>
            </div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有检测到 CLI 工具数据</p>}
      </div>
    </div>
  );
}

export default CliToolsModule;
```

### Task 6.3: 创建 Downloads 模块

- [ ] **Step 1: 创建 src/modules/DownloadsModule.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { scanModule } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

function DownloadsModule() {
  const { scanResults, setScanning } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const result = scanResults['downloads'];

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try { await scanModule('downloads'); }
    finally { setScanning(false); }
  }

  function toggleSelect(path: string) {
    const next = new Set(selected);
    next.has(path) ? next.delete(path) : next.add(path);
    setSelected(next);
  }

  function getFileType(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      dmg: '📦 安装包', zip: '📦 压缩包', tar: '📦 压缩包', gz: '📦 压缩包',
      pdf: '📄 文档', doc: '📄 文档', docx: '📄 文档',
      png: '🖼️ 图片', jpg: '🖼️ 图片',
    };
    return types[ext ?? ''] ?? '📄 文件';
  }

  if (!result) return <p className="text-gray-500">加载中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📥 Downloads</h1>
        <button onClick={handleScan} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
          重新扫描
        </button>
      </div>

      <p className="text-sm text-gray-400">选中文件将移至废纸篓（非永久删除）</p>

      <div className="rounded-lg bg-gray-800 p-4">
        {result.items.map((item, i) => (
          <div
            key={i}
            className="flex cursor-pointer items-center gap-3 border-b border-gray-700 py-3 last:border-0 hover:bg-gray-700/50"
            onClick={() => toggleSelect(item.path)}
          >
            <input type="checkbox" checked={selected.has(item.path)} onChange={() => {}} className="rounded" />
            <span className="w-8">{getFileType(item.name)}</span>
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
            </div>
            <div className="font-bold">{formatBytes(item.size)}</div>
          </div>
        ))}
        {result.items.length === 0 && <p className="text-gray-500">没有大于 10MB 的文件</p>}
      </div>
    </div>
  );
}

export default DownloadsModule;
```

### Task 6.4: 更新 ModuleView

- [ ] **Step 1: 修改 src/components/ModuleView.tsx — 添加新模块导入**

在已有的 import 后添加:

```typescript
import SystemCacheModule from '@/modules/SystemCacheModule';
import CliToolsModule from '@/modules/CliToolsModule';
import DownloadsModule from '@/modules/DownloadsModule';
```

替换占位映射:

```typescript
'system-cache': <SystemCacheModule />,
'cli-tools': <CliToolsModule />,
downloads: <DownloadsModule />,
```

### Task 6.5: 验证 Phase 6

- [ ] **Step 1: 运行测试**

```bash
npm run dev
```

预期: 7 个清理模块全部可用

---

## Phase 7: 卸载系统

**目标:** 实现 APP 扫描/卸载、CLI 工具卸载、残留清理。

**文件:**
- Create: `electron/services/uninstaller.ts`
- Create: `electron/ipc/uninstall.ts`
- Create: `src/features/UninstallApps.tsx`
- Create: `src/features/UninstallCli.tsx`
- Create: `src/features/ResidualCleaner.tsx`
- Modify: `src/components/ModuleView.tsx`

### Task 7.1: 创建卸载服务

- [ ] **Step 1: 创建 electron/services/uninstaller.ts**

```typescript
import { execFileNoThrow } from '../utils/execFileNoThrow';
import type { AppInfo, AssociatedFile, CleanResult } from '../types';
import { readdir, stat, access, rm } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';

const home = homedir();

export async function scanApps(): Promise<AppInfo[]> {
  const appsDir = '/Applications';
  const apps: AppInfo[] = [];

  try {
    const entries = await readdir(appsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.app')) continue;
      const appPath = join(appsDir, entry);
      const appStat = await stat(appPath);

      // 获取 bundle ID
      const plistPath = join(appPath, 'Contents', 'Info.plist');
      let bundleId = '';
      const { stdout } = await execFileNoThrow('defaults', ['read', plistPath, 'CFBundleIdentifier']);
      bundleId = stdout.trim();

      // 扫描关联文件
      const associatedFiles = await findAssociatedFiles(bundleId, entry);

      apps.push({
        name: entry.replace('.app', ''),
        path: appPath,
        bundleId,
        size: appStat.size,
        associatedFiles,
      });
    }
  } catch { /* 无权限 */ }

  return apps;
}

async function findAssociatedFiles(bundleId: string, appName: string): Promise<AssociatedFile[]> {
  const files: AssociatedFile[] = [];
  const appNameLower = appName.replace('.app', '').toLowerCase();

  const searchPaths = [
    { dir: join(home, 'Library', 'Application Support'), type: 'support' as const },
    { dir: join(home, 'Library', 'Preferences'), type: 'preferences' as const },
    { dir: join(home, 'Library', 'Caches'), type: 'cache' as const },
    { dir: join(home, 'Library', 'Containers'), type: 'container' as const },
    { dir: join(home, 'Library', 'Saved Application State'), type: 'savedState' as const },
    { dir: join(home, 'Library', 'WebKit'), type: 'webkit' as const },
  ];

  for (const { dir, type } of searchPaths) {
    try {
      const entries = await readdir(dir);
      for (const entry of entries) {
        const entryLower = entry.toLowerCase();
        if (
          (bundleId && entryLower.includes(bundleId.toLowerCase())) ||
          entryLower.includes(appNameLower) ||
          entryLower.includes(appNameLower.replace(/\s/g, '')) ||
          entryLower.includes(appNameLower.replace(/\s/g, '-'))
        ) {
          const fullPath = join(dir, entry);
          const entryStat = await stat(fullPath);
          files.push({ path: fullPath, type, size: entryStat.isDirectory() ? await getDirSize(fullPath) : entryStat.size });
        }
      }
    } catch { /* 路径不存在 */ }
  }

  // 扫描隐藏目录 ~/.xxx
  const hiddenDirType: AssociatedFile['type'] = 'hiddenDir';
  try {
    const homeEntries = await readdir(home);
    for (const entry of homeEntries) {
      if (!entry.startsWith('.')) continue;
      const entryLower = entry.toLowerCase().replace('.', '');
      if (entryLower.includes(appNameLower) || entryLower.includes(appNameLower.replace(/\s/g, ''))) {
        const fullPath = join(home, entry);
        const entryStat = await stat(fullPath);
        if (entryStat.isDirectory()) {
          files.push({ path: fullPath, type: hiddenDirType, size: await getDirSize(fullPath) });
        }
      }
    }
  } catch { /* 无权限 */ }

  return files;
}

export async function uninstallApp(
  appPath: string,
  associatedPaths: string[],
  keepUserData: boolean,
): Promise<CleanResult> {
  const errors: string[] = [];
  let freedSpace = 0;

  // 删除 APP
  try {
    if (existsSync(appPath)) {
      const appStat = await stat(appPath);
      freedSpace += appStat.isDirectory() ? await getDirSize(appPath) : appStat.size;
      await rm(appPath, { recursive: true, force: true });
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // 删除关联文件
  for (const p of associatedPaths) {
    if (!existsSync(p)) continue;

    // 保留用户数据
    if (keepUserData) {
      if (p.includes('Application Support') || p.includes('Documents')) {
        continue; // 保留
      }
    }

    try {
      const fileStat = await stat(p);
      freedSpace += fileStat.isDirectory() ? await getDirSize(p) : fileStat.size;
      await rm(p, { recursive: true, force: true });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { success: errors.length === 0, freedSpace, errors };
}

async function getDirSize(dirPath: string): Promise<number> {
  const { stdout } = await execFileNoThrow('du', ['-sb', dirPath]);
  return parseInt(stdout.split('\t')[0], 10) || 0;
}

export async function scanResidual(): Promise<AppInfo[]> {
  // 扫描 Library 下无对应 APP 的残留文件
  const residuals: AppInfo[] = [];
  const apps = await scanApps();
  const appBundleIds = new Set(apps.map((a) => a.bundleId));
  const appNames = new Set(apps.map((a) => a.name.toLowerCase()));

  const searchDirs = [
    join(home, 'Library', 'Application Support'),
    join(home, 'Library', 'Preferences'),
    join(home, 'Library', 'Caches'),
  ];

  for (const searchDir of searchDirs) {
    try {
      const entries = await readdir(searchDir);
      for (const entry of entries) {
        // 提取 bundle ID 前缀
        const bundlePrefix = entry.split('.').slice(0, 3).join('.');
        if (bundlePrefix && !appBundleIds.has(bundlePrefix + '*') && !appNames.has(entry.toLowerCase().replace('.plist', ''))) {
          const fullPath = join(searchDir, entry);
          const entryStat = await stat(fullPath);
          residuals.push({
            name: entry.replace('.plist', '').replace(/^com\./, ''),
            path: fullPath,
            bundleId: entry,
            size: entryStat.isDirectory() ? await getDirSize(fullPath) : entryStat.size,
            associatedFiles: [{ path: fullPath, type: entry.endsWith('.plist') ? 'preferences' : 'support', size: entryStat.size }],
          });
        }
      }
    } catch { /* 跳过 */ }
  }

  return residuals;
}

// CLI 工具扫描和卸载
interface CliToolInfo {
  name: string;
  source: 'brew' | 'npm' | 'pip';
  version: string;
  path: string;
}

export async function scanCliTools(): Promise<CliToolInfo[]> {
  const tools: CliToolInfo[] = [];

  // Brew tools
  const { stdout: brewList } = await execFileNoThrow('brew', ['list', '--formula']);
  for (const pkg of brewList.trim().split('\n').slice(0, 50)) {
    const { stdout: info } = await execFileNoThrow('brew', ['info', pkg, '--json=v2']);
    try {
      const data = JSON.parse(info);
      const version = data.formulae?.[0]?.versions?.stable ?? '';
      tools.push({ name: pkg, source: 'brew', version, path: `/opt/homebrew/bin/${pkg}` });
    } catch {}
  }

  // npm global tools
  const { stdout: npmList } = await execFileNoThrow('npm', ['list', '-g', '--depth=0', '--json']);
  try {
    const data = JSON.parse(npmList);
    const deps = data.dependencies ?? {};
    for (const [name, info] of Object.entries(deps) as [string, { version: string }][]) {
      tools.push({ name, source: 'npm', version: info.version, path: '' });
    }
  } catch {}

  return tools;
}

export async function uninstallCliTool(name: string, source: string): Promise<CleanResult> {
  const commands: Record<string, [string, string[]]> = {
    brew: ['brew', ['uninstall', name]],
    npm: ['npm', ['uninstall', '-g', name]],
    pip: ['pip3', ['uninstall', '-y', name]],
  };
  const [cmd, args] = commands[source] ?? ['', []];
  if (!cmd) return { success: false, freedSpace: 0, errors: [`未知来源: ${source}`] };
  const { stderr } = await execFileNoThrow(cmd, args);
  return { success: !stderr, freedSpace: 0, errors: stderr ? [stderr] : [] };
}
```

### Task 7.2: 注册卸载 IPC handler

- [ ] **Step 1: 创建 electron/ipc/uninstall.ts**

```typescript
import { ipcMain } from 'electron';
import { scanApps, uninstallApp, scanResidual } from '../services/uninstaller';

export function registerUninstallHandlers() {
  ipcMain.handle('scan:apps', async () => scanApps());
  ipcMain.handle('uninstall:app', async (_event, appPath: string, paths: string[], keep: boolean) =>
    uninstallApp(appPath, paths, keep),
  );
  ipcMain.handle('scan:residual', async () => scanResidual());
  ipcMain.handle('scan:cli-tools', async () => scanCliTools());
  ipcMain.handle('uninstall:cli', async (_event, name: string, source: string) =>
    uninstallCliTool(name, source),
  );
}
```

- [ ] **Step 2: 在 electron/main.ts 中注册**

```typescript
import { registerUninstallHandlers } from './ipc/uninstall';

// 在 app.whenReady() 中:
registerUninstallHandlers();
```

### Task 7.3: 创建 APP 卸载页

- [ ] **Step 1: 创建 src/features/UninstallApps.tsx**

```typescript
import { useEffect, useState } from 'react';
import { scanApps, uninstallApp } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { AppInfo } from '@/types';

function UninstallApps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [selected, setSelected] = useState<AppInfo | null>(null);
  const [keepUserData, setKeepUserData] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await scanApps();
      setApps(result);
    } finally {
      setScanning(false);
    }
  }

  async function handleUninstall() {
    if (!selected) return;
    const paths = selected.associatedFiles.map((f) => f.path);
    await uninstallApp(selected.path, paths, keepUserData);
    setSelected(null);
    await handleScan();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📱 已安装 APP</h1>
        <button onClick={handleScan} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
          重新扫描
        </button>
      </div>

      {/* APP 列表 */}
      <div className="grid grid-cols-2 gap-3">
        {apps.map((app, i) => (
          <button
            key={i}
            onClick={() => setSelected(app)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              selected?.path === app.path ? 'border-red-500 bg-red-500/10' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <div className="font-medium">{app.name}</div>
            <div className="text-xs text-gray-400">
              {formatBytes(app.size)} • {app.associatedFiles.length} 个关联文件
            </div>
          </button>
        ))}
      </div>

      {/* 选中详情 */}
      {selected && (
        <div className="rounded-lg border border-red-500/50 bg-gray-800 p-4">
          <h3 className="mb-3 text-lg font-bold text-red-400">🗑️ 卸载 {selected.name}</h3>

          <div className="mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={keepUserData} onChange={(e) => setKeepUserData(e.target.checked)} className="rounded" />
              保留用户数据（Documents、Application Support 中的用户文件）
            </label>
          </div>

          <div className="mb-3 max-h-40 overflow-y-auto rounded bg-gray-900 p-2 text-xs">
            <div className="font-medium text-gray-400 mb-1">将被删除的文件：</div>
            <div className="text-red-400">{selected.path}</div>
            {selected.associatedFiles.map((f, i) => (
              <div key={i} className="text-gray-400">{f.path} ({formatBytes(f.size)})</div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUninstall}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
            >
              确认卸载
            </button>
            <button
              onClick={() => setSelected(null)}
              className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium hover:bg-gray-500"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UninstallApps;
```

### Task 7.4: 创建 CLI 卸载页 + 残留清理页

- [ ] **Step 1: 创建 src/features/UninstallCli.tsx**

```typescript
import { useEffect, useState } from 'react';
import { uninstallCliTool } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

interface CliTool {
  name: string;
  source: 'brew' | 'npm' | 'pip';
  version: string;
  path: string;
}

function UninstallCli() {
  const [tools, setTools] = useState<CliTool[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await window.electronAPI.ipc.invoke('scan:cli-tools') as CliTool[];
      setTools(result);
    } finally {
      setScanning(false);
    }
  }

  async function handleUninstall(tool: CliTool) {
    await uninstallCliTool(tool.name, tool.source);
    await handleScan();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📦 CLI 工具卸载</h1>
        <button onClick={handleScan} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
          重新扫描
        </button>
      </div>

      <div className="rounded-lg bg-gray-800 p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="pb-2 text-left">工具</th>
              <th className="pb-2 text-left">来源</th>
              <th className="pb-2 text-left">版本</th>
              <th className="pb-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2">{tool.name}</td>
                <td className="py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    tool.source === 'brew' ? 'bg-orange-500/20 text-orange-400' :
                    tool.source === 'npm' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{tool.source}</span>
                </td>
                <td className="py-2 text-gray-400">{tool.version}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleUninstall(tool)}
                    className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30"
                  >
                    卸载
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tools.length === 0 && <p className="text-gray-500">{scanning ? '扫描中...' : '没有检测到 CLI 工具'}</p>}
      </div>
    </div>
  );
}

export default UninstallCli;
```

- [ ] **Step 2: 创建 src/features/ResidualCleaner.tsx**

```typescript
import { useEffect, useState } from 'react';
import { scanResidual, advancedClean } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';
import type { AppInfo, CleanAction } from '@/types';

function ResidualCleaner() {
  const [residuals, setResiduals] = useState<AppInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);

  useEffect(() => { handleScan(); }, []);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await scanResidual();
      setResiduals(result);
    } finally {
      setScanning(false);
    }
  }

  async function handleClean() {
    const actions: CleanAction[] = residuals
      .filter((r) => selected.has(r.path))
      .flatMap((r) => r.associatedFiles.map((f) => ({
        path: f.path,
        size: f.size,
        description: f.path,
      })));

    if (actions.length === 0) return;

    setScanning(true);
    try {
      await advancedClean('system-cache', actions);
      await handleScan();
    } finally {
      setScanning(false);
      setSelected(new Set());
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🗑️ APP 残留清理</h1>
        <button onClick={handleClean} disabled={selected.size === 0} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          清理选中 ({selected.size})
        </button>
      </div>

      <p className="text-sm text-gray-400">以下文件属于已卸载 APP 的残留</p>

      <div className="rounded-lg bg-gray-800 p-4">
        {residuals.map((res, i) => (
          <div
            key={i}
            className="flex cursor-pointer items-center gap-3 border-b border-gray-700 py-3 last:border-0 hover:bg-gray-700/50"
            onClick={() => {
              const next = new Set(selected);
              next.has(res.path) ? next.delete(res.path) : next.add(res.path);
              setSelected(next);
            }}
          >
            <input type="checkbox" checked={selected.has(res.path)} onChange={() => {}} className="rounded" />
            <div className="flex-1">
              <div className="font-medium">{res.name}</div>
              <div className="text-xs text-gray-400">{res.path}</div>
            </div>
            <div className="font-bold">{formatBytes(res.size)}</div>
          </div>
        ))}
        {residuals.length === 0 && <p className="text-gray-500">没有检测到残留文件</p>}
      </div>
    </div>
  );
}

export default ResidualCleaner;
```

### Task 7.5: 更新 ModuleView

- [ ] **Step 1: 修改 src/components/ModuleView.tsx**

添加导入:

```typescript
import UninstallApps from '@/features/UninstallApps';
import UninstallCli from '@/features/UninstallCli';
import ResidualCleaner from '@/features/ResidualCleaner';
```

替换占位:

```typescript
'uninstall-apps': <UninstallApps />,
'uninstall-cli': <UninstallCli />,
'residual-clean': <ResidualCleaner />,
```

### Task 7.6: 验证 Phase 7

- [ ] **Step 1: 运行测试**

```bash
npm run dev
```

预期: APP 列表可展示，选中后显示关联文件，点击卸载确认。

---

## Phase 8: 设置页 + 定时扫描 + AI 分析 + 最终打磨

**目标:** 完成设置页、定时扫描、AI 分析（可选）选项、APP 图标、打包配置。

**文件:**
- Create: `src/components/SettingsView.tsx`
- Create: `electron/services/scheduler.ts`
- Create: `electron/ipc/schedule.ts`
- Create: `src/features/AiAnalyzer.tsx`
- Create: `electron-builder.json`
- Modify: `src/components/ModuleView.tsx`

### Task 8.1: 创建定时调度服务

- [ ] **Step 1: 创建 electron/services/scheduler.ts**

```typescript
import { BrowserWindow } from 'electron';
import { scanAllModules } from './scanner';

let scheduleInterval: NodeJS.Timeout | null = null;

export function registerSchedule(cronExpression: string, window: BrowserWindow): boolean {
  // 简化实现：按小时检查
  const [minute] = cronExpression.split(' ');
  const targetMinute = parseInt(minute, 10);

  if (scheduleInterval) clearInterval(scheduleInterval);

  scheduleInterval = setInterval(async () => {
    const now = new Date();
    if (now.getMinutes() === targetMinute) {
      const results = await scanAllModules();
      window.webContents.send('events:complete', {
        success: true,
        freedSpace: 0,
        errors: [],
        type: 'schedule-scan',
        results,
      });
    }
  }, 60000); // 每分钟检查

  return true;
}

export function stopSchedule() {
  if (scheduleInterval) {
    clearInterval(scheduleInterval);
    scheduleInterval = null;
  }
}
```

- [ ] **Step 2: 创建 electron/ipc/schedule.ts**

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { registerSchedule } from '../services/scheduler';

export function registerScheduleHandlers(window: BrowserWindow) {
  ipcMain.handle('schedule:register', async (_event, cron: string) => {
    return registerSchedule(cron, window);
  });
}
```

### Task 8.2: 创建设置页

- [ ] **Step 1: 创建 src/components/SettingsView.tsx**

```typescript
import { useState } from 'react';
import { registerSchedule } from '@/lib/ipc';

function SettingsView() {
  const [scanTime, setScanTime] = useState('09:00');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (scheduleEnabled) {
      const [hour, minute] = scanTime.split(':');
      await registerSchedule(`${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ 设置</h1>

      {/* 定时扫描 */}
      <div className="rounded-lg bg-gray-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">定时扫描</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} className="rounded" />
          启用每日自动扫描
        </label>
        {scheduleEnabled && (
          <div className="mt-2">
            <label className="text-sm text-gray-400">扫描时间：</label>
            <input
              type="time"
              value={scanTime}
              onChange={(e) => setScanTime(e.target.value)}
              className="ml-2 rounded bg-gray-700 px-2 py-1 text-sm"
            />
          </div>
        )}
      </div>

      {/* AI 分析 */}
      <div className="rounded-lg bg-gray-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">AI 增强分析</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className="rounded" />
          启用 AI 分析（可选）
        </label>
        {aiEnabled && (
          <div className="mt-2 space-y-2">
            <div>
              <label className="text-sm text-gray-400">Ollama 地址：</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="ml-2 w-64 rounded bg-gray-700 px-2 py-1 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">AI 仅在手动触发时调用，不会产生后台费用</p>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700"
      >
        {saved ? '已保存 ✓' : '保存设置'}
      </button>
    </div>
  );
}

export default SettingsView;
```

### Task 8.3: 创建 AI 分析组件

- [ ] **Step 1: 创建 src/features/AiAnalyzer.tsx**

```typescript
// AI 分析组件 — V1 为占位，后续集成 Ollama/Claude API
function AiAnalyzer() {
  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
      <h3 className="mb-2 text-sm font-semibold text-purple-400">🤖 AI 分析</h3>
      <p className="text-sm text-gray-400">
        在设置中启用 AI 分析后，可右键未知目录获取智能分析。
      </p>
    </div>
  );
}

export default AiAnalyzer;
```

### Task 8.4: 创建 electron-builder 配置

- [ ] **Step 1: 创建 electron-builder.json**

```json
{
  "appId": "com.maccleaner.app",
  "productName": "MacCleaner",
  "directories": {
    "output": "out"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "mac": {
    "category": "public.app-category.utilities",
    "target": ["dmg", "zip"],
    "icon": "resources/icon.icns"
  },
  "dmg": {
    "title": "MacCleaner"
  }
}
```

### Task 8.5: 更新 ModuleView 添加设置页

- [ ] **Step 1: 修改 src/components/ModuleView.tsx**

添加导入:

```typescript
import SettingsView from '@/components/SettingsView';
```

替换设置占位:

```typescript
settings: <SettingsView />,
```

### Task 8.6: 验证 Phase 8 + 打包

- [ ] **Step 1: 运行全功能测试**

```bash
npm run dev
```

- [ ] **Step 2: 打包 macOS APP**

```bash
npm run build
npm run build:mac
```

预期: `out/` 目录下生成 MacCleaner.dmg

---

## 实现顺序总结

| Phase | 内容 | 产出 |
|-------|------|------|
| **1** | 项目脚手架 | 空白 Electron 窗口 |
| **2** | 类型 + 状态管理 + 命令封装 | 可复用的基础设施 |
| **3** | 侧边栏 + 模块容器 + Tray | APP 整体布局 |
| **4** | 仪表盘 + 扫描引擎 | 可展示磁盘信息 |
| **5** | Brew + Docker + npm + Conda | 4 个核心清理模块 |
| **6** | 系统缓存 + CLI + Downloads | 全部 7 个清理模块 |
| **7** | APP 卸载 + CLI 卸载 + 残留 | 完整卸载系统 |
| **8** | 设置 + 定时 + AI 选项 + 打包 | 可发布的完整 APP |
