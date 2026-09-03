import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida o token contra o Auth server (ao contrário de getSession(),
  // que só lê o cookie sem validar) — necessário para uma checagem confiável no middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rotas acessíveis sem sessão: /login (óbvio), /auth (troca o code do link de
  // recuperação por sessão) e /redefinir-senha (decide sozinha o que mostrar — formulário
  // se a sessão de recovery for válida, aviso de "link expirado" caso contrário).
  const rotaPublica = ['/login', '/auth', '/redefinir-senha'].some((p) => request.nextUrl.pathname.startsWith(p));

  if (!user && !rotaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
