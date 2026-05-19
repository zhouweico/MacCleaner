import { useState, useEffect, useRef } from 'react';
import { registerSchedule, getOperationLogs, clearOperationLogs, checkForUpdates, getAppInfo, openExternal, testAiConnection } from '@/lib/ipc';
import { DEFAULT_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import AutoHideScroll from '@/components/AutoHideScroll';
import type { OperationLogEntry, AiProviderConfig } from '@/lib/ipc';
import { formatBytes } from '@/lib/format';

const STORAGE_KEY = 'maccleaner-settings';

interface SavedSettings {
  scanTime: string;
  scheduleEnabled: boolean;
  aiEnabled: boolean;
  aiProvider: 'ollama' | 'openai' | 'anthropic';
  ollamaUrl: string;
  ollamaModel: string;
  openaiUrl: string;
  openaiModel: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  anthropicModel: string;
  shortcutEnabled?: Record<string, boolean>;
}

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    scanTime: '09:00', scheduleEnabled: false, aiEnabled: false,
    aiProvider: 'ollama',
    ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3.2',
    openaiUrl: 'https://api.openai.com/v1', openaiModel: 'gpt-4o-mini', openaiApiKey: '',
    anthropicApiKey: '', anthropicModel: 'claude-sonnet-4-6',
    shortcutEnabled: {},
  };
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

// Custom dropdown select
function CompactSelect({ value, options, onChange, width }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const btnWidth = width ?? '48px';
  const btnWidthNum = parseInt(btnWidth);
  const dropdownWidth = `${btnWidthNum + 16}px`;

  const currentIndex = options.indexOf(value);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlightedIndex(0);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keyboard navigation when open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onChange(options[highlightedIndex]);
        setOpen(false);
        setHighlightedIndex(0);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(0);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, highlightedIndex, options, onChange]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !dropdownRef.current) return;
    const highlightedBtn = dropdownRef.current.children[highlightedIndex] as HTMLElement;
    if (highlightedBtn) {
      highlightedBtn.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [highlightedIndex, open]);

  // Reset highlight index when opening
  useEffect(() => {
    if (open) setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="bg-macos-sidebar-hover/60 border border-macos-separator rounded-lg px-2.5 py-1.5 text-sm text-macos-text-primary focus:border-macos-accent focus:outline-none cursor-pointer text-center hover:bg-macos-surface-hover transition-colors"
        style={{ width: btnWidth }}
      >
        {value}
      </button>
      {open && (
        <div ref={dropdownRef} className="absolute left-0 top-full mt-1 bg-macos-surface border border-macos-separator rounded-lg shadow-lg z-[100] overflow-y-auto" style={{ maxHeight: 200, width: dropdownWidth }}>
            {options.map((o, idx) => (
              <button
                key={o}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => { onChange(o); setOpen(false); setHighlightedIndex(0); }}
                className={`w-full text-sm text-left transition-colors flex items-center gap-1 rounded-lg px-2 py-1 ${
                  highlightedIndex === idx
                    ? 'bg-macos-accent text-white'
                    : 'text-macos-text-primary hover:bg-macos-accent'
                }`}
              >
                <span className="w-4 text-center shrink-0">{o === value ? '✓' : ''}</span>
                <span>{o}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function SettingsView() {
  const [scanTime, setScanTime] = useState(() => {
    const t = loadSettings().scanTime;
    const [h, m] = t.split(':');
    let hour = parseInt(h, 10);
    let minute = Math.round(parseInt(m, 10) / 5) * 5;
    if (minute >= 60) { minute = 0; hour = (hour + 1) % 24; }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(() => loadSettings().scheduleEnabled);
  const [aiEnabled, setAiEnabled] = useState(() => loadSettings().aiEnabled);
  const [aiProvider, setAiProvider] = useState<'ollama' | 'openai' | 'anthropic'>(() => loadSettings().aiProvider);
  const [ollamaUrl, setOllamaUrl] = useState(() => loadSettings().ollamaUrl);
  const [ollamaModel, setOllamaModel] = useState(() => loadSettings().ollamaModel);
  const [openaiUrl, setOpenaiUrl] = useState(() => loadSettings().openaiUrl);
  const [openaiModel, setOpenaiModel] = useState(() => loadSettings().openaiModel);
  const [openaiApiKey, setOpenaiApiKey] = useState(() => loadSettings().openaiApiKey);
  const [anthropicApiKey, setAnthropicApiKey] = useState(() => loadSettings().anthropicApiKey);
  const [anthropicModel, setAnthropicModel] = useState(() => loadSettings().anthropicModel);
  const [ollamaTestStatus, setOllamaTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [ollamaTestError, setOllamaTestError] = useState<string>('');
  const [cloudTestStatus, setCloudTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [cloudTestError, setCloudTestError] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
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
    let [h, m] = s.scanTime.split(':');
    let hour = parseInt(h, 10);
    let minute = Math.round(parseInt(m, 10) / 5) * 5;
    if (minute >= 60) { minute = 0; hour = (hour + 1) % 24; }
    setScanTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setScheduleEnabled(s.scheduleEnabled);
    setAiEnabled(s.aiEnabled);
    setAiProvider(s.aiProvider);
    setOllamaUrl(s.ollamaUrl);
    setOllamaModel(s.ollamaModel);
    setOpenaiUrl(s.openaiUrl);
    setOpenaiModel(s.openaiModel);
    setOpenaiApiKey(s.openaiApiKey);
    setAnthropicApiKey(s.anthropicApiKey);
    setAnthropicModel(s.anthropicModel);
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
    setOllamaTestStatus('idle');
    setOllamaTestError('');
    setCloudTestStatus('idle');
    setCloudTestError('');
    const current = loadSettings();
    saveSettings({ ...current, aiEnabled: enabled });
    window.dispatchEvent(new Event('settings-changed'));
  }

  function handleAiProviderChange(provider: 'ollama' | 'openai' | 'anthropic') {
    setAiProvider(provider);
    setOllamaTestStatus('idle');
    setOllamaTestError('');
    setCloudTestStatus('idle');
    setCloudTestError('');
    const current = loadSettings();
    saveSettings({ ...current, aiProvider: provider });
    window.dispatchEvent(new Event('settings-changed'));
  }

  function saveAiField(field: string, value: unknown) {
    const current = loadSettings();
    saveSettings({ ...current, [field]: value });
    window.dispatchEvent(new Event('settings-changed'));
  }

  async function testConnection() {
    const config = getProviderConfig();
    setCloudTestStatus('testing');
    setCloudTestError('');
    try {
      const res = await testAiConnection(config);
      setCloudTestStatus(res.success ? 'ok' : 'fail');
      setCloudTestError(res.error ?? '');
    } catch (e) {
      setCloudTestStatus('fail');
      setCloudTestError(e instanceof Error ? e.message : '未知错误');
    }
    setTimeout(() => { setCloudTestStatus('idle'); setCloudTestError(''); }, 5000);
  }

  function getProviderConfig(): AiProviderConfig {
    switch (aiProvider) {
      case 'ollama':
        return { type: 'ollama', url: ollamaUrl, model: ollamaModel };
      case 'openai':
        return { type: 'openai', url: openaiUrl, model: openaiModel, apiKey: openaiApiKey };
      case 'anthropic':
        return { type: 'anthropic', model: anthropicModel, apiKey: anthropicApiKey };
    }
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
    setOllamaTestError('');
    try {
      const res = await testAiConnection({ type: 'ollama', url: ollamaUrl, model: ollamaModel });
      setOllamaTestStatus(res.success ? 'ok' : 'fail');
      setOllamaTestError(res.error ?? '');
    } catch (e) {
      setOllamaTestStatus('fail');
      setOllamaTestError(e instanceof Error ? e.message : '未知错误');
    }
    setTimeout(() => { setOllamaTestStatus('idle'); setOllamaTestError(''); }, 5000);
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
        <div className="rounded-xl bg-macos-surface mb-3 overflow-visible">
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
              <div className="flex items-center gap-1">
                <CompactSelect
                  value={scanTime.split(':')[0]}
                  options={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))}
                  onChange={(h) => handleScanTimeChange(`${h}:${scanTime.split(':')[1]}`)}
                />
                <span className="text-macos-text-tertiary text-sm">:</span>
                <CompactSelect
                  value={scanTime.split(':')[1]}
                  options={Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))}
                  onChange={(m) => handleScanTimeChange(`${scanTime.split(':')[0]}:${m}`)}
                />
              </div>
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
          {/* Enable toggle */}
          <div className="flex items-center justify-between py-2.5 border-b border-macos-separator">
            <div>
              <div className="text-sm font-medium">启用 AI 分析</div>
              <div className="text-xs text-macos-text-tertiary">使用 AI 模型分析未知目录和清理建议</div>
            </div>
            <ToggleSwitch checked={aiEnabled} onChange={handleAiChange} />
          </div>
          {aiEnabled && (
            <>
              {/* Provider selector */}
              <div className="flex items-center justify-between py-2.5 border-b border-macos-separator">
                <div>
                  <div className="text-sm font-medium">AI 模型</div>
                </div>
                <CompactSelect
                  value={aiProvider === 'ollama' ? 'Ollama' : aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'}
                  options={['Ollama', 'OpenAI', 'Anthropic']}
                  onChange={(v) => handleAiProviderChange(v === 'Ollama' ? 'ollama' : v === 'OpenAI' ? 'openai' : 'anthropic')}
                  width="100px"
                />
              </div>

              {/* Ollama config */}
              {aiProvider === 'ollama' && (
                <div className="py-2.5">
                  <div className="grid grid-cols-[1fr_320px] gap-x-4 items-center">
                    <div>
                      <div className="text-sm font-medium">服务地址</div>
                      <div className="text-xs text-macos-text-tertiary">本地 Ollama 服务地址</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => { setOllamaUrl(e.target.value); saveAiField('ollamaUrl', e.target.value); }}
                        placeholder="http://localhost:11434"
                        className="w-full rounded-lg bg-macos-sidebar-hover/60 px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_320px] gap-x-4 items-center mt-2.5">
                    <div className="text-sm font-medium">模型</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ollamaModel}
                        onChange={(e) => { setOllamaModel(e.target.value); saveAiField('ollamaModel', e.target.value); }}
                        placeholder="llama3.2"
                        className="w-48 rounded-lg bg-macos-sidebar-hover/60 px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                      />
                      <button
                        onClick={testOllamaConnection}
                        disabled={ollamaTestStatus === 'testing'}
                        className={`text-xs rounded px-2 py-1 transition-colors shrink-0 ${
                          ollamaTestStatus === 'ok'
                            ? 'bg-macos-green/20 text-macos-green'
                            : ollamaTestStatus === 'fail'
                              ? 'bg-macos-red/20 text-macos-red'
                              : 'bg-macos-surface text-macos-text-secondary hover:bg-macos-surface-hover disabled:opacity-40'
                        }`}
                      >
                        {ollamaTestStatus === 'testing' ? '测试中' :
                         ollamaTestStatus === 'ok' ? '✓ 已连接' :
                         ollamaTestStatus === 'fail' ? '✗ 失败' : '测试连接'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-macos-text-tertiary mt-1.5">AI 仅在手动触发时调用，不会产生后台费用</p>
                  {ollamaTestError && (
                    <p className="text-xs text-macos-red mt-1">{ollamaTestError}</p>
                  )}
                </div>
              )}

              {/* OpenAI-compatible config */}
              {aiProvider === 'openai' && (
                <div className="py-2.5">
                  <div className="grid grid-cols-[1fr_320px] gap-x-4 items-center">
                    <div>
                      <div className="text-sm font-medium">API 地址</div>
                      <div className="text-xs text-macos-text-tertiary">OpenAI / DeepSeek / Groq 等兼容地址</div>
                    </div>
                    <input
                      type="text"
                      value={openaiUrl}
                      onChange={(e) => { setOpenaiUrl(e.target.value); saveAiField('openaiUrl', e.target.value); }}
                      placeholder="https://api.openai.com/v1"
                      className="w-full rounded-lg bg-macos-sidebar-hover/60 px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-[1fr_320px] gap-x-4 items-center mt-2.5">
                    <div className="text-sm font-medium">API Key</div>
                    <div className="flex items-center gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={openaiApiKey}
                        onChange={(e) => { setOpenaiApiKey(e.target.value); saveAiField('openaiApiKey', e.target.value); }}
                        placeholder="sk-..."
                        className="w-64 rounded-lg bg-macos-sidebar-hover/60 px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-xs rounded bg-macos-surface px-2 py-1 text-macos-text-secondary hover:bg-macos-surface-hover transition-colors shrink-0"
                      >
                        {showApiKey ? '隐藏' : '显示'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_320px] gap-x-4 items-center mt-2.5">
                    <div className="text-sm font-medium">模型</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={openaiModel}
                        onChange={(e) => { setOpenaiModel(e.target.value); saveAiField('openaiModel', e.target.value); }}
                        placeholder="gpt-4o-mini"
                        className="w-48 rounded-lg bg-macos-sidebar-hover/60 px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                      />
                      <button
                        onClick={testConnection}
                        disabled={cloudTestStatus === 'testing'}
                        className={`text-xs rounded px-2 py-1 transition-colors shrink-0 ${
                          cloudTestStatus === 'ok'
                            ? 'bg-macos-green/20 text-macos-green'
                            : cloudTestStatus === 'fail'
                              ? 'bg-macos-red/20 text-macos-red'
                              : 'bg-macos-surface text-macos-text-secondary hover:bg-macos-surface-hover disabled:opacity-40'
                        }`}
                      >
                        {cloudTestStatus === 'testing' ? '测试中' :
                         cloudTestStatus === 'ok' ? '✓ 已连接' :
                         cloudTestStatus === 'fail' ? '✗ 失败' : '测试连接'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-macos-text-tertiary mt-1.5">支持 OpenAI、DeepSeek、Groq、Together 等兼容协议</p>
                  {cloudTestError && (
                    <p className="text-xs text-macos-red mt-1">{cloudTestError}</p>
                  )}
                </div>
              )}

              {/* Anthropic config */}
              {aiProvider === 'anthropic' && (
                <div className="py-2.5">
                  <div className="grid grid-cols-[1fr_320px] gap-x-4 items-center">
                    <div>
                      <div className="text-sm font-medium">API Key</div>
                      <div className="text-xs text-macos-text-tertiary">
                        从 <a href="https://console.anthropic.com/settings/keys" onClick={(e) => { e.preventDefault(); openExternal('https://console.anthropic.com/settings/keys'); }} className="text-macos-accent hover:text-macos-accent-hover">Anthropic Console</a> 获取
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={anthropicApiKey}
                        onChange={(e) => { setAnthropicApiKey(e.target.value); saveAiField('anthropicApiKey', e.target.value); }}
                        placeholder="sk-ant-api03-..."
                        className="w-64 rounded-lg bg-macos-sidebar-hover/60 px-3 py-1.5 text-sm text-white border border-macos-separator focus:border-macos-accent focus:outline-none"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-xs rounded bg-macos-surface px-2 py-1 text-macos-text-secondary hover:bg-macos-surface-hover transition-colors shrink-0"
                      >
                        {showApiKey ? '隐藏' : '显示'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_320px] gap-x-4 items-center mt-2.5">
                    <div className="text-sm font-medium">模型</div>
                    <div className="flex items-center gap-2">
                      <select
                        value={anthropicModel}
                        onChange={(e) => { setAnthropicModel(e.target.value); saveAiField('anthropicModel', e.target.value); }}
                        className="rounded-lg bg-macos-sidebar-hover/60 px-3 py-1.5 text-sm text-macos-text-primary border border-macos-separator focus:border-macos-accent focus:outline-none"
                      >
                        <option value="claude-sonnet-4-6">Claude Sonnet 4.6（推荐）</option>
                        <option value="claude-haiku-4-5">Claude Haiku 4.5（更便宜）</option>
                      </select>
                      <button
                        onClick={testConnection}
                        disabled={cloudTestStatus === 'testing'}
                        className={`text-xs rounded px-2 py-1 transition-colors shrink-0 ${
                          cloudTestStatus === 'ok'
                            ? 'bg-macos-green/20 text-macos-green'
                            : cloudTestStatus === 'fail'
                              ? 'bg-macos-red/20 text-macos-red'
                              : 'bg-macos-surface text-macos-text-secondary hover:bg-macos-surface-hover disabled:opacity-40'
                        }`}
                      >
                        {cloudTestStatus === 'testing' ? '测试中' :
                         cloudTestStatus === 'ok' ? '✓ 已连接' :
                         cloudTestStatus === 'fail' ? '✗ 失败' : '测试连接'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-macos-text-tertiary mt-1.5">AI 仅在手动触发时调用，按 token 计费</p>
                  {cloudTestError && (
                    <p className="text-xs text-macos-red mt-1">{cloudTestError}</p>
                  )}
                </div>
              )}
            </>
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
