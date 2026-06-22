"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import {
  reorderCategoriesAction,
  reorderEvaluationItemsAction,
  reorderTargetsAction,
} from "@/app/(dashboard)/admin/targets/actions";
import { CategoryActions } from "@/components/admin/CategoryActions";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { EvaluationItemActions } from "@/components/admin/EvaluationItemActions";
import { EvaluationItemInlineForm } from "@/components/admin/EvaluationItemInlineForm";
import { TargetActions } from "@/components/admin/TargetActions";

type EvaluationItem = {
  id: number;
  no: number;
  name: string;
  description: string | null;
  evalCriteria: string | null;
  hasEvaluations: boolean;
};

type Category = {
  id: number;
  targetId: number;
  no: number;
  name: string;
  canDelete: boolean;
  items: EvaluationItem[];
};

type Target = {
  id: number;
  no: number;
  name: string;
  canDelete: boolean;
  categories: Category[];
};

type Props = { targets: Target[] };

function DragHandle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 text-gray-300"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
  );
}

function SortableEvaluationItem({ item }: { item: EvaluationItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="py-2 pl-2 pr-1 w-6">
        <button
          type="button"
          aria-label="並び替え"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none"
        >
          <DragHandle />
        </button>
      </td>
      <td className="py-2 pr-4 text-xs text-gray-400 w-8">{item.no}</td>
      <td className="py-2 text-gray-700">{item.name}</td>
      <td className="py-2 text-right pr-2">
        <EvaluationItemActions
          item={{
            id: item.id,
            no: item.no,
            name: item.name,
            description: item.description,
            evalCriteria: item.evalCriteria,
          }}
          hasEvaluations={item.hasEvaluations}
        />
      </td>
    </tr>
  );
}

function SortableCategory({ category, targetId }: { category: Category; targetId: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(category.items);

  useEffect(() => {
    setItems(category.items);
  }, [category.items]);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    const result = await reorderEvaluationItemsAction(
      reordered.map(({ id }, idx) => ({ id, index: idx + 1 })),
    );
    if (result.error) {
      setItems(category.items);
      alert(result.error);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="border-b last:border-b-0">
      <div className="flex items-center gap-2 px-2 py-2 bg-gray-50/50">
        <button
          type="button"
          aria-label="並び替え"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none shrink-0"
        >
          <DragHandle />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <span>{open ? "▼" : "▶"}</span>
        </button>
        <span className="text-xs text-gray-400 w-6 shrink-0">{category.no}</span>
        <span className="text-sm text-gray-700 flex-1">{category.name}</span>
        <CategoryActions
          category={{ id: category.id, targetId, name: category.name, no: category.no }}
          canDelete={category.canDelete}
        />
      </div>

      {open && (
        <div className="pl-10 pr-2 pb-2">
          <DndContext
            id={`dnd-items-${category.id}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.length > 0 ? (
                <table className="w-full text-sm mb-2">
                  <tbody className="divide-y">
                    {items.map((item) => (
                      <SortableEvaluationItem key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-2 text-xs text-gray-400">評価項目が登録されていません。</p>
              )}
            </SortableContext>
          </DndContext>
          <div className="mt-1">
            <EvaluationItemInlineForm targetId={targetId} categoryId={category.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function SortableTarget({ target }: { target: Target }) {
  const [categories, setCategories] = useState(target.categories);

  useEffect(() => {
    setCategories(target.categories);
  }, [target.categories]);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: target.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    const result = await reorderCategoriesAction(
      reordered.map(({ id }, idx) => ({ id, index: idx + 1 })),
    );
    if (result.error) {
      setCategories(target.categories);
      alert(result.error);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center gap-2 border-b bg-gray-50 px-2 py-3">
        <button
          type="button"
          aria-label="並び替え"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none shrink-0"
        >
          <DragHandle />
        </button>
        <span className="text-xs font-medium text-gray-400 w-6 shrink-0">No.{target.no}</span>
        <span className="font-medium text-gray-900 flex-1">{target.name}</span>
        <TargetActions
          target={{ id: target.id, name: target.name, no: target.no }}
          canDelete={target.canDelete}
        />
      </div>

      <div className="px-2 py-2">
        <DndContext
          id={`dnd-categories-${target.id}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {categories.length === 0 ? (
              <p className="py-2 text-xs text-gray-400 pl-2">中分類が登録されていません。</p>
            ) : (
              <div className="divide-y rounded border">
                {categories.map((cat) => (
                  <SortableCategory key={cat.id} category={cat} targetId={target.id} />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>
        <div className="mt-2 pl-2">
          <CategoryForm targetId={target.id} />
        </div>
      </div>
    </div>
  );
}

export function MasterList({ targets: initialTargets }: Props) {
  const [targets, setTargets] = useState(initialTargets);

  useEffect(() => {
    setTargets(initialTargets);
  }, [initialTargets]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleTargetDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = targets.findIndex((t) => t.id === active.id);
    const newIndex = targets.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(targets, oldIndex, newIndex);
    setTargets(reordered);
    const result = await reorderTargetsAction(
      reordered.map(({ id }, idx) => ({ id, index: idx + 1 })),
    );
    if (result.error) {
      setTargets(initialTargets);
      alert(result.error);
    }
  }

  return (
    <DndContext
      id="dnd-targets"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleTargetDragEnd}
    >
      <SortableContext items={targets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {targets.map((target) => (
            <SortableTarget key={target.id} target={target} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
