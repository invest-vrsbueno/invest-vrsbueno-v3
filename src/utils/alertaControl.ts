const JANELA_MS = 24 * 60 * 60 * 1000;

// Controle generico de reenvio de alertas: no maximo 1 envio por (tipo, chave)
// a cada 24h corridas desde o ultimo envio (janela movel, nao por dia-calendario).
export async function podeEnviarAlerta(tipo: string, chave: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  const res = await fetch(
    `${url}/rest/v1/alertas_enviados?tipo=eq.${encodeURIComponent(tipo)}&chave=eq.${encodeURIComponent(chave)}&select=enviado_em&order=enviado_em.desc&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: 'no-store' }
  );
  if (!res.ok) return false;

  const rows: { enviado_em: string }[] = await res.json();
  const ultimo = rows[0];
  if (!ultimo) return true;
  return Date.now() - new Date(ultimo.enviado_em).getTime() >= JANELA_MS;
}

export async function registrarAlerta(tipo: string, chave: string, valorTotal?: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  await fetch(`${url}/rest/v1/alertas_enviados`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ tipo, chave, valor_total: valorTotal ?? null }),
  });
}
