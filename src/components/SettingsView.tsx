import { useState, useEffect } from 'react';
import { registerSchedule } from '@/lib/ipc';
import { DEFAULT_SHORTCUTS, type ShortcutConfig } from '@/hooks/useKeyboardShortcuts';

const STORAGE_KEY = 'maccleaner-settings';

interface SavedSettings {
  scanTime: string;
  scheduleEnabled: boolean;
  aiEnabled: boolean;
  ollamaUrl: string;
  shortcuts?: Partial<ShortcutConfig>;
  shortcutEnabled?: Record<string, boolean>;
}

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { scanTime: '09:00', scheduleEnabled: false, aiEnabled: false, ollamaUrl: 'http://localhost:11434', shortcuts: {}, shortcutEnabled: {} };
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
  const [saved, setSaved] = useState(false);
  const [shortcuts, setShortcuts] = useState<Partial<ShortcutConfig>>(() => loadSettings().shortcuts || {});
  const [shortcutEnabled, setShortcutEnabled] = useState<Record<string, boolean>>(() => {
    const s = loadSettings();
    return s.shortcutEnabled ?? { selectAll: true, rescan: true };
  });
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setScanTime(s.scanTime);
    setScheduleEnabled(s.scheduleEnabled);
    setAiEnabled(s.aiEnabled);
    setOllamaUrl(s.ollamaUrl);
    setShortcuts(s.shortcuts || {});
    setShortcutEnabled(s.shortcutEnabled ?? { selectAll: true, rescan: true });
  }, []);

  async function handleSave() {
    saveSettings({ scanTime, scheduleEnabled, aiEnabled, ollamaUrl, shortcuts, shortcutEnabled });
    if (scheduleEnabled) {
      const [hour, minute] = scanTime.split(':');
      await registerSchedule(`${parseInt(minute, 10)} ${parseInt(hour, 10)} * * *`);
    }
    window.dispatchEvent(new Event('settings-changed'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleShortcut(key: string) {
    setShortcutEnabled(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // Save immediately so hook picks it up
      const s = loadSettings();
      saveSettings({ ...s, shortcutEnabled: next });
      window.dispatchEvent(new Event('settings-changed'));
      return next;
    });
  }

  function handleShortcutEdit(key: keyof ShortcutConfig) {
    setEditingKey(key);
  }

  function handleShortcutKeyDown(e: React.KeyboardEvent, key: keyof ShortcutConfig) {
    e.preventDefault();
    const parts: string[] = [];
    if (e.metaKey) parts.push('meta');
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    parts.push(e.key.toLowerCase());
    const shortcut = parts.join('+');
    setShortcuts(prev => ({ ...prev, [key]: shortcut }));
    setEditingKey(null);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
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
            <ToggleSwitch checked={scheduleEnabled} onChange={setScheduleEnabled} />
          </div>
          {scheduleEnabled && (
            <div className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-sm font-medium">扫描时间</div>
              </div>
              <input
                type="time"
                value={scanTime}
                onChange={(e) => setScanTime(e.target.value)}
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
            <ToggleSwitch checked={aiEnabled} onChange={setAiEnabled} />
          </div>
          {aiEnabled && (
            <div className="py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Ollama 地址</div>
                  <div className="text-xs text-macos-text-tertiary">本地 Ollama 服务地址</div>
                </div>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-64 rounded-lg bg-macos-content px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                />
              </div>
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
          <p className="text-xs text-macos-text-tertiary py-2.5">若要更改快捷键，请先启用开关，然后按下组合键。</p>
          {(['selectAll', 'rescan'] as const).map((key, idx) => {
            const label = key === 'selectAll' ? '全选' : '重新扫描';
            const desc = key === 'selectAll' ? '选中/取消选中当前模块所有项目' : '重新扫描当前模块';
            const defaultVal = DEFAULT_SHORTCUTS[key];
            const currentVal = shortcuts[key] ?? defaultVal;
            const enabled = shortcutEnabled[key] !== false;
            const isEditing = editingKey === key;
            return (
              <div key={key} className={`flex items-center justify-between ${idx === 0 ? '' : 'border-t border-macos-separator'}`}>
                <div className="flex-1 py-2.5">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-macos-text-tertiary">{desc}</div>
                </div>
                <div className="flex items-center gap-3 py-2.5">
                  {isEditing ? (
                    <div
                      tabIndex={0}
                      onKeyDown={(e) => handleShortcutKeyDown(e, key)}
                      onBlur={() => setEditingKey(null)}
                      className="rounded bg-macos-content px-3 py-1 text-xs text-macos-accent border border-macos-accent focus:outline-none min-w-[80px] text-center"
                      autoFocus
                    >
                      按下组合键...
                    </div>
                  ) : (
                    <button
                      onClick={() => enabled && handleShortcutEdit(key)}
                      disabled={!enabled}
                      className={`rounded px-3 py-1 text-xs border transition-colors ${enabled ? 'bg-macos-content text-macos-text-primary border-macos-separator hover:border-macos-accent cursor-pointer' : 'text-macos-text-tertiary border-transparent cursor-default'}`}
                    >
                      {enabled ? formatShortcutDisplay(currentVal) : '关闭'}
                    </button>
                  )}
                  <ToggleSwitch checked={enabled} onChange={() => toggleShortcut(key)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end mt-3">
        <button
          onClick={handleSave}
          className="rounded bg-macos-accent px-3 py-1.5 text-xs font-medium hover:bg-macos-accent-hover transition-colors"
        >
          {saved ? '已保存 ✓' : '保存设置'}
        </button>
      </div>
    </div>
  );
}

export default SettingsView;
