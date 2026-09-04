import { createClient } from '../../utils/supabase/server';
import RedefinirSenhaForm from './RedefinirSenhaForm';

const cardStyle: React.CSSProperties = { background: '#12141c', padding: '32px', borderRadius: '12px', width: 'min(380px, 100%)', border: '1px solid #323546', color: '#fff' };

export default async function RedefinirSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b10', padding: '16px' }}>
      {user ? (
        <RedefinirSenhaForm />
      ) : (
        <div style={cardStyle}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '12px' }}>Link expirado</h1>
          <p style={{ fontSize: '0.85rem', color: '#8b8fa8', marginBottom: '20px' }}>
            Este link de recuperação de senha expirou ou já foi usado. Volte à tela de login e
            solicite um novo.
          </p>
          <a
            className="btn"
            href="/login"
            style={{ display: 'block', textAlign: 'center', padding: '12px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}
          >
            Voltar ao login
          </a>
        </div>
      )}
    </div>
  );
}
