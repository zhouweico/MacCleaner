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
