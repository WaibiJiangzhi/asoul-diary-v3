import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createId } from '@/lib/defaults';
import { CARD_COLORS, type GrowthDraft } from './constants';
import { DecorationPicker } from './sticker-picker';

export function RecordStateFields({
  draft,
  onChange,
}: {
  draft: GrowthDraft;
  onChange: (patch: Partial<GrowthDraft>) => void;
}) {
  return (
    <fieldset className="record-state-fields">
      <legend>每天记录的状态</legend>
      <p className="challenge-setup-hint">
        一天选一种，名称、颜色和表情都由你决定。
      </p>
      {draft.states.map((status, index) => (
        <div className="record-state-field" key={status.id}>
          <DecorationPicker
            compact
            value={status.emoji}
            label={`选择状态 ${index + 1} 的表情`}
            onChange={(emoji) =>
              onChange({
                states: draft.states.map((item) =>
                  item.id === status.id ? { ...item, emoji } : item,
                ),
              })
            }
          />
          <Input
            aria-label={`状态 ${index + 1} 名称`}
            value={status.name}
            maxLength={12}
            required
            onChange={(event) =>
              onChange({
                states: draft.states.map((item) =>
                  item.id === status.id
                    ? { ...item, name: event.target.value }
                    : item,
                ),
              })
            }
          />
          <details className="record-state-color">
            <summary
              aria-label={`选择状态 ${index + 1} 颜色`}
              style={{ backgroundColor: status.color }}
            />
            <div>
              {CARD_COLORS.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  aria-label={`状态 ${index + 1} 使用${color.label}`}
                  aria-pressed={status.color === color.value}
                  style={{ background: color.value }}
                  onClick={(event) => {
                    onChange({
                      states: draft.states.map((item) =>
                        item.id === status.id
                          ? { ...item, color: color.value }
                          : item,
                      ),
                    });
                    event.currentTarget
                      .closest('details')
                      ?.removeAttribute('open');
                  }}
                />
              ))}
            </div>
          </details>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={draft.states.length === 1}
            aria-label={`移除状态 ${index + 1}`}
            onClick={() => {
              const states = draft.states.filter(
                (item) => item.id !== status.id,
              );
              onChange({
                states,
                targetStateId:
                  draft.targetStateId === status.id
                    ? states[0].id
                    : draft.targetStateId,
              });
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {draft.states.length < 4 && (
        <Button
          type="button"
          variant="ghost"
          className="record-add-state"
          onClick={() =>
            onChange({
              states: [
                ...draft.states,
                {
                  id: createId('state'),
                  name: '',
                  emoji: '',
                  color: CARD_COLORS.find(
                    (color) =>
                      !draft.states.some(
                        (status) => status.color === color.value,
                      ),
                  )!.value,
                },
              ],
            })
          }
        >
          <Plus />
          添加状态
        </Button>
      )}
    </fieldset>
  );
}
