'use client';

import React, { useMemo, useState } from 'react';
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

const inputDateStyle: React.CSSProperties = { flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e2e4f0', color: '#1a1d27', background: '#fff' };
const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
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

export function InvestimentosAVencerV3({ investimentos }: { investimentos: InvestimentoVencendo[] }) {
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const { order, reorder } = useColumnOrder('investimentos-a-vencer', DEFAULT_ORDER);
  const cols = orderedMeta(COLUMN_META, order);
  const { draggedKey, onDragStart, onDragOver, onDrop } = useColumnDrag(order, reorder);
  const { sortField, sortDir, toggleSort } = useColumnSort<SortKey>();
  const gridCols = `${IDENTITY_WIDTH} ${cols.map((c) => c.width).join(' ')}`;

  const filtrados = useMemo(() => {
    const futuros = investimentos.filter((i) => i.diasRestantes >= 0);
    const filtradosPorData = futuros
      .filter((i) => !dataInicial || i.data_vencimento.slice(0, 10) >= dataInicial)
      .filter((i) => !dataFinal || i.data_vencimento.slice(0, 10) <= dataFinal);

    if (!sortField) return filtradosPorData.sort((a, b) => a.diasRestantes - b.diasRestantes);
    return [...filtradosPorData].sort((a, b) => compareValues(sortValue(sortField, a), sortValue(sortField, b), sortDir));
  }, [investimentos, dataInicial, dataFinal, sortField, sortDir]);

  return (
    <>
      <div style={{ padding: '0 16px', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} style={inputDateStyle} />
        <span style={{ color: '#8b8fa8', fontSize: '0.75rem' }}>até</span>
        <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} style={inputDateStyle} />
      </div>

      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '8px 4px', borderBottom: '2px solid rgba(139,143,168,0.35)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <SortableIdentityLabel
            label="Investimento"
            sortDir={sortField === 'investimento' ? sortDir : null}
            onSortClick={() => toggleSort('investimento')}
            style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase' }}
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

        {filtrados.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: '#8b8fa8', padding: '16px 4px' }}>Nenhum investimento vencendo neste período.</div>
        )}

        {filtrados.map((inv) => (
          <div
            key={inv.id}
            style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid rgba(139,143,168,0.25)' }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nomeInvestimento(inv)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>vence em {formatDataBR(inv.data_vencimento)}</div>
            </div>
            {cols.map((col) => (
              <React.Fragment key={col.key}>{renderCell(col.key, inv)}</React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
