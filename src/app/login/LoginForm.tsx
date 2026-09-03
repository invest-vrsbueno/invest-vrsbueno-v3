'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: '#1f2029', border: '1px solid #323546', color: '#fff', borderRadius: '6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', marginBottom: '8px' };

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [etapa, setEtapa] = useState<'credenciais' | 'mfa'>('credenciais');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmitCredenciais(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (signInError) {
      setErro(signInError.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : signInError.message);
      setCarregando(false);
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      setCarregando(false);
      setEtapa('mfa');
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleSubmitMfa(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError || !factors) {
      setErro('Não foi possível carregar o fator de autenticação. Tente novamente.');
      setCarregando(false);
      return;
    }

    const totpFactor = factors.totp.find((f) => f.status === 'verified');
    if (!totpFactor) {
      setErro('Nenhum fator de 2FA verificado encontrado nesta conta.');
      setCarregando(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpFactor.id,
      code: codigo,
    });

    setCarregando(false);
    if (verifyError) {
      setErro('Código inválido. Verifique o app autenticador e tente novamente.');
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form
      onSubmit={etapa === 'credenciais' ? handleSubmitCredenciais : handleSubmitMfa}
      style={{ background: '#12141c', padding: '32px', borderRadius: '12px', width: '380px', border: '1px solid #323546', color: '#fff' }}
    >
      <h1 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '4px' }}>Investimentos BUD</h1>
      <p style={{ fontSize: '0.8rem', marginBottom: '24px', color: '#8b8fa8' }}>
        {etapa === 'credenciais' ? 'Entre com sua conta para acessar o dashboard.' : 'Digite o código do seu aplicativo autenticador.'}
      </p>

      {etapa === 'credenciais' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>E-mail</label>
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Senha</label>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} style={inputStyle} />
          </div>
        </>
      )}

      {etapa === 'mfa' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Código de 6 dígitos</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.1rem' }}
          />
        </div>
      )}

      {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}

      <button
        type="submit"
        disabled={carregando}
        style={{ width: '100%', padding: '12px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, opacity: carregando ? 0.6 : 1 }}
      >
        {carregando ? 'Entrando...' : etapa === 'credenciais' ? 'Entrar' : 'Confirmar código'}
      </button>
    </form>
  );
}
