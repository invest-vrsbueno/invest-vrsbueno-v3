# Plano do Projeto: Dashboard de Investimentos (invest-vrsbueno-v3)

## Visão
Dashboard de investimentos pessoal (CDB/LCA/LCI/LF) para acompanhar a carteira de forma visual e resumida, com posição diária estimada calculada dinamicamente (não a partir de colunas estáticas da planilha original), alertas de limite FGC (R$ 250 mil por instituição) e ferramentas de simulação. Sucesso = dados sempre corretos e atualizados, acesso protegido por login, e a informação certa (rendimento bruto/líquido, vencimentos, cobertura FGC) visível sem esforço.

## Escopo
### Dentro
- Dashboard com KPIs, gráficos (Recharts) e tabelas com sanfona (Instituição/Ano → Investimento)
- CRUD completo de investimentos (`/editar-ativos`), com confirmação antes de cada escrita
- Login + 2FA opcional (Supabase Auth)
- Alertas por e-mail (FGC, vencimento) e Simulador Selic (com PDF e e-mail)
- Cálculo de IR via tabela regressiva

### Fora
- Coleta automática de dados via webhook/API externa (fonte é a planilha migrada para Supabase, não uma integração ao vivo)
- Qualquer automação de trade ou ação financeira real

## Critérios de Aceite
- [x] Login obrigatório funcionando em produção
- [x] CRUD de investimentos com confirmação antes de escrever no Supabase
- [x] Alertas de FGC e vencimento por e-mail configurados
- [x] Simulador Selic com PDF e e-mail
- [x] Dashboard com KPIs, distribuição por instituição, resumo anual, investimentos a vencer
- [x] `npx tsc --noEmit` limpo e produção sincronizada com `main` (confirmado em 2026-09-04)
- [ ] Consolidar cálculo de IR e nome do investimento em utils compartilhados (hoje duplicado em vários componentes)

## Arquitetura Técnica
- Next.js 16.3.4 (App Router) + React 19 + TypeScript, deploy no Vercel, dados no Supabase (Postgres + Auth).
- `src/app/DashboardClient.tsx` monta o grid (`react-grid-layout`) que renderiza os cards definidos em `src/components/DashboardTopLayout.tsx`.
- Lógica de negócio (IR, agrupamento por instituição/vencimento, cálculo Selic) em `src/utils/` (`fgc.ts`, `vencimento.ts`, `selic.ts`).
- Rotas de API (`src/app/api/`) para envio de alertas e e-mails (selic, alertas-fgc, alertas-vencimento).
- Proteção de rotas via `src/proxy.ts` (Supabase Auth, cookies).

## Checklist de Tarefas
- [x] Migrar fonte de dados da planilha para Supabase
- [x] Implementar cálculo dinâmico de posição/rendimento (não usar colunas estáticas HOJE/RENDIMENTO)
- [x] Dashboard com KPIs, gráficos e tabelas
- [x] Navbar sticky/glassmorphism aplicada em produção (`architecture/STATUS_2026-09-03_sessao_completa.md`)
- [x] CRUD "Editar Ativos" com escrita real no Supabase (RLS `authenticated`)
- [x] Login + 2FA opcional
- [x] Alertas por e-mail (FGC + vencimento) e Simulador Selic com PDF/e-mail
- [x] Cards de tabela com sanfona e IR (Distribuição, Resumo Anual, Investimentos a Vencer) — sessão 2026-09-04
- [ ] Extrair `nomeInvestimento` e cálculo de IR duplicados para um util compartilhado
- [x] Resolver arquivos órfãos de outra sessão em paralelo (removidos em 2026-09-04, com confirmação do usuário)
