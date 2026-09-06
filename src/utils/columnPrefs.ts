import type { SupabaseClient } from '@supabase/supabase-js';

export type CardKey = 'distribuicao-instituicoes' | 'resumo-anual' | 'investimentos-a-vencer' | 'investimentos-vencidos';

export async function fetchColumnOrder(supabase: SupabaseClient, cardKey: CardKey): Promise<string[] | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_column_prefs')
    .select('column_order')
    .eq('user_id', user.id)
    .eq('card_key', cardKey)
    .maybeSingle();

  if (error || !data) return null;
  return data.column_order as string[];
}

export async function saveColumnOrder(supabase: SupabaseClient, cardKey: CardKey, order: string[]): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  await supabase.from('user_column_prefs').upsert({
    user_id: user.id,
    card_key: cardKey,
    column_order: order,
    updated_at: new Date().toISOString(),
  });
}
