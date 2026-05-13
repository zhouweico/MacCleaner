import { execFileNoThrow } from '../utils/execFileNoThrow';
import type { AppInfo, AssociatedFile, CleanResult } from '../types';
import { readdir, stat } from 'fs/promises';
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

      let bundleId = '';
      const plistPath = join(appPath, 'Contents', 'Info.plist');
      if (existsSync(plistPath)) {
        const { stdout } = await execFileNoThrow('defaults', ['read', plistPath, 'CFBundleIdentifier']);
        bundleId = stdout.trim();
      }

      apps.push({
        name: entry.replace('.app', ''),
        path: appPath,
        bundleId,
        size: appStat.isDirectory() ? await getDirSize(appPath) : appStat.size,
        associatedFiles: [],
      });
    }
  } catch { /* 无权限 */ }

  return apps;
}

export async function findAssociatedFiles(bundleId: string, appName: string): Promise<AssociatedFile[]> {
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
          files.push({
            path: fullPath,
            type,
            size: entryStat.isDirectory() ? await getDirSize(fullPath) : entryStat.size,
          });
        }
      }
    } catch { /* 路径不存在 */ }
  }

  // 扫描隐藏目录 ~/.xxx
  try {
    const homeEntries = await readdir(home);
    for (const entry of homeEntries) {
      if (!entry.startsWith('.')) continue;
      const entryLower = entry.slice(1).toLowerCase();
      if (
        entryLower.includes(appNameLower) ||
        entryLower.includes(appNameLower.replace(/\s/g, '')) ||
        entryLower.includes(appNameLower.replace(/\s/g, '-'))
      ) {
        const fullPath = join(home, entry);
        const entryStat = await stat(fullPath);
        if (entryStat.isDirectory()) {
          files.push({ path: fullPath, type: 'hiddenDir', size: await getDirSize(fullPath) });
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
      freedSpace += await getDirSize(appPath);
      await import('fs/promises').then(({ rm }) => rm(appPath, { recursive: true, force: true }));
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // 删除关联文件
  for (const p of associatedPaths) {
    if (!existsSync(p)) continue;

    if (keepUserData) {
      if (p.includes('Application Support') || p.includes('Documents')) {
        continue;
      }
    }

    try {
      freedSpace += await getDirSize(p);
      await import('fs/promises').then(({ rm }) => rm(p, { recursive: true, force: true }));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { success: errors.length === 0, freedSpace, errors };
}

export async function scanResidual(): Promise<AppInfo[]> {
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
        const bundlePrefix = entry.split('.').slice(0, 3).join('.');
        if (bundlePrefix && !appBundleIds.has(bundlePrefix) && !appNames.has(entry.toLowerCase().replace('.plist', ''))) {
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

export interface CliToolInfo {
  name: string;
  source: 'brew' | 'npm' | 'pip';
  version: string;
  path: string;
}

export async function scanCliTools(): Promise<CliToolInfo[]> {
  const tools: CliToolInfo[] = [];

  // brew: get all formula info in one call
  try {
    const { stdout: brewInfo } = await execFileNoThrow('brew', ['info', '--json=v2']);
    const data = JSON.parse(brewInfo);
    for (const formula of (data.formulae ?? []).slice(0, 50)) {
      tools.push({ name: formula.name, source: 'brew', version: formula.versions?.stable ?? '', path: `/opt/homebrew/bin/${formula.name}` });
    }
  } catch {}

  try {
    const { stdout: npmList } = await execFileNoThrow('npm', ['list', '-g', '--depth=0', '--json']);
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

async function getDirSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execFileNoThrow('du', ['-sk', dirPath]);
    const kb = parseInt(stdout.split('\t')[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}
