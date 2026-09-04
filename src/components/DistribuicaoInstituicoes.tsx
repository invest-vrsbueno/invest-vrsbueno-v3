'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { InstituicaoFGC, InvestimentoFGC } from '../utils/fgc';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

function formatTaxa(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}

function nomeInvestimento(invest: InvestimentoFGC) {
  return `${invest.tipo} ${invest.emissor} ${invest.indexador_tipo} - ${formatTaxa(invest.taxa)}%`;
}

const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };

export function DistribuicaoInstituicoes({ byInstArray, patrimonioTotal, CORES }: { byInstArray: InstituicaoFGC[]; patrimonioTotal: number; CORES: string[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div style={{ padding: '0 16px', overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
      <div style={{ minWidth: '760px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.3fr 1.3fr 1fr', gap: '4px', padding: '8px 4px', borderBottom: '2px solid #e2e4f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase' }}>Instituição</span>
          <span style={colHeaderStyle}>Valor Investido</span>
          <span style={colHeaderStyle}>Rend. Bruto</span>
          <span style={colHeaderStyle}>Rend. Líquido (Sem IR)</span>
          <span style={colHeaderStyle}>Posição Atual</span>
          <span style={colHeaderStyle}>Posição Atual (Líquida)</span>
        </div>

        {byInstArray.map((inst, i) => {
          const isOpen = aberto === inst.name;
          return (
            <div key={inst.name}>
              <div
                onClick={() => setAberto(isOpen ? null : inst.name)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.3fr 1.3fr 1fr', gap: '4px', alignItems: 'center', padding: '12px 4px', borderBottom: '1px solid #e2e4f0', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '50%', backgroundColor: CORES[i % CORES.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                    {inst.name.substring(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>{((inst.value / patrimonioTotal) * 100).toFixed(0)}% do portfólio</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="#8b8fa8" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#8b8fa8" style={{ flexShrink: 0 }} />}
                </div>
                <span style={colValStyle}>{formatBRL(inst.valorAplicado)}</span>
                <span style={colValStyle}>{formatBRL(inst.rendimentoBruto)}</span>
                <span style={colValStyle}>{formatBRL(inst.rendimentoLiquidoSemIR)}</span>
                <span style={colValStyle}>{formatBRL(inst.value)}</span>
                <span style={{ ...colValStyle, fontWeight: 700 }}>{formatBRL(inst.posicaoAtualLiquida)}</span>
              </div>

              {isOpen && inst.investimentos.map((invest) => (
                <div
                  key={invest.id}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.3fr 1.3fr 1fr', gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #e2e4f0', background: '#f8f9fc' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '15px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.78rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nomeInvestimento(invest)}
                    </span>
                  </div>
                  <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.valorAplicado)}</span>
                  <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.rendimentoBruto)}</span>
                  <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.rendimentoLiquidoSemIR)}</span>
                  <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.posicaoHoje)}</span>
                  <span style={{ ...colValStyle, fontWeight: 600, fontSize: '0.75rem' }}>{formatBRL(invest.posicaoAtualLiquida)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
