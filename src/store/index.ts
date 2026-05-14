import { create } from 'zustand';
import type { ModuleId, ModuleScanResult, AppInfo, NavItem, HiddenDirInfo, CleanResult } from '@/types';

export type SelectedItem = {
  path: string;
  name: string;
  size?: number;
} | Record<string, unknown>;

export interface SearchResult {
  moduleId: string;
  moduleName: string;
  moduleIcon: string;
  itemName: string;
  itemPath?: string;
  itemSize?: number;
  itemType: 'module' | 'item' | 'app' | 'residual' | 'cli-tool';
}

export interface AppState {
  currentModule: string;
  setCurrentModule: (id: string) => void;

  scanResults: Partial<Record<ModuleId, ModuleScanResult>>;
  hiddenDirs: HiddenDirInfo[];
  apps: AppInfo[];
  residuals: AppInfo[];
  cliTools: { name: string; source: string; version: string; path: string; size?: number }[];
  isScanning: boolean;
  scanProgress: number;

  setScanResults: (results: Partial<Record<ModuleId, ModuleScanResult>> | ((prev: Partial<Record<ModuleId, ModuleScanResult>>) => Partial<Record<ModuleId, ModuleScanResult>>)) => void;
  setHiddenDirs: (dirs: HiddenDirInfo[]) => void;
  setApps: (apps: AppInfo[]) => void;
  setResiduals: (residuals: AppInfo[]) => void;
  setCliTools: (tools: { name: string; source: string; version: string; path: string; size?: number }[]) => void;
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

  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  // Path to auto-select after navigation (from search)
  searchTargetPath: string;
  setSearchTargetPath: (path: string) => void;
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '🏠', group: 'clean' },
  { id: 'brew', label: 'Homebrew', icon: '🍺', group: 'clean' },
  { id: 'docker', label: 'Docker', icon: '🐳', group: 'clean' },
  { id: 'npm', label: 'npm 缓存', icon: '📦', group: 'clean' },
  { id: 'conda', label: 'Conda 环境', icon: '🐍', group: 'clean' },
  { id: 'system-cache', label: '系统缓存', icon: '🗂️', group: 'clean' },
  { id: 'cli-tools', label: 'CLI 工具', icon: '🛠️', group: 'clean' },
  { id: 'downloads', label: '下载', icon: '📥', group: 'clean' },
  { id: 'uninstall-apps', label: '应用程序', icon: '📱', group: 'uninstall' },
  { id: 'uninstall-cli', label: 'CLI 工具卸载', icon: '🛠️', group: 'uninstall' },
  { id: 'residual-clean', label: '残留文件', icon: '🗑️', group: 'uninstall' },
  { id: 'settings', label: '设置', icon: '⚙️', group: 'settings' },
];

export const useAppStore = create<AppState>((set, get) => ({
  currentModule: 'dashboard',
  setCurrentModule: (id) => set({ currentModule: id, selectedItem: null, selectedPaths: new Set() }),

  scanResults: {},
  hiddenDirs: [],
  apps: [],
  residuals: [],
  cliTools: [],
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
  setCliTools: (cliTools) => set({ cliTools }),
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

  // Search state
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: '' }),
  searchTargetPath: '',
  setSearchTargetPath: (path) => set({ searchTargetPath: path }),
}));

// --- Search helpers (pure functions, not in store) ---

function getModuleIcon(moduleId: string): string {
  return navItems.find(n => n.id === moduleId)?.icon ?? '';
}

function match(text: string, query: string): boolean {
  if (!query) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Build search results from current app state.
 * Called externally by Sidebar to get real-time results.
 */
export function buildSearchResults(): SearchResult[] {
  const state = useAppStore.getState();
  const q = state.searchQuery;
  if (!q) return [];

  const results: SearchResult[] = [];

  // 1. Search nav items (module names)
  for (const nav of navItems) {
    if (match(nav.label, q)) {
      results.push({
        moduleId: nav.id,
        moduleName: nav.label,
        moduleIcon: nav.icon,
        itemName: nav.label,
        itemType: 'module',
      });
    }
  }

  // 2. Search scanResults items
  for (const [moduleId, scanResult] of Object.entries(state.scanResults)) {
    if (!scanResult || !scanResult.items) continue;
    const nav = navItems.find(n => n.id === moduleId);
    if (!nav) continue;

    for (const item of scanResult.items) {
      if (match(item.name, q) || match(item.path, q) || (item as unknown as { description?: string }).description && match((item as unknown as { description: string }).description, q)) {
        results.push({
          moduleId,
          moduleName: nav.label,
          moduleIcon: nav.icon,
          itemName: item.name,
          itemPath: item.path,
          itemSize: item.size,
          itemType: 'item',
        });
      }
    }
  }

  // 3. Search installed apps
  for (const app of state.apps) {
    if (match(app.name, q) || match(app.path, q) || match(app.bundleId, q)) {
      results.push({
        moduleId: 'uninstall-apps',
        moduleName: '应用程序',
        moduleIcon: getModuleIcon('uninstall-apps'),
        itemName: app.name,
        itemPath: app.path,
        itemSize: app.size,
        itemType: 'app',
      });
    }
  }

  // 4. Search residuals
  for (const res of state.residuals) {
    if (match(res.name, q) || match(res.path, q)) {
      results.push({
        moduleId: 'residual-clean',
        moduleName: '残留文件',
        moduleIcon: getModuleIcon('residual-clean'),
        itemName: res.name,
        itemPath: res.path,
        itemSize: res.size,
        itemType: 'residual',
      });
    }
  }

  // 5. Search CLI tools
  for (const tool of state.cliTools) {
    if (match(tool.name, q) || match(tool.source, q) || match(tool.version, q)) {
      const cliKey = tool.path || `${tool.source}:${tool.name}`;
      results.push({
        moduleId: 'uninstall-cli',
        moduleName: 'CLI 工具卸载',
        moduleIcon: getModuleIcon('uninstall-cli'),
        itemName: tool.name,
        itemPath: cliKey,
        itemSize: tool.size,
        itemType: 'cli-tool',
      });
    }
  }

  return results;
}

/**
 * Group search results by module for sidebar display.
 */
export function groupSearchResults(results: SearchResult[]): { moduleId: string; moduleName: string; moduleIcon: string; items: SearchResult[] }[] {
  const groups = new Map<string, { moduleName: string; moduleIcon: string; items: SearchResult[] }>();

  for (const r of results) {
    if (!groups.has(r.moduleId)) {
      groups.set(r.moduleId, { moduleName: r.moduleName, moduleIcon: r.moduleIcon, items: [] });
    }
    groups.get(r.moduleId)!.items.push(r);
  }

  return Array.from(groups.entries()).map(([moduleId, group]) => ({
    moduleId,
    moduleName: group.moduleName,
    moduleIcon: group.moduleIcon,
    items: group.items,
  }));
}
