'use client';
import Image from 'next/image';
import { Dialog } from '@base-ui/react/dialog';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JournalEditor } from './journal-editor';
import { Sheet } from './life-form';
import { Decoration } from './decoration';
import { DecorationPicker } from './sticker-picker';
import { usePhotoUrls } from '@/hooks/use-photo-urls';
import { createId } from '@/lib/defaults';
import { dateKey } from '@/lib/date';
import { canRecord, stageComplete, stageEmoji } from '@/lib/life';
import { draftKey, useRecordDraft } from '@/hooks/use-record-draft';
import type { RecordDraft, LifeCard, LifeRecord } from '@/lib/types';
export function PhotoStrip({
  ids,
  onRemove,
}: {
  ids: string[];
  onRemove?: (id: string) => void;
}) {
  const photos = usePhotoUrls(ids);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <div className="photo-strip">
        {photos.map((p) => (
          <div key={p.id}>
            <button
              type="button"
              onClick={() => setSelected(p.url)}
              aria-label={'查看照片 ' + p.name}
            >
              <Image
                src={p.url}
                alt={p.name}
                width={160}
                height={160}
                unoptimized
              />
            </button>
            {onRemove && (
              <button
                className="photo-remove"
                type="button"
                aria-label={'移除照片 ' + p.name}
                onClick={() => onRemove(p.id)}
              >
                <X />
              </button>
            )}
          </div>
        ))}
      </div>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="photo-backdrop" forceRender />
          <Dialog.Popup className="life-lightbox">
            <Dialog.Title className="sr-only">照片预览</Dialog.Title>
            <Dialog.Close aria-label="关闭照片">
              <X />
            </Dialog.Close>
            {selected && (
              <Image
                src={selected}
                alt="照片大图"
                width={1600}
                height={1600}
                unoptimized
              />
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
type RecordFormProps = {
  card: LifeCard;
  date: string;
  initial?: LifeRecord;
  preview?: boolean;
  onSave: (r: LifeRecord, files: File[]) => Promise<void>;
  onClose: () => void;
};
export function RecordForm(props: RecordFormProps) {
  const { loaded, persist } = useRecordDraft(
    draftKey(props.card.id, props.initial?.id),
    !!props.preview,
    props.initial?.updatedAt,
  );
  if (!loaded)
    return (
      <Sheet title="打开记录" onClose={props.onClose}>
        <p>正在读取草稿…</p>
      </Sheet>
    );
  return (
    <RecordFormEditor
      {...props}
      seed={
        !props.initial &&
        loaded.draft?.recordId &&
        props.card.records.some((r) => r.id === loaded.draft?.recordId)
          ? undefined
          : loaded.draft
      }
      draftError={loaded.error}
      persist={persist}
    />
  );
}
function RecordFormEditor({
  card,
  date,
  initial,
  onSave,
  onClose,
  seed,
  draftError,
  persist,
}: RecordFormProps & {
  seed?: RecordDraft;
  draftError?: string;
  persist: (draft?: RecordDraft) => Promise<void>;
}) {
  const [body, setBody] = useState(seed?.body ?? initial?.body ?? '');
  const [selectedDate, setDate] = useState(seed?.date ?? initial?.date ?? date);
  const [delta, setDelta] = useState(
    seed?.delta ??
      String(initial?.delta ?? (initial ? 0 : (card.progress?.step ?? 1))),
  );
  const [status, setStatus] = useState(seed?.status ?? initial?.statusId ?? '');
  const [stage, setStage] = useState(seed?.stage ?? initial?.stageId ?? '');
  const [stageDone, setStageDone] = useState(
    seed?.stageDone ?? initial?.stageDone ?? true,
  );
  const [completionEmoji, setCompletionEmoji] = useState(
    seed?.completionEmoji ?? initial?.stageEmoji ?? '',
  );
  const [photoIds, setPhotoIds] = useState(
    seed?.photoIds ?? initial?.photoIds ?? [],
  );
  const [files, setFiles] = useState<File[]>(seed?.files ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const stopped = useRef(false);
  const saving = useRef(false);
  const [recordId] = useState(
    () => initial?.id ?? seed?.recordId ?? createId('record'),
  );
  const form = useRef<HTMLFormElement>(null);
  const [draftNotice, setDraftNotice] = useState(
    draftError ?? (seed ? '已恢复未提交的草稿' : ''),
  );
  const snapshot: RecordDraft = {
    cardId: card.id,
    recordId,
    body,
    date: selectedDate,
    delta,
    status,
    stage,
    stageDone,
    completionEmoji,
    photoIds,
    files,
    sourceUpdatedAt: initial?.updatedAt,
  };
  const first = useRef(true);
  const retainDraft = useEffectEvent(() => {
    if (stopped.current) return;
    if (first.current) {
      first.current = false;
      return;
    }
    void persist(snapshot).then(
      () => setDraftNotice('草稿已保留，确认后才计入记录'),
      () => setDraftNotice('草稿仅暂存在本页，请及时确认记录'),
    );
  });
  useEffect(() => {
    retainDraft();
  }, [
    body,
    selectedDate,
    delta,
    status,
    stage,
    stageDone,
    completionEmoji,
    photoIds,
    files,
  ]);
  async function discard() {
    stopped.current = true;
    try {
      await persist();
      onClose();
    } catch {
      stopped.current = false;
      setDraftNotice('草稿未能清除，请重试');
    }
  }
  const max = dateKey();
  async function save() {
    if (saving.current) return;
    setError('');
    if (
      !body.trim() &&
      !files.length &&
      !photoIds.length &&
      !status &&
      !stage &&
      !(card.kind === 'progress' && Number(delta)) &&
      !initial
    ) {
      setError('写一点、选一个状态，或放一张照片再保存吧');
      return;
    }
    saving.current = true;
    setBusy(true);
    const now = new Date().toISOString();
    try {
      await onSave(
        {
          id: recordId,
          date: selectedDate,
          body,
          photoIds,
          createdAt: initial?.createdAt ?? now,
          updatedAt: now,
          ...(card.kind === 'progress' || initial?.delta !== undefined
            ? { delta: Number(delta) }
            : {}),
          ...(status ? { statusId: status } : {}),
          ...(stage
            ? {
                stageId: stage,
                stageDone,
                stageEmoji: stageDone ? completionEmoji : undefined,
              }
            : {}),
        },
        files,
      );
      stopped.current = true;
      try {
        await persist();
      } catch {
        /* A saved record supersedes this draft on reopening. */
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={initial ? '修改这条记录' : '记下一点进展'}
      description={card.title}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
      composerHost={setHost}
    >
      <form
        ref={form}
        className="life-form record-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset className="record-form-fields" disabled={busy}>
          <div className="draft-notice">
            <output>
              {draftNotice || '关闭后可继续编辑，确认后才计入记录'}
            </output>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void discard()}
            >
              放弃草稿
            </Button>
          </div>
          <label>
            记录哪一天
            <Input
              type="date"
              required
              min={card.startDate}
              max={max}
              value={selectedDate}
              onChange={(e) => setDate(e.target.value)}
              disabled={busy || card.location === 'memory'}
            />
          </label>
          {card.kind === 'progress' && (
            <label>
              本次调整 <small>填 0 只留文字，负数可减少进度</small>
              <div className="quantity-field">
                <Input
                  type="number"
                  step="any"
                  required
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                />
                <strong>{card.progress?.unit}</strong>
              </div>
            </label>
          )}
          {card.kind === 'record' && (
            <fieldset>
              <legend>
                今天的状态 <small>再点一次可以取消</small>
              </legend>
              <div className="status-options">
                {card.record?.states.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    aria-pressed={status === s.id}
                    className={status === s.id ? 'selected' : ''}
                    onClick={() => setStatus(status === s.id ? '' : s.id)}
                  >
                    <Decoration value={s.emoji} className="status-emoji" />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {card.kind === 'stage' && (
            <fieldset>
              <legend>
                这次走到哪一步 <small>可选</small>
              </legend>
              <select
                aria-label="关联子目标"
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value);
                  setStageDone(!stageComplete(card, e.target.value));
                  setCompletionEmoji(stageEmoji(card, e.target.value));
                }}
              >
                <option value="">只写一条记录</option>
                {card.stages?.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              {stage && (
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={stageDone}
                    onChange={(e) => setStageDone(e.target.checked)}
                  />
                  这一步已完成
                </label>
              )}
              {stage && stageDone && (
                <DecorationPicker
                  value={completionEmoji}
                  onChange={setCompletionEmoji}
                  label="完成这一步的表情（可选）"
                />
              )}
            </fieldset>
          )}
          <div className="record-editor-host">
            <JournalEditor
              value={body}
              onChange={setBody}
              portalTarget={host}
              onConfirm={() => form.current?.requestSubmit()}
              confirmDisabled={busy}
              readOnly={busy}
            />
          </div>
          <PhotoStrip
            ids={photoIds}
            onRemove={(id) => setPhotoIds((ids) => ids.filter((v) => v !== id))}
          />
          <div className="pending-photos">
            {files.map((f, i) => (
              <div key={i}>
                <span>{f.name}</span>
                <button
                  type="button"
                  aria-label={'移除待添加照片 ' + f.name}
                  onClick={() =>
                    setFiles((values) => values.filter((_, n) => n !== i))
                  }
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
          <label className="attach-photo">
            <Camera />
            添加照片 <small>{photoIds.length + files.length}/9</small>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy || photoIds.length + files.length >= 9}
              onChange={(e) => {
                const selected = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (selected.some((f) => !f.type.startsWith('image/'))) {
                  setError('请选择图片文件');
                  return;
                }
                setFiles((current) =>
                  [...current, ...selected].slice(0, 9 - photoIds.length),
                );
              }}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="form-submit">
            {busy ? '正在保存…' : '确认记录'}
          </Button>
        </fieldset>
      </form>
    </Sheet>
  );
}

export function StageCompletion({
  card,
  stageId,
  onSave,
  onClose,
}: {
  card: LifeCard;
  stageId: string;
  onSave: (done: boolean, emoji: string) => void;
  onClose: () => void;
}) {
  const done = stageComplete(card, stageId);
  const [emoji, setEmoji] = useState(stageEmoji(card, stageId));
  const allowed = canRecord(card, dateKey());
  return (
    <Sheet
      title={done ? '给这一步留个表情' : '这一步，做到了'}
      description={card.stages?.find((s) => s.id === stageId)?.title}
      onClose={onClose}
    >
      <div className="stage-completion">
        <DecorationPicker
          value={emoji}
          onChange={setEmoji}
          label="挑一个完成表情（可选）"
        />
        <p className="field-hint">选好的表情会陪在节点上方，也可以直接打勾。</p>
        <Button disabled={!allowed} onClick={() => onSave(true, emoji)}>
          {done ? '保存表情' : '确认完成'}
        </Button>
        {done && (
          <Button
            disabled={!allowed}
            variant="ghost"
            onClick={() => onSave(false, '')}
          >
            撤回这一步
          </Button>
        )}
        {!allowed && <p className="field-hint">到开始日期后，就可以记录了。</p>}
      </div>
    </Sheet>
  );
}
