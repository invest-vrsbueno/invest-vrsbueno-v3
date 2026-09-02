# Dashboard de Investimentos — Contexto do Projeto

Este arquivo documenta as decisões e o estado atual do projeto para continuidade do
desenvolvimento (uso com Claude Code ou outra ferramenta de IA).

## Objetivo

Dashboard devera ser desenvolvido e validado localmente antes de pensarmos no deploy.
hospedado no vercel (não hospedado, sem webhooks/API de coleta de dados por enquanto) que lê a
planilha `INVEST_R2.xlsx` (que esta no link https://docs.google.com/spreadsheets/d/1sEKSj5AwNuNXCjjkAVHo-wM6TWhCPDU3Xl22hi3_fJc/edit?gid=0#gid=0) e apresenta:

1. Resumo anual dos rendimentos dos investimentos.
2. Posição diária estimada de cada CDB/LCA/LCI.
3. Distribuição por Instituição (Banco).
4. Alerta de limite de R$ 250 mil de rendimento bruto por instituição (cobertura do FGC).

## Fonte de dados: `INVEST_R2.xlsx` (https://docs.google.com/spreadsheets/d/1sEKSj5AwNuNXCjjkAVHo-wM6TWhCPDU3Xl22hi3_fJc/edit?gid=0#gid=0) que devera  ser migrada para banco de dados que vercel suporte

Aba `Planilha1`, colunas A–I:

| Coluna | Conteúdo |
|---|---|
| ATIVO | Texto livre com tipo (CDB/LCA/LCI), instituição, indexador (Pré/Pós-Fixado) e taxa, ex: `CDB - ORIGINAL (XP) - Pré-Fixado - 17.36%` |
| INSTITUIÇÃO | Nome do banco/emissor |
| APLICADO | Valor principal investido |
| HOJE | *Ignorado* - Usaremos cálculo dinâmico |
| RENDIMENTO | *Ignorado* - Usaremos cálculo dinâmico |
| LÍQUIDIO | Rendimento líquido projetado (estático) |
| DATA | Data de aplicação |
| VENC | Data de vencimento |
| ANO | Ano do vencimento (`=YEAR(VENC)`) |

utilize boas praticas de design contidas nas diretivas do google em https://m3.material.io
Crie um arquivo resumo de referencia para que nao tenha que pesquisar sempre
Crie um arquivo de memoria para que nao tenha que ler todo o contexto sempre desde o inicio
Crie um arquivo de planejamento de etapas para que possa acompanhar o progresso
utilize as skills e superpowers para cada etapa do projeto

Faça perguntas antes de definir o curso do projeto
instale as skills referentes a brainstorm, planejamento, design.

Sempre documente o que será feito a seguir antes de alterar, aguardando confirmaçao
caso nao consiga ler algum dos links listados nao crie nada do zero, oriente o que deve ser feito para que voce tenha visibilidade de tudo que é necessário

## Stack Tecnológica Definida
- **Banco de Dados (Vercel):** Supabase (PostgreSQL)
- **Frontend Framework:** Next.js
- **Design System:** Material Design 3 (M3)

## Data Schema (Payloads V.L.A.E.G.)
Para garantir o rigor técnico, as operações intermédias de processamento do arquivo `INVEST_R2.csv` e persistência no Supabase seguirão o seguinte formato de dados.

### Payload de Entrada (Dados Limpos da Planilha)
A extração inicial e limpeza da string "ATIVO" resultará neste JSON:
```json
{
  "tipo": "CDB | LCA | LCI",
  "emissor": "ORIGINAL (XP)",
  "indexador_tipo": "PRÉ | PÓS",
  "taxa": 17.36,
  "instituicao_agrupadora": "ORIGINAL",
  "valor_aplicado": 2723.03,
  "data_aplicacao": "2025-07-30",
  "data_vencimento": "2026-03-09"
}
```

### Payload de Saída (Dashboard via Next.js)
```json
{
  "resumo": {
    "total_aplicado": 150000.00,
    "total_estimado_hoje": 165000.00,
    "rentabilidade_media": 14.5
  },
  "alerta_fgc": [
    { "instituicao": "DAYCOVAL", "saldo_hoje": 100000.00, "status": "OK" },
    { "instituicao": "PITTZ", "saldo_hoje": 290000.00, "status": "ALERTA" }
  ]
}
```
