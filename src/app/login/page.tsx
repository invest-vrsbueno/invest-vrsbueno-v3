import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next, erro } = await searchParams;

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0b10',
        padding: '16px',
      }}
    >
      <LoginForm
        nextPath={next || '/'}
        erroInicial={erro === 'link_invalido' ? 'O link de recuperação expirou ou já foi usado. Solicite um novo abaixo.' : null}
      />
    </div>
  );
}
