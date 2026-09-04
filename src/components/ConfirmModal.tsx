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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
      <div style={{ background: 'var(--dark-popover)', padding: '24px', borderRadius: '12px', width: 'min(420px, 100%)', border: '1px solid var(--dark-border)', color: 'var(--dark-fg)', boxShadow: 'var(--dark-shadow-popover)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>{titulo}</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--dark-fg)', marginBottom: '24px', lineHeight: 1.6 }}>{children}</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            disabled={carregando}
            style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--dark-border)', color: 'var(--dark-fg)', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={carregando}
            style={{ flex: 1, padding: '11px', background: corConfirmar, border: '1px solid transparent', color: '#fff', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, fontSize: '0.85rem', opacity: carregando ? 0.6 : 1 }}
          >
            {carregando ? 'Salvando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
