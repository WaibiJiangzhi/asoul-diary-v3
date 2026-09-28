'use client';
import { useState } from 'react';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from './life-form';
import { SortableList, SortableGrip } from './sortable-list';
import type { CardGroup } from '@/lib/types';
export function GroupFilter({
  groups,
  value,
  onChange,
  onManage,
}: {
  groups: CardGroup[];
  value: string;
  onChange: (id: string) => void;
  onManage?: () => void;
}) {
  return (
    <div className="group-filter">
      <fieldset aria-label="按分组查看">
        {[
          { id: 'all', name: '全部' },
          ...groups,
          { id: 'ungrouped', name: '未分组' },
        ].map((g) => (
          <button
            type="button"
            key={g.id}
            aria-pressed={value === g.id}
            onClick={() => onChange(g.id)}
          >
            {g.name}
          </button>
        ))}
      </fieldset>
      {onManage && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="管理分组"
          onClick={onManage}
        >
          <Settings2 />
        </Button>
      )}
    </div>
  );
}
export function GroupManager({
  groups,
  onSave,
  onRemove,
  onReorder,
  onClose,
}: {
  groups: CardGroup[];
  onSave: (name: string, id?: string) => void;
  onRemove: (id: string) => void;
  onReorder: (a: string, b: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [id, setId] = useState<string>();
  const [error, setError] = useState('');
  return (
    <Sheet
      title="管理分组"
      description="把相关的愿望放在一起；拖动手柄调整顺序。"
      onClose={onClose}
    >
      <SortableList
        className="group-manage-list"
        ids={groups.map((g) => g.id)}
        onReorder={onReorder}
      >
        {(key, handle) => {
          const g = groups.find((g) => g.id === key)!;
          return (
            <div className="group-manage-row">
              <button
                type="button"
                onClick={() => {
                  setName(g.name);
                  setId(g.id);
                  setError('');
                }}
              >
                {g.name}
              </button>
              <SortableGrip handle={handle} label={'排序分组 ' + g.name} />
              <Button
                variant="ghost"
                size="icon"
                aria-label={'删除分组 ' + g.name}
                onClick={() => {
                  onRemove(g.id);
                  if (id === g.id) {
                    setId(undefined);
                    setName('');
                  }
                }}
              >
                <Trash2 />
              </Button>
            </div>
          );
        }}
      </SortableList>
      <p className="field-hint">删除分组不会删除卡片，卡片会回到「未分组」。</p>
      <form
        className="life-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(name, id);
            setName('');
            setId(undefined);
            setError('');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          分组名称
          <Input
            required
            maxLength={30}
            placeholder="比如：日常、钢琴、运动"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button type="submit">
          <Plus />
          {id ? '保存名称' : '添加分组'}
        </Button>
        {id && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setId(undefined);
              setName('');
            }}
          >
            取消改名
          </Button>
        )}
      </form>
    </Sheet>
  );
}
