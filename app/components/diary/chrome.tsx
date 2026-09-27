'use client';

import type { ChangeEvent } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookHeart,
  Check,
  Download,
  FileUp,
  RefreshCw,
  Settings,
  Smartphone,
  Sprout,
  Trash2,
  Volume2,
  Heart,
  ArrowUpRight,
} from 'lucide-react';

import { Sheet } from './life-form';
import { Button } from '@/components/ui/button';
import { ACCENT_THEMES, WALLPAPERS, wallpaperAssetUrl } from '@/lib/defaults';
import type { AppState, AppTab } from '@/lib/types';

const COMMUNITY_TAGS = [
  { name: '嘉心糖的手帐本', id: '36443', color: '#AF4F70' },
  { name: '贝极星空间站的日常', id: '32780', color: '#AB5149' },
  { name: '乃琳夸夸群', id: '9825', color: '#576690' },
];

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
  saveStatus,
  preview = false,
  updateAvailable,
  onOpenSettings,
}: {
  preview?: boolean;
  saveStatus: 'saved' | 'saving' | 'unavailable';
  updateAvailable: boolean;
  onOpenSettings: () => void;
}) {
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
          <p className="eyebrow">一个魂生活</p>
          <span className={`save-state is-${saveStatus}`}>
            <i />
            {preview ? '示例体验' : saveLabel}
          </span>
        </div>
      </div>
      <Button
        className={`round-button ${updateAvailable ? 'has-update' : ''}`}
        variant="ghost"
        size="icon"
        aria-label={updateAvailable ? '打开设置，有新版本' : '打开设置'}
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
  updateAvailable,
  onApplyUpdate,
}: {
  state: AppState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStateChange: Dispatch<SetStateAction<AppState | null>>;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onInstall: () => void;
  updateAvailable: boolean;
  onApplyUpdate: () => void;
}) {
  const setSettings = (patch: Partial<AppState['settings']>) => {
    onStateChange(
      (current) =>
        current && { ...current, settings: { ...current.settings, ...patch } },
    );
  };

  if (!open) return null;

  return (
    <Sheet
      title="让生活更像你"
      description="选择温馨纸张，或让一张收藏壁纸陪着你记录。"
      onClose={() => onOpenChange(false)}
      wide
    >
      <div className="settings-sheet">
        {updateAvailable && (
          <section className="settings-update" aria-live="polite">
            <span>
              <strong>新版本已经准备好</strong>
              <small>更新后会自动回到生活。</small>
            </span>
            <Button onClick={onApplyUpdate}>
              <RefreshCw aria-hidden="true" />
              立即更新
            </Button>
          </section>
        )}

        <section className="settings-section">
          <h3>主题色</h3>
          <p className="setting-note">
            主题色会统一改变标题、按钮、线条和选择状态。
          </p>
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
        </section>

        <section className="settings-section">
          <h3>纸张与壁纸</h3>
          <label className="toggle-row">
            <span>
              <strong>显示正文横线</strong>
              <small>让淡淡的横线陪着正文</small>
            </span>
            <input
              type="checkbox"
              checked={state.settings.journalLines}
              onChange={(event) =>
                setSettings({ journalLines: event.target.checked })
              }
            />
          </label>
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
              <strong>温馨纸张</strong>
              <small>温馨纸张和装订孔陪着你写</small>
            </div>
            {state.settings.theme === 'paper' && <Check />}
          </button>

          <p className="wallpaper-label">或选择一张收藏壁纸</p>
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
                  src={wallpaperAssetUrl(wallpaper)}
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
            壁纸会铺在整本日记后面，内容使用半透明纸面保持清楚。
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
          <label className="toggle-row">
            <span>
              <strong>
                <Volume2 /> 轻柔音效
              </strong>
              <small>每次记录轻轻回应，达成时特别庆祝</small>
            </span>
            <input
              type="checkbox"
              checked={state.settings.sounds}
              onChange={(event) =>
                setSettings({ sounds: event.target.checked })
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

        <section className="settings-section community-section">
          <h3>去姐仨的 TAG 逛逛</h3>
          <div className="community-tags">
            {COMMUNITY_TAGS.map((tag) => (
              <a
                key={tag.id}
                href={`https://www.bilibili.com/v/topic/detail?topic_id=${tag.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: tag.color }}
              >
                <Heart aria-hidden="true" />
                <span>{tag.name}</span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
        <Link className="settings-preview-link" href="/preview">
          体验一段已经记录的生活 →
        </Link>
        <footer className="settings-footer">
          <strong>Asoul一个魂生活日记</strong>
          <span>作者：就一枝匠纸 · AI 生成</span>
          <span>V3.0 · 预览版</span>
        </footer>
      </div>
    </Sheet>
  );
}

export function BottomNav({
  active,
  onChange,
}: {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}) {
  const items: { id: AppTab; label: string; icon: typeof Sprout }[] = [
    { id: 'life', label: '生活', icon: Sprout },
    { id: 'memories', label: '纪念册', icon: BookHeart },
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
