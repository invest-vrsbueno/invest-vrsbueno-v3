'use client';

import React, { useMemo, useState } from 'react';
import type { InvestimentoVencendo } from '../utils/vencimento';

// Lista direta dos investimentos a vencer (sem agrupamento por instituição), ordenada
// por proximidade do vencimento. Coluna "líquido" em destaque (teal/negrito) — mesma
// linguagem de hierarquia usada nos KPIs (bruto = preto, líquido = teal em negrito).
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

export function InvestimentosAVencerV3({ investimentos }: { investimentos: InvestimentoVencendo[] }) {
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const filtrados = useMemo(() => {
    const futuros = investimentos.filter((i) => i.diasRestantes >= 0);
    return futuros
      .filter((i) => !dataInicial || i.data_vencimento.slice(0, 10) >= dataInicial)
      .filter((i) => !dataFinal || i.data_vencimento.slice(0, 10) <= dataFinal)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [investimentos, dataInicial, dataFinal]);

  return (
    <>
      <div style={{ padding: '0 16px', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} style={inputDateStyle} />
        <span style={{ color: '#8b8fa8', fontSize: '0.75rem' }}>até</span>
        <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} style={inputDateStyle} />
      </div>

      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4px', padding: '8px 4px', borderBottom: '2px solid #e2e4f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase' }}>Investimento</span>
          <span style={colHeaderStyle}>Rend. Bruto</span>
          <span style={colHeaderStyle}>Rend. Líquido</span>
        </div>

        {filtrados.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: '#8b8fa8', padding: '16px 4px' }}>Nenhum investimento vencendo neste período.</div>
        )}

        {filtrados.map((inv) => (
          <div
            key={inv.id}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #e2e4f0' }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nomeInvestimento(inv)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>vence em {formatDataBR(inv.data_vencimento)}</div>
            </div>
            <span style={colValStyle}>{formatBRL(inv.rendimentoBruto)}</span>
            <span style={colValLiquidoStyle}>{formatBRL(inv.rendimentoLiquido)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
