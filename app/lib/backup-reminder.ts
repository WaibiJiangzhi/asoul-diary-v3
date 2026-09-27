export const BACKUP_REMINDER_INTERVAL = 30 * 24 * 60 * 60 * 1000;
export function backupReminderSince(
  stored: number,
  session: number | null,
  now: number,
) {
  const clocks = [stored, session].filter(
    (value): value is number =>
      value !== null && Number.isFinite(value) && value > 0 && value <= now,
  );
  return clocks.length ? Math.max(...clocks) : now;
}

export function backupReminderDue(since: number, now: number) {
  return (
    Number.isFinite(since) &&
    since > 0 &&
    now - since >= BACKUP_REMINDER_INTERVAL
  );
}
