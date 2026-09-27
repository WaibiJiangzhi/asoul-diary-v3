'use client';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  Archive,
  Candy,
  Star,
  IceCreamCone,
  ArrowRight,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  AppHeader,
  BottomNav,
  SettingsDrawer,
} from '@/components/diary/chrome';
import {
  ConfirmDialog,
  type Confirmation,
} from '@/components/diary/confirm-dialog';
import { CardForm, Sheet } from '@/components/diary/life-form';
import { CardStarter } from '@/components/diary/card-starter';
import { CardDetail, ArchiveForm } from '@/components/diary/life-detail';
import { RecordForm, StageCompletion } from '@/components/diary/life-record';
import {
  LifeView,
  MemoryView,
  CompanionForm,
} from '@/components/diary/life-view';
import { Decoration } from '@/components/diary/decoration';
import { Button } from '@/components/ui/button';
import { useAppFeedback } from '@/hooks/use-app-feedback';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useDataController } from '@/hooks/use-data-controller';
import { useDiaryState } from '@/hooks/use-diary-state';
import { useLifeController } from '@/hooks/use-life-controller';
import { useToast } from '@/hooks/use-toast';
import { formatShortDate } from '@/lib/date';
import { createLifeCard, wallpaperAssetUrl } from '@/lib/defaults';
import { getCommonCards, restartLifeCard } from '@/lib/card-templates';
import { canRecord, statusRecord } from '@/lib/life';
import type { AppTab, LifeCard, LifeRecord } from '@/lib/types';

type Panel =
  | { kind: 'detail' | 'menu' | 'archive'; id: string }
  | {
      kind: 'card';
      draft: LifeCard;
      returnTo?: string;
      isNew?: boolean;
      common?: boolean;
    }
  | { kind: 'starter'; managing?: boolean }
  | { kind: 'stage'; id: string; stageId: string; returnTo?: string }
  | {
      kind: 'record' | 'status';
      id: string;
      date: string;
      record?: LifeRecord;
      returnTo?: string;
    }
  | { kind: 'companions' }
  | null;

export default function DiaryApp({ preview = false }: { preview?: boolean }) {
  const { toast, showToast, dismissToast } = useToast();
  const {
    state,
    setState,
    stateRef,
    saveStatus,
    todayDate,
    flushSave,
    replaceData,
  } = useDiaryState(showToast, preview);
  const [tab, setTab] = useState<AppTab>('life');
  const [panel, setPanel] = useState<Panel>(null);
  const [settings, setSettings] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const positions = useRef<Record<AppTab, number>>({ life: 0, memories: 0 });
  const { haptic, softChime } = useAppFeedback(stateRef);
  const updates = useAppUpdate({ flushSave, showToast, enabled: !preview });
  const life = useLifeController({
    stateRef,
    setState,
    showToast,
    haptic,
    softChime,
    askConfirmation: setConfirmation,
    preview,
  });
  const data = useDataController({
    state,
    replaceData,
    showToast,
    askConfirmation: setConfirmation,
    onClear: () => {
      setSettings(false);
      setPanel(null);
    },
  });
  const { celebration, setCelebration } = life;
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 2200);
    return () => clearTimeout(timer);
  }, [celebration, setCelebration]);
  useLayoutEffect(() => {
    window.scrollTo({ top: positions.current[tab], behavior: 'instant' });
  }, [tab]);
  function changeTab(next: AppTab) {
    if (next === tab) return;
    positions.current[tab] = window.scrollY;
    setTab(next);
  }
  function closePanel() {
    setPanel((p) =>
      p?.kind === 'card' && p.common
        ? { kind: 'starter', managing: true }
        : p && 'returnTo' in p && p.returnTo
          ? { kind: 'detail', id: p.returnTo }
          : null,
    );
  }
  function openRecord(
    id: string,
    date?: string,
    record?: LifeRecord,
    returnTo?: string,
    full = false,
  ) {
    const card = stateRef.current?.cards.find((c) => c.id === id);
    if (!card) return;
    const target = date ?? todayDate;
    if (!canRecord(card, target, todayDate)) {
      showToast('这一天还不能记录，可以先调整卡片的开始日期。');
      return;
    }
    setPanel({
      kind: card.kind === 'record' && !record && !full ? 'status' : 'record',
      id,
      date: target,
      record:
        record ??
        (card.kind === 'record' ? statusRecord(card, target) : undefined),
      returnTo,
    });
  }
  const previewNotice = () =>
    showToast('这是可体验的示例页；保存照片、备份和恢复请回到自己的生活页。');
  if (!state)
    return (
      <main className="app-loading">
        <div className="loading-motifs" aria-hidden="true">
          <Candy className="loading-jiaran" />
          <Star className="loading-bella" />
          <IceCreamCone className="loading-nailin" />
        </div>
        <p>翻开生活，慢慢来…</p>
      </main>
    );
  const current =
    panel && 'id' in panel
      ? state.cards.find((c) => c.id === panel.id)
      : undefined;
  const wallpaperStyle =
    state.settings.theme === 'wallpaper'
      ? ({
          '--selected-wallpaper': `url("${wallpaperAssetUrl(state.settings.wallpaper)}")`,
        } as CSSProperties)
      : undefined;
  return (
    <main
      className={`app-shell theme-${state.settings.accent} ${state.settings.theme === 'wallpaper' ? 'has-wallpaper' : ''}`}
      style={wallpaperStyle}
    >
      <section className="diary-page" aria-label="一个魂生活">
        <AppHeader
          saveStatus={saveStatus}
          preview={preview}
          updateAvailable={Boolean(updates.waitingServiceWorker)}
          onOpenSettings={() => setSettings(true)}
        />
        {preview && (
          <div className="preview-note">
            <span>体验示例 · 修改不会保存</span>
            <Link href="/">
              回到我的生活
              <ArrowRight />
            </Link>
          </div>
        )}
        <div className="app-tab-panel" hidden={tab !== 'life'}>
          <LifeView
            cards={state.cards}
            companions={state.companions}
            today={todayDate}
            onNew={() => setPanel({ kind: 'starter' })}
            onOpen={(id) => setPanel({ kind: 'detail', id })}
            onRecord={openRecord}
            onStage={(id, stageId) => setPanel({ kind: 'stage', id, stageId })}
            onAdjust={life.adjustProgress}
            onMenu={(id) => setPanel({ kind: 'menu', id })}
            onStart={(id) => life.locate(id, 'active')}
            onReorder={life.reorder}
            onCompanions={() => setPanel({ kind: 'companions' })}
          />
        </div>
        <div className="app-tab-panel" hidden={tab !== 'memories'}>
          <MemoryView
            cards={state.cards}
            onOpen={(id) => setPanel({ kind: 'detail', id })}
          />
        </div>
      </section>
      <BottomNav active={tab} onChange={changeTab} />
      {panel?.kind === 'starter' && (
        <CardStarter
          cards={getCommonCards(state)}
          managing={Boolean(panel.managing)}
          onClose={closePanel}
          onManage={(managing) => setPanel({ kind: 'starter', managing })}
          onAdd={(ids) => {
            life.addCommonCards(ids);
            setPanel(null);
          }}
          onEdit={(draft) => setPanel({ kind: 'card', draft, common: true })}
          onRemove={life.removeCommonCard}
          onReorder={life.reorderCommonCards}
          onWrite={() =>
            setPanel({ kind: 'card', draft: createLifeCard(), isNew: true })
          }
        />
      )}
      {panel?.kind === 'card' && (
        <CardForm
          key={panel.draft.id}
          initial={panel.draft}
          isNew={panel.isNew}
          common={panel.common}
          onBack={
            panel.isNew && !panel.returnTo
              ? () => setPanel({ kind: 'starter' })
              : undefined
          }
          onSave={(card) => {
            if (panel.common) life.saveCommonCard(card);
            else life.saveCard(card);
            if (panel.isNew) {
              setPanel(null);
              changeTab('life');
            }
          }}
          onClose={closePanel}
        />
      )}
      {panel?.kind === 'companions' && (
        <CompanionForm
          cards={state.companions}
          onChange={(companions) => setState((s) => s && { ...s, companions })}
          onClose={closePanel}
        />
      )}
      {current && panel?.kind === 'menu' && (
        <Sheet
          title={current.title}
          description="让这张卡片适合现在的自己。"
          onClose={closePanel}
        >
          <div className="card-menu">
            <button
              type="button"
              onClick={() => setPanel({ kind: 'card', draft: current })}
            >
              <Pencil />
              编辑卡片与记录方式
            </button>
            <button
              type="button"
              onClick={() => {
                life.saveCommonCard(restartLifeCard(current));
                setPanel(null);
              }}
            >
              <Plus />
              存为常用卡片
            </button>
            <button
              type="button"
              onClick={() => {
                life.locate(
                  current.id,
                  current.location === 'active' ? 'later' : 'active',
                );
                setPanel(null);
              }}
            >
              <Clock3 />
              {current.location === 'active' ? '放到以后想做' : '回到正在记录'}
            </button>
            <button
              type="button"
              onClick={() => setPanel({ kind: 'archive', id: current.id })}
            >
              <Archive />
              收进纪念册
            </button>
            <button
              type="button"
              className="danger-text"
              onClick={() => {
                setPanel(null);
                life.removeCard(current.id);
              }}
            >
              <Trash2 />
              删除卡片
            </button>
          </div>
        </Sheet>
      )}
      {current && panel?.kind === 'detail' && (
        <CardDetail
          key={current.id}
          card={current}
          onClose={closePanel}
          onRecord={(date, record) =>
            openRecord(current.id, date, record, current.id, Boolean(record))
          }
          onEdit={() =>
            setPanel({ kind: 'card', draft: current, returnTo: current.id })
          }
          onDeleteRecord={(id) => life.removeRecord(current.id, id)}
          onStage={(stageId) =>
            setPanel({
              kind: 'stage',
              id: current.id,
              stageId,
              returnTo: current.id,
            })
          }
          onArchive={() => setPanel({ kind: 'archive', id: current.id })}
          onRestore={() => {
            life.locate(current.id, 'active');
            setPanel(null);
            changeTab('life');
          }}
          onNewSeason={() => {
            setPanel({
              kind: 'card',
              draft: restartLifeCard(current),
              isNew: true,
              returnTo: current.id,
            });
          }}
          onDelete={() => life.removeCard(current.id)}
        />
      )}
      {current && panel?.kind === 'archive' && (
        <ArchiveForm
          card={current}
          onClose={closePanel}
          onSave={(summary, ending) =>
            life.archive(current.id, summary, ending)
          }
        />
      )}
      {current && panel?.kind === 'record' && (
        <RecordForm
          key={current.id + panel.date + (panel.record?.id ?? '')}
          card={current}
          date={panel.date}
          initial={panel.record}
          onSave={(record, files) => life.saveRecord(current.id, record, files)}
          onClose={closePanel}
        />
      )}
      {current && panel?.kind === 'stage' && (
        <StageCompletion
          key={current.id + panel.stageId}
          card={current}
          stageId={panel.stageId}
          onClose={closePanel}
          onSave={(done, emoji) => {
            life.setStage(current.id, panel.stageId, done, emoji);
            closePanel();
          }}
        />
      )}
      {current && panel?.kind === 'status' && (
        <Sheet
          title={formatShortDate(panel.date) + '，今天怎么样？'}
          description={current.title}
          onClose={closePanel}
        >
          <div className="quick-status">
            <div className="status-options">
              {current.record?.states.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={
                    statusRecord(current, panel.date)?.statusId === s.id
                      ? 'selected'
                      : ''
                  }
                  aria-pressed={
                    statusRecord(current, panel.date)?.statusId === s.id
                  }
                  onClick={() => {
                    life.quickStatus(current.id, panel.date, s.id);
                    closePanel();
                  }}
                >
                  <Decoration value={s.emoji} className="status-emoji" />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
            <p className="field-hint">
              再点已选状态，就能撤回。每一天都可以重新开始。
            </p>
            <Button
              variant="outline"
              onClick={() =>
                openRecord(
                  current.id,
                  panel.date,
                  undefined,
                  panel.returnTo,
                  true,
                )
              }
            >
              <Plus />
              写点文字，或放张照片
            </Button>
          </div>
        </Sheet>
      )}
      <SettingsDrawer
        state={state}
        open={settings}
        onOpenChange={setSettings}
        onStateChange={setState}
        onExport={preview ? previewNotice : data.exportData}
        onImport={
          preview
            ? (event) => {
                event.target.value = '';
                previewNotice();
              }
            : data.importData
        }
        onClear={preview ? previewNotice : data.clearData}
        onInstall={updates.installApp}
        updateAvailable={Boolean(updates.waitingServiceWorker)}
        onApplyUpdate={() => void updates.applyReadyUpdate()}
      />
      <ConfirmDialog
        confirmation={confirmation}
        onClose={() => setConfirmation(null)}
        accent={state.settings.accent}
      />
      {celebration &&
        createPortal(
          <output
            className="life-celebration"
            key={celebration.id}
            aria-live="polite"
          >
            <Sparkles />
            <strong>{celebration.title}</strong>
            <span>给认真生活的自己，一点掌声 ♡</span>
          </output>,
          document.body,
        )}
      {toast &&
        createPortal(
          <output
            className={`toast theme-${state.settings.accent}`}
            aria-live="polite"
          >
            <span>{toast.message}</span>
            {toast.undo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  toast.undo?.();
                  dismissToast();
                }}
              >
                <RotateCcw />
                撤销
              </Button>
            )}
          </output>,
          document.body,
        )}
      {updates.waitingServiceWorker &&
        updates.updateNoticeVisible &&
        !toast &&
        createPortal(
          <output className="toast update-toast" aria-live="polite">
            <span>新版本已经准备好</span>
            <Button size="sm" onClick={() => void updates.applyReadyUpdate()}>
              <RefreshCw />
              立即更新
            </Button>
          </output>,
          document.body,
        )}
    </main>
  );
}
