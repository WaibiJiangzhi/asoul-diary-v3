'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Candy, IceCreamBowl, RefreshCw, RotateCcw, Star } from 'lucide-react';
import { createPortal } from 'react-dom';

import {
  AppHeader,
  BottomNav,
  PaperBinding,
  SettingsDrawer,
} from '@/components/diary/chrome';
import {
  ConfirmDialog,
  type Confirmation,
} from '@/components/diary/confirm-dialog';
import { GrowthDrawer, GrowthView } from '@/components/diary/growth';
import { JournalView } from '@/components/diary/journal';
import {
  TaskEditDrawer,
  TodayDrawer,
  TodayView,
} from '@/components/diary/today';
import { Button } from '@/components/ui/button';
import { useAppFeedback } from '@/hooks/use-app-feedback';
import { useAppUpdate } from '@/hooks/use-app-update';
import { useDataController } from '@/hooks/use-data-controller';
import { useDiaryState } from '@/hooks/use-diary-state';
import { useDiaryWebMcp } from '@/hooks/use-diary-webmcp';
import { useGrowthController } from '@/hooks/use-growth-controller';
import { useJournalController } from '@/hooks/use-journal-controller';
import { useTodayController } from '@/hooks/use-today-controller';
import { useToast } from '@/hooks/use-toast';
import { dateKey } from '@/lib/date';
import { wallpaperAssetUrl } from '@/lib/defaults';
import type { AppTab } from '@/lib/types';

/**
 * Application composition root. Domain mutations live in focused controllers;
 * this component only connects state, screens, drawers, and global feedback.
 */
export default function DiaryApp() {
  const { toast, showToast, dismissToast } = useToast();
  const {
    state,
    setState,
    stateRef,
    storageAvailable,
    saveStatus,
    setSaveStatus,
    todayDate,
    setTodayDate,
    isReady,
  } = useDiaryState(showToast);
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [journalDate, setJournalDate] = useState(dateKey());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  function askConfirmation(next: Confirmation) {
    setConfirmation(next);
  }

  const { haptic, softChime } = useAppFeedback(stateRef);
  const {
    waitingServiceWorker,
    updateNoticeVisible,
    applyReadyUpdate,
    installApp,
  } = useAppUpdate({
    stateRef,
    storageAvailable,
    setSaveStatus,
    showToast,
  });
  useDiaryWebMcp({ isReady, stateRef, setState });

  const today = useTodayController({
    selectedDate: todayDate,
    setState,
    showToast,
    haptic,
    softChime,
    askConfirmation,
  });
  const growth = useGrowthController({
    state,
    stateRef,
    setState,
    showToast,
    haptic,
    softChime,
    askConfirmation,
  });
  const journal = useJournalController({
    stateRef,
    setState,
    showToast,
    askConfirmation,
  });
  const data = useDataController({
    state,
    setState,
    showToast,
    askConfirmation,
    onClear: () => setSettingsOpen(false),
  });

  function changeTab(tab: AppTab) {
    setActiveTab(tab);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

  if (!state) {
    return (
      <main className="app-loading">
        <span className="loading-motifs" aria-hidden="true">
          <Candy className="loading-jiaran" />
          <Star className="loading-bella" />
          <IceCreamBowl className="loading-nailin" />
        </span>
        <p>正在翻开今天的一页…</p>
      </main>
    );
  }

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
      <section className="diary-page" aria-label="Asoul一个魂生活日记">
        <PaperBinding />
        <AppHeader
          saveStatus={saveStatus}
          updateAvailable={Boolean(waitingServiceWorker)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {activeTab === 'today' && (
          <TodayView
            key={todayDate}
            state={state}
            selectedDate={todayDate}
            onDateChange={setTodayDate}
            onAdd={() => {
              today.setTodayDrawerMode('add');
              today.setTodayDrawerOpen(true);
            }}
            onToggle={today.toggleTodayTask}
            onEdit={today.setTaskEditing}
            onReorder={today.reorderTodayTasks}
          />
        )}
        {activeTab === 'growth' && (
          <GrowthView
            state={state}
            onAdd={growth.openNewGrowth}
            onAdjust={growth.adjustProgress}
            onDeleteEvent={growth.deleteProgressEvent}
            onEdit={growth.openEditGrowth}
            onDelete={growth.deleteGrowth}
            onArchive={growth.archiveGrowth}
            onCopy={growth.copyMemory}
            onRestoreMemory={growth.restoreMemory}
            onDeleteMemory={growth.deleteMemory}
            onAddCountdownNote={growth.addCountdownNote}
            onDeleteCountdownNote={growth.deleteCountdownNote}
          />
        )}
        {activeTab === 'journal' && (
          <JournalView
            state={state}
            selectedDate={journalDate}
            onDateChange={setJournalDate}
            onUpdate={journal.updateDiary}
            onAddPhotos={journal.addDiaryPhotos}
            onRemovePhoto={journal.removeDiaryPhoto}
            onDelete={journal.deleteDiary}
            onSetDateMarker={journal.setDateMarker}
          />
        )}
        <BottomNav active={activeTab} onChange={changeTab} />
      </section>

      <TodayDrawer
        state={state}
        selectedDate={todayDate}
        open={today.todayDrawerOpen}
        mode={today.todayDrawerMode}
        onModeChange={today.setTodayDrawerMode}
        onOpenChange={today.setTodayDrawerOpen}
        onAddTasks={today.addTodayTasks}
        onSaveCommon={today.saveCommon}
        onDeleteCommon={today.deleteCommon}
        onReorderCommon={today.reorderCommonItems}
      />

      <TaskEditDrawer
        task={today.taskEditing}
        onChange={today.setTaskEditing}
        onSave={today.saveEditedTask}
        onDelete={today.deleteTodayTask}
      />

      <GrowthDrawer
        open={growth.growthOpen}
        draft={growth.growthDraft}
        onOpenChange={growth.setGrowthOpen}
        onDraftChange={growth.setGrowthDraft}
        onSave={growth.saveGrowth}
        onMove={(kind, id, direction) => {
          const item =
            kind === 'countdown'
              ? state.countdowns.find((entry) => entry.id === id)
              : state.progressGoals.find((entry) => entry.id === id);
          if (item) growth.moveGrowth(item, direction);
        }}
      />

      <SettingsDrawer
        state={state}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onStateChange={setState}
        onExport={data.exportData}
        onImport={data.importData}
        onClear={data.clearData}
        onInstall={installApp}
        updateAvailable={Boolean(waitingServiceWorker)}
        onApplyUpdate={() => void applyReadyUpdate()}
      />

      <ConfirmDialog
        confirmation={confirmation}
        onClose={() => setConfirmation(null)}
        accent={state.settings.accent}
      />

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
                <RotateCcw aria-hidden="true" /> 撤销
              </Button>
            )}
          </output>,
          document.body,
        )}
      {waitingServiceWorker &&
        updateNoticeVisible &&
        !toast &&
        createPortal(
          <output
            className={`toast update-toast theme-${state.settings.accent}`}
            aria-live="polite"
          >
            <span>新版本已经准备好</span>
            <Button size="sm" onClick={() => void applyReadyUpdate()}>
              <RefreshCw aria-hidden="true" />
              立即更新
            </Button>
          </output>,
          document.body,
        )}
    </main>
  );
}
