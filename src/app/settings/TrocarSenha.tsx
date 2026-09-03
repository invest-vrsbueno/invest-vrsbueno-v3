'use client';

import React, { useState } from 'react';
import { createClient } from '../../utils/supabase/client';

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: '#1f2029', border: '1px solid #323546', color: '#fff', borderRadius: '6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', marginBottom: '8px' };
const cardStyle: React.CSSProperties = { background: '#12141c', padding: '24px', borderRadius: '12px', border: '1px solid #323546' };
const buttonStyle: React.CSSProperties = { padding: '12px 20px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 };

export default function TrocarSenha() {
  const supabase = createClient();
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    if (nova.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (nova !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: nova });
    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setSucesso(true);
    setNova('');
    setConfirmar('');
  }

  return (
    <div style={cardStyle}>
      <strong style={{ display: 'block', marginBottom: '8px' }}>Alterar senha</strong>
      <p style={{ fontSize: '0.8rem', color: '#8b8fa8', marginBottom: '20px' }}>
        Defina uma nova senha de acesso à sua conta.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Nova senha</label>
          <input type="password" required value={nova} onChange={(e) => setNova(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Confirmar nova senha</label>
          <input type="password" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} style={inputStyle} />
        </div>
        {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}
        {sucesso && <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '16px' }}>✓ Senha alterada com sucesso.</div>}
        <button type="submit" disabled={carregando} style={{ ...buttonStyle, opacity: carregando ? 0.6 : 1 }}>
          {carregando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  );
}
