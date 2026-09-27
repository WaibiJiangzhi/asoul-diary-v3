'use client';
import { useState } from 'react';
import { Check, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLifeCard } from '@/lib/defaults';
import type { LifeCard } from '@/lib/types';
import { Decoration } from './decoration';
import { CARD_KINDS, Sheet } from './life-form';

export function CardStarter({
  cards,
  managing,
  onManage,
  onAdd,
  onEdit,
  onRemove,
  onWrite,
  onClose,
}: {
  cards: LifeCard[];
  managing: boolean;
  onManage: (value: boolean) => void;
  onAdd: (ids: string[]) => void;
  onEdit: (card: LifeCard) => void;
  onRemove: (id: string) => void;
  onWrite: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const count = cards.filter((c) => selected.includes(c.id)).length;
  return (
    <Sheet
      title={managing ? '管理常用卡片' : '添加常用卡片'}
      description={
        managing
          ? '把经常想做的事放在这里，之后随时添加。'
          : '选几张放进生活，每张都从新的一段开始。'
      }
      onClose={onClose}
    >
      <div className="card-starter">
        <div className="common-card-list">
          {cards.map((card) => (
            <div className="common-card-row" key={card.id}>
              <button
                type="button"
                className="common-card-choice"
                aria-pressed={managing ? undefined : selected.includes(card.id)}
                onClick={() =>
                  managing
                    ? onEdit(card)
                    : setSelected((ids) =>
                        ids.includes(card.id)
                          ? ids.filter((id) => id !== card.id)
                          : [...ids, card.id],
                      )
                }
              >
                <Decoration value={card.emoji} className="starter-emoji" />
                <span>
                  <strong>{card.title}</strong>
                  <small>
                    {CARD_KINDS.find((k) => k.id === card.kind)?.name}
                  </small>
                </span>
                {managing ? (
                  <Pencil />
                ) : (
                  <i>{selected.includes(card.id) && <Check />}</i>
                )}
              </button>
              {managing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={'移除常用卡片 ' + card.title}
                  onClick={() => onRemove(card.id)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
          {!cards.length && (
            <p className="field-hint">还没有常用卡片，先添加一张喜欢的吧。</p>
          )}
        </div>
        {managing ? (
          <>
            <Button variant="outline" onClick={() => onEdit(createLifeCard())}>
              <Plus />
              新增常用卡片
            </Button>
            <Button onClick={() => onManage(false)}>完成管理</Button>
          </>
        ) : (
          <>
            <Button disabled={!count} onClick={() => onAdd(selected)}>
              添加已选 {count} 张
            </Button>
            <button className="starter-blank" type="button" onClick={onWrite}>
              <Plus />
              <span>
                <strong>手动写一张</strong>
                <small>这次想到的事，直接放进生活</small>
              </span>
              <ChevronRight />
            </button>
            <Button variant="ghost" onClick={() => onManage(true)}>
              管理常用卡片
              <ChevronRight />
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}
