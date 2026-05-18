import { execFileNoThrow } from '../utils/execFileNoThrow';
import { extractAppIcon } from '../utils/extractAppIcon';
import type { AppInfo, AssociatedFile, CleanResult } from '../types';
import { readdir, stat, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const home = homedir();

// Protected directories that should never be marked for deletion
const PROTECTED_DIRS = new Set([
  '.ssh', '.gnupg', '.keychain', '.pki', '.aws', '.azure', '.gcp',
]);

/**
 * Generate matching variants of an app name for hidden directory matching.
 * e.g. "App Cleaner 8" → ["appcleaner8", "app-cleaner-8", "app_cleaner_8", "appcleaner"]
 */
function generateAppVariants(appName: string): string[] {
  const base = appName.replace('.app', '').toLowerCase();
  const variants = new Set<string>();
  variants.add(base);
  variants.add(base.replace(/\s+/g, ''));
  variants.add(base.replace(/\s+/g, '-'));
  variants.add(base.replace(/\s+/g, '_'));
  // Remove version numbers
  variants.add(base.replace(/[\s\d]+$/g, '').replace(/\s+/g, ''));
  variants.add(base.replace(/[\s\d]+$/g, '').replace(/\s+/g, '-'));
  return Array.from(variants);
}

/**
 * Extract the tool name from a bundle ID for ~/.xxx matching.
 * e.g. "com.microsoft.VSCode" → "vscode"
 */
function bundleIdToToolName(bundleId: string): string {
  const parts = bundleId.split('.');
  return (parts[parts.length - 1] ?? '').toLowerCase();
}

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
        iconData: await extractAppIcon(appPath),
        associatedFiles: [],
      });
    }
  } catch { /* 无权限 */ }

  return apps;
}

export async function findAssociatedFiles(bundleId: string, appName: string): Promise<AssociatedFile[]> {
  const files: AssociatedFile[] = [];
  const appVariants = generateAppVariants(appName);
  const bundleToolName = bundleId ? bundleIdToToolName(bundleId) : '';

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
        const matches =
          (bundleId && entryLower.includes(bundleId.toLowerCase())) ||
          appVariants.some(v => entryLower.includes(v));
        if (matches) {
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
  // Match by: app name variants, bundle ID derived name
  try {
    const homeEntries = await readdir(home);
    for (const entry of homeEntries) {
      if (!entry.startsWith('.')) continue;
      const dirName = entry.slice(1); // remove leading dot
      const dirNameLower = dirName.toLowerCase();

      // Skip protected directories
      if (PROTECTED_DIRS.has(entry)) continue;

      const matches =
        appVariants.some(v => dirNameLower.includes(v)) ||
        (bundleToolName && dirNameLower.includes(bundleToolName));

      if (matches) {
        const fullPath = join(home, entry);
        const entryStat = await stat(fullPath);
        if (entryStat.isDirectory()) {
          files.push({ path: fullPath, type: 'hiddenDir', size: await getDirSize(fullPath) });
        }
      }
    }
  } catch { /* 无权限 */ }

  // 扫描 ~/.config/<appname>/ subdirectories
  const configDir = join(home, '.config');
  try {
    if (existsSync(configDir)) {
      const configEntries = await readdir(configDir);
      for (const entry of configEntries) {
        const entryLower = entry.toLowerCase();
        const matches = appVariants.some(v => entryLower.includes(v)) ||
          (bundleToolName && entryLower.includes(bundleToolName));
        if (matches) {
          const fullPath = join(configDir, entry);
          const entryStat = await stat(fullPath);
          if (entryStat.isDirectory()) {
            // Avoid duplicates if already found above
            if (!files.some(f => f.path === fullPath)) {
              files.push({ path: fullPath, type: 'hiddenDir', size: await getDirSize(fullPath) });
            }
          }
        }
      }
    }
  } catch { /* 路径不存在 */ }

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

    // Skip protected directories
    if ([...PROTECTED_DIRS].some(protectedDir => p.includes(protectedDir))) continue;

    if (keepUserData) {
      if (p.includes('Application Support') || p.includes('Documents')) {
        continue;
      }
      // For hidden directories, keep config-like dirs when keeping user data
      if (p.includes('.config/') || p.includes('.local/')) {
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

  // Known hidden dir names that belong to installed tools
  const knownToolDirs = new Set<string>();
  try {
    const hiddenDirsPath = join(__dirname, '../data/known-hidden-dirs.json');
    if (existsSync(hiddenDirsPath)) {
      const raw = JSON.parse(await readFile(hiddenDirsPath, 'utf-8'));
      for (const category of Object.values(raw) as Record<string, { path: string; tool?: string }>[] as any[]) {
        if (Array.isArray(category)) {
          for (const item of category) {
            knownToolDirs.add(item.path.replace('.', ''));
            if (item.tool) knownToolDirs.add(item.tool.toLowerCase());
          }
        }
      }
    }
  } catch {}

  // Scan Library directories for orphaned files
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
        const isOrphan = bundlePrefix &&
          ![...appBundleIds].some(id => id.startsWith(bundlePrefix)) &&
          !appNames.has(entry.toLowerCase().replace('.plist', ''));
        if (isOrphan) {
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

  // Scan hidden directories ~/.xxx for orphans
  // A hidden dir is "orphaned" if its name doesn't match any installed app AND isn't a known tool
  try {
    const homeEntries = await readdir(home);
    for (const entry of homeEntries) {
      if (!entry.startsWith('.')) continue;
      const dirName = entry.slice(1).toLowerCase();

      // Skip protected and known tool directories
      if ([...PROTECTED_DIRS].includes(entry) || knownToolDirs.has(dirName)) continue;
      // Skip directories modified within last 7 days (likely active)
      try {
        const entryStat = await stat(join(home, entry));
        const daysSinceModified = (Date.now() - entryStat.mtimeMs) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 7) continue;
      } catch { continue; }

      // Check if this dir matches any installed app name
      const matchesInstalled = [...appNames].some(name =>
        dirName.includes(name.replace(/\s/g, '')) ||
        dirName.includes(name.replace(/\s/g, '-'))
      );
      if (matchesInstalled) continue;

      // This is a potential orphan
      const fullPath = join(home, entry);
      const entryStat = await stat(fullPath);
      if (entryStat.isDirectory()) {
        const size = await getDirSize(fullPath);
        if (size > 1024 * 1024) { // Only show if > 1MB
          residuals.push({
            name: `${entry} (未知目录)`,
            path: fullPath,
            bundleId: entry,
            size,
            associatedFiles: [{ path: fullPath, type: 'hiddenDir', size }],
          });
        }
      }
    }
  } catch { /* 无权限 */ }

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
