'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { InstituicaoFGC } from '../utils/fgc';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

export function FgcDetalhe({ byInstArray, LIMIT_FGC }: { byInstArray: InstituicaoFGC[]; LIMIT_FGC: number }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const emRisco = byInstArray.filter((i) => i.value >= LIMIT_FGC);

  if (emRisco.length === 0) {
    return (
      <div style={{ padding: '12px 4px', fontSize: '0.8rem', color: '#8b8fa8' }}>
        ✅ Nenhuma instituição acima do limite de {formatBRL(LIMIT_FGC)}.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '8px' }}>
      {emRisco.map((inst) => {
        const excesso = inst.value - LIMIT_FGC;
        const isOpen = aberto === inst.name;
        return (
          <div key={inst.name} style={{ border: '1px solid #fecaca', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setAberto(isOpen ? null : inst.name)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1d27' }}>⚠️ {inst.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>{formatBRL(inst.value)} — excesso de {formatBRL(excesso)}</div>
              </div>
              {isOpen ? <ChevronUp size={16} color="#8b8fa8" /> : <ChevronDown size={16} color="#8b8fa8" />}
            </button>
            {isOpen && (
              <div style={{ padding: '0 14px 12px' }}>
                {inst.investimentos.map((invest) => (
                  <div key={invest.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #fecaca', fontSize: '0.75rem' }}>
                    <span style={{ color: '#1a1d27' }}>{invest.emissor} <span style={{ color: '#8b8fa8' }}>({invest.tipo})</span></span>
                    <span style={{ fontWeight: 600, color: '#1a1d27' }}>{formatBRL(invest.posicaoHoje)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
