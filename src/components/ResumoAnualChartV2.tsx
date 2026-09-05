'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, XAxis, Tooltip, Bar, Legend } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AnoVencimento, InvestimentoAno } from '../utils/vencimento';

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

export function ResumoAnualChartV2({ barData, anoVencimentoArray, formatBRL }: { barData: any[]; anoVencimentoArray: AnoVencimento[]; formatBRL: (v: number) => string }) {
  const [anoAberto, setAnoAberto] = useState<string | null>(null);
  const [instAberta, setInstAberta] = useState<string | null>(null);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '4px', padding: '8px 4px', borderBottom: '2px solid #e2e4f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase' }}>Ano</span>
          <span style={colHeaderStyle}>Vence Bruto</span>
          <span style={colHeaderStyle}>Vence Líquido</span>
        </div>

        {anoVencimentoArray.map((ano) => {
          const anoIsOpen = anoAberto === ano.name;
          return (
            <div key={ano.name}>
              <div
                onClick={() => { setAnoAberto(anoIsOpen ? null : ano.name); setInstAberta(null); }}
                style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #e2e4f0', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00bfa5', fontWeight: 700, fontSize: '0.85rem' }}>{ano.name}</span>
                  {anoIsOpen ? <ChevronUp size={16} color="#8b8fa8" /> : <ChevronDown size={16} color="#8b8fa8" />}
                </div>
                <span style={colValStyle}>{formatBRL(ano.venceBruto)}</span>
                <span style={colValLiquidoStyle}>{formatBRL(ano.venceLiquido)}</span>
              </div>

              {anoIsOpen && ano.instituicoes.map((inst) => {
                const instIsOpen = instAberta === `${ano.name}-${inst.name}`;
                return (
                  <div key={inst.name}>
                    <div
                      onClick={() => setInstAberta(instIsOpen ? null : `${ano.name}-${inst.name}`)}
                      style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #e2e4f0', background: '#f8f9fc', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1d27' }}>{inst.name}</span>
                        {instIsOpen ? <ChevronUp size={14} color="#8b8fa8" /> : <ChevronDown size={14} color="#8b8fa8" />}
                      </div>
                      <span style={{ ...colValStyle, fontSize: '0.78rem' }}>{formatBRL(inst.venceBruto)}</span>
                      <span style={{ ...colValLiquidoStyle, fontSize: '0.78rem' }}>{formatBRL(inst.venceLiquido)}</span>
                    </div>

                    {instIsOpen && inst.investimentos.map((invest) => (
                      <div
                        key={invest.id}
                        style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #e2e4f0', background: '#f0f1f7' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '24px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.72rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nomeInvestimento(invest)}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#8b8fa8', marginTop: '1px' }}>vence em {formatDataBR(invest.data_vencimento)}</span>
                        </div>
                        <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.72rem' }}>{formatBRL(invest.venceBruto)}</span>
                        <span style={{ ...colValLiquidoStyle, fontWeight: 700, fontSize: '0.72rem' }}>{formatBRL(invest.venceLiquido)}</span>
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
