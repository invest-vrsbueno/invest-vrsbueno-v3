# Design: Colunas reordenáveis (drag-and-drop) nos cards estilo planilha

Data: 2026-09-05

## Contexto e motivação

O dashboard tem 3 cards "estilo planilha" com colunas fixas via `gridTemplateColumns`:
- `src/components/DistribuicaoInstituicoes.tsx` (Distribuição por Instituição)
- `src/components/ResumoAnualChartV2.tsx` (Resumo Anual)
- `src/components/InvestimentosAVencerV3.tsx` (Investimentos a Vencer)

O usuário quer poder arrastar o cabeçalho de uma coluna para trocar sua posição, com a ordem escolhida sincronizada no Supabase (por usuário, entre dispositivos/navegadores).

## Decisões já confirmadas com o usuário

- Interação: arrastar o cabeçalho da coluna (drag nativo HTML5, sem lib nova como `@dnd-kit`).
- Persistência: Supabase, por usuário (não localStorage).
- A primeira coluna de cada card (Instituição / Ano / Investimento) fica sempre fixa na 1ª posição — só as colunas de valores são reordenáveis.
- Mecanismo técnico: **não** usar só a propriedade CSS `order` (isso reordena a posição visual mas não move a largura da coluna junto — uma coluna larga cairia numa faixa estreita e ficaria cortada). Em vez disso, cada card passa a montar cabeçalho e células a partir de um array de definição de colunas (`ColumnDef`), e o `gridTemplateColumns` é recalculado a partir da ordem atual — a largura viaja junto com a coluna.

## Schema Supabase (tabela nova)

```sql
CREATE TABLE user_column_prefs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_key VARCHAR(50) NOT NULL,
    column_order TEXT[] NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, card_key)
);

ALTER TABLE user_column_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario le sua propria preferencia" ON user_column_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario grava sua propria preferencia" ON user_column_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario atualiza sua propria preferencia" ON user_column_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario deleta sua propria preferencia" ON user_column_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

Sem policy de leitura anônima (diferente de `investimentos`) — não há motivo para expor preferência de UI de outro usuário. `card_key` values: `distribuicao-instituicoes`, `resumo-anual`, `investimentos-a-vencer`. Uma linha por (usuário, card).

Esse SQL precisa ser rodado manualmente pelo usuário no SQL editor do Supabase (projeto `cixtqtbyylzmgylvbwbz`) — não temos ferramenta de execução direta contra o banco nesta sessão.

## Mecanismo compartilhado (client-side)

- `src/utils/columnPrefs.ts` — `fetchColumnOrder(supabase, cardKey)` / `saveColumnOrder(supabase, cardKey, order)`, wrappers finos sobre `supabase.from('user_column_prefs')`, mesmo padrão direto-do-cliente já usado em `AtivosClient.tsx` (sem rota de API nova).
- `src/hooks/useColumnOrder.ts` — hook `useColumnOrder(cardKey, defaultOrder): { order, reorder }`. Busca a ordem salva no mount; se não houver (ou tiver chaves desatualizadas), cai no `defaultOrder`, preservando chaves conhecidas e acrescentando no fim quaisquer colunas novas que não existiam quando foi salvo. `reorder(novaOrdem)` atualiza o estado local (otimista) e grava em background.
- `src/components/DraggableColumns.tsx` — genérico, reusado pelos 3 cards:
  - `type ColumnDef<T> = { key: string; label: string; width: string; render: (row: T) => ReactNode }`
  - `orderedColumns(columns, order)` — ordena o array de definição pela ordem atual.
  - `useColumnDrag(order, reorder)` — estado do drag (`draggedKey`) + handlers `onDragStart/onDragOver/onDrop` que fazem splice+insert no array de chaves.
  - `<DraggableHeaderCell>` — `<span draggable>` com ícone de grip (`GripVertical` do lucide-react, já usado no projeto), reaproveitando o estilo de cabeçalho existente (`colHeaderStyle`).

## Refatoração por componente

Em cada arquivo: a coluna de identidade (nome) continua exatamente como está hoje (JSX fixo, não entra no array reordenável). As demais colunas passam a ter uma "chave" estável, e cabeçalho + valores (em todos os níveis de expansão) são montados por um lookup `key → render` em vez de JSX posicional fixo. `gridTemplateColumns` passa a ser `\`${larguraIdentidade} ${cols.map(c => c.width).join(' ')}\``, recalculado a cada reorder.

**DistribuicaoInstituicoes.tsx** — identidade "Instituição" (2fr, fixa). Colunas reordenáveis (ordem padrão = ordem atual):
| key | label | largura |
|---|---|---|
| valorInvestido | Valor Investido | 1fr |
| projecaoBruta | Projeção Bruta | 1fr |
| projecaoLiquida | Projeção Líquida | 1fr |
| margemFgc | Margem P/FGC | 1fr |
| rendBruto | Rend. Bruto | 1fr |
| rendLiquido | Rend. Líquido | 1fr |
| posicaoAtual | Posição Atual | 1.3fr |
| posicaoAtualLiquida | Posição Atual (Líquida) | 1.3fr |
| percentual | % | 0.6fr |
| dataInvest | Data do Invest. | 0.8fr |
| dataVencimento | Data do Vencimento | 0.8fr |

`margemFgc` continua só na linha do banco ("—" na linha de investimento); `dataInvest`/`dataVencimento` continuam "—" na linha do banco. Isso não muda — é lógica de conteúdo, não de posição.

**ResumoAnualChartV2.tsx** — identidade "Ano" (1.6fr, fixa). Colunas reordenáveis: `venceBruto` (Vence Bruto, 1fr), `venceLiquido` (Vence Líquido, 1fr). Aplica-se aos 3 níveis (ano/instituição/investimento) que já compartilham as mesmas 3 colunas.

**InvestimentosAVencerV3.tsx** — identidade "Investimento" (2fr, fixa). Colunas reordenáveis: `rendBruto` (Rend. Bruto, 1fr), `rendLiquido` (Rend. Líquido, 1fr).

## Preview

`src/app/preview-v1/page.tsx` (já existe, criado para as colunas de FGC) passa a montar os 3 cards com dados reais, atrás do login existente, para testar o drag em cada um. Removido junto com a pasta inteira depois da aprovação final (nenhuma exceção foi aberta em `src/proxy.ts` para essa rota).

## Fora de escopo

- Ocultar/mostrar colunas (só reordenar).
- Suporte a touch/mobile refinado para o drag (fica com o comportamento padrão do HTML5 drag, que é limitado em touch — aceitável para uso interno, revisitar se virar problema real).
- Migrar `investimentos` ou qualquer tabela existente — só uma tabela nova, isolada.
