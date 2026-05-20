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

export async function showItemInFolder(filePath: string): Promise<{ success: boolean; error?: string }> {
  return window.electronAPI.ipc.invoke('finder:show-item', filePath) as Promise<{ success: boolean; error?: string }>;
}

export async function getFinderIcon(): Promise<string> {
  const result = await window.electronAPI.ipc.invoke('finder:icon') as { iconDataUri: string };
  return result.iconDataUri;
}

export interface OperationLogEntry {
  timestamp: string;
  type: 'clean' | 'uninstall' | 'trash' | 'scan';
  module: string;
  freedSpace: number;
  success: boolean;
  error?: string;
  details?: string;
}

export async function getOperationLogs(): Promise<OperationLogEntry[]> {
  return window.electronAPI.ipc.invoke('log:get') as Promise<OperationLogEntry[]>;
}

export async function clearOperationLogs(): Promise<boolean> {
  return window.electronAPI.ipc.invoke('log:clear') as Promise<boolean>;
}

export interface AiAnalysisResult {
  software: string;
  category: 'cache' | 'config' | 'data' | 'log' | 'unknown';
  safeToDelete: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  recommendedAction: string;
}

export interface AiProviderConfig {
  type: 'ollama' | 'openai' | 'anthropic';
  url?: string;
  model?: string;
  apiKey?: string;
}

export async function aiAnalyze(dirPath: string, config?: AiProviderConfig): Promise<AiAnalysisResult> {
  return window.electronAPI.ipc.invoke('ai:analyze', dirPath, config) as Promise<AiAnalysisResult>;
}

export async function testAiConnection(config: AiProviderConfig): Promise<{ success: boolean; error?: string }> {
  return window.electronAPI.ipc.invoke('ai:test-connection', config) as Promise<{ success: boolean; error?: string }>;
}

export function showAbout() {
  window.electronAPI.ipc.send('app:about');
}

export async function getAppInfo(): Promise<{ name: string; version: string; description: string; electron: string; node: string }> {
  return window.electronAPI.ipc.invoke('app:info') as Promise<{ name: string; version: string; description: string; electron: string; node: string }>;
}

export async function checkForUpdates(): Promise<{ success: boolean; error?: string }> {
  return window.electronAPI.ipc.invoke('update:check') as Promise<{ success: boolean; error?: string }>;
}

export async function downloadUpdate(): Promise<{ success: boolean; error?: string }> {
  return window.electronAPI.ipc.invoke('update:download') as Promise<{ success: boolean; error?: string }>;
}

export function onUpdateChecking(callback: () => void): () => void {
  return window.electronAPI.ipc.on('update:checking', () => callback());
}

export function onUpdateProgress(callback: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void): () => void {
  return window.electronAPI.ipc.on('update:progress', (data) => callback(data as { percent: number; bytesPerSecond: number; transferred: number; total: number }));
}

export function onUpdateAvailable(callback: (data: { version: string }) => void): () => void {
  return window.electronAPI.ipc.on('update:available', (data) => callback(data as { version: string }));
}

export function onUpdateNotAvailable(callback: () => void): () => void {
  return window.electronAPI.ipc.on('update:not-available', () => callback());
}

export function onUpdateDownloaded(callback: (data: { version: string }) => void): () => void {
  return window.electronAPI.ipc.on('update:downloaded', (data) => callback(data as { version: string }));
}

export function onUpdateError(callback: (data: { message: string }) => void): () => void {
  return window.electronAPI.ipc.on('update:error', (data) => callback(data as { message: string }));
}

export async function installUpdate(): Promise<{ success: boolean; error?: string }> {
  return window.electronAPI.ipc.invoke('update:install') as Promise<{ success: boolean; error?: string }>;
}

export function openExternal(url: string) {
  window.electronAPI.ipc.invoke('shell:open-external', url);
}
