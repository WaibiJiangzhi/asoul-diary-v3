import { useEffect, useRef, useState } from 'react';
import { backupReminderDue, backupReminderSince } from '@/lib/backup-reminder';

const KEY = 'asoul-life-backup-reminder-since';

export function useBackupReminder(hasRecords: boolean, preview: boolean) {
  const [visible, setVisible] = useState(false);
  const fallback = useRef<number | null>(null);
  useEffect(() => {
    if (preview || !hasRecords) return;
    const check = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      let since = backupReminderSince(0, fallback.current, now);
      try {
        const stored = Number(localStorage.getItem(KEY));
        since = backupReminderSince(stored, fallback.current, now);
        if (stored !== since) localStorage.setItem(KEY, String(since));
      } catch {
        // Keep a session-only clock when optional browser storage is unavailable.
      }
      fallback.current = since;
      setVisible(backupReminderDue(since, now));
    };
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('storage', check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('storage', check);
      window.clearInterval(timer);
    };
  }, [hasRecords, preview]);
  function acknowledge() {
    const now = Date.now();
    fallback.current = now;
    try {
      localStorage.setItem(KEY, String(now));
    } catch {
      /* Session-only dismissal. */
    }
    setVisible(false);
  }
  return { visible: !preview && hasRecords && visible, acknowledge };
}
