-- Schema de Banco de Dados para Dashboard de Investimentos (Supabase / Postgres)

-- Drop das tabelas caso já existam para fins de recriacao
DROP TABLE IF EXISTS investimentos CASCADE;

-- 1. Tabela Principal de Investimentos
CREATE TABLE investimentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo VARCHAR(10) NOT NULL, -- CDB, LCA, LCI, LF
    emissor VARCHAR(100) NOT NULL, -- (ex: ORIGINAL (XP), DAYCOVAL)
    indexador_tipo VARCHAR(10) NOT NULL, -- PRÉ, PÓS
    taxa NUMERIC(10, 4) NOT NULL, -- A taxa bruta (ex: 17.36 ou 120.0 para CDI)
    instituicao_agrupadora VARCHAR(100) NOT NULL, -- Instituição final para o limite FGC
    valor_aplicado NUMERIC(15, 2) NOT NULL,
    data_aplicacao DATE NOT NULL,
    data_vencimento DATE, -- null se não tiver vencimento (ex: CDB liquidez diaria)
    
    -- Metadados de auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices para otimizar busca por instituicao FGC
CREATE INDEX idx_investimentos_inst ON investimentos (instituicao_agrupadora);
CREATE INDEX idx_investimentos_datas ON investimentos (data_aplicacao, data_vencimento);

-- O Supabase usa Row Level Security, entao ativaremos (ainda que publico pra comecar localmento)
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;

-- Política de leitura anônima (no contexto local)
CREATE POLICY "Leitura anonima" ON investimentos FOR SELECT USING (true);
CREATE POLICY "Escrita anonima" ON investimentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Update livre" ON investimentos FOR UPDATE USING (true);
CREATE POLICY "Deletar livre" ON investimentos FOR DELETE USING (true);
