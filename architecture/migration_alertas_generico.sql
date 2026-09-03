-- Substitui fgc_alertas_enviados (janela por dia-calendario) por uma tabela
-- generica de controle de alertas com janela movel de 24h corridas desde o
-- ultimo envio, reutilizada pelos alarmes de FGC e de vencimento de investimentos.
DROP TABLE IF EXISTS fgc_alertas_enviados;

CREATE TABLE IF NOT EXISTS alertas_enviados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL,       -- 'fgc' | 'vencimento'
    chave VARCHAR(150) NOT NULL,      -- instituicao (fgc) ou id do investimento (vencimento)
    valor_total NUMERIC(15, 2),
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_tipo_chave_enviado ON alertas_enviados (tipo, chave, enviado_em DESC);

ALTER TABLE alertas_enviados ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy criada de proposito: apenas a service_role acessa,
-- usada pelas rotas de servidor src/app/api/alertas-fgc e alertas-vencimento.
