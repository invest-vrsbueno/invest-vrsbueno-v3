-- Preferência de ordem de colunas por usuário, por card "estilo planilha" do dashboard.
-- card_key: 'distribuicao-instituicoes' | 'resumo-anual' | 'investimentos-a-vencer'
CREATE TABLE user_column_prefs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_key VARCHAR(50) NOT NULL,
    column_order TEXT[] NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, card_key)
);

ALTER TABLE user_column_prefs ENABLE ROW LEVEL SECURITY;

-- Sem policy de leitura anônima — diferente de `investimentos`, aqui não há motivo
-- para expor a preferência de UI de um usuário para outro.
CREATE POLICY "Usuario le sua propria preferencia" ON user_column_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario grava sua propria preferencia" ON user_column_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario atualiza sua propria preferencia" ON user_column_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario deleta sua propria preferencia" ON user_column_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
