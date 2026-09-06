'use client';

import React, { useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export interface ColumnMeta {
  key: string;
  label: string;
  width: string;
}

// Retorna os metadados de coluna na ordem atual, ignorando chaves desconhecidas
// (ex.: uma ordem salva antes de uma coluna nova ser adicionada ao card).
export function orderedMeta(all: ColumnMeta[], order: string[]): ColumnMeta[] {
  const byKey = Object.fromEntries(all.map((c) => [c.key, c]));
  return order.map((k) => byKey[k]).filter((c): c is ColumnMeta => Boolean(c));
}

export function useColumnDrag(order: string[], reorder: (next: string[]) => void) {
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  function onDragStart(key: string) {
    setDraggedKey(key);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault(); // necessário para o onDrop disparar (regra do HTML5 drag-and-drop)
  }

  function onDrop(targetKey: string) {
    setDraggedKey((current) => {
      if (!current || current === targetKey) return null;
      const next = order.filter((k) => k !== current);
      next.splice(next.indexOf(targetKey), 0, current);
      reorder(next);
      return null;
    });
  }

  return { draggedKey, onDragStart, onDragOver, onDrop };
}

export type SortDir = 'asc' | 'desc';

// Ordenação de uma única coluna por vez, mesmo padrão de "Ativos" (AtivosClient.tsx):
// clicar numa coluna nova ordena crescente; clicar de novo na mesma coluna inverte.
export function useColumnSort<K extends string>() {
  const [sortField, setSortField] = useState<K | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(field: K) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  return { sortField, sortDir, toggleSort };
}

// Números comparam numericamente; o resto (texto, datas ISO) compara como string em pt-BR —
// mesma regra de AtivosClient.tsx.
export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const mult = dir === 'asc' ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mult;
  return String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR') * mult;
}

function SortIcon({ sortDir }: { sortDir: SortDir | null }) {
  if (sortDir === 'asc') return <ArrowUp size={11} />;
  if (sortDir === 'desc') return <ArrowDown size={11} />;
  return <ArrowUpDown size={11} style={{ opacity: 0.35 }} />;
}

export function DraggableHeaderCell({
  col,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  sortDir,
  onSortClick,
  style,
}: {
  col: ColumnMeta;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  sortDir: SortDir | null;
  onSortClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <span
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSortClick}
      title="Arraste para reordenar · clique para ordenar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '3px',
        cursor: 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.4 : 1,
        ...style,
      }}
    >
      <GripVertical size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
      {col.label}
      <SortIcon sortDir={sortDir} />
    </span>
  );
}

// Cabeçalho da coluna de identidade (não é arrastável — fica sempre na 1ª posição), mas
// continua ordenável por clique, igual às demais colunas.
export function SortableIdentityLabel({
  label,
  sortDir,
  onSortClick,
  style,
}: {
  label: string;
  sortDir: SortDir | null;
  onSortClick: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <span
      onClick={onSortClick}
      title="Clique para ordenar"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none', ...style }}
    >
      {label}
      <SortIcon sortDir={sortDir} />
    </span>
  );
}
