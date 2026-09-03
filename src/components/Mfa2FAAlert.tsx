'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import MfaEnrollment from '../app/settings/MfaEnrollment';

export function Mfa2FAAlert() {
  const supabase = createClient();
  const [temFatorAtivo, setTemFatorAtivo] = useState<boolean | null>(null); // null = ainda verificando
  const [fechadoNestaSessao, setFechadoNestaSessao] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setTemFatorAtivo(!!data?.totp.find((f) => f.status === 'verified'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (temFatorAtivo !== false || fechadoNestaSessao) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div style={{ background: 'var(--dark-popover)', padding: '28px', borderRadius: '12px', width: 'min(380px, 100%)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--dark-warning)', color: 'var(--dark-fg)', boxShadow: 'var(--dark-shadow-popover)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <ShieldAlert size={20} color="var(--dark-warning)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Ative o 2FA para maior segurança</h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#8b8fa8', marginBottom: '20px' }}>
          Sua conta ainda não tem autenticação em duas etapas. Escaneie o QR code abaixo com um app autenticador para ativar agora.
        </p>

        <MfaEnrollment autoIniciar onAtivado={() => setTemFatorAtivo(true)} />

        <button
          onClick={() => setFechadoNestaSessao(true)}
          style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'transparent', border: 'none', color: '#8b8fa8', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
