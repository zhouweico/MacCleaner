import { useState, useEffect } from 'react';
import { registerSchedule, getOperationLogs, clearOperationLogs, checkForUpdates, getAppInfo, openExternal } from '@/lib/ipc';
import { DEFAULT_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import AutoHideScroll from '@/components/AutoHideScroll';
import type { OperationLogEntry } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

const STORAGE_KEY = 'maccleaner-settings';

interface SavedSettings {
  scanTime: string;
  scheduleEnabled: boolean;
  aiEnabled: boolean;
  ollamaUrl: string;
  shortcutEnabled?: Record<string, boolean>;
}

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { scanTime: '09:00', scheduleEnabled: false, aiEnabled: false, ollamaUrl: 'http://localhost:11434', shortcutEnabled: {} };
}

function saveSettings(settings: SavedSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function formatShortcutDisplay(shortcut: string): string {
  return shortcut
    .replace('meta', '⌘')
    .replace('shift', '⇧')
    .replace('ctrl', '⌃')
    .replace('alt', '⌥')
    .replace(/\+/g, '');
}

function formatShortcutKey(shortcut: string): string {
  const formatted = formatShortcutDisplay(shortcut);
  // Only uppercase the key letter (last char), keep symbols as-is
  return formatted.slice(0, -1) + formatted.slice(-1).toUpperCase();
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? 'bg-macos-accent' : 'bg-macos-surface-hover'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingsView() {
  const [scanTime, setScanTime] = useState(() => loadSettings().scanTime);
  const [scheduleEnabled, setScheduleEnabled] = useState(() => loadSettings().scheduleEnabled);
  const [aiEnabled, setAiEnabled] = useState(() => loadSettings().aiEnabled);
  const [ollamaUrl, setOllamaUrl] = useState(() => loadSettings().ollamaUrl);
  const [ollamaTestStatus, setOllamaTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [shortcutEnabled, setShortcutEnabled] = useState<Record<string, boolean>>(() => {
    const s = loadSettings();
    return s.shortcutEnabled ?? { selectAll: true, rescan: true };
  });
  const [logs, setLogs] = useState<OperationLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    const s = loadSettings();
    setScanTime(s.scanTime);
    setScheduleEnabled(s.scheduleEnabled);
    setAiEnabled(s.aiEnabled);
    setOllamaUrl(s.ollamaUrl);
    setShortcutEnabled(s.shortcutEnabled ?? { selectAll: true, rescan: true });
    loadLogs();
    getAppInfo().then(info => setAppVersion(info.version));
  }, []);

  function handleScheduleChange(enabled: boolean) {
    setScheduleEnabled(enabled);
    const current = loadSettings();
    saveSettings({ ...current, scheduleEnabled: enabled });
    if (enabled) {
      const [hour, minute] = scanTime.split(':');
      registerSchedule(`${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`);
    } else {
      window.electronAPI.ipc.invoke('schedule:stop');
    }
    window.dispatchEvent(new Event('settings-changed'));
  }

  function handleScanTimeChange(time: string) {
    setScanTime(time);
    const current = loadSettings();
    saveSettings({ ...current, scanTime: time });
    if (scheduleEnabled) {
      const [hour, minute] = time.split(':');
      registerSchedule(`${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`);
    }
  }

  function handleAiChange(enabled: boolean) {
    setAiEnabled(enabled);
    const current = loadSettings();
    saveSettings({ ...current, aiEnabled: enabled });
    window.dispatchEvent(new Event('settings-changed'));
  }

  function handleOllamaUrlChange(url: string) {
    setOllamaUrl(url);
    const current = loadSettings();
    saveSettings({ ...current, ollamaUrl: url });
    window.dispatchEvent(new Event('settings-changed'));
  }

  function toggleShortcut(key: string) {
    setShortcutEnabled(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const current = loadSettings();
      saveSettings({ ...current, shortcutEnabled: next });
      window.dispatchEvent(new Event('settings-changed'));
      return next;
    });
  }

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const entries = await getOperationLogs();
      setLogs(entries.reverse()); // newest first
    } finally {
      setLogsLoading(false);
    }
  }

  async function handleClearLogs() {
    await clearOperationLogs();
    setLogs([]);
  }

  async function testOllamaConnection() {
    setOllamaTestStatus('testing');
    try {
      const resp = await fetch(ollamaUrl, { method: 'GET' });
      if (resp.ok || resp.status === 404) {
        setOllamaTestStatus('ok');
      } else {
        setOllamaTestStatus('fail');
      }
    } catch {
      setOllamaTestStatus('fail');
    }
    setTimeout(() => setOllamaTestStatus('idle'), 3000);
  }

  return (
    <AutoHideScroll className="flex flex-col overflow-y-auto h-full">
      <div className="flex-1 min-w-0 p-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-lg font-bold">⚙️ 设置</h1>
          <p className="mt-0.5 text-xs text-macos-text-tertiary">自定义 MacCleaner 的行为和外观</p>
        </div>

        {/* Schedule card */}
        <div className="rounded-xl bg-macos-surface mb-3 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-macos-separator">
          <h2 className="text-xs font-semibold text-macos-text-secondary uppercase tracking-wide">定时扫描</h2>
        </div>
        <div className="px-4">
          <div className="flex items-center justify-between py-2.5 border-b border-macos-separator">
            <div>
              <div className="text-sm font-medium">启用每日自动扫描</div>
              <div className="text-xs text-macos-text-tertiary">每天在指定时间自动扫描系统</div>
            </div>
            <ToggleSwitch checked={scheduleEnabled} onChange={handleScheduleChange} />
          </div>
          {scheduleEnabled && (
            <div className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-sm font-medium">扫描时间</div>
              </div>
              <input
                type="time"
                value={scanTime}
                onChange={(e) => handleScanTimeChange(e.target.value)}
                className="rounded-lg bg-macos-content px-3 py-1.5 text-sm text-macos-text-primary border border-macos-separator focus:border-macos-accent focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* AI card */}
      <div className="rounded-xl bg-macos-surface mb-3 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-macos-separator">
          <h2 className="text-xs font-semibold text-macos-text-secondary uppercase tracking-wide">AI 增强分析</h2>
        </div>
        <div className="px-4">
          <div className="flex items-center justify-between py-2.5 border-b border-macos-separator">
            <div>
              <div className="text-sm font-medium">启用 AI 分析</div>
              <div className="text-xs text-macos-text-tertiary">使用本地 AI 模型分析可清理内容</div>
            </div>
            <ToggleSwitch checked={aiEnabled} onChange={handleAiChange} />
          </div>
          {aiEnabled && (
            <div className="py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Ollama 地址</div>
                  <div className="text-xs text-macos-text-tertiary">本地 Ollama 服务地址</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => handleOllamaUrlChange(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-52 rounded-lg bg-macos-content px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                  />
                  <button
                    onClick={testOllamaConnection}
                    disabled={ollamaTestStatus === 'testing'}
                    className="text-xs rounded bg-macos-surface px-2 py-1 text-macos-text-secondary hover:bg-macos-surface-hover disabled:opacity-40 transition-colors"
                  >
                    {ollamaTestStatus === 'testing' ? '测试中' :
                     ollamaTestStatus === 'ok' ? '✓ 已连接' :
                     ollamaTestStatus === 'fail' ? '✗ 失败' : '测试连接'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-macos-text-tertiary mt-1.5">AI 仅在手动触发时调用，不会产生后台费用</p>
            </div>
          )}
        </div>
      </div>

      {/* Shortcuts card */}
      <div className="rounded-xl bg-macos-surface mb-3 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-macos-separator">
          <h2 className="text-xs font-semibold text-macos-text-secondary uppercase tracking-wide">快捷键</h2>
        </div>
        <div className="px-4">
          {(['selectAll', 'rescan'] as const).map((key, idx) => {
            const label = key === 'selectAll' ? '全选' : '重新扫描';
            const desc = key === 'selectAll' ? '选中/取消选中当前模块所有项目' : '重新扫描当前模块';
            const defaultVal = DEFAULT_SHORTCUTS[key];
            const enabled = shortcutEnabled[key] !== false;
            return (
              <div key={key} className={`flex items-center justify-between ${idx === 0 ? '' : 'border-t border-macos-separator'}`}>
                <div className="flex-1 py-2.5">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-macos-text-tertiary">{desc}</div>
                </div>
                <div className="flex items-center gap-4 py-2.5">
                  <span className="text-sm font-medium text-macos-text-primary">
                    {formatShortcutKey(defaultVal)}
                  </span>
                  <ToggleSwitch checked={enabled} onChange={() => toggleShortcut(key)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* About card */}
      <div className="rounded-xl bg-macos-surface mb-3 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-macos-separator">
          <h2 className="text-xs font-semibold text-macos-text-secondary uppercase tracking-wide">关于</h2>
        </div>
        <div className="px-4">
          {/* Current version + check update */}
          <div className="flex items-center justify-between py-2.5 border-b border-macos-separator">
            <div className="text-sm font-medium">
              {appVersion ? `版本号 ${appVersion}` : '检查更新'}
            </div>
            <button
              onClick={async () => {
                setUpdateChecking(true);
                try {
                  const res = await checkForUpdates();
                  if (!res.success) {
                    alert(`检查失败: ${res.error}`);
                  }
                } finally {
                  setUpdateChecking(false);
                }
              }}
              disabled={updateChecking}
              className="shrink-0 rounded-lg bg-macos-surface-hover px-3 py-1.5 text-xs font-medium text-macos-text-primary hover:bg-macos-surface disabled:opacity-40 transition-colors"
            >
              {updateChecking ? '检查中...' : '检查并更新'}
            </button>
          </div>
          {/* Update log */}
          <div className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-sm font-medium">更新日志</div>
              <div className="text-xs text-macos-text-tertiary">查看每个版本的新功能</div>
            </div>
            <button
              onClick={() => openExternal('https://github.com/zhouweico/MacCleaner/releases')}
              className="shrink-0 rounded-lg bg-macos-surface-hover px-3 py-1.5 text-xs font-medium text-macos-text-primary hover:bg-macos-surface transition-colors"
            >
              查看
            </button>
          </div>
        </div>
      </div>

      {/* Operation Log card */}
      <div className="rounded-xl bg-macos-surface mb-3 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-macos-separator flex items-center justify-between">
          <h2 className="text-xs font-semibold text-macos-text-secondary uppercase tracking-wide">操作日志</h2>
          <div className="flex gap-2">
            <button
              onClick={loadLogs}
              disabled={logsLoading}
              className="text-xs text-macos-accent hover:text-macos-accent-hover disabled:opacity-40"
            >
              {logsLoading ? '加载中...' : '刷新'}
            </button>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-macos-red hover:text-macos-red-hover"
              >
                清空
              </button>
            )}
          </div>
        </div>
        <div className="px-4 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="py-3 text-xs text-macos-text-tertiary text-center">暂无操作记录</p>
          ) : (
            logs.map((log, idx) => {
              const typeLabel: Record<string, string> = {
                clean: '🧹 清理',
                uninstall: '🗑️ 卸载',
                trash: '🗑️ 废纸篓',
                scan: '📋 扫描',
              };
              const time = new Date(log.timestamp).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={idx} className={`py-2 ${idx > 0 ? 'border-t border-macos-separator' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-macos-text-secondary truncate">{log.module}</span>
                    <span className={`text-xs font-medium shrink-0 ml-2 ${log.success ? 'text-macos-green' : 'text-macos-red'}`}>
                      {log.success ? '成功' : '失败'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-macos-text-tertiary">{typeLabel[log.type] ?? log.type}</span>
                    <span className="text-xs text-macos-text-tertiary">{time}</span>
                  </div>
                  {log.freedSpace > 0 && (
                    <div className="text-xs text-macos-text-tertiary mt-0.5">{formatBytes(log.freedSpace)}</div>
                  )}
                  {log.details && (
                    <div className="text-xs text-macos-text-tertiary mt-0.5">{log.details}</div>
                  )}
                  {log.error && (
                    <div className="text-xs text-macos-red mt-0.5" title={log.error}>{log.error}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </AutoHideScroll>
  );
}

export default SettingsView;
