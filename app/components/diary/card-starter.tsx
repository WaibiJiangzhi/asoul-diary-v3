'use client';
import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createLifeCard } from '@/lib/defaults';
import {
  CARD_TEMPLATES,
  createCardFromTemplate,
  restartLifeCard,
} from '@/lib/card-templates';
import type { LifeCard } from '@/lib/types';
import { Decoration } from './decoration';
import { CARD_KINDS, Sheet } from './life-form';

export function CardStarter({
  cards,
  onChoose,
  onClose,
}: {
  cards: LifeCard[];
  onChoose: (card: LifeCard, prefilled: boolean) => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState<'templates' | 'previous'>('templates');
  const [query, setQuery] = useState('');
  const previous = cards
    .filter((c) => c.title.includes(query.trim()))
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Sheet
      title="想从哪件事开始？"
      description="选个例子，改成自己的；也可以从空白开始。"
      onClose={onClose}
    >
      <div className="card-starter">
        {cards.length > 0 && (
          <div className="segmented starter-sources" aria-label="卡片来源">
            <button
              type="button"
              aria-pressed={source === 'templates'}
              onClick={() => setSource('templates')}
            >
              模板起步
            </button>
            <button
              type="button"
              aria-pressed={source === 'previous'}
              onClick={() => setSource('previous')}
            >
              用过的卡片
            </button>
          </div>
        )}
        {source === 'templates' ? (
          <div className="starter-grid">
            {CARD_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChoose(createCardFromTemplate(item.id), true)}
              >
                <Decoration value={item.emoji} className="starter-emoji" />
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="starter-previous">
            <p className="field-hint">
              沿用名字、表情和记录方式，进度从零开始，原卡片照常保留。
            </p>
            <Input
              aria-label="搜索用过的卡片"
              placeholder="找一张用过的卡片…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="starter-previous-list">
              {previous.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => onChoose(restartLifeCard(card), true)}
                >
                  <Decoration value={card.emoji} className="starter-emoji" />
                  <span>
                    <strong>{card.title}</strong>
                    <small>
                      {CARD_KINDS.find((k) => k.id === card.kind)?.name} ·{' '}
                      {card.location === 'memory'
                        ? '已收进纪念册'
                        : card.location === 'later'
                          ? '以后想做'
                          : '正在记录'}
                    </small>
                  </span>
                  <ChevronRight />
                </button>
              ))}
              {!previous.length && (
                <p className="field-hint">没有找到这张卡片，换个名字试试。</p>
              )}
            </div>
          </div>
        )}
        <button
          className="starter-blank"
          type="button"
          onClick={() => onChoose(createLifeCard(), false)}
        >
          <Plus />
          <span>
            <strong>自己写一张</strong>
            <small>名字、表情、记录方式都由你决定</small>
          </span>
          <ChevronRight />
        </button>
      </div>
    </Sheet>
  );
}
