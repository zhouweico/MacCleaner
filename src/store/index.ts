import { create } from 'zustand';
import type { ModuleId, ModuleScanResult, AppInfo, NavItem, HiddenDirInfo, CleanResult } from '@/types';

export type SelectedItem = {
  path: string;
  name: string;
  size?: number;
} | Record<string, unknown>;

export interface AppState {
  currentModule: string;
  setCurrentModule: (id: string) => void;

  scanResults: Partial<Record<ModuleId, ModuleScanResult>>;
  hiddenDirs: HiddenDirInfo[];
  apps: AppInfo[];
  residuals: AppInfo[];
  isScanning: boolean;
  scanProgress: number;

  setScanResults: (results: Partial<Record<ModuleId, ModuleScanResult>> | ((prev: Partial<Record<ModuleId, ModuleScanResult>>) => Partial<Record<ModuleId, ModuleScanResult>>)) => void;
  setHiddenDirs: (dirs: HiddenDirInfo[]) => void;
  setApps: (apps: AppInfo[]) => void;
  setResiduals: (residuals: AppInfo[]) => void;
  setScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number) => void;

  lastCleanResult: CleanResult | null;
  setLastCleanResult: (result: CleanResult | null) => void;

  // Selection state for 3-column layout
  selectedItem: SelectedItem | null;
  selectedPaths: Set<string>;
  setSelectedItem: (item: SelectedItem | null) => void;
  toggleSelection: (path: string) => void;
  selectItem: (path: string, item?: SelectedItem) => void;
  clearSelection: () => void;
  isSelected: (path: string) => boolean;

  totalCleanable: number;
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '', group: 'clean' },
  { id: 'brew', label: 'Brew 缓存', icon: '🍺', group: 'clean' },
  { id: 'docker', label: 'Docker 清理', icon: '🐳', group: 'clean' },
  { id: 'npm', label: 'npm/Node', icon: '📦', group: 'clean' },
  { id: 'conda', label: 'Conda/Python', icon: '🐍', group: 'clean' },
  { id: 'system-cache', label: '系统缓存', icon: '🗂️', group: 'clean' },
  { id: 'cli-tools', label: 'CLI 工具', icon: '🛠️', group: 'clean' },
  { id: 'downloads', label: 'Downloads', icon: '📥', group: 'clean' },
  { id: 'uninstall-apps', label: '已安装 APP', icon: '📱', group: 'uninstall' },
  { id: 'uninstall-cli', label: 'CLI 工具卸载', icon: '📦', group: 'uninstall' },
  { id: 'residual-clean', label: 'APP 残留清理', icon: '🗑️', group: 'uninstall' },
  { id: 'settings', label: '设置', icon: '⚙️', group: 'settings' },
];

export const useAppStore = create<AppState>((set, get) => ({
  currentModule: 'dashboard',
  setCurrentModule: (id) => set({ currentModule: id, selectedItem: null, selectedPaths: new Set() }),

  scanResults: {},
  hiddenDirs: [],
  apps: [],
  residuals: [],
  isScanning: false,
  scanProgress: 0,

  setScanResults: (results) => set((state) => ({
    scanResults: {
      ...state.scanResults,
      ...(typeof results === 'function' ? results(state.scanResults) : results),
    },
  })),
  setHiddenDirs: (dirs) => set({ hiddenDirs: dirs }),
  setApps: (apps) => set({ apps }),
  setResiduals: (residuals) => set({ residuals }),
  setScanning: (scanning) => set({ isScanning: scanning, scanProgress: scanning ? 0 : 100 }),
  setScanProgress: (progress) => set({ scanProgress: progress }),

  lastCleanResult: null,
  setLastCleanResult: (result) => set({ lastCleanResult: result }),

  // Selection state
  selectedItem: null,
  selectedPaths: new Set(),
  setSelectedItem: (item) => set({ selectedItem: item }),
  toggleSelection: (path) => set((state) => {
    const next = new Set(state.selectedPaths);
    next.has(path) ? next.delete(path) : next.add(path);
    return { selectedPaths: next };
  }),
  selectItem: (path, item) => set({ selectedPaths: new Set([path]), selectedItem: item ?? null }),
  clearSelection: () => set({ selectedPaths: new Set(), selectedItem: null }),
  isSelected: (path) => get().selectedPaths.has(path),

  get totalCleanable() {
    return Object.values(this.scanResults).reduce<number>(
      (sum, r) => sum + ((r as ModuleScanResult)?.totalSize ?? 0),
      0,
    );
  },
}));
