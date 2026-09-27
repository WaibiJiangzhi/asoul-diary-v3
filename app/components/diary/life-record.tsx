'use client';
import Image from 'next/image';
import { Dialog } from '@base-ui/react/dialog';
import { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JournalEditor } from './journal-editor';
import { Sheet } from './life-form';
import { Decoration } from './decoration';
import { getPhotos } from '@/lib/db';
import { createId } from '@/lib/defaults';
import { dateKey } from '@/lib/date';
import { recordEnd, stageComplete } from '@/lib/life';
import type { LifeCard, LifeRecord } from '@/lib/types';
export function usePhotoUrls(ids: string[]) {
  const key = ids.join('|');
  const [photos, setPhotos] = useState<
    { id: string; url: string; name: string }[]
  >([]);
  useEffect(() => {
    let disposed = false;
    let urls: string[] = [];
    void getPhotos(key ? key.split('|') : [])
      .then((items) => {
        if (disposed) return;
        const next = items.map((p) => ({
          id: p.id,
          url: URL.createObjectURL(p.blob),
          name: p.name,
        }));
        urls = next.map((p) => p.url);
        setPhotos(next);
      })
      .catch(() => {
        if (!disposed) setPhotos([]);
      });
    return () => {
      disposed = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [key]);
  return photos;
}
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
          <Dialog.Backdrop className="photo-backdrop" />
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
export function RecordForm({
  card,
  date,
  initial,
  ruled,
  onSave,
  onClose,
}: {
  card: LifeCard;
  date: string;
  initial?: LifeRecord;
  ruled: boolean;
  onSave: (r: LifeRecord, files: File[]) => Promise<void>;
  onClose: () => void;
}) {
  const [body, setBody] = useState(initial?.body ?? '');
  const [selectedDate, setDate] = useState(initial?.date ?? date);
  const [delta, setDelta] = useState(
    String(initial?.delta ?? (initial ? 0 : (card.progress?.step ?? 1))),
  );
  const [status, setStatus] = useState(initial?.statusId ?? '');
  const [stage, setStage] = useState(initial?.stageId ?? '');
  const [stageDone, setStageDone] = useState(initial?.stageDone ?? true);
  const [photoIds, setPhotoIds] = useState(initial?.photoIds ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const now = new Date().toISOString();
  const end = recordEnd(card);
  const max =
    end && card.kind === 'record' && end < dateKey() ? end : dateKey();
  async function save() {
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
    setBusy(true);
    try {
      await onSave(
        {
          id: initial?.id ?? createId('record'),
          date: selectedDate,
          body,
          photoIds,
          createdAt: initial?.createdAt ?? now,
          updatedAt: now,
          ...(card.kind === 'progress' || initial?.delta !== undefined
            ? { delta: Number(delta) }
            : {}),
          ...(status ? { statusId: status } : {}),
          ...(stage ? { stageId: stage, stageDone } : {}),
        },
        files,
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
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
    >
      <form
        className="life-form record-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label>
          记录哪一天
          <Input
            type="date"
            required
            min={card.startDate}
            max={max}
            value={selectedDate}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
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
          </fieldset>
        )}
        <div ref={setHost} className="record-editor-host">
          <JournalEditor
            value={body}
            onChange={setBody}
            ruled={ruled}
            portalTarget={host}
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
          {busy ? '正在保存照片…' : '确认记录'}
        </Button>
      </form>
    </Sheet>
  );
}
