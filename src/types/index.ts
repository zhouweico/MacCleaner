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
  modifiedAt?: number;
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
  iconData?: string;
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
