'use client';

import React from 'react';

export function ConfirmModal({
  titulo,
  children,
  onConfirm,
  onCancel,
  corConfirmar = '#3b82f6',
  textoConfirmar = 'Confirmar',
  carregando = false,
}: {
  titulo: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  corConfirmar?: string;
  textoConfirmar?: string;
  carregando?: boolean;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ background: '#12141c', padding: '24px', borderRadius: '12px', width: '420px', maxWidth: '90vw', border: '1px solid #323546', color: '#fff' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>{titulo}</h2>
        <div style={{ fontSize: '0.85rem', color: '#e2e4f0', marginBottom: '24px', lineHeight: 1.6 }}>{children}</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            disabled={carregando}
            style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #323546', color: '#e2e4f0', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={carregando}
            style={{ flex: 1, padding: '11px', background: corConfirmar, border: 'none', color: '#fff', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: carregando ? 0.6 : 1 }}
          >
            {carregando ? 'Salvando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
