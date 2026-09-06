import type { SupabaseClient } from '@supabase/supabase-js';

export interface Investimento {
  id: string;
  tipo: string;
  emissor: string;
  indexador_tipo: string;
  taxa: number;
  instituicao_agrupadora: string;
  valor_aplicado: number;
  data_aplicacao: string;
  data_vencimento: string | null;
}

export type Rascunho = Omit<Investimento, 'id'>;

// Abstrai as operações de persistência da tela de Ativos. A implementação real (Supabase)
// e a de simulação (preview-v4, em memória) têm a mesma interface — o componente
// AtivosClient não sabe (nem precisa saber) qual das duas está em uso.
export interface AtivosRepo {
  insert(payload: Rascunho): Promise<Investimento>;
  insertMany(payload: Rascunho[]): Promise<Investimento[]>;
  update(id: string, payload: Rascunho): Promise<void>;
  remove(id: string): Promise<void>;
  // Apaga todos os registros existentes e insere os da planilha no lugar — usado só no modo
  // "reescrever" da importação de CSV (ver AtivosClient.tsx).
  replaceAll(payload: Rascunho[]): Promise<Investimento[]>;
}

export function createSupabaseAtivosRepo(supabase: SupabaseClient): AtivosRepo {
  return {
    async insert(payload) {
      const { data, error } = await supabase.from('investimentos').insert(payload).select().single();
      if (error) throw error;
      return data as Investimento;
    },
    async insertMany(payload) {
      if (payload.length === 0) return [];
      const { data, error } = await supabase.from('investimentos').insert(payload).select();
      if (error) throw error;
      return (data as Investimento[]) || [];
    },
    async update(id, payload) {
      const { error } = await supabase.from('investimentos').update(payload).eq('id', id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await supabase.from('investimentos').delete().eq('id', id);
      if (error) throw error;
    },
    async replaceAll(payload) {
      // "neq" com um uuid que nunca existe é o jeito padrão de fazer "delete all" no
      // Supabase sem um WHERE vazio (que a API recusa por segurança).
      const { error: delError } = await supabase.from('investimentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delError) throw delError;
      if (payload.length === 0) return [];
      const { data, error } = await supabase.from('investimentos').insert(payload).select();
      if (error) throw error;
      return (data as Investimento[]) || [];
    },
  };
}
