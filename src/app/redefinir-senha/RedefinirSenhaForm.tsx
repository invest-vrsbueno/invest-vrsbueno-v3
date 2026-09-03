'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: '#1f2029', border: '1px solid #323546', color: '#fff', borderRadius: '6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', marginBottom: '8px' };

export default function RedefinirSenhaForm() {
  const router = useRouter();
  const supabase = createClient();

  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

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

    setSalvo(true);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 2000);
  }

  return (
    <div style={{ background: '#12141c', padding: '32px', borderRadius: '12px', width: 'min(380px, 100%)', border: '1px solid #323546', color: '#fff' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '4px' }}>Redefinir senha</h1>
      <p style={{ fontSize: '0.8rem', marginBottom: '24px', color: '#8b8fa8' }}>Escolha uma nova senha para sua conta.</p>

      {salvo ? (
        <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '8px', padding: '14px 16px', fontSize: '0.82rem', color: '#e2e4f0' }}>
          ✓ Senha atualizada com sucesso. Redirecionando para o dashboard...
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nova senha</label>
            <input type="password" required autoFocus value={nova} onChange={(e) => setNova(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Confirmar nova senha</label>
            <input type="password" required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} style={inputStyle} />
          </div>
          {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}
          <button
            type="submit"
            disabled={carregando}
            style={{ width: '100%', padding: '12px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, opacity: carregando ? 0.6 : 1 }}
          >
            {carregando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </div>
  );
}
