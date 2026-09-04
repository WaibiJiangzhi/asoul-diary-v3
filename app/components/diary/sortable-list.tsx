'use client';

/* oxlint-disable react/react-compiler -- dnd-kit exposes callback refs and sensor refs as render-time hook results. */

import type { CSSProperties, ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type SortableHandle = Pick<
  ReturnType<typeof useSortable>,
  'attributes' | 'listeners' | 'setActivatorNodeRef'
>;

export function SortableList({
  ids,
  className,
  onReorder,
  onDragStart,
  onDraggingChange,
  children,
}: {
  ids: string[];
  className?: string;
  onReorder: (activeId: string, overId: string) => void;
  onDragStart?: () => void;
  onDraggingChange?: (dragging: boolean) => void;
  children: (
    id: string,
    handle: SortableHandle,
    isDragging: boolean,
  ) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function finishDrag(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) {
      onReorder(String(event.active.id), String(event.over.id));
    }
    onDraggingChange?.(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => {
        onDraggingChange?.(true);
        onDragStart?.();
      }}
      onDragEnd={finishDrag}
      onDragCancel={() => onDraggingChange?.(false)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {ids.map((id) => (
            <SortableItem id={id} key={id}>
              {children}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (
    id: string,
    handle: SortableHandle,
    isDragging: boolean,
  ) => ReactNode;
}) {
  const sortable = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    zIndex: sortable.isDragging ? 5 : undefined,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      className={`sortable-item ${sortable.isDragging ? 'is-dragging' : ''}`}
      style={style}
    >
      {children(
        id,
        {
          attributes: sortable.attributes,
          listeners: sortable.listeners,
          setActivatorNodeRef: sortable.setActivatorNodeRef,
        },
        sortable.isDragging,
      )}
    </div>
  );
}
