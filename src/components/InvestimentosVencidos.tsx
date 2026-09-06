'use client';

import React, { useMemo } from 'react';
import type { InvestimentoVencendo } from '../utils/vencimento';
import { useColumnOrder } from '../hooks/useColumnOrder';
import { orderedMeta, useColumnDrag, useColumnSort, compareValues, DraggableHeaderCell, SortableIdentityLabel, type ColumnMeta } from './DraggableColumns';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

function formatDataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatTaxa(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}

function nomeInvestimento(inv: InvestimentoVencendo) {
  return `${inv.tipo} ${inv.emissor} ${inv.indexador_tipo} - ${formatTaxa(inv.taxa)}%`;
}

const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };
const colValLiquidoStyle: React.CSSProperties = { ...colValStyle, color: '#00a693', fontWeight: 800 };

const IDENTITY_WIDTH = '2fr';
const COLUMN_META: ColumnMeta[] = [
  { key: 'rendBruto', label: 'Rend. Bruto', width: '1fr' },
  { key: 'rendLiquido', label: 'Rend. Líquido', width: '1fr' },
];
const DEFAULT_ORDER = COLUMN_META.map((c) => c.key);

type SortKey = 'investimento' | 'rendBruto' | 'rendLiquido';

function sortValue(key: SortKey, inv: InvestimentoVencendo): number | string {
  switch (key) {
    case 'investimento':
      return nomeInvestimento(inv);
    case 'rendBruto':
      return inv.rendimentoBruto;
    case 'rendLiquido':
      return inv.rendimentoLiquido;
  }
}

function renderCell(key: string, inv: InvestimentoVencendo): React.ReactNode {
  switch (key) {
    case 'rendBruto':
      return <span style={colValStyle}>{formatBRL(inv.rendimentoBruto)}</span>;
    case 'rendLiquido':
      return <span style={colValLiquidoStyle}>{formatBRL(inv.rendimentoLiquido)}</span>;
    default:
      return null;
  }
}

export function InvestimentosVencidos({ investimentos }: { investimentos: InvestimentoVencendo[] }) {
  const { order, reorder } = useColumnOrder('investimentos-vencidos', DEFAULT_ORDER);
  const cols = orderedMeta(COLUMN_META, order);
  const { draggedKey, onDragStart, onDragOver, onDrop } = useColumnDrag(order, reorder);
  const { sortField, sortDir, toggleSort } = useColumnSort<SortKey>();
  const gridCols = `${IDENTITY_WIDTH} ${cols.map((c) => c.width).join(' ')}`;

  const vencidos = useMemo(() => {
    const filtrados = investimentos.filter((i) => i.diasRestantes < 0);
    if (!sortField) return filtrados.sort((a, b) => a.diasRestantes - b.diasRestantes);
    return [...filtrados].sort((a, b) => compareValues(sortValue(sortField, a), sortValue(sortField, b), sortDir));
  }, [investimentos, sortField, sortDir]);

  return (
    <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '8px 4px', borderBottom: '2px solid rgba(239,68,68,0.20)', position: 'sticky', top: 0, background: 'inherit', zIndex: 1 }}>
        <SortableIdentityLabel
          label="Investimento"
          sortDir={sortField === 'investimento' ? sortDir : null}
          onSortClick={() => toggleSort('investimento')}
          style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}
        />
        {cols.map((col) => (
          <DraggableHeaderCell
            key={col.key}
            col={col}
            isDragging={draggedKey === col.key}
            onDragStart={() => onDragStart(col.key)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(col.key)}
            sortDir={sortField === col.key ? sortDir : null}
            onSortClick={() => toggleSort(col.key as SortKey)}
            style={colHeaderStyle}
          />
        ))}
      </div>

      {vencidos.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: '#8b8fa8', padding: '16px 4px' }}>Nenhum investimento vencido. 🎉</div>
      )}

      {vencidos.map((inv) => (
        <div
          key={inv.id}
          style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid rgba(239,68,68,0.15)' }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1d27' }}>
              {nomeInvestimento(inv)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600 }}>venceu em {formatDataBR(inv.data_vencimento)} · {Math.abs(inv.diasRestantes)}d atrás</div>
          </div>
          {cols.map((col) => (
            <React.Fragment key={col.key}>{renderCell(col.key, inv)}</React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
