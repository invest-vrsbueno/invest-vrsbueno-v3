# Constituição do Projeto: Dashboard de Investimentos (invest-vrsbueno-v3)

## Princípios
- Nunca disparar e-mails reais (alertas FGC/vencimento, Simulador Selic) sem confirmação explícita do usuário antes de cada envio.
- Nunca fazer deploy em produção (`vercel --prod`) sem antes mostrar/confirmar a mudança com o usuário.
- Mudança visual ou de cálculo significativa vai primeiro para uma rota de preview isolada (`/preview-vN`) com dados mock ou reais; só é aplicada na tela real após aprovação — depois o preview e a exceção correspondente em `src/proxy.ts` são removidos.
- Rodar `npx tsc --noEmit` limpo depois de qualquer mudança de código, antes de considerar a tarefa concluída.
- Tratar exposição de credenciais/write-access como preocupação padrão, não só quando pedido — revisar RLS e `.vercelignore`/`.gitignore` antes de qualquer deploy ou link enviado ao cliente.
- Duas sessões podem estar editando o repo ao mesmo tempo — sempre `git diff HEAD -- <arquivo>` antes de `git add` num arquivo compartilhado, para não commitar trabalho alheio sem querer.

## Stack e Restrições Técnicas
- Next.js 16.3.4 (App Router) — versão com convenções que quebram o que a maioria dos modelos "sabe" de treino. Consultar `node_modules/next/dist/docs/` antes de escrever qualquer código Next.js novo (ver `AGENTS.md`).
- Arquivo de proteção de rotas é `src/proxy.ts` (não `middleware.ts`, depreciado nesta versão) — nunca reintroduzir `middleware.ts`. Editar `src/proxy.ts` exige reiniciar o dev server manualmente (mudanças ali não são pegas por hot-reload).
- React 19.2.8, TypeScript 5, ESLint 9.
- Supabase (Postgres + Auth via `@supabase/ssr`, sessão em cookies) — projeto ref `cixtqtbyylzmgylvbwbz`.
- Deploy: Vercel (projeto `investvrsbueno-4177/invest-vrsbueno-v3`), GitHub privado `invest-vrsbueno/invest-vrsbueno-v3`.
- Bibliotecas de domínio: `recharts` (gráficos), `jspdf`/`jspdf-autotable` (PDF Selic), `nodemailer` (e-mails), `date-fns`, `react-grid-layout` (grid do dashboard).
- `vercel --prod` empacota o diretório de trabalho local inteiro (não só o commitado no git) — sempre checar `git status` e remover rotas `preview-vN`/exceções soltas em `proxy.ts` antes de rodar.

## Schema de Dados
### Entrada (linha da planilha `INVEST_R2`, após limpeza da coluna ATIVO)
```json
{
  "tipo": "CDB | LCA | LCI | LF",
  "emissor": "ORIGINAL (XP)",
  "indexador_tipo": "PRÉ | PÓS",
  "taxa": 17.36,
  "instituicao_agrupadora": "ORIGINAL",
  "valor_aplicado": 2723.03,
  "data_aplicacao": "2025-07-30",
  "data_vencimento": "2026-03-09"
}
```

### Saída (tabela `investimentos`, Supabase/Postgres — ver `architecture/supabase_schema.sql`)
```json
{
  "id": "uuid",
  "tipo": "varchar(10)",
  "emissor": "varchar(100)",
  "indexador_tipo": "varchar(10)",
  "taxa": "numeric(10,4)",
  "instituicao_agrupadora": "varchar(100)",
  "valor_aplicado": "numeric(15,2)",
  "data_aplicacao": "date",
  "data_vencimento": "date | null",
  "created_at": "timestamptz",
  "updated_at": "timestamptz"
}
```
RLS: leitura pública (`SELECT` anônimo permitido), escrita (`INSERT`/`UPDATE`/`DELETE`) restrita ao papel `authenticated`.

## Regras Comportamentais
- Nomenclatura de colunas de rendimento é contraintuitiva e já foi confirmada com o usuário — não renomear sem reconfirmar: "Rendimento Líquido (Sem IR)" é, na prática, o valor líquido de IR (Bruto − IR); "Posição Atual (Líquida)" = Posição Atual − IR.
- Limite FGC: R$ 250.000,00 de saldo/rendimento bruto por instituição financeira agrupadora — alerta visual ao atingir ou se aproximar do limite.
- IR usa tabela regressiva (22,5% / 20% / 17,5% / 15% por dias corridos); LCI/LCA são isentos (`aliquotaIR` em `src/utils/fgc.ts`).
- Nome padrão de investimento exibido: `${tipo} ${emissor} ${indexador_tipo} - ${taxa com 2 casas, vírgula}%` (ex.: `CDB Original (XP) PRÉ - 17,36%`) — hoje duplicado localmente em vários componentes, não extraído para util compartilhado.
- Simulador Selic assume sempre produto tributável (CDB) — não tem conceito de instituição/isenção real.
- Não testar o envio de e-mail (alertas ou Calculadora Selic) disparando de verdade, a menos que o usuário peça explicitamente.

## Invariantes Arquiteturais
- `src/proxy.ts` é o único ponto de proteção de rotas (Supabase Auth via cookies) — qualquer nova rota pública precisa de exceção explícita no `matcher`.
- RLS da tabela `investimentos`: nunca abrir escrita para `anon` — sempre `TO authenticated`.
- `.vercelignore` deve continuar excluindo `.env*`, `.tmp/`, `tools/`, `csv_antigo/`, `Referencia/`, `*.py`, `*.md` — revisar sempre que um novo arquivo sensível ou desnecessário for adicionado na raiz.
- Cálculo de posição/rendimento é sempre dinâmico (baseado no indexador/taxa/datas) — nunca reintroduzir dependência das colunas estáticas `HOJE`/`RENDIMENTO` da planilha original.
