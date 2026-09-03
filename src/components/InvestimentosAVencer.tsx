'use client';

import React, { useMemo, useState } from 'react';
import type { InvestimentoVencendo } from '../utils/vencimento';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

function formatDataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const HORIZONTES: { label: string; dias: number | null }[] = [
  { label: 'Todos os prazos', dias: null },
  { label: 'Próximos 30 dias', dias: 30 },
  { label: 'Próximos 60 dias', dias: 60 },
  { label: 'Próximos 90 dias', dias: 90 },
  { label: 'Próximos 180 dias', dias: 180 },
];

export function InvestimentosAVencer({ investimentos }: { investimentos: InvestimentoVencendo[] }) {
  const [horizonte, setHorizonte] = useState<number | null>(null);

  const filtrados = useMemo(() => {
    const futuros = investimentos.filter((i) => i.diasRestantes >= 0);
    const porHorizonte = horizonte === null ? futuros : futuros.filter((i) => i.diasRestantes <= horizonte);
    return porHorizonte.slice(0, 10);
  }, [investimentos, horizonte]);

  return (
    <>
      <div style={{ padding: '0 16px', marginBottom: '4px' }}>
        <select
          value={horizonte ?? ''}
          onChange={(e) => setHorizonte(e.target.value ? Number(e.target.value) : null)}
          style={{ width: '100%', padding: '8px 10px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid #e2e4f0', color: '#1a1d27', background: '#fff' }}
        >
          {HORIZONTES.map((h) => (
            <option key={h.label} value={h.dias ?? ''}>{h.label}</option>
          ))}
        </select>
      </div>
      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1 }}>
        {filtrados.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: '#8b8fa8', padding: '16px 0' }}>Nenhum investimento vencendo neste período.</div>
        )}
        {filtrados.map((inv) => (
          <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e4f0' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{inv.emissor}</div>
              <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>
                {inv.instituicao_agrupadora} · vence em {formatDataBR(inv.data_vencimento)} ({inv.diasRestantes === 0 ? 'hoje' : `${inv.diasRestantes}d`})
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.85rem' }}>{formatBRL(inv.posicaoHoje)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
