'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: '#1f2029', border: '1px solid #323546', color: '#fff', borderRadius: '6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', marginBottom: '8px' };
const linkBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#8b8fa8', fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' };

type Etapa = 'credenciais' | 'mfa' | 'recuperar' | 'recuperar-enviado';

export default function LoginForm({ nextPath, erroInicial = null }: { nextPath: string; erroInicial?: string | null }) {
  const router = useRouter();
  const supabase = createClient();

  const [etapa, setEtapa] = useState<Etapa>(erroInicial ? 'recuperar' : 'credenciais');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [emailRecuperar, setEmailRecuperar] = useState('');
  const [erro, setErro] = useState<string | null>(erroInicial);
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

  async function handleSubmitRecuperar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    // O Supabase não revela se o e-mail existe ou não (evita enumeração de contas) —
    // por isso a mensagem de sucesso é sempre a mesma, mesmo em caso de erro de rede
    // aqui abaixo optamos por mostrar o erro só se for algo diferente de "rate limit"
    // comum quando o usuário tenta reenviar rápido demais.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailRecuperar, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });

    setCarregando(false);
    if (resetError && !resetError.message.toLowerCase().includes('rate limit')) {
      setErro(resetError.message);
      return;
    }

    setEtapa('recuperar-enviado');
  }

  return (
    <div style={{ background: '#12141c', padding: '32px', borderRadius: '12px', width: 'min(380px, 100%)', border: '1px solid #323546', color: '#fff' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '4px' }}>vrsbueno Invest</h1>
      <p style={{ fontSize: '0.8rem', marginBottom: '24px', color: '#8b8fa8' }}>
        {etapa === 'credenciais' && 'Entre com sua conta para acessar o dashboard.'}
        {etapa === 'mfa' && 'Digite o código do seu aplicativo autenticador.'}
        {etapa === 'recuperar' && 'Informe seu e-mail para receber o link de recuperação.'}
        {etapa === 'recuperar-enviado' && 'Verifique sua caixa de entrada.'}
      </p>

      {etapa === 'credenciais' && (
        <form onSubmit={handleSubmitCredenciais}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>E-mail</label>
            <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={labelStyle}>Senha</label>
            <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ textAlign: 'right', marginBottom: '20px' }}>
            <button
              type="button"
              style={linkBtnStyle}
              onClick={() => { setErro(null); setEmailRecuperar(email); setEtapa('recuperar'); }}
            >
              Esqueci minha senha
            </button>
          </div>

          {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}

          <button
            type="submit"
            disabled={carregando}
            style={{ width: '100%', padding: '12px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, opacity: carregando ? 0.6 : 1 }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      )}

      {etapa === 'mfa' && (
        <form onSubmit={handleSubmitMfa}>
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

          {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}

          <button
            type="submit"
            disabled={carregando}
            style={{ width: '100%', padding: '12px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, opacity: carregando ? 0.6 : 1 }}
          >
            {carregando ? 'Entrando...' : 'Confirmar código'}
          </button>
        </form>
      )}

      {etapa === 'recuperar' && (
        <form onSubmit={handleSubmitRecuperar}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>E-mail</label>
            <input type="email" required autoFocus value={emailRecuperar} onChange={(e) => setEmailRecuperar(e.target.value)} style={inputStyle} />
          </div>

          {erro && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '16px' }}>{erro}</div>}

          <button
            type="submit"
            disabled={carregando}
            style={{ width: '100%', padding: '12px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: carregando ? 'default' : 'pointer', fontWeight: 600, opacity: carregando ? 0.6 : 1, marginBottom: '14px' }}
          >
            {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
          <div style={{ textAlign: 'center' }}>
            <button type="button" style={linkBtnStyle} onClick={() => { setErro(null); setEtapa('credenciais'); }}>&larr; Voltar ao login</button>
          </div>
        </form>
      )}

      {etapa === 'recuperar-enviado' && (
        <>
          <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', fontSize: '0.82rem', color: '#e2e4f0' }}>
            Se <strong>{emailRecuperar}</strong> estiver cadastrado, enviamos um link de recuperação. O link expira em 1 hora.
          </div>
          <div style={{ textAlign: 'center' }}>
            <button type="button" style={linkBtnStyle} onClick={() => { setEtapa('credenciais'); }}>&larr; Voltar ao login</button>
          </div>
        </>
      )}
    </div>
  );
}
