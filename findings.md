# Resumo de Referência & Descobertas (findings.md)

## 🎨 Diretrizes de Design: Google Material 3 (M3)
Referência: https://m3.material.io

### Princípios Fundamentais M3:
1. **Dynamic Color & System Tokens:**
   - Utilizar tokens de cor semânticos (`primary`, `onPrimary`, `surface`, `onSurface`, `error`, `outline`, etc.).
   - Suporte nativo a Tema Claro (Light Mode) e Tema Escuro (Dark Mode).
2. **Tipografia (M3 Type Scale):**
   - Display (Large, Medium, Small)
   - Headline (Large, Medium, Small)
   - Title (Large, Medium, Small)
   - Body (Large, Medium, Small)
   - Label (Large, Medium, Small)
   - Fonte recomendada: Roboto, Google Sans ou Inter.
3. **Componentes Padrão M3:**
   - **Cards:** Elevated, Filled, Outlined para exibição de ativos e alertas.
   - **Top App Bar & Navigation:** Estrutura clara de navegação.
   - **Badges / Chips:** Alertas de limite do FGC (ex: < R$250k = Verde/OK, >= R$250k = Alerta Amarelo/Vermelho).
   - **Charts:** Gráficos responsivos alinhados aos tokens de cor M3.

---

## 📊 Fonte de Dados & Restrições

- **Link da Planilha:** `https://docs.google.com/spreadsheets/d/1sEKSj5AwNuNXCjjkAVHo-wM6TWhCPDU3Xl22hi3_fJc/edit?gid=0#gid=0`
- **Status do Acesso:** Exige autenticação / login Google na URL direta de edição.
- **Solução Recomendada:** 
  1. Baixar o arquivo `INVEST_R2.xlsx` e colocá-lo na pasta raiz do projeto.
  2. Ou publicar a planilha na web (`Arquivo -> Compartilhar -> Publicar na Web -> CSV/XLSX`).

### Estrutura das Colunas (`Planilha1`, A–I):
| Coluna | Campo | Tipo | Descrição |
|---|---|---|---|
| A | ATIVO | Texto | Contém tipo (CDB/LCA/LCI), banco, indexador e taxa (ex: `CDB - ORIGINAL (XP) - Pré-Fixado - 17.36%`) |
| B | INSTITUIÇÃO | Texto | Nome da instituição emissora (ex: Banco Original) |
| C | APLICADO | Decimal | Valor principal aplicado |
| D | HOJE | Decimal | Valor estático (histórico - não usar como fonte da verdade) |
| E | RENDIMENTO | Decimal | Valor projetado no vencimento estático (não usar como fonte da verdade) |
| F | LÍQUIDO | Decimal | Rendimento líquido estático |
| G | DATA | Data | Data de aplicação |
| H | VENC | Data | Data de vencimento |
| I | ANO | Número | Ano do vencimento |

---

## ⚠️ Regras de Negócio e Invariantes
1. **Posição Diária Estimada:** Deve ser calculada dinamicamente via lógica determinística (não via colunas estáticas `HOJE`/`RENDIMENTO`).
2. **Limite FGC:** R$ 250.000,00 de saldo/rendimento bruto por Instituição financeira. Exibir alertas visuais quando o montante acumulado por instituição atingir ou se aproximar desse limite.

---

## 2026-09-04 — Migração para o Protocolo Spec-Driven
**Fonte:** `spec-driven.md` fornecido pelo usuário, substitui o Protocolo V.L.A.E.G. (`VLAEG.md`)
**Descoberta:** O projeto já tinha um ciclo equivalente (V.L.A.E.G.) com `gemini.md` como constituição e `VLAEG.md` como protocolo, mas ficou desatualizado — `task_plan.md` ainda descrevia a Fase 2 (parsing do CSV) como em andamento, enquanto o projeto já está em produção com CRUD, autenticação, alertas por e-mail e Simulador Selic.
**Impacto no projeto:** Conteúdo de `gemini.md` (schema de dados, regras de negócio) foi absorvido em `constitution.md`. `gemini.md` e `VLAEG.md` foram removidos por ficarem redundantes. `task_plan.md` foi reescrito para refletir o estado real do projeto.
