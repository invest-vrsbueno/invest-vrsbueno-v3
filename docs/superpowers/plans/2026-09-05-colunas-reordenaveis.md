# Colunas Reordenáveis (Drag-and-Drop) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir arrastar o cabeçalho das colunas de valores (não a coluna de identidade) nos 3 cards "estilo planilha" do dashboard, com a ordem escolhida sincronizada no Supabase por usuário.

**Architecture:** Uma tabela nova (`user_column_prefs`) guarda a ordem por (usuário, card). Um hook (`useColumnOrder`) busca/salva essa ordem. Um módulo compartilhado (`DraggableColumns.tsx`) fornece os metadados de coluna reordenados, o estado de drag e o cabeçalho arrastável. Cada um dos 3 componentes de tabela passa a montar cabeçalho e células por um lookup `key → render` em vez de JSX posicional fixo, e recalcula `gridTemplateColumns` a partir da ordem atual — a largura viaja com a coluna.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript, Supabase (Postgres + `@supabase/ssr` client), drag-and-drop nativo HTML5 (sem lib nova), lucide-react (ícone `GripVertical`, já uma dependência do projeto).

**Spec:** [docs/superpowers/specs/2026-09-05-colunas-reordenaveis-design.md](../specs/2026-09-05-colunas-reordenaveis-design.md)

## Global Constraints

- Sem framework de teste automatizado neste projeto (`package.json` só tem `dev`/`build`/`start`/`lint`, sem `test`) — cada task usa `npx tsc --noEmit` como verificação de compilação e checagem manual no navegador (via `preview-v1`, atrás do login) como verificação funcional, no lugar de testes unitários.
- Nunca reintroduzir `middleware.ts` — proteção de rotas é só `src/proxy.ts`.
- Não abrir escrita da tabela nova para o papel `anon` — RLS sempre `TO authenticated`, filtrando por `auth.uid() = user_id`.
- Não fazer deploy (`vercel --prod`) nem rodar migração contra o Supabase de produção sem confirmação explícita do usuário — a migração SQL é entregue como arquivo para o usuário rodar manualmente.
- Mudança fica em `preview-v1` até aprovação do usuário; só depois é replicada nos componentes reais (nesse caso os componentes *são* os reais — `preview-v1` só monta os 3 cards à parte para facilitar o teste do drag, ver Task 8).

---

### Task 1: Migração SQL da tabela `user_column_prefs`

**Files:**
- Create: `architecture/migration_user_column_prefs.sql`

**Interfaces:**
- Produces: tabela `user_column_prefs(user_id uuid, card_key varchar(50), column_order text[], updated_at timestamptz)`, PK `(user_id, card_key)`, RLS restrita a `auth.uid() = user_id`. Todas as tasks seguintes que leem/gravam essa tabela dependem deste schema exato.

- [ ] **Step 1: Escrever o arquivo de migração**

```sql
-- Preferência de ordem de colunas por usuário, por card "estilo planilha" do dashboard.
-- card_key: 'distribuicao-instituicoes' | 'resumo-anual' | 'investimentos-a-vencer'
CREATE TABLE user_column_prefs (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_key VARCHAR(50) NOT NULL,
    column_order TEXT[] NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, card_key)
);

ALTER TABLE user_column_prefs ENABLE ROW LEVEL SECURITY;

-- Sem policy de leitura anônima — diferente de `investimentos`, aqui não há motivo
-- para expor a preferência de UI de um usuário para outro.
CREATE POLICY "Usuario le sua propria preferencia" ON user_column_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario grava sua propria preferencia" ON user_column_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario atualiza sua propria preferencia" ON user_column_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuario deleta sua propria preferencia" ON user_column_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

- [ ] **Step 2: Pedir para o usuário rodar no SQL editor do Supabase (projeto `cixtqtbyylzmgylvbwbz`) e confirmar sucesso**

Sem essa tabela, os Steps de fetch/save das próximas tasks falham silenciosamente (o hook cai no `defaultOrder` e o `saveColumnOrder` não lança erro visível — ver Task 3). Não seguir para a Task 8 (verificação no navegador) sem essa confirmação.

- [ ] **Step 3: Commit**

```bash
git add architecture/migration_user_column_prefs.sql
git commit -m "docs: adiciona migracao da tabela user_column_prefs"
```

---

### Task 2: `src/utils/columnPrefs.ts` — leitura/gravação da ordem no Supabase

**Files:**
- Create: `src/utils/columnPrefs.ts`

**Interfaces:**
- Consumes: `SupabaseClient` de `@supabase/supabase-js` (tipo já usado pelo projeto via `@supabase/ssr`).
- Produces: `type CardKey = 'distribuicao-instituicoes' | 'resumo-anual' | 'investimentos-a-vencer'`; `fetchColumnOrder(supabase, cardKey): Promise<string[] | null>`; `saveColumnOrder(supabase, cardKey, order: string[]): Promise<void>`. A Task 3 (`useColumnOrder`) consome as duas funções e o tipo `CardKey`.

- [ ] **Step 1: Escrever o arquivo**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type CardKey = 'distribuicao-instituicoes' | 'resumo-anual' | 'investimentos-a-vencer';

export async function fetchColumnOrder(supabase: SupabaseClient, cardKey: CardKey): Promise<string[] | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_column_prefs')
    .select('column_order')
    .eq('user_id', user.id)
    .eq('card_key', cardKey)
    .maybeSingle();

  if (error || !data) return null;
  return data.column_order as string[];
}

export async function saveColumnOrder(supabase: SupabaseClient, cardKey: CardKey, order: string[]): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  await supabase.from('user_column_prefs').upsert({
    user_id: user.id,
    card_key: cardKey,
    column_order: order,
    updated_at: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `columnPrefs.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/utils/columnPrefs.ts
git commit -m "feat: adiciona leitura/gravacao da ordem de colunas no Supabase"
```

---

### Task 3: `src/hooks/useColumnOrder.ts` — hook de estado + persistência

**Files:**
- Create: `src/hooks/useColumnOrder.ts`

**Interfaces:**
- Consumes: `createClient` de `../utils/supabase/client` (já existe, síncrono); `fetchColumnOrder`, `saveColumnOrder`, `CardKey` de `../utils/columnPrefs` (Task 2).
- Produces: `useColumnOrder(cardKey: CardKey, defaultOrder: string[]): { order: string[]; reorder: (next: string[]) => void }`. As Tasks 5, 6 e 7 (os 3 componentes) consomem esse hook.

- [ ] **Step 1: Escrever o arquivo**

```ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { fetchColumnOrder, saveColumnOrder, type CardKey } from '../utils/columnPrefs';

export function useColumnOrder(cardKey: CardKey, defaultOrder: string[]) {
  const [order, setOrderState] = useState<string[]>(defaultOrder);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let active = true;
    fetchColumnOrder(supabaseRef.current, cardKey).then((saved) => {
      if (!active || !saved) return;
      // Mantém só chaves ainda válidas e acrescenta no fim as que não existiam quando foi salvo.
      const known = saved.filter((k) => defaultOrder.includes(k));
      const missing = defaultOrder.filter((k) => !known.includes(k));
      setOrderState([...known, ...missing]);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey]);

  function reorder(newOrder: string[]) {
    setOrderState(newOrder);
    saveColumnOrder(supabaseRef.current, cardKey, newOrder);
  }

  return { order, reorder };
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `useColumnOrder.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useColumnOrder.ts
git commit -m "feat: adiciona hook useColumnOrder"
```

---

### Task 4: `src/components/DraggableColumns.tsx` — mecânica de drag compartilhada

**Files:**
- Create: `src/components/DraggableColumns.tsx`

**Interfaces:**
- Consumes: `GripVertical` de `lucide-react` (já uma dependência do projeto).
- Produces: `interface ColumnMeta { key: string; label: string; width: string }`; `orderedMeta(all: ColumnMeta[], order: string[]): ColumnMeta[]`; `useColumnDrag(order: string[], reorder: (next: string[]) => void): { draggedKey: string | null; onDragStart: (key: string) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (key: string) => void }`; `<DraggableHeaderCell col={ColumnMeta} isDragging={boolean} onDragStart={() => void} onDragOver={(e) => void} onDrop={() => void} style={React.CSSProperties} />`. As Tasks 5, 6 e 7 consomem os 4 exports.

- [ ] **Step 1: Escrever o arquivo**

```tsx
'use client';

import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

export interface ColumnMeta {
  key: string;
  label: string;
  width: string;
}

// Retorna os metadados de coluna na ordem atual, ignorando chaves desconhecidas
// (ex.: uma ordem salva antes de uma coluna nova ser adicionada ao card).
export function orderedMeta(all: ColumnMeta[], order: string[]): ColumnMeta[] {
  const byKey = Object.fromEntries(all.map((c) => [c.key, c]));
  return order.map((k) => byKey[k]).filter((c): c is ColumnMeta => Boolean(c));
}

export function useColumnDrag(order: string[], reorder: (next: string[]) => void) {
  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  function onDragStart(key: string) {
    setDraggedKey(key);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault(); // necessário para o onDrop disparar (regra do HTML5 drag-and-drop)
  }

  function onDrop(targetKey: string) {
    setDraggedKey((current) => {
      if (!current || current === targetKey) return null;
      const next = order.filter((k) => k !== current);
      next.splice(next.indexOf(targetKey), 0, current);
      reorder(next);
      return null;
    });
  }

  return { draggedKey, onDragStart, onDragOver, onDrop };
}

export function DraggableHeaderCell({
  col,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  style,
}: {
  col: ColumnMeta;
  isDragging: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <span
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title="Arraste para reordenar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '3px',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        ...style,
      }}
    >
      <GripVertical size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
      {col.label}
    </span>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `DraggableColumns.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/DraggableColumns.tsx
git commit -m "feat: adiciona mecanica compartilhada de drag-and-drop de colunas"
```

---

### Task 5: Refatorar `DistribuicaoInstituicoes.tsx`

**Files:**
- Modify: `src/components/DistribuicaoInstituicoes.tsx` (reescrita completa do arquivo)

**Interfaces:**
- Consumes: `useColumnOrder` (Task 3), `orderedMeta`/`useColumnDrag`/`DraggableHeaderCell`/`ColumnMeta` (Task 4), `LIMIT_FGC`/`InstituicaoFGC`/`InvestimentoFGC` (já existentes em `../utils/fgc`).
- Produces: nenhuma mudança na assinatura do componente exportado — mesmas props (`byInstArray`, `patrimonioTotal`, `CORES`, `datasPorInvestimento`) usadas hoje em `preview-v1/page.tsx` e (depois de aprovado) em `DashboardTopLayout.tsx`.

- [ ] **Step 1: Substituir o conteúdo do arquivo**

```tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LIMIT_FGC, type InstituicaoFGC, type InvestimentoFGC } from '../utils/fgc';
import { useColumnOrder } from '../hooks/useColumnOrder';
import { orderedMeta, useColumnDrag, DraggableHeaderCell, type ColumnMeta } from './DraggableColumns';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

function formatTaxa(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}

function formatDataBR(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function nomeInvestimento(invest: InvestimentoFGC) {
  return `${invest.tipo} ${invest.emissor} ${invest.indexador_tipo} - ${formatTaxa(invest.taxa)}%`;
}

// Escada de cores da Margem P/FGC, sobre o % do limite de R$ 250 mil já ocupado pelo saldo
// bruto da instituição (mesmo valor que hoje dispara o alerta de risco FGC no dashboard).
function corMargemFgc(percentualUsado: number): { bg: string; fg: string; label: string } {
  if (percentualUsado > 100) return { bg: '#fee2e2', fg: '#b91c1c', label: 'Estourado' };
  if (percentualUsado >= 85) return { bg: '#ffedd5', fg: '#c2410c', label: 'Perto do limite' };
  if (percentualUsado >= 60) return { bg: '#fef9c3', fg: '#a16207', label: 'Atenção' };
  return { bg: '#dcfce7', fg: '#15803d', label: 'Confortável' };
}

function investimentoVencido(dataVencimento: string | null): boolean {
  if (!dataVencimento) return false;
  const hojeISO = new Date().toISOString().slice(0, 10);
  return dataVencimento.slice(0, 10) < hojeISO;
}

const IDENTITY_WIDTH = '2fr';

const COLUMN_META: ColumnMeta[] = [
  { key: 'valorInvestido', label: 'Valor Investido', width: '1fr' },
  { key: 'projecaoBruta', label: 'Projeção Bruta', width: '1fr' },
  { key: 'projecaoLiquida', label: 'Projeção Líquida', width: '1fr' },
  { key: 'margemFgc', label: 'Margem P/FGC', width: '1fr' },
  { key: 'rendBruto', label: 'Rend. Bruto', width: '1fr' },
  { key: 'rendLiquido', label: 'Rend. Líquido', width: '1fr' },
  { key: 'posicaoAtual', label: 'Posição Atual', width: '1.3fr' },
  { key: 'posicaoAtualLiquida', label: 'Posição Atual (Líquida)', width: '1.3fr' },
  { key: 'percentual', label: '%', width: '0.6fr' },
  { key: 'dataInvest', label: 'Data do Invest.', width: '0.8fr' },
  { key: 'dataVencimento', label: 'Data do Vencimento', width: '0.8fr' },
];
const DEFAULT_ORDER = COLUMN_META.map((c) => c.key);

const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };
const colValLiquidoStyle: React.CSSProperties = { ...colValStyle, color: '#00a693', fontWeight: 800 };
const colValMutedStyle: React.CSSProperties = { ...colValStyle, fontWeight: 500, color: '#8b8fa8' };

type DatasPorInvestimento = Record<string, { dataAplicacao: string; dataVencimento: string | null }>;

function renderInstCell(key: string, inst: InstituicaoFGC, percentualInst: number, corFgc: { bg: string; fg: string; label: string }): React.ReactNode {
  switch (key) {
    case 'valorInvestido':
      return <span style={colValStyle}>{formatBRL(inst.valorAplicado)}</span>;
    case 'projecaoBruta':
      return <span style={colValStyle}>{formatBRL(inst.projecaoBruta)}</span>;
    case 'projecaoLiquida':
      return <span style={colValLiquidoStyle}>{formatBRL(inst.projecaoLiquida)}</span>;
    case 'margemFgc':
      return (
        <span style={{ textAlign: 'right', padding: '0 4px' }}>
          <span
            style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: corFgc.bg, color: corFgc.fg, whiteSpace: 'nowrap' }}
            title={corFgc.label}
          >
            {formatBRL(inst.margemFgc)}
          </span>
        </span>
      );
    case 'rendBruto':
      return <span style={colValStyle}>{formatBRL(inst.rendimentoBruto)}</span>;
    case 'rendLiquido':
      return <span style={colValLiquidoStyle}>{formatBRL(inst.rendimentoLiquidoSemIR)}</span>;
    case 'posicaoAtual':
      return <span style={colValStyle}>{formatBRL(inst.value)}</span>;
    case 'posicaoAtualLiquida':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.85rem' }}>{formatBRL(inst.posicaoAtualLiquida)}</span>;
    case 'percentual':
      return <span style={colValStyle}>{percentualInst.toFixed(0)}%</span>;
    case 'dataInvest':
    case 'dataVencimento':
      return <span style={colValMutedStyle}>—</span>;
    default:
      return null;
  }
}

function renderInvestCell(
  key: string,
  invest: InvestimentoFGC,
  percentualInvest: number,
  datas: { dataAplicacao: string; dataVencimento: string | null } | undefined,
): React.ReactNode {
  switch (key) {
    case 'valorInvestido':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.valorAplicado)}</span>;
    case 'projecaoBruta':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.projecaoBruta)}</span>;
    case 'projecaoLiquida':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.75rem' }}>{formatBRL(invest.projecaoLiquida)}</span>;
    case 'margemFgc':
      return <span style={{ ...colValMutedStyle, fontSize: '0.75rem' }}>—</span>;
    case 'rendBruto':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.rendimentoBruto)}</span>;
    case 'rendLiquido':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.75rem' }}>{formatBRL(invest.rendimentoLiquidoSemIR)}</span>;
    case 'posicaoAtual':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{formatBRL(invest.posicaoHoje)}</span>;
    case 'posicaoAtualLiquida':
      return <span style={{ ...colValLiquidoStyle, fontSize: '0.75rem' }}>{formatBRL(invest.posicaoAtualLiquida)}</span>;
    case 'percentual':
      return <span style={{ ...colValStyle, fontWeight: 500, fontSize: '0.75rem' }}>{percentualInvest.toFixed(1)}%</span>;
    case 'dataInvest':
      return <span style={{ ...colValMutedStyle, fontSize: '0.75rem' }}>{formatDataBR(datas?.dataAplicacao ?? null)}</span>;
    case 'dataVencimento':
      return <span style={{ ...colValMutedStyle, fontSize: '0.75rem' }}>{formatDataBR(datas?.dataVencimento ?? null)}</span>;
    default:
      return null;
  }
}

export function DistribuicaoInstituicoes({ byInstArray, patrimonioTotal, CORES, datasPorInvestimento }: { byInstArray: InstituicaoFGC[]; patrimonioTotal: number; CORES: string[]; datasPorInvestimento: DatasPorInvestimento }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const { order, reorder } = useColumnOrder('distribuicao-instituicoes', DEFAULT_ORDER);
  const cols = orderedMeta(COLUMN_META, order);
  const { draggedKey, onDragStart, onDragOver, onDrop } = useColumnDrag(order, reorder);
  const gridCols = `${IDENTITY_WIDTH} ${cols.map((c) => c.width).join(' ')}`;

  return (
    <div style={{ padding: '0 16px', overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
      <div style={{ minWidth: '1360px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '8px 4px', borderBottom: '2px solid #e2e4f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase' }}>Instituição</span>
          {cols.map((col) => (
            <DraggableHeaderCell
              key={col.key}
              col={col}
              isDragging={draggedKey === col.key}
              onDragStart={() => onDragStart(col.key)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(col.key)}
              style={colHeaderStyle}
            />
          ))}
        </div>

        {byInstArray.map((inst, i) => {
          const isOpen = aberto === inst.name;
          const percentualInst = (inst.value / patrimonioTotal) * 100;
          const percentualFgc = (inst.value / LIMIT_FGC) * 100;
          const corFgc = corMargemFgc(percentualFgc);
          return (
            <div key={inst.name}>
              <div
                onClick={() => setAberto(isOpen ? null : inst.name)}
                style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '12px 4px', borderBottom: '1px solid #e2e4f0', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '50%', backgroundColor: CORES[i % CORES.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                    {inst.name.substring(0, 2)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inst.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>{percentualInst.toFixed(0)}% do portfólio</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color="#8b8fa8" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#8b8fa8" style={{ flexShrink: 0 }} />}
                </div>
                {cols.map((col) => (
                  <React.Fragment key={col.key}>{renderInstCell(col.key, inst, percentualInst, corFgc)}</React.Fragment>
                ))}
              </div>

              {isOpen && inst.investimentos.map((invest) => {
                const datas = datasPorInvestimento[invest.id];
                const percentualInvest = (invest.posicaoHoje / patrimonioTotal) * 100;
                const vencido = investimentoVencido(datas?.dataVencimento ?? null);
                return (
                  <div
                    key={invest.id}
                    style={{
                      display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '8px 4px',
                      borderBottom: '1px solid #e2e4f0',
                      background: vencido ? '#fee2e2' : '#f8f9fc',
                      borderLeft: vencido ? '3px solid #ef4444' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '15px', minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nomeInvestimento(invest)}
                      </span>
                      {vencido && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#ef4444', color: '#fff', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          Ativo Vencido
                        </span>
                      )}
                    </div>
                    {cols.map((col) => (
                      <React.Fragment key={col.key}>{renderInvestCell(col.key, invest, percentualInvest, datas)}</React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual no navegador**

Com o servidor de dev rodando (`npm run dev`) e logado, abrir `/preview-v1`, arrastar 2-3 cabeçalhos de coluna (ex.: mover "Margem P/FGC" para o início) e confirmar: a ordem muda visualmente, as larguras continuam corretas (nada cortado), o valor de "Margem P/FGC" some ("—") ao expandir uma instituição, e o destaque de "Ativo Vencido" (se houver algum) continua funcionando. Recarregar a página e confirmar que a ordem escolhida persiste (prova de que o Supabase gravou e o hook releu).

- [ ] **Step 4: Commit**

```bash
git add src/components/DistribuicaoInstituicoes.tsx
git commit -m "feat: colunas arrastaveis em Distribuicao por Instituicao"
```

---

### Task 6: Refatorar `InvestimentosAVencerV3.tsx`

**Files:**
- Modify: `src/components/InvestimentosAVencerV3.tsx` (reescrita completa do arquivo)

**Interfaces:**
- Consumes: `useColumnOrder` (Task 3), `orderedMeta`/`useColumnDrag`/`DraggableHeaderCell`/`ColumnMeta` (Task 4).
- Produces: nenhuma mudança na assinatura do componente exportado — mesma prop (`investimentos: InvestimentoVencendo[]`).

- [ ] **Step 1: Substituir o conteúdo do arquivo**

```tsx
'use client';

import React, { useMemo, useState } from 'react';
import type { InvestimentoVencendo } from '../utils/vencimento';
import { useColumnOrder } from '../hooks/useColumnOrder';
import { orderedMeta, useColumnDrag, DraggableHeaderCell, type ColumnMeta } from './DraggableColumns';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

function formatDataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatTaxa(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}

function nomeInvestimento(inv: InvestimentoVencendo) {
  return `${inv.tipo} ${inv.emissor} ${inv.indexador_tipo} - ${formatTaxa(inv.taxa)}%`;
}

const inputDateStyle: React.CSSProperties = { flex: 1, padding: '6px 8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e2e4f0', color: '#1a1d27', background: '#fff' };
const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };
const colValLiquidoStyle: React.CSSProperties = { ...colValStyle, color: '#00a693', fontWeight: 800 };

const IDENTITY_WIDTH = '2fr';
const COLUMN_META: ColumnMeta[] = [
  { key: 'rendBruto', label: 'Rend. Bruto', width: '1fr' },
  { key: 'rendLiquido', label: 'Rend. Líquido', width: '1fr' },
];
const DEFAULT_ORDER = COLUMN_META.map((c) => c.key);

function renderCell(key: string, inv: InvestimentoVencendo): React.ReactNode {
  switch (key) {
    case 'rendBruto':
      return <span style={colValStyle}>{formatBRL(inv.rendimentoBruto)}</span>;
    case 'rendLiquido':
      return <span style={colValLiquidoStyle}>{formatBRL(inv.rendimentoLiquido)}</span>;
    default:
      return null;
  }
}

export function InvestimentosAVencerV3({ investimentos }: { investimentos: InvestimentoVencendo[] }) {
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const { order, reorder } = useColumnOrder('investimentos-a-vencer', DEFAULT_ORDER);
  const cols = orderedMeta(COLUMN_META, order);
  const { draggedKey, onDragStart, onDragOver, onDrop } = useColumnDrag(order, reorder);
  const gridCols = `${IDENTITY_WIDTH} ${cols.map((c) => c.width).join(' ')}`;

  const filtrados = useMemo(() => {
    const futuros = investimentos.filter((i) => i.diasRestantes >= 0);
    return futuros
      .filter((i) => !dataInicial || i.data_vencimento.slice(0, 10) >= dataInicial)
      .filter((i) => !dataFinal || i.data_vencimento.slice(0, 10) <= dataFinal)
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [investimentos, dataInicial, dataFinal]);

  return (
    <>
      <div style={{ padding: '0 16px', marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} style={inputDateStyle} />
        <span style={{ color: '#8b8fa8', fontSize: '0.75rem' }}>até</span>
        <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} style={inputDateStyle} />
      </div>

      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '8px 4px', borderBottom: '2px solid #e2e4f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase' }}>Investimento</span>
          {cols.map((col) => (
            <DraggableHeaderCell
              key={col.key}
              col={col}
              isDragging={draggedKey === col.key}
              onDragStart={() => onDragStart(col.key)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(col.key)}
              style={colHeaderStyle}
            />
          ))}
        </div>

        {filtrados.length === 0 && (
          <div style={{ fontSize: '0.8rem', color: '#8b8fa8', padding: '16px 4px' }}>Nenhum investimento vencendo neste período.</div>
        )}

        {filtrados.map((inv) => (
          <div
            key={inv.id}
            style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #e2e4f0' }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nomeInvestimento(inv)}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>vence em {formatDataBR(inv.data_vencimento)}</div>
            </div>
            {cols.map((col) => (
              <React.Fragment key={col.key}>{renderCell(col.key, inv)}</React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual no navegador**

Em `/preview-v1`, arrastar o cabeçalho "Rend. Líquido" para antes de "Rend. Bruto" no card de Investimentos a Vencer e confirmar que a coluna troca de posição e o valor continua correto (teal/negrito).

- [ ] **Step 4: Commit**

```bash
git add src/components/InvestimentosAVencerV3.tsx
git commit -m "feat: colunas arrastaveis em Investimentos a Vencer"
```

---

### Task 7: Refatorar `ResumoAnualChartV2.tsx`

**Files:**
- Modify: `src/components/ResumoAnualChartV2.tsx` (reescrita completa do arquivo)

**Interfaces:**
- Consumes: `useColumnOrder` (Task 3), `orderedMeta`/`useColumnDrag`/`DraggableHeaderCell`/`ColumnMeta` (Task 4).
- Produces: nenhuma mudança na assinatura do componente exportado — mesmas props (`barData`, `anoVencimentoArray`, `formatBRL`).

- [ ] **Step 1: Substituir o conteúdo do arquivo**

```tsx
'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, XAxis, Tooltip, Bar, Legend } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AnoVencimento, InvestimentoAno } from '../utils/vencimento';
import { useColumnOrder } from '../hooks/useColumnOrder';
import { orderedMeta, useColumnDrag, DraggableHeaderCell, type ColumnMeta } from './DraggableColumns';

const colHeaderStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase', padding: '0 4px' };
const colValStyle: React.CSSProperties = { textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px', whiteSpace: 'nowrap' };
const colValLiquidoStyle: React.CSSProperties = { ...colValStyle, color: '#00a693', fontWeight: 800 };

function formatDataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatTaxa(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}

function nomeInvestimento(invest: InvestimentoAno) {
  return `${invest.tipo} ${invest.emissor} ${invest.indexador_tipo} - ${formatTaxa(invest.taxa)}%`;
}

const IDENTITY_WIDTH = '1.6fr';
const COLUMN_META: ColumnMeta[] = [
  { key: 'venceBruto', label: 'Vence Bruto', width: '1fr' },
  { key: 'venceLiquido', label: 'Vence Líquido', width: '1fr' },
];
const DEFAULT_ORDER = COLUMN_META.map((c) => c.key);

function renderValueCell(key: string, bruto: number, liquido: number, extraBruto: React.CSSProperties | undefined, extraLiquido: React.CSSProperties | undefined, formatBRL: (v: number) => string): React.ReactNode {
  switch (key) {
    case 'venceBruto':
      return <span style={{ ...colValStyle, ...extraBruto }}>{formatBRL(bruto)}</span>;
    case 'venceLiquido':
      return <span style={{ ...colValLiquidoStyle, ...extraLiquido }}>{formatBRL(liquido)}</span>;
    default:
      return null;
  }
}

export function ResumoAnualChartV2({ barData, anoVencimentoArray, formatBRL }: { barData: any[]; anoVencimentoArray: AnoVencimento[]; formatBRL: (v: number) => string }) {
  const [anoAberto, setAnoAberto] = useState<string | null>(null);
  const [instAberta, setInstAberta] = useState<string | null>(null);
  const { order, reorder } = useColumnOrder('resumo-anual', DEFAULT_ORDER);
  const cols = orderedMeta(COLUMN_META, order);
  const { draggedKey, onDragStart, onDragOver, onDrop } = useColumnDrag(order, reorder);
  const gridCols = `${IDENTITY_WIDTH} ${cols.map((c) => c.width).join(' ')}`;

  return (
    <>
      <div style={{ padding: '20px 20px 0', height: '220px', flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} barGap={0} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b8fa8' }} axisLine={{ stroke: '#e2e4f0' }} tickLine={false} />
            <Tooltip cursor={{ fill: 'transparent' }} formatter={(val: any) => formatBRL(Number(val))} />
            <Bar dataKey="vence" fill="#00bfa5" radius={[2, 2, 0, 0]} name="Vence no Ano" />
            <Bar dataKey="gerado" fill="#6c63ff" radius={[2, 2, 0, 0]} name="Gerado no Ano" />
            <Legend iconType="square" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', padding: '8px 4px', borderBottom: '2px solid #e2e4f0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8b8fa8', textTransform: 'uppercase' }}>Ano</span>
          {cols.map((col) => (
            <DraggableHeaderCell
              key={col.key}
              col={col}
              isDragging={draggedKey === col.key}
              onDragStart={() => onDragStart(col.key)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(col.key)}
              style={colHeaderStyle}
            />
          ))}
        </div>

        {anoVencimentoArray.map((ano) => {
          const anoIsOpen = anoAberto === ano.name;
          return (
            <div key={ano.name}>
              <div
                onClick={() => { setAnoAberto(anoIsOpen ? null : ano.name); setInstAberta(null); }}
                style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '10px 4px', borderBottom: '1px solid #e2e4f0', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#00bfa5', fontWeight: 700, fontSize: '0.85rem' }}>{ano.name}</span>
                  {anoIsOpen ? <ChevronUp size={16} color="#8b8fa8" /> : <ChevronDown size={16} color="#8b8fa8" />}
                </div>
                {cols.map((col) => (
                  <React.Fragment key={col.key}>{renderValueCell(col.key, ano.venceBruto, ano.venceLiquido, undefined, undefined, formatBRL)}</React.Fragment>
                ))}
              </div>

              {anoIsOpen && ano.instituicoes.map((inst) => {
                const instIsOpen = instAberta === `${ano.name}-${inst.name}`;
                return (
                  <div key={inst.name}>
                    <div
                      onClick={() => setInstAberta(instIsOpen ? null : `${ano.name}-${inst.name}`)}
                      style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #e2e4f0', background: '#f8f9fc', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a1d27' }}>{inst.name}</span>
                        {instIsOpen ? <ChevronUp size={14} color="#8b8fa8" /> : <ChevronDown size={14} color="#8b8fa8" />}
                      </div>
                      {cols.map((col) => (
                        <React.Fragment key={col.key}>{renderValueCell(col.key, inst.venceBruto, inst.venceLiquido, { fontSize: '0.78rem' }, { fontSize: '0.78rem' }, formatBRL)}</React.Fragment>
                      ))}
                    </div>

                    {instIsOpen && inst.investimentos.map((invest) => (
                      <div
                        key={invest.id}
                        style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '4px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #e2e4f0', background: '#f0f1f7' }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '15px', borderLeft: '2px solid #d1d5db', marginLeft: '24px', minWidth: 0 }}>
                          <span style={{ fontSize: '0.72rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nomeInvestimento(invest)}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#8b8fa8', marginTop: '1px' }}>vence em {formatDataBR(invest.data_vencimento)}</span>
                        </div>
                        {cols.map((col) => (
                          <React.Fragment key={col.key}>{renderValueCell(col.key, invest.venceBruto, invest.venceLiquido, { fontWeight: 500, fontSize: '0.72rem' }, { fontWeight: 700, fontSize: '0.72rem' }, formatBRL)}</React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual no navegador**

Em `/preview-v1`, expandir um ano e uma instituição, arrastar "Vence Líquido" para antes de "Vence Bruto" e confirmar que a troca se reflete nos 3 níveis (ano, instituição, investimento) ao mesmo tempo.

- [ ] **Step 4: Commit**

```bash
git add src/components/ResumoAnualChartV2.tsx
git commit -m "feat: colunas arrastaveis em Resumo Anual"
```

---

### Task 8: Expandir `preview-v1` para os 3 cards e verificação final

**Files:**
- Modify: `src/app/preview-v1/page.tsx` (reescrita completa do arquivo)

**Interfaces:**
- Consumes: `DistribuicaoInstituicoes` (Task 5), `InvestimentosAVencerV3` (Task 6), `ResumoAnualChartV2` (Task 7), mais `investimentosPorVencimento`/`agruparPorAnoVencimento` de `../../utils/vencimento` (já existentes, mesmos usados em `DashboardClient.tsx`).
- Produces: nada consumido por outra task — é a página final de verificação manual.

- [ ] **Step 1: Substituir o conteúdo do arquivo**

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '../../utils/supabase/server';
import { calculateAsset } from '../../utils/finance';
import { agruparPorInstituicaoFGC } from '../../utils/fgc';
import { investimentosPorVencimento, agruparPorAnoVencimento } from '../../utils/vencimento';
import { DistribuicaoInstituicoes } from '../../components/DistribuicaoInstituicoes';
import { InvestimentosAVencerV3 } from '../../components/InvestimentosAVencerV3';
import { ResumoAnualChartV2 } from '../../components/ResumoAnualChartV2';

const CORES = ["#00bfa5", "#6c63ff", "#f97316", "#3b82f6", "#ec4899", "#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

async function getInvestimentos() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return [];
  const endpoint = `${url}/rest/v1/investimentos?select=*&order=data_vencimento.asc.nullsfirst`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

// Preview isolado (ver constitution.md) das colunas novas (Projeção Bruta/Líquida, Margem
// P/FGC, destaque de ativo vencido) + colunas arrastáveis nos 3 cards estilo planilha.
// Remover esta pasta assim que o cliente aprovar e a mudança já estiver replicada no dashboard real.
export default async function PreviewV1Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const TODAY = new Date();
  const rawInvestimentos = await getInvestimentos();
  const data = rawInvestimentos.map((item: any) => calculateAsset(item, TODAY));
  const patrimonioTotal = data.reduce((acc: number, obj: any) => acc + obj.posicaoHoje, 0);
  const byInstArray = agruparPorInstituicaoFGC(data, TODAY);

  const datasPorInvestimento: Record<string, { dataAplicacao: string; dataVencimento: string | null }> = {};
  for (const obj of data) {
    datasPorInvestimento[obj.id] = { dataAplicacao: obj.data_aplicacao, dataVencimento: obj.data_vencimento };
  }

  const investimentosVencendo = investimentosPorVencimento(data, TODAY);
  const anoVencimentoArray = agruparPorAnoVencimento(data);
  const byYear = data.reduce((acc: any, obj: any) => {
    const y = obj.anoVencimento || 2026;
    if (!acc[y]) acc[y] = { name: String(y), vence: 0, gerado: 0 };
    acc[y].vence += obj.projetadoVencimento;
    acc[y].gerado += (obj.projetadoVencimento - obj.aplicado);
    return acc;
  }, {});
  const barData = Object.values(byYear).sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));

  const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', maxHeight: '70vh', marginBottom: '24px' };

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f9', padding: '32px 16px' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', fontWeight: 700, marginBottom: '4px' }}>
          Preview v1 — Colunas novas + colunas arrastáveis
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '20px' }}>
          Arraste o cabeçalho de qualquer coluna de valor para reordenar. A ordem é salva por usuário no Supabase.
        </p>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, padding: '16px 16px 0' }}>Distribuição por Instituição</h2>
          <DistribuicaoInstituicoes byInstArray={byInstArray} patrimonioTotal={patrimonioTotal} CORES={CORES} datasPorInvestimento={datasPorInvestimento} />
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, padding: '16px 16px 0' }}>Resumo Anual</h2>
          <ResumoAnualChartV2 barData={barData} anoVencimentoArray={anoVencimentoArray} formatBRL={formatBRL} />
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, padding: '16px 16px 0' }}>Investimentos a Vencer</h2>
          <InvestimentosAVencerV3 investimentos={investimentosVencendo} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual final no navegador**

Abrir `/preview-v1` logado, testar drag em pelo menos uma coluna de cada um dos 3 cards, recarregar a página e confirmar que todas as 3 ordens persistiram. Tirar um screenshot de cada card para mostrar ao usuário.

- [ ] **Step 4: Commit**

```bash
git add src/app/preview-v1/page.tsx
git commit -m "feat: preview-v1 mostra os 3 cards com colunas arrastaveis"
```

---

### Task 9 (só depois da aprovação do usuário): Aplicar no dashboard real e remover o preview

**Files:**
- Nenhuma mudança adicional nos 3 componentes (já são os componentes reais, usados hoje em `DashboardTopLayout.tsx` — a Task 5/6/7 já é a mudança "real").
- Delete: `src/app/preview-v1/`

**Interfaces:** nenhuma.

- [ ] **Step 1: Confirmar com o usuário que o preview foi aprovado**
- [ ] **Step 2: Remover a pasta `src/app/preview-v1/`**

```bash
git rm -r src/app/preview-v1
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove preview-v1 apos aprovacao"
```
