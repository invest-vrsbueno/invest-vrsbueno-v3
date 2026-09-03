import { redirect } from 'next/navigation';
import { createClient } from '../../utils/supabase/server';
import MfaEnrollment from './MfaEnrollment';
import TrocarSenha from './TrocarSenha';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0a0b10', color: '#fff', padding: '40px 16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <a href="/" style={{ color: '#8b8fa8', fontSize: '0.85rem', textDecoration: 'none' }}>&larr; Voltar ao dashboard</a>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '16px 0 4px' }}>Segurança da conta</h1>
          <p style={{ fontSize: '0.85rem', color: '#8b8fa8' }}>{user.email}</p>
        </div>
        <TrocarSenha />
        <MfaEnrollment />
      </div>
    </div>
  );
}
