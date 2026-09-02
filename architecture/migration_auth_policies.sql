-- Restringe escrita (insert/update/delete) em investimentos a usuarios autenticados
-- via Supabase Auth. Leitura continua publica para o dashboard funcionar sem login.
DROP POLICY IF EXISTS "Escrita anonima" ON investimentos;
DROP POLICY IF EXISTS "Update livre" ON investimentos;
DROP POLICY IF EXISTS "Deletar livre" ON investimentos;

CREATE POLICY "Escrita autenticada" ON investimentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update autenticado" ON investimentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Deletar autenticado" ON investimentos FOR DELETE TO authenticated USING (true);
