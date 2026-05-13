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

export async function scanAppAssociated(bundleId: string, appName: string): Promise<AppInfo['associatedFiles']> {
  return window.electronAPI.ipc.invoke('scan:app-associated', bundleId, appName) as Promise<AppInfo['associatedFiles']>;
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
  return window.electronAPI.ipc.on('events:progress', (event) => callback(event as ProgressEvent));
}

export function onComplete(callback: (result: CleanResult) => void): () => void {
  return window.electronAPI.ipc.on('events:complete', (result) => callback(result as CleanResult));
}

export function onError(callback: (error: string) => void): () => void {
  return window.electronAPI.ipc.on('events:error', (error) => callback(error as string));
}

export async function scanCliToolsList(): Promise<unknown[]> {
  return window.electronAPI.ipc.invoke('scan:cli-tools') as Promise<unknown[]>;
}

export async function uninstallCliTool(name: string, source: string): Promise<CleanResult> {
  return window.electronAPI.ipc.invoke('uninstall:cli', name, source) as Promise<CleanResult>;
}
