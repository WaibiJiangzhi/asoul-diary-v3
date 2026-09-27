'use client';
import { useState, type ReactNode, type CSSProperties } from 'react';
import {
  X,
  Plus,
  Trash2,
  CalendarDays,
  TrendingUp,
  ListChecks,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecorationPicker } from './sticker-picker';
import { CARD_COLORS } from './constants';
import { createId, createLifeCard } from '@/lib/defaults';

import type { CardKind, LifeCard } from '@/lib/types';
export const CARD_KINDS = [
  { id: 'record', name: '记录卡', hint: '每天的状态', Icon: CalendarDays },
  { id: 'progress', name: '进度卡', hint: '一点点积累', Icon: TrendingUp },
  { id: 'stage', name: '阶段卡', hint: '一步步做到', Icon: ListChecks },
  { id: 'blank', name: '随记卡', hint: '文字与照片', Icon: Sparkles },
] as const;
export function Sheet({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent
        className={'sheet-drawer life-sheet ' + (wide ? 'tall' : '')}
        initialFocus={false}
      >
        <div className="drawer-inner">
          <DrawerHeader>
            <div className="sheet-title-row">
              <DrawerTitle>{title}</DrawerTitle>
              <Button
                variant="ghost"
                size="icon"
                aria-label="关闭面板"
                onClick={onClose}
              >
                <X />
              </Button>
            </div>
            <DrawerDescription>
              {description ?? '按自己的节奏，慢慢记录。'}
            </DrawerDescription>
          </DrawerHeader>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
export function CardForm({
  initial,
  onSave,
  onClose,
  isNew = false,
  common = false,
  onBack,
}: {
  initial: LifeCard;
  onSave: (c: LifeCard) => void;
  onClose: () => void;
  isNew?: boolean;
  common?: boolean;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(initial));
  const [error, setError] = useState('');
  const patch = (part: Partial<LifeCard>) =>
    setDraft((c) => ({ ...c, ...part }));
  function kindChange(kind: CardKind) {
    const fresh = createLifeCard(kind);
    patch({
      kind,
      progress: draft.progress ?? fresh.progress,
      record: draft.record ?? fresh.record,
      stages: draft.stages ?? fresh.stages,
    });
  }
  return (
    <Sheet
      title={
        common
          ? '这张常用卡片的样子'
          : isNew
            ? '让它成为你的卡片'
            : '这张卡片的样子'
      }
      description={
        common
          ? '保存的是记录方式；添加到生活后，各自独立记录。'
          : '名字、表情和记录方式，都按自己的习惯来。'
      }
      onClose={onClose}
      wide
    >
      <form
        className="life-form"
        onInvalidCapture={(event) => {
          let section = (event.target as HTMLElement).closest('details');
          while (section) {
            section.open = true;
            section = section.parentElement?.closest('details') ?? null;
          }
        }}
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(draft);
            onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        {onBack && (
          <button className="starter-back" type="button" onClick={onBack}>
            <ArrowLeft />
            重新选一个
          </button>
        )}
        <div className="card-identity-field">
          <DecorationPicker
            compact
            value={draft.emoji}
            onChange={(emoji) => patch({ emoji })}
          />
          <label>
            给它起个名字
            <Input
              required
              maxLength={80}
              placeholder="比如，重新成为一个能跑的人"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
        </div>
        <label>
          给自己的话 <small>可选</small>
          <textarea
            rows={2}
            maxLength={500}
            placeholder="为什么想做这件事？"
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value })}
          />
        </label>
        <section className="form-section card-configuration">
          <div className="card-config-content">
            <fieldset>
              <legend>怎么记录</legend>
              <div className="kind-options">
                {CARD_KINDS.map(({ id, name, hint, Icon }) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={draft.kind === id}
                    className={draft.kind === id ? 'selected' : ''}
                    onClick={() => kindChange(id)}
                  >
                    <Icon />
                    <strong>{name}</strong>
                    <small>{hint}</small>
                  </button>
                ))}
              </div>
            </fieldset>
            {draft.kind === 'progress' && draft.progress && (
              <div className="config-block">
                <div className="field-pair">
                  <label>
                    计量单位
                    <Input
                      required
                      maxLength={12}
                      value={draft.progress.unit}
                      onChange={(e) =>
                        patch({
                          progress: {
                            ...draft.progress!,
                            unit: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    常用增量
                    <Input
                      type="number"
                      min="0.0001"
                      step="any"
                      required
                      value={draft.progress.step}
                      onChange={(e) =>
                        patch({
                          progress: {
                            ...draft.progress!,
                            step: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <div className="field-pair">
                  <label>
                    目标数量 <small>可选</small>
                    <Input
                      type="number"
                      min="0.0001"
                      step="any"
                      placeholder="不填也可以一直积累"
                      value={draft.progress.total ?? ''}
                      onChange={(e) =>
                        patch({
                          progress: {
                            ...draft.progress!,
                            total: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    开始前已有
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={draft.progress.initial}
                      onChange={(e) =>
                        patch({
                          progress: {
                            ...draft.progress!,
                            initial: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  希望完成的日期 <small>可选</small>
                  <Input
                    type="date"
                    value={draft.progress.expectedDate ?? ''}
                    onChange={(e) =>
                      patch({
                        progress: {
                          ...draft.progress!,
                          expectedDate: e.target.value || undefined,
                        },
                      })
                    }
                  />
                </label>
              </div>
            )}
            {draft.kind === 'record' && draft.record && (
              <fieldset className="config-block">
                <legend>每天可以选的状态</legend>
                <p className="field-hint">
                  表情和名称都由你决定；不选表情时显示文字。
                </p>
                {draft.record.states.map((s, i) => (
                  <div className="status-field" key={s.id}>
                    <DecorationPicker
                      compact
                      value={s.emoji}
                      label={'状态 ' + (i + 1) + ' 的表情'}
                      onChange={(emoji) =>
                        patch({
                          record: {
                            ...draft.record!,
                            states: draft.record!.states.map((v) =>
                              v.id === s.id ? { ...v, emoji } : v,
                            ),
                          },
                        })
                      }
                    />
                    <Input
                      aria-label={'状态 ' + (i + 1) + ' 名称'}
                      required
                      maxLength={16}
                      value={s.name}
                      onChange={(e) =>
                        patch({
                          record: {
                            ...draft.record!,
                            states: draft.record!.states.map((v) =>
                              v.id === s.id
                                ? { ...v, name: e.target.value }
                                : v,
                            ),
                          },
                        })
                      }
                    />
                    <select
                      aria-label={'状态 ' + (i + 1) + ' 颜色'}
                      value={s.color}
                      onChange={(e) =>
                        patch({
                          record: {
                            ...draft.record!,
                            states: draft.record!.states.map((v) =>
                              v.id === s.id
                                ? {
                                    ...v,
                                    color: e.target.value as LifeCard['color'],
                                  }
                                : v,
                            ),
                          },
                        })
                      }
                    >
                      {CARD_COLORS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={'移除状态 ' + (i + 1)}
                      disabled={
                        draft.record!.states.length === 1 ||
                        draft.records.some((r) => r.statusId === s.id)
                      }
                      onClick={() =>
                        patch({
                          record: {
                            ...draft.record!,
                            states: draft.record!.states.filter(
                              (v) => v.id !== s.id,
                            ),
                            ...(draft.record!.targetStateId === s.id
                              ? {
                                  targetStateId: undefined,
                                  targetDays: undefined,
                                }
                              : {}),
                          },
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {draft.record.states.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      patch({
                        record: {
                          ...draft.record!,
                          states: [
                            ...draft.record!.states,
                            {
                              id: createId('status'),
                              name: '',
                              emoji: '',
                              color:
                                CARD_COLORS[draft.record!.states.length].value,
                            },
                          ],
                        },
                      })
                    }
                  >
                    <Plus />
                    添加状态
                  </Button>
                )}
                <section className="form-section">
                  <h3>
                    记录周期与期待 <small>可选</small>
                  </h3>
                  <label>
                    记录多少天
                    <Input
                      type="number"
                      min="1"
                      max="3650"
                      step="1"
                      placeholder="留空，长期记录"
                      value={draft.record.periodDays ?? ''}
                      onChange={(e) =>
                        patch({
                          record: {
                            ...draft.record!,
                            periodDays: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        })
                      }
                    />
                  </label>
                  <div className="field-pair">
                    <label>
                      期待的状态
                      <select
                        value={draft.record.targetStateId ?? ''}
                        onChange={(e) =>
                          patch({
                            record: {
                              ...draft.record!,
                              targetStateId: e.target.value || undefined,
                              targetDays: e.target.value
                                ? draft.record!.targetDays
                                : undefined,
                            },
                          })
                        }
                      >
                        <option value="">不设置期待</option>
                        {draft.record.states.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || '未命名状态'}
                          </option>
                        ))}
                      </select>
                    </label>
                    {draft.record.targetStateId && (
                      <label>
                        希望记录几天
                        <Input
                          type="number"
                          min="1"
                          max={draft.record.periodDays ?? 3650}
                          required
                          value={draft.record.targetDays ?? ''}
                          onChange={(e) =>
                            patch({
                              record: {
                                ...draft.record!,
                                targetDays: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                </section>
              </fieldset>
            )}
            {draft.kind === 'stage' && (
              <fieldset className="config-block">
                <legend>想走过的几步</legend>
                <p className="field-hint">可以并行完成，不必按顺序解锁。</p>
                {draft.stages?.map((s, i) => (
                  <div className="stage-field" key={s.id}>
                    <span>{i + 1}</span>
                    <Input
                      required
                      maxLength={60}
                      aria-label={'子目标 ' + (i + 1)}
                      value={s.title}
                      onChange={(e) =>
                        patch({
                          stages: draft.stages!.map((v) =>
                            v.id === s.id ? { ...v, title: e.target.value } : v,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={'移除子目标 ' + (i + 1)}
                      disabled={
                        draft.stages!.length === 1 ||
                        draft.records.some((r) => r.stageId === s.id)
                      }
                      onClick={() =>
                        patch({
                          stages: draft.stages!.filter((v) => v.id !== s.id),
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={(draft.stages?.length ?? 0) >= 30}
                  onClick={() =>
                    patch({
                      stages: [
                        ...(draft.stages ?? []),
                        { id: createId('stage'), title: '' },
                      ],
                    })
                  }
                >
                  <Plus />
                  添加一步
                </Button>
              </fieldset>
            )}
            {draft.kind === 'blank' && (
              <p className="field-hint">
                写文字、放照片就能开始。以后换成其他记录方式，原来的内容都会留下。
              </p>
            )}
          </div>
        </section>
        <section className="form-section">
          <h3>开始日期、位置与颜色</h3>
          <div className="field-pair">
            <label>
              开始日期
              <Input
                type="date"
                required
                value={draft.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </label>
            <label>
              放在哪里
              <select
                value={draft.location}
                onChange={(e) =>
                  patch({ location: e.target.value as LifeCard['location'] })
                }
              >
                {draft.location === 'memory' ? (
                  <option value="memory">纪念册</option>
                ) : (
                  <>
                    <option value="active">正在做的事</option>
                    <option value="later">以后想做</option>
                  </>
                )}
              </select>
            </label>
          </div>
          <div className="color-options">
            {CARD_COLORS.map((c) => (
              <button
                type="button"
                aria-label={c.label}
                aria-pressed={draft.color === c.value}
                key={c.value}
                style={{ '--swatch': c.value } as CSSProperties}
                onClick={() => patch({ color: c.value })}
              />
            ))}
          </div>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button className="form-submit" type="submit">
          {common ? '保存常用卡片' : isNew ? '放进生活，开始记录' : '保存卡片'}
        </Button>
      </form>
    </Sheet>
  );
}
