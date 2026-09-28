'use client';
import { useEffect, useState } from 'react';
import { readRecordDraft, writeRecordDraft, dataGeneration } from '@/lib/db';
import type { RecordDraft } from '@/lib/types';
const cache = new Map<string, RecordDraft>();
export function draftKey(cardId: string, recordId?: string) {
  return cardId + ':' + (recordId ?? 'new');
}
export function useRecordDraft(
  key: string,
  preview: boolean,
  sourceUpdatedAt?: string,
) {
  const [loaded, setLoaded] = useState<{
    draft?: RecordDraft;
    error?: string;
  }>();
  const cacheKey = (preview ? 'preview:' : dataGeneration() + ':') + key;
  useEffect(() => {
    let active = true;
    const accept = (draft?: RecordDraft, error?: string) => {
      if (active)
        setLoaded({
          draft: draft?.sourceUpdatedAt === sourceUpdatedAt ? draft : undefined,
          error,
        });
    };
    if (cache.has(cacheKey) || preview) {
      accept(cache.get(cacheKey));
    } else {
      void readRecordDraft(key).then(
        (d) => accept(d),
        () => accept(undefined, '无法读取本地草稿，本次请及时确认记录。'),
      );
    }
    return () => {
      active = false;
    };
  }, [key, preview, cacheKey, sourceUpdatedAt]);
  async function persist(draft?: RecordDraft) {
    if (draft) cache.set(cacheKey, draft);
    else cache.delete(cacheKey);
    if (!preview) await writeRecordDraft(key, draft);
  }
  return { loaded, persist };
}
