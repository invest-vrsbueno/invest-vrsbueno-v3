# Memória do Projeto (progress.md)

## 📝 Registro de Estado e Progresso

### Data de Inicialização: 01/09/2026

### 🛠️ Status dos Arquivos Constitutivos:
- [x] `gemini.md` (Constituição e Contexto do Projeto) - Configurado.
- [x] `VLAEG.md` (Protocolo de Desenvolvimento) - Configurado.
- [x] `task_plan.md` (Planejamento de Etapas) - Criado.
- [x] `findings.md` (Resumo de Referência & M3 Design) - Criado.
- [x] `progress.md` (Memória do Projeto) - Criado.

### 📌 Histórico de Decisões e Execuções:
- **01/09/2026:**
  - Verificação de saldo de cota do usuário no Claude.
  - Inicialização da estrutura de memória do projeto V.L.A.E.G.
  - Teste de leitura da URL do Google Sheets concluída com impedimento (login obrigatório).
  - **[Decisões de Descoberta - Fase 1]:**
    - A planilha original foi exportada e salva localmente como `INVEST_R2.csv`.
    - **Estrela Guia:** Acompanhar carteira de forma visual, resumida, com foco primário em rentabilidade.
    - **Cálculo:** Posição diária estimada calculada diariamente através de lógica baseada no indexador/rendimento da própria planilha/título (dinâmico).
    - **Tecnologia Banco de Dados:** Supabase.
    - **Tecnologia Frontend:** Next.js (com Material Design 3).

---

## 🧭 Próximos Passos Imediatos:
1. Realizar parsing determinístico do arquivo `INVEST_R2.csv` (Fase 2 - Link).
2. Definir tabelas do Supabase e configurar conexão.
3. Projetar e implementar a lógica de rendimento diário na arquitetura.

---

## 2026-09-04 — Adoção do Protocolo Spec-Driven
**Resultado:** SUCESSO
**Erros:** nenhum
**Próximo passo:** Extrair `nomeInvestimento`/cálculo de IR duplicados para um util compartilhado; confirmar com o usuário o destino dos arquivos órfãos de outra sessão (`InvestimentosAVencerV2.tsx`, `preview-v13/`, exceção em `proxy.ts`) antes de removê-los.

## 2026-09-04 — Limpeza do diretório do projeto
**Resultado:** SUCESSO (`npx tsc --noEmit` limpo antes e depois)
**Erros:** nenhum
**O que foi removido** (via `git rm`, recuperável pelo histórico do git se precisar):
- Protótipo antigo em Streamlit (`dashboard.py`), scripts de migração/teste de uma vez só (`seed.py`, `tools/parse_investments.py`, `tools/populate_supabase.py`, `tools/test_db.py`), CSV antigo (`csv_antigo/INVEST_R2_old.csv`) e ícones padrão não usados do boilerplate (`public/*.svg`).
- Confirmado com o usuário: `INVEST_R2.csv` (dado já migrado para o Supabase), `Referencia/` (imagens de referência de design, telas já finalizadas), e `architecture/HANDOFF_navbar_e_deploy.md` (handoff de tarefa já concluída e em produção).
- Confirmado com o usuário: arquivos órfãos de outra sessão em paralelo — `src/app/preview-v13/`, `src/components/InvestimentosAVencerV2.tsx` (nunca commitados) e a exceção `preview-v13` em `src/proxy.ts` (revertida para o matcher original).
- Caches/artefatos regeráveis apagados do disco (já ignorados pelo git): `.next/`, `.tmp/`, `tsconfig.tsbuildinfo`, `next-env.d.ts` (recriado com o conteúdo padrão do Next.js, pois é referenciado como arquivo literal em `tsconfig.json`).
**Próximo passo:** nenhuma pendência desta limpeza. `db_migrate.js`, `db_update.js`, `.vercel/`, `.env*` e todo `architecture/*.md` (POPs e logs de status) foram mantidos intencionalmente — ver `constitution.md`.
