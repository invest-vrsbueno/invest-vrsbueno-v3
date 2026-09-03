import { NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

// Recebe o link enviado por e-mail (resetPasswordForEmail) — troca o código de uso único
// por uma sessão válida (necessário para poder chamar auth.updateUser em seguida) e
// redireciona para a página que o próprio link pediu (?next=...).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
}
