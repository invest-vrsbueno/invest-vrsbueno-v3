-- Controle de alertas de excesso de cobertura FGC ja enviados por e-mail,
-- para garantir no maximo 1 envio por instituicao por dia mesmo com
-- multiplos acessos simultaneos ao dashboard (constraint UNIQUE abaixo).
CREATE TABLE IF NOT EXISTS fgc_alertas_enviados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instituicao VARCHAR(100) NOT NULL,
    data_alerta DATE NOT NULL DEFAULT CURRENT_DATE,
    valor_total NUMERIC(15, 2) NOT NULL,
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (instituicao, data_alerta)
);

ALTER TABLE fgc_alertas_enviados ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy criada de proposito: anon/authenticated nao enxergam nada
-- nessa tabela via PostgREST. Apenas a service_role (que ignora RLS) acessa,
-- usada exclusivamente pela rota de servidor src/app/api/alertas-fgc/route.ts.
