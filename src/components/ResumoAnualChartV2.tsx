'use client';

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, XAxis, Tooltip, Bar, Legend } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AnoVencimento, InvestimentoAno } from '../utils/vencimento';
import { useColumnOrder } from '../hooks/useColumnOrder';
import { orderedMeta, useColumnDrag, useColumnSort, compareValues, DraggableHeaderCell, SortableIdentityLabel, type ColumnMeta } from './DraggableColumns';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };
// Coluna líquida em destaque (teal/negrito) — mesma linguagem de hierarquia dos KPIs
// (bruto = preto, líquido = teal em negrito).
const colValLiquidoStyle: React.CSSProperties = { ...colValStyle, color: '#00a693', fontWeight: 800 };

function formatDataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatTaxa(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}

function nomeInvestimento(invest: InvestimentoAno) {
  return `${invest.tipo} ${invest.emissor} ${invest.indexador_tipo} - ${formatTaxa(invest.taxa)}%`;
}

const IDENTITY_WIDTH = '1.6fr';
const COLUMN_META: ColumnMeta[] = [
  { key: 'venceBruto', label: 'Vence Bruto', width: '1fr' },
  { key: 'venceLiquido', label: 'Vence Líquido', width: '1fr' },
];
const DEFAULT_ORDER = COLUMN_META.map((c) => c.key);

type SortKey = 'ano' | 'venceBruto' | 'venceLiquido';

// Só a linha do ano é ordenável — instituição/investimento dentro de um ano expandido
// mantêm a ordem natural.
function sortValue(key: SortKey, ano: AnoVencimento): number | string {
  switch (key) {
    case 'ano':
      return parseInt(ano.name, 10);
    case 'venceBruto':
      return ano.venceBruto;
    case 'venceLiquido':
      return ano.venceLiquido;
  }
}

function renderValueCell(key: string, bruto: number, liquido: number, extraBruto: React.CSSProperties | undefined, extraLiquido: React.CSSProperties | undefined, formatBRL: (v: number) => string): React.ReactNode {
  switch (key) {
    case 'venceBruto':
      return <span style={{ ...colValStyle, ...extraBruto }}>{formatBRL(bruto)}</span>;
    case 'venceLiquido':
      return <span style={{ ...colValLiquidoStyle, ...extraLiquido }}>{formatBRL(liquido)}</span>;
    default:
      return null;
  }
}

export function ResumoAnualChartV2({ barData, anoVencimentoArray }: { barData: any[]; anoVencimentoArray: AnoVencimento[] }) {
  const [anoAberto, setAnoAberto] = useState<string | null>(null);
  const [instAberta, setInstAberta] = useState<string | null>(null);
  const { order, reorder } = useColumnOrder('resumo-anual', DEFAULT_ORDER);
  const cols = orderedMeta(COLUMN_META, order);
  const { draggedKey, onDragStart, onDragOver, onDrop } = useColumnDrag(order, reorder);
  const { sortField, sortDir, toggleSort } = useColumnSort<SortKey>();
  const gridCols = `${IDENTITY_WIDTH} ${cols.map((c) => c.width).join(' ')}`;

  const anosOrdenados = useMemo(() => {
    if (!sortField) return anoVencimentoArray;
    return [...anoVencimentoArray].sort((a, b) => compareValues(sortValue(sortField, a), sortValue(sortField, b), sortDir));
  }, [anoVencimentoArray, sortField, sortDir]);

  return (
    <>
      <div style={{ padding: '20px 20px 0', height: '220px', flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} barGap={0} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b8fa8' }} axisLine={{ stroke: '#e2e4f0' }} tickLine={false} />
            <Tooltip cursor={{ fill: 'transparent' }} formatter={(val: any) => formatBRL(Number(val))} />
            <Bar dataKey="vence" fill="#00bfa5" radius={[2, 2, 0, 0]} name="Vence no Ano" />
            <Bar dataKey="gerado" fill="#6c63ff" radius={[2, 2, 0, 0]} name="Gerado no Ano" />
            <Legend iconType="square" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '8px 4px', borderBottom: '2px solid rgba(139,143,168,0.35)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <SortableIdentityLabel
            label="Ano"
            sortDir={sortField === 'ano' ? sortDir : null}
            onSortClick={() => toggleSort('ano')}
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

        {anosOrdenados.map((ano) => {
          const anoIsOpen = anoAberto === ano.name;
          return (
            <div key={ano.name}>
              <div
                onClick={() => { setAnoAberto(anoIsOpen ? null : ano.name); setInstAberta(null); }}
                style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid rgba(139,143,168,0.25)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00bfa5', fontWeight: 700, fontSize: '0.85rem' }}>{ano.name}</span>
                  {anoIsOpen ? <ChevronUp size={16} color="#8b8fa8" /> : <ChevronDown size={16} color="#8b8fa8" />}
                </div>
                {cols.map((col) => (
                  <React.Fragment key={col.key}>{renderValueCell(col.key, ano.venceBruto, ano.venceLiquido, undefined, undefined, formatBRL)}</React.Fragment>
                ))}
              </div>

              {anoIsOpen && ano.instituicoes.map((inst) => {
                const instIsOpen = instAberta === `${ano.name}-${inst.name}`;
                return (
                  <div key={inst.name}>
                    <div
                      onClick={() => setInstAberta(instIsOpen ? null : `${ano.name}-${inst.name}`)}
                      style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid rgba(139,143,168,0.25)', background: '#f8f9fc', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1d27' }}>{inst.name}</span>
                        {instIsOpen ? <ChevronUp size={14} color="#8b8fa8" /> : <ChevronDown size={14} color="#8b8fa8" />}
                      </div>
                      {cols.map((col) => (
                        <React.Fragment key={col.key}>{renderValueCell(col.key, inst.venceBruto, inst.venceLiquido, { fontSize: '0.78rem' }, { fontSize: '0.78rem' }, formatBRL)}</React.Fragment>
                      ))}
                    </div>

                    {instIsOpen && inst.investimentos.map((invest) => (
                      <div
                        key={invest.id}
                        style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid rgba(139,143,168,0.25)', background: '#f0f1f7' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '24px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.72rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nomeInvestimento(invest)}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#8b8fa8', marginTop: '1px' }}>vence em {formatDataBR(invest.data_vencimento)}</span>
                        </div>
                        {cols.map((col) => (
                          <React.Fragment key={col.key}>{renderValueCell(col.key, invest.venceBruto, invest.venceLiquido, { fontWeight: 500, fontSize: '0.72rem' }, { fontWeight: 700, fontSize: '0.72rem' }, formatBRL)}</React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
