'use client';

import type { ChangeEvent } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import {
  BookHeart,
  CalendarDays,
  Check,
  Download,
  FileUp,
  Settings,
  Smartphone,
  Sprout,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ACCENT_THEMES, WALLPAPERS } from '@/lib/defaults';
import { formatFullDate } from '@/lib/date';
import type { AppState, AppTab } from '@/lib/types';

export function PaperBinding() {
  return (
    <div className="binding-holes" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}

export function AppHeader({
  tab,
  todayDate,
  saveStatus,
  onOpenSettings,
}: {
  tab: AppTab;
  todayDate: string;
  saveStatus: 'saved' | 'saving' | 'unavailable';
  onOpenSettings: () => void;
}) {
  const labels = {
    today: '今天的记录',
    growth: '成长手册',
    journal: '日记本',
  };
  const saveLabel =
    saveStatus === 'unavailable'
      ? '本地保存暂不可用'
      : saveStatus === 'saving'
        ? '正在保存…'
        : '已自动保存到本机';

  return (
    <header className="top-bar">
      <div className="top-bar-copy">
        <div className="top-bar-line">
          <p className="eyebrow">{labels[tab]}</p>
          <span className={`save-state is-${saveStatus}`}>
            <i />
            {saveLabel}
          </span>
        </div>
        {tab === 'today' && (
          <p className="today-date">{formatFullDate(todayDate)}</p>
        )}
      </div>
      <Button
        className="round-button"
        variant="ghost"
        size="icon"
        aria-label="打开设置"
        onClick={onOpenSettings}
      >
        <Settings aria-hidden="true" />
      </Button>
    </header>
  );
}

export function SettingsDrawer({
  state,
  open,
  onOpenChange,
  onStateChange,
  onExport,
  onImport,
  onClear,
  onInstall,
}: {
  state: AppState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStateChange: Dispatch<SetStateAction<AppState | null>>;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onInstall: () => void;
}) {
  const setSettings = (patch: Partial<AppState['settings']>) => {
    onStateChange(
      (current) =>
        current && { ...current, settings: { ...current.settings, ...patch } },
    );
  };

  if (!open) return null;

  return (
    <div className="settings-backdrop is-open">
      <button
        className="settings-dismiss"
        type="button"
        aria-label="关闭设置"
        onClick={() => onOpenChange(false)}
      />
      <dialog className="settings-panel" open aria-label="日记设置">
        <div className="settings-panel-head">
          <div>
            <h2>这本日记的样子</h2>
            <p>选择温馨纸张，或让一张收藏壁纸陪着你记录。</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="关闭设置"
            onClick={() => onOpenChange(false)}
          >
            ×
          </Button>
        </div>

        <div className="settings-sheet">
          <section className="settings-section">
            <h3>主题</h3>
            <button
              type="button"
              className={`paper-theme-card ${state.settings.theme === 'paper' ? 'active' : ''}`}
              onClick={() => setSettings({ theme: 'paper' })}
            >
              <span>
                <i />
                <i />
                <i />
              </span>
              <div>
                <strong>温馨日记纸</strong>
                <small>横线、纸张和装订孔陪着你写</small>
              </div>
              {state.settings.theme === 'paper' && <Check />}
            </button>

            <p className="wallpaper-label">选择整本日记的主题色</p>
            <div className="accent-theme-grid">
              {ACCENT_THEMES.map((theme) => (
                <button
                  type="button"
                  key={theme.id}
                  className={state.settings.accent === theme.id ? 'active' : ''}
                  onClick={() => setSettings({ accent: theme.id })}
                >
                  <i style={{ background: theme.color }} />
                  <span>
                    <strong>{theme.name}</strong>
                    <small>{theme.feeling}</small>
                  </span>
                  {state.settings.accent === theme.id && <Check />}
                </button>
              ))}
            </div>
            <p className="wallpaper-label">或者选一张收藏壁纸</p>
            <div className="wallpaper-grid">
              {WALLPAPERS.map((wallpaper, index) => (
                <button
                  type="button"
                  key={wallpaper}
                  className={
                    state.settings.theme === 'wallpaper' &&
                    state.settings.wallpaper === wallpaper
                      ? 'active'
                      : ''
                  }
                  onClick={() => setSettings({ theme: 'wallpaper', wallpaper })}
                >
                  <Image
                    src={wallpaper}
                    alt={`壁纸 ${index + 1}`}
                    fill
                    sizes="(max-width: 560px) 30vw, 170px"
                    unoptimized
                  />
                  {state.settings.theme === 'wallpaper' &&
                    state.settings.wallpaper === wallpaper && <Check />}
                </button>
              ))}
            </div>
            <p className="setting-note">
              选择壁纸后会收起横线和装订孔，内容改为清晰的半透明卡片。
            </p>
          </section>

          <section className="settings-section">
            <h3>安装与反馈</h3>
            <Button
              variant="outline"
              className="settings-wide"
              onClick={onInstall}
            >
              <Smartphone />
              安装到手机桌面
            </Button>
            <label className="toggle-row">
              <span>
                <strong>轻微振动反馈</strong>
                <small>打勾和记录进度时轻轻回应</small>
              </span>
              <input
                type="checkbox"
                checked={state.settings.haptics}
                onChange={(event) =>
                  setSettings({ haptics: event.target.checked })
                }
              />
            </label>
          </section>

          <section className="settings-section">
            <h3>本地数据</h3>
            <p className="setting-note">
              文字和照片只在这台设备里。清理浏览器或换手机前，请先下载备份。
            </p>
            <div className="settings-buttons">
              <Button onClick={onExport}>
                <Download />
                下载完整备份
              </Button>
              <label className="import-button">
                <FileUp />
                恢复备份
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={onImport}
                />
              </label>
            </div>
            <Button
              variant="ghost"
              className="danger-text settings-wide"
              onClick={onClear}
            >
              <Trash2 />
              清空全部数据
            </Button>
          </section>

          <footer className="settings-footer">
            <strong>Asoul一个魂生活日记</strong>
            <span>作者：就一枝匠纸 · AI 协作制作</span>
            <span>v3 · 独立数据结构，不读取 v2 数据</span>
          </footer>
        </div>
      </dialog>
    </div>
  );
}

export function BottomNav({
  active,
  onChange,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  const items: { id: AppTab; label: string; icon: typeof CalendarDays }[] = [
    { id: 'today', label: '今日', icon: CalendarDays },
    { id: 'growth', label: '成长', icon: Sprout },
    { id: 'journal', label: '日记', icon: BookHeart },
  ];

  return (
    <nav className="bottom-nav" aria-label="主要页面">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'is-active' : ''}`}
            type="button"
            onClick={() => onChange(item.id)}
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
