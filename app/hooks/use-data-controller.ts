import type { ChangeEvent, Dispatch, SetStateAction } from 'react';

import type { Confirmation } from '@/components/diary/confirm-dialog';
import { dateKey } from '@/lib/date';
import { clearAllData, createBackup, restoreBackup } from '@/lib/db';
import type { AppState, DiaryBackup } from '@/lib/types';
import type { ShowToast } from '@/hooks/use-toast';

interface DataControllerOptions {
  state: AppState | null;
  setState: Dispatch<SetStateAction<AppState | null>>;
  showToast: ShowToast;
  askConfirmation: (confirmation: Confirmation) => void;
  onClear: () => void;
}

export function useDataController({
  state,
  setState,
  showToast,
  askConfirmation,
  onClear,
}: DataControllerOptions) {
  async function exportData() {
    if (!state) return;
    showToast('正在整理本地备份…');
    const backup = await createBackup(state);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `asoul-diary-v3-${dateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('完整备份已下载');
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    askConfirmation({
      title: '用备份替换现在的记录？',
      description: '当前设备上的事项、成长、日记和照片都会被备份内容替换。',
      confirmLabel: '恢复备份',
      action: async () => {
        try {
          const backup = JSON.parse(await file.text()) as DiaryBackup;
          const restored = await restoreBackup(backup);
          setState(restored);
          showToast('备份已恢复');
        } catch (error) {
          showToast(error instanceof Error ? error.message : '备份恢复失败');
        }
      },
    });
  }

  function clearData() {
    askConfirmation({
      title: '清空这台设备上的全部记录？',
      description:
        '事项、成长、日记和照片都会永久删除。建议先取消并下载完整备份。',
      confirmLabel: '确认全部清空',
      destructive: true,
      action: async () => {
        const fresh = await clearAllData();
        setState(fresh);
        onClear();
        showToast('数据已清空，又是新的一页');
      },
    });
  }

  return { exportData, importData, clearData };
}
