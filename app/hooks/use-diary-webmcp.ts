import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { pickDailyEmoji } from '@/components/diary/constants';
import { createId } from '@/lib/defaults';
import { dateKey } from '@/lib/date';
import type { AppState, DailyTask } from '@/lib/types';

declare global {
  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: object;
          annotations?: {
            readOnlyHint?: boolean;
            untrustedContentHint?: boolean;
          };
          execute: (input: unknown) => unknown;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

const pause = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

interface DiaryWebMcpOptions {
  isReady: boolean;
  stateRef: MutableRefObject<AppState | null>;
  setState: Dispatch<SetStateAction<AppState | null>>;
}

/** Optional browser-agent tools. The diary works normally when WebMCP is absent. */
export function useDiaryWebMcp({
  isReady,
  stateRef,
  setState,
}: DiaryWebMcpOptions) {
  useEffect(() => {
    if (!isReady || !document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const report = () => undefined;
    try {
      void Promise.resolve(
        document.modelContext.registerTool(
          {
            name: 'read_today_summary',
            title: '查看今日记录',
            description: '读取今天的事项及完成情况，不修改数据。',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: () => {
              const today = dateKey();
              const tasks =
                stateRef.current?.dailyTasks.filter(
                  (task) => task.date === today,
                ) ?? [];
              return {
                date: today,
                completed: tasks.filter((task) => task.done).length,
                tasks,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
      void Promise.resolve(
        document.modelContext.registerTool(
          {
            name: 'add_today_tasks',
            title: '添加今日事项',
            description: '把一件或多件一行小事添加到今天。',
            inputSchema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 12,
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      emoji: { type: 'string' },
                    },
                    required: ['title'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['items'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            async execute(input) {
              const items = (
                input as { items?: { title?: string; emoji?: string }[] }
              ).items;
              if (
                !Array.isArray(items) ||
                !items.length ||
                items.some((item) => !item.title?.trim())
              ) {
                throw new Error('items 必须是包含标题的非空数组');
              }
              const now = new Date().toISOString();
              const tasks: DailyTask[] = items.map((item) => ({
                id: createId('task'),
                date: dateKey(),
                emoji: item.emoji?.trim() || pickDailyEmoji(),
                title: item.title!.trim().slice(0, 50),
                done: false,
                createdAt: now,
                updatedAt: now,
              }));
              setState(
                (current) =>
                  current && {
                    ...current,
                    dailyTasks: [...current.dailyTasks, ...tasks],
                  },
              );
              await pause();
              return { added: tasks.length, ids: tasks.map((task) => task.id) };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
      void Promise.resolve(
        document.modelContext.registerTool(
          {
            name: 'adjust_progress_goal',
            title: '记录成长足迹',
            description: '为已有进度目标增加或减少数值，并自动留下一条足迹。',
            inputSchema: {
              type: 'object',
              properties: {
                goalId: { type: 'string' },
                delta: { type: 'number' },
                note: { type: 'string' },
              },
              required: ['goalId', 'delta'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            async execute(input) {
              const { goalId, delta, note } = input as {
                goalId?: string;
                delta?: number;
                note?: string;
              };
              const goal = stateRef.current?.progressGoals.find(
                (item) => item.id === goalId,
              );
              if (
                !goal ||
                typeof delta !== 'number' ||
                !Number.isFinite(delta) ||
                delta === 0
              ) {
                throw new Error('需要有效的 goalId 和非零 delta');
              }
              const changedAt = new Date().toISOString();
              setState(
                (current) =>
                  current && {
                    ...current,
                    progressGoals: current.progressGoals.map((item) => {
                      if (item.id !== goalId) return item;
                      const nextValue = Math.min(
                        item.total,
                        Math.max(0, Number((item.current + delta).toFixed(4))),
                      );
                      const appliedDelta = Number(
                        (nextValue - item.current).toFixed(4),
                      );
                      if (!appliedDelta) return item;
                      return {
                        ...item,
                        current: nextValue,
                        updatedAt: changedAt,
                        events: [
                          ...item.events,
                          {
                            id: createId('event'),
                            delta: appliedDelta,
                            valueAfter: nextValue,
                            note: note?.trim().slice(0, 100) ?? '',
                            createdAt: changedAt,
                          },
                        ],
                      };
                    }),
                  },
              );
              await pause();
              return { goalId, delta };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(report);
    } catch {
      // WebMCP is an optional progressive enhancement.
    }
    return () => lifecycle.abort();
  }, [isReady, setState, stateRef]);
}
