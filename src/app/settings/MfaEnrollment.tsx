'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '../../utils/supabase/client';

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: '#1f2029', border: '1px solid #323546', color: '#fff', borderRadius: '6px' };
const cardStyle: React.CSSProperties = { background: '#12141c', padding: '24px', borderRadius: '12px', border: '1px solid #323546' };
const buttonStyle: React.CSSProperties = { padding: '12px 20px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 };

type Estado =
  | { fase: 'carregando' }
  | { fase: 'inativo' }
  | { fase: 'ativo'; factorId: string }
  | { fase: 'inscrevendo'; factorId: string; qrCode: string; secret: string };

export default function MfaEnrollment({ autoIniciar = false, onAtivado }: { autoIniciar?: boolean; onAtivado?: () => void } = {}) {
  const supabase = createClient();
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const jaCarregouRef = useRef(false);

  async function carregarFatores() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) {
      setEstado({ fase: 'inativo' });
      return;
    }
    const verificado = data.totp.find((f) => f.status === 'verified');
    if (verificado) {
      setEstado({ fase: 'ativo', factorId: verificado.id });
      return;
    }
    if (autoIniciar) {
      // remove qualquer inscrição anterior não confirmada para gerar um QR novo
      const naoVerificado = data.all.find((f) => f.factor_type === 'totp' && f.status === 'unverified');
      if (naoVerificado) {
        await supabase.auth.mfa.unenroll({ factorId: naoVerificado.id });
      }
      await iniciarAtivacao();
      return;
    }
    setEstado({ fase: 'inativo' });
  }

  useEffect(() => {
    // Evita disparo duplicado (React Strict Mode invoca efeitos de montagem 2x em dev),
    // o que causaria duas chamadas concorrentes a mfa.enroll() com o mesmo friendly_name.
    if (jaCarregouRef.current) return;
    jaCarregouRef.current = true;
    carregarFatores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function iniciarAtivacao() {
    setErro(null);
    setCarregando(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Autenticador' });
    setCarregando(false);
    if (error || !data) {
      setErro(error?.message || 'Não foi possível iniciar a ativação do 2FA.');
      return;
    }
    setEstado({ fase: 'inscrevendo', factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmarAtivacao(e: React.FormEvent) {
    e.preventDefault();
    if (estado.fase !== 'inscrevendo') return;
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: estado.factorId, code: codigo });
    setCarregando(false);
    if (error) {
      setErro('Código inválido. Confira o app autenticador e tente novamente.');
      return;
    }
    setCodigo('');
    onAtivado?.();
    await carregarFatores();
  }

  async function desativar() {
    if (estado.fase !== 'ativo') return;
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: estado.factorId });
    setCarregando(false);
    if (error) {
      setErro('Não foi possível desativar o 2FA.');
      return;
    }
    setEstado({ fase: 'inativo' });
  }

  if (estado.fase === 'carregando') {
    return <div style={cardStyle}><p style={{ fontSize: '0.85rem', color: '#8b8fa8' }}>Carregando...</p></div>;
  }

  if (estado.fase === 'ativo') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ color: '#10b981', fontSize: '1.1rem' }}>&#10003;</span>
          <strong>Autenticação em duas etapas ativada</strong>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#8b8fa8', marginBottom: '20px' }}>
          Um código do seu app autenticador será exigido a cada login.
        </p>
        {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}
        <button onClick={desativar} disabled={carregando} style={{ ...buttonStyle, borderColor: '#ef4444', color: '#ef4444', opacity: carregando ? 0.6 : 1 }}>
          {carregando ? 'Desativando...' : 'Desativar 2FA'}
        </button>
      </div>
    );
  }

  if (estado.fase === 'inscrevendo') {
    return (
      <div style={cardStyle}>
        <strong style={{ display: 'block', marginBottom: '16px' }}>Escaneie o QR code</strong>
        <p style={{ fontSize: '0.8rem', color: '#8b8fa8', marginBottom: '16px' }}>
          Use o Google Authenticator, Authy ou similar. Se preferir, digite a chave manualmente.
        </p>
        <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', width: 'fit-content', marginBottom: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={estado.qrCode} alt="QR code para configurar o autenticador" width={180} height={180} />
        </div>
        <p style={{ fontSize: '0.75rem', color: '#8b8fa8', marginBottom: '20px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
          Chave manual: {estado.secret}
        </p>
        <form onSubmit={confirmarAtivacao}>
          <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '8px' }}>Código de 6 dígitos</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            style={{ ...inputStyle, marginBottom: '16px', textAlign: 'center', letterSpacing: '0.3em' }}
          />
          {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}
          <button type="submit" disabled={carregando} style={{ ...buttonStyle, width: '100%', opacity: carregando ? 0.6 : 1 }}>
            {carregando ? 'Confirmando...' : 'Confirmar ativação'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <strong style={{ display: 'block', marginBottom: '8px' }}>Autenticação em duas etapas (2FA)</strong>
      <p style={{ fontSize: '0.8rem', color: '#8b8fa8', marginBottom: '20px' }}>
        Adicione uma camada extra de segurança exigindo um código do seu celular a cada login.
      </p>
      {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}
      <button onClick={iniciarAtivacao} disabled={carregando} style={{ ...buttonStyle, opacity: carregando ? 0.6 : 1 }}>
        {carregando ? 'Iniciando...' : 'Ativar 2FA'}
      </button>
    </div>
  );
}
