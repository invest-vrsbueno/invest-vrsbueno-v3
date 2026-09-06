'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LIMIT_FGC, type InstituicaoFGC, type InvestimentoFGC } from '../utils/fgc';
import { useColumnOrder } from '../hooks/useColumnOrder';
import { orderedMeta, useColumnDrag, useColumnSort, compareValues, DraggableHeaderCell, SortableIdentityLabel, type ColumnMeta } from './DraggableColumns';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

function formatTaxa(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}

function formatDataBR(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function nomeInvestimento(invest: InvestimentoFGC) {
  return `${invest.tipo} ${invest.emissor} ${invest.indexador_tipo} - ${formatTaxa(invest.taxa)}%`;
}

// Escada de cores da Margem P/FGC, sobre o % do limite de R$ 250 mil já ocupado pelo saldo
// bruto da instituição (mesmo valor que hoje dispara o alerta de risco FGC no dashboard).
function corMargemFgc(percentualUsado: number): { bg: string; fg: string; label: string } {
  if (percentualUsado > 100) return { bg: '#fee2e2', fg: '#b91c1c', label: 'Estourado' };
  if (percentualUsado >= 85) return { bg: '#ffedd5', fg: '#c2410c', label: 'Perto do limite' };
  if (percentualUsado >= 60) return { bg: '#fef9c3', fg: '#a16207', label: 'Atenção' };
  return { bg: '#dcfce7', fg: '#15803d', label: 'Confortável' };
}

function investimentoVencido(dataVencimento: string | null): boolean {
  if (!dataVencimento) return false;
  const hojeISO = new Date().toISOString().slice(0, 10);
  return dataVencimento.slice(0, 10) < hojeISO;
}

const IDENTITY_WIDTH = '2fr';

const COLUMN_META: ColumnMeta[] = [
  { key: 'valorInvestido', label: 'Valor Investido', width: '1fr' },
  { key: 'projecaoBruta', label: 'Projeção Bruta', width: '1fr' },
  { key: 'projecaoLiquida', label: 'Projeção Líquida', width: '1fr' },
  { key: 'margemFgc', label: 'Margem P/FGC', width: '1fr' },
  { key: 'rendBruto', label: 'Rend. Bruto', width: '1fr' },
  { key: 'rendLiquido', label: 'Rend. Líquido', width: '1fr' },
  { key: 'posicaoAtual', label: 'Posição Atual', width: '1.3fr' },
  { key: 'posicaoAtualLiquida', label: 'Posição Atual (Líquida)', width: '1.3fr' },
  { key: 'percentual', label: '%', width: '0.6fr' },
  { key: 'dataInvest', label: 'Data do Invest.', width: '0.8fr' },
  { key: 'dataVencimento', label: 'Data do Vencimento', width: '0.8fr' },
];
const DEFAULT_ORDER = COLUMN_META.map((c) => c.key);

const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };
const colValLiquidoStyle: React.CSSProperties = { ...colValStyle, color: '#00a693', fontWeight: 800 };
const colValMutedStyle: React.CSSProperties = { ...colValStyle, fontWeight: 500, color: '#8b8fa8' };

type DatasPorInvestimento = Record<string, { dataAplicacao: string; dataVencimento: string | null }>;

type SortKey = 'instituicao' | 'valorInvestido' | 'projecaoBruta' | 'projecaoLiquida' | 'margemFgc' | 'rendBruto' | 'rendLiquido' | 'posicaoAtual' | 'posicaoAtualLiquida' | 'percentual' | 'dataInvest' | 'dataVencimento';

// Só a linha-resumo do banco é ordenável — as sub-linhas de investimento (quando expande)
// mantêm a ordem natural, já que "ordenar" faz sentido para a lista de instituições, não
// para os investimentos dentro de uma instituição já aberta.
function sortValue(key: SortKey, inst: InstituicaoFGC): number | string {
  switch (key) {
    case 'instituicao':
      return inst.name;
    case 'valorInvestido':
      return inst.valorAplicado;
    case 'projecaoBruta':
      return inst.projecaoBruta;
    case 'projecaoLiquida':
      return inst.projecaoLiquida;
    case 'margemFgc':
      return inst.margemFgc;
    case 'rendBruto':
      return inst.rendimentoBruto;
    case 'rendLiquido':
      return inst.rendimentoLiquidoSemIR;
    case 'posicaoAtual':
    case 'percentual':
      return inst.value;
    case 'posicaoAtualLiquida':
      return inst.posicaoAtualLiquida;
    case 'dataInvest':
    case 'dataVencimento':
      return 0;
  }
}

function renderInstCell(key: string, inst: InstituicaoFGC, percentualInst: number, corFgc: { bg: string; fg: string; label: string }): React.ReactNode {
  switch (key) {
    case 'valorInvestido':
      return <span style={colValStyle}>{formatBRL(inst.valorAplicado)}</span>;
    case 'projecaoBruta':
      return <span style={colValStyle}>{formatBRL(inst.projecaoBruta)}</span>;
    case 'projecaoLiquida':
      return <span style={colValLiquidoStyle}>{formatBRL(inst.projecaoLiquida)}</span>;
    case 'margemFgc':
      return (
        <span style={{ textAlign: 'right', padding: '0 4px' }}>
          <span
            style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: corFgc.bg, color: corFgc.fg, whiteSpace: 'nowrap' }}
            title={corFgc.label}
          >
            {formatBRL(inst.margemFgc)}
          </span>
        </span>
      );
    case 'rendBruto':
      return <span style={colValStyle}>{formatBRL(inst.rendimentoBruto)}</span>;
    case 'rendLiquido':
      return <span style={colValLiquidoStyle}>{formatBRL(inst.rendimentoLiquidoSemIR)}</span>;
    case 'posicaoAtual':
      return <span style={colValStyle}>{formatBRL(inst.value)}</span>;
    case 'posicaoAtualLiquida':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.85rem' }}>{formatBRL(inst.posicaoAtualLiquida)}</span>;
    case 'percentual':
      return <span style={colValStyle}>{percentualInst.toFixed(0)}%</span>;
    case 'dataInvest':
    case 'dataVencimento':
      return <span style={colValMutedStyle}>—</span>;
    default:
      return null;
  }
}

function renderInvestCell(
  key: string,
  invest: InvestimentoFGC,
  percentualInvest: number,
  datas: { dataAplicacao: string; dataVencimento: string | null } | undefined,
): React.ReactNode {
  switch (key) {
    case 'valorInvestido':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.valorAplicado)}</span>;
    case 'projecaoBruta':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.projecaoBruta)}</span>;
    case 'projecaoLiquida':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.75rem' }}>{formatBRL(invest.projecaoLiquida)}</span>;
    case 'margemFgc':
      return <span style={{ ...colValMutedStyle, fontSize: '0.75rem' }}>—</span>;
    case 'rendBruto':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.rendimentoBruto)}</span>;
    case 'rendLiquido':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.75rem' }}>{formatBRL(invest.rendimentoLiquidoSemIR)}</span>;
    case 'posicaoAtual':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.posicaoHoje)}</span>;
    case 'posicaoAtualLiquida':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.75rem' }}>{formatBRL(invest.posicaoAtualLiquida)}</span>;
    case 'percentual':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{percentualInvest.toFixed(1)}%</span>;
    case 'dataInvest':
      return <span style={{ ...colValMutedStyle, fontSize: '0.75rem' }}>{formatDataBR(datas?.dataAplicacao ?? null)}</span>;
    case 'dataVencimento':
      return <span style={{ ...colValMutedStyle, fontSize: '0.75rem' }}>{formatDataBR(datas?.dataVencimento ?? null)}</span>;
    default:
      return null;
  }
}

export function DistribuicaoInstituicoes({ byInstArray, patrimonioTotal, CORES, datasPorInvestimento }: { byInstArray: InstituicaoFGC[]; patrimonioTotal: number; CORES: string[]; datasPorInvestimento: DatasPorInvestimento }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const { order, reorder } = useColumnOrder('distribuicao-instituicoes', DEFAULT_ORDER);
  const cols = orderedMeta(COLUMN_META, order);
  const { draggedKey, onDragStart, onDragOver, onDrop } = useColumnDrag(order, reorder);
  const { sortField, sortDir, toggleSort } = useColumnSort<SortKey>();
  const gridCols = `${IDENTITY_WIDTH} ${cols.map((c) => c.width).join(' ')}`;

  const instituicoesOrdenadas = useMemo(() => {
    if (!sortField) return byInstArray;
    return [...byInstArray].sort((a, b) => compareValues(sortValue(sortField, a), sortValue(sortField, b), sortDir));
  }, [byInstArray, sortField, sortDir]);

  // Cor por instituição fixa na ordem original (a mesma do gráfico "Alocação %"), pra não
  // ficar trocando de cor quando o usuário ordena a lista por outra coluna.
  const corIndexPorNome = useMemo(() => Object.fromEntries(byInstArray.map((inst, i) => [inst.name, i])), [byInstArray]);

  return (
    <div style={{ padding: '0 16px', overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
      <div style={{ minWidth: '1360px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '8px 4px', borderBottom: '2px solid rgba(139,143,168,0.35)', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <SortableIdentityLabel
            label="Instituição"
            sortDir={sortField === 'instituicao' ? sortDir : null}
            onSortClick={() => toggleSort('instituicao')}
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

        {instituicoesOrdenadas.map((inst) => {
          const isOpen = aberto === inst.name;
          const percentualInst = (inst.value / patrimonioTotal) * 100;
          const percentualFgc = (inst.value / LIMIT_FGC) * 100;
          const corFgc = corMargemFgc(percentualFgc);
          return (
            <div key={inst.name}>
              <div
                onClick={() => setAberto(isOpen ? null : inst.name)}
                style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '12px 4px', borderBottom: '1px solid rgba(139,143,168,0.25)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '50%', backgroundColor: CORES[corIndexPorNome[inst.name] % CORES.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                    {inst.name.substring(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>{percentualInst.toFixed(0)}% do portfólio</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="#8b8fa8" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#8b8fa8" style={{ flexShrink: 0 }} />}
                </div>
                {cols.map((col) => (
                  <React.Fragment key={col.key}>{renderInstCell(col.key, inst, percentualInst, corFgc)}</React.Fragment>
                ))}
              </div>

              {isOpen && inst.investimentos.map((invest) => {
                const datas = datasPorInvestimento[invest.id];
                const percentualInvest = (invest.posicaoHoje / patrimonioTotal) * 100;
                const vencido = investimentoVencido(datas?.dataVencimento ?? null);
                return (
                  <div
                    key={invest.id}
                    style={{
                      display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '8px 4px',
                      borderBottom: '1px solid rgba(139,143,168,0.25)',
                      background: vencido ? '#fee2e2' : '#f8f9fc',
                      borderLeft: vencido ? '3px solid #ef4444' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '15px', minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nomeInvestimento(invest)}
                      </span>
                      {vencido && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#ef4444', color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          Ativo Vencido
                        </span>
                      )}
                    </div>
                    {cols.map((col) => (
                      <React.Fragment key={col.key}>{renderInvestCell(col.key, invest, percentualInvest, datas)}</React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
