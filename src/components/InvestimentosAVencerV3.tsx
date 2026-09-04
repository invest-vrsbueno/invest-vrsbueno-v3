'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { InvestimentoVencendo } from '../utils/vencimento';

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

interface InstituicaoVencendo {
  name: string;
  rendimentoBruto: number;
  rendimentoLiquido: number;
  investimentos: InvestimentoVencendo[];
}

function agruparPorInstituicao(investimentos: InvestimentoVencendo[]): InstituicaoVencendo[] {
  const acc: Record<string, InstituicaoVencendo> = {};
  for (const inv of investimentos) {
    const key = inv.instituicao_agrupadora;
    if (!acc[key]) acc[key] = { name: key, rendimentoBruto: 0, rendimentoLiquido: 0, investimentos: [] };
    acc[key].rendimentoBruto += inv.rendimentoBruto;
    acc[key].rendimentoLiquido += inv.rendimentoLiquido;
    acc[key].investimentos.push(inv);
  }
  const instituicoes = Object.values(acc);
  for (const inst of instituicoes) {
    inst.investimentos.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }
  return instituicoes.sort((a, b) => a.investimentos[0].diasRestantes - b.investimentos[0].diasRestantes);
}

const inputDateStyle: React.CSSProperties = { flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e2e4f0', color: '#1a1d27', background: '#fff' };
const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };

export function InvestimentosAVencerV3({ investimentos }: { investimentos: InvestimentoVencendo[] }) {
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [instAberta, setInstAberta] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const futuros = investimentos.filter((i) => i.diasRestantes >= 0);
    return futuros
      .filter((i) => !dataInicial || i.data_vencimento.slice(0, 10) >= dataInicial)
      .filter((i) => !dataFinal || i.data_vencimento.slice(0, 10) <= dataFinal);
  }, [investimentos, dataInicial, dataFinal]);

  const porInstituicao = useMemo(() => agruparPorInstituicao(filtrados), [filtrados]);

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

        {porInstituicao.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: '#8b8fa8', padding: '16px 4px' }}>Nenhum investimento vencendo neste período.</div>
        )}

        {porInstituicao.map((inst) => {
          const isOpen = instAberta === inst.name;
          const proximo = inst.investimentos[0];
          return (
            <div key={inst.name}>
              <div
                onClick={() => setInstAberta(isOpen ? null : inst.name)}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #e2e4f0', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{inst.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>
                      próximo vence em {formatDataBR(proximo.data_vencimento)} ({proximo.diasRestantes === 0 ? 'hoje' : `${proximo.diasRestantes}d`})
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="#8b8fa8" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#8b8fa8" style={{ flexShrink: 0 }} />}
                </div>
                <span style={colValStyle}>{formatBRL(inst.rendimentoBruto)}</span>
                <span style={colValStyle}>{formatBRL(inst.rendimentoLiquido)}</span>
              </div>

              {isOpen && inst.investimentos.map((inv) => (
                <div
                  key={inv.id}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #e2e4f0', background: '#f8f9fc' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.75rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nomeInvestimento(inv)}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#8b8fa8', marginTop: '1px' }}>vence em {formatDataBR(inv.data_vencimento)}</span>
                  </div>
                  <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(inv.rendimentoBruto)}</span>
                  <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(inv.rendimentoLiquido)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
