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
  IceCreamBowl,
  Star,
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
import { GroupFilter, GroupManager } from './diary/card-groups';
import { saveGroup, removeGroup, reorderGroups } from '@/lib/card-groups';
import { useNativeApp } from '@/hooks/use-native-app';
import { isNativeApp } from '@/lib/native';
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
import { PreviewPhotosContext } from '@/hooks/use-photo-urls';
import { DEMO_PHOTOS } from '@/lib/demo-photos';
import { useBackupReminder } from '@/hooks/use-backup-reminder';
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
  | { kind: 'companions' | 'groups' }
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
  const backupReminder = useBackupReminder(
    Boolean(state?.cards.some((card) => card.records.length > 0)),
    preview,
  );
  const [tab, setTab] = useState<AppTab>('life');
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [memoryGroup, setMemoryGroup] = useState('all');
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
  useNativeApp(() => {
    if (confirmation) {
      setConfirmation(null);
      return true;
    }
    if (settings) {
      setSettings(false);
      return true;
    }
    if (panel) {
      closePanel();
      return true;
    }
    if (tab !== 'life') {
      changeTab('life');
      return true;
    }
    return false;
  }, flushSave);
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
    if (
      !canRecord(card, target, todayDate) &&
      !(
        card.location === 'memory' &&
        record &&
        card.records.some((r) => r.id === record.id && r.date === target)
      )
    ) {
      showToast('这一天还不能记录，可以先调整卡片的开始日期。');
      return;
    }
    setPanel({
      kind:
        card.kind === 'record' && !!date && !record && !full
          ? 'status'
          : 'record',
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
          <IceCreamBowl className="loading-nailin" />
        </div>
        <p>翻开生活，慢慢来…</p>
      </main>
    );
  const group =
    selectedGroup === 'ungrouped' ||
    state.groups?.some((g) => g.id === selectedGroup)
      ? selectedGroup
      : 'all';
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
  const content = (
    <main
      className={`app-shell theme-${state.settings.accent} ${state.settings.theme === 'wallpaper' ? 'has-wallpaper' : ''}`}
      style={wallpaperStyle}
    >
      <section className="diary-page" aria-label="一个魂日记">
        <AppHeader
          saveStatus={saveStatus}
          preview={preview}
          updateAvailable={Boolean(updates.waitingServiceWorker)}
          onOpenSettings={() => setSettings(true)}
        />
        {backupReminder.visible && (
          <div className="backup-reminder">
            <span>
              {isNativeApp()
                ? '卸载或清除应用数据前，记得存一份数据备份~'
                : '清空浏览器数据前，记得存一份数据备份~'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={backupReminder.acknowledge}
            >
              知道啦
            </Button>
          </div>
        )}
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
            preview={preview}
            cards={state.cards}
            companions={state.companions}
            group={group}
            groupControls={(actions) => (
              <GroupFilter
                actions={actions}
                groups={state.groups ?? []}
                value={group}
                onChange={setSelectedGroup}
                onManage={() => setPanel({ kind: 'groups' })}
              />
            )}
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
            group={
              memoryGroup === 'ungrouped' ||
              state.groups?.some((g) => g.id === memoryGroup)
                ? memoryGroup
                : 'all'
            }
            groupControls={
              !!state.groups?.length && (
                <GroupFilter
                  groups={state.groups}
                  value={
                    memoryGroup === 'ungrouped' ||
                    state.groups.some((g) => g.id === memoryGroup)
                      ? memoryGroup
                      : 'all'
                  }
                  onChange={setMemoryGroup}
                  onManage={() => setPanel({ kind: 'groups' })}
                />
              )
            }
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
            life.addCommonCards(
              ids,
              state.groups?.some((g) => g.id === group) ? group : undefined,
            );
            setPanel(null);
          }}
          onEdit={(draft) => setPanel({ kind: 'card', draft, common: true })}
          onRemove={life.removeCommonCard}
          onReorder={life.reorderCommonCards}
          onWrite={() =>
            setPanel({
              kind: 'card',
              draft: {
                ...createLifeCard(),
                groupId: state.groups?.some((g) => g.id === group)
                  ? group
                  : undefined,
              },
              isNew: true,
            })
          }
        />
      )}
      {panel?.kind === 'card' && (
        <CardForm
          key={panel.draft.id}
          initial={panel.draft}
          groups={state.groups}
          onCreateGroup={(name) => {
            const currentState = stateRef.current;
            if (!currentState) throw new Error('数据尚未准备好，请稍后重试');
            const next = saveGroup(currentState, name);
            setState(next);
            return next.groups![next.groups!.length - 1].id;
          }}
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
      {panel?.kind === 'groups' && (
        <GroupManager
          groups={state.groups ?? []}
          onClose={closePanel}
          onViewUngrouped={() => {
            if (tab === 'memories') setMemoryGroup('ungrouped');
            else setSelectedGroup('ungrouped');
            closePanel();
          }}
          onSave={(name, id) => {
            const s = stateRef.current;
            if (s) setState(saveGroup(s, name, id));
          }}
          onRemove={(id, onRemoved) => {
            const name = state.groups?.find((group) => group.id === id)?.name;
            setConfirmation({
              title: `删除「${name ?? '这个分组'}」？`,
              description: '卡片和记录不会删除，组内卡片会回到「未分组」。',
              confirmLabel: '确认删除',
              destructive: true,
              action: () => {
                setState((s) => s && removeGroup(s, id));
                onRemoved();
              },
            });
          }}
          onReorder={(a, b) => setState((s) => s && reorderGroups(s, a, b))}
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
          preview={preview}
          initial={panel.record}
          onSave={async (record, files) => {
            await life.saveRecord(current.id, record, files);
            if (!(await flushSave()))
              throw new Error('暂时无法保存到本机，草稿仍保留，请稍后重试');
            showToast('已经记下了');
          }}
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
  return (
    <PreviewPhotosContext value={preview ? DEMO_PHOTOS : null}>
      {content}
    </PreviewPhotosContext>
  );
}
