# Plano de Etapas e Tarefas (task_plan.md)

## 📌 Objetivo Geral
Desenvolver e validar localmente um Dashboard de Investimentos baseado no Google Material Design 3 (M3), que leia os dados da planilha `INVEST_R2.xlsx` (ou migrados para banco de dados suportado pela Vercel) e apresente:
1. Resumo anual dos rendimentos.
2. Posição diária estimada de cada CDB/LCA/LCI.
3. Distribuição por Instituição (Banco).
4. Alerta de limite FGC (R$ 250 mil de rendimento bruto por instituição).

---

## 🎯 Fases do Projeto (Protocolo V.L.A.E.G.)

### Fase 1: V - Visão & Descoberta
- [x] Ler e internalizar diretrizes de `gemini.md` e `VLAEG.md`.
- [x] Criar arquivos de memória, planejamento e resumo de referência (`task_plan.md`, `findings.md`, `progress.md`).
- [x] Acesso à fonte de dados: Usuário forneceu arquivo `INVEST_R2.csv`.
- [x] Definir o JSON Data Schema oficial (Payload de Entrada e Saída) em `gemini.md`.
- [x] Resposta às 5 perguntas de descoberta V.L.A.E.G. pelo usuário.

### Fase 2: L - Link (Conectividade & Dados)
- [/] Ler e analisar arquivo `INVEST_R2.csv`.
- [ ] Testar leitura e parsing determinístico dos dados dos ativos (CDB, LCA, LCI).
- [ ] Criar scripts/módulos de parser para cálculo da posição diária estimada e rendimentos.

### Fase 3: A - Arquitetura (Construção das Camadas)
- [ ] Definir POPs na pasta `architecture/`.
- [ ] Estruturar regras de cálculo determinísticas (CDB Pré/Pós, LCA/LCI, CDI, limites FGC).
- [ ] Definir modelagem do banco de dados (ex: SQLite local / Postgres/Vercel Postgres/Supabase/Neon).

### Fase 4: E - Estilo (Frontend M3 Design System)
- [ ] Implementar Design System baseado em Material Design 3 (M3 - Google).
- [ ] Componentes M3: Cards, Top Bar, Navigation Drawer/Rail, Charts com paleta M3 e tema Dark/Light.
- [ ] Painéis de Resumo Anual, Posição Diária Estimada, Distribuição por Banco e Alerta FGC (R$ 250k).

### Fase 5: G - Gatilho & Validação Local
- [ ] Validação local completa do Dashboard.
- [ ] Documentação de deploy no `gemini.md` e finalização.
