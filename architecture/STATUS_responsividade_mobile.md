# Status — Responsividade Mobile/Tablet/Desktop (CONCLUÍDA)

**Data:** 2026-09-03
**Referência de design:** [architecture/materialdesign.md](materialdesign.md) — leia esse arquivo
primeiro se for mexer em qualquer breakpoint/grid/spacing deste projeto, ele documenta as regras
do Material Design 3 aplicadas aqui e as armadilhas já descobertas (evita repetir os mesmos bugs).

---

## O Que Foi Pedido

1. Testar o dashboard e a página "Editar Ativos" em desktop, tablet e celular.
2. Garantir que cards e fontes se adaptam sem quebrar, com prioridade em mobile (uso principal).
3. Seguir boas práticas de Material Design (breakpoints, grid, spacing) — documentadas em
   `materialdesign.md`.
4. Transformar o navmenu em hamburger menu no celular.
5. Depois, corrigir 2 problemas apontados via screenshot pelo usuário:
   - Cards do dashboard encostando na borda direita em mobile (espaçamento assimétrico).
   - Tabela de "Editar Ativos" exigia rolar até o fim para acessar os botões de editar/remover.

## O Que Foi Feito

### 1. Header vira hamburger menu em mobile (`src/app/DashboardClient.tsx`)

- Abaixo de **600px** de largura (breakpoint "Compact" do MD3): logo compacta ("VRSBUENO INVEST",
  sem o sufixo "— Dashboard") + botão hamburger (☰) que abre um dropdown com os 4 itens de
  navegação (Calculadora Selic, Editar Ativos, Segurança, Sair), cada um com altura ≥48px (alvo
  de toque).
- Entre 600–899px (tablet): botões completos visíveis, mas o sufixo "— Dashboard" some (evita
  truncar feio com "..."); logo usa `clamp()` + `minWidth: 0` no flex para encolher sem vazar.
- ≥900px: header completo como antes.

### 2. Grid de KPIs/gráficos deixa de sobrepor e fica com espaçamento correto
(`src/components/DashboardTopLayout.tsx`)

Dois bugs de raiz no uso do `react-grid-layout`, ambos corrigidos — **detalhes técnicos completos
em `materialdesign.md` seção 3.1**:

- **Sobreposição de cards em mobile/tablet:** só existia layout para o breakpoint `lg`. Agora há
  um layout explícito por breakpoint (`lg/md/sm/xs/xxs`), empilhando em 1 coluna no mobile e 2
  colunas no tablet.
- **Espaçamento assimétrico (cards encostando na borda direita):** o componente media a tela
  inteira (`document.documentElement.clientWidth`) em vez do container real (que tem padding).
  Corrigido para medir via `ResizeObserver` no container interno. Como consequência, os
  breakpoints do grid tiveram que ser recalibrados (~48px menores que o nominal) para contar o
  padding do wrapper.

### 3. Tabela "Editar Ativos": coluna de Ações fixa (sticky)
(`src/app/editar-ativos/EditarAtivosClient.tsx`)

A tabela tem 9 colunas (`minWidth: 1100px`) dentro de um container com scroll horizontal. A
coluna "Ações" (editar/remover) agora usa `position: sticky; right: 0` com fundo opaco — fica
sempre visível na borda direita, não importa o quanto se role a tabela. Aplicado no `<th>` e em
todas as variações de `<tr>` (normal e em edição).

### 4. Tipografia fluida e modais responsivos

- `.text-value-large`, `.grid-card-title`, `.kpi-subtitle` (`globals.css`) usam `clamp()` em vez
  de `font-size` fixo.
- Modal da Calculadora Selic (`Modals.tsx`) e modal de Cobertura FGC (`DashboardTopLayout.tsx`)
  tinham `width` fixo em px (900px / 640px) que estourava em mobile — trocado para
  `min(NNNpx, 100%)` + padding no overlay.
- Grid de inputs da Calculadora Selic: `1fr 1fr 1fr` fixo → `repeat(auto-fit, minmax(140px,1fr))`
  (colapsa para 1 coluna sozinho em telas estreitas).

### 5. Correção de bug pré-existente: scroll horizontal fantasma (`src/app/page.tsx`)

`width: '100vw'` no wrapper raiz incluía a largura da scrollbar (bug clássico de CSS),
causando ~15px de overflow horizontal. Trocado para `width: '100%'`, e adicionado
`overflow-x: hidden` no `html`/`body` como rede de segurança contra pequenos arredondamentos de
pixel do grid.

## Validações Executadas

- ✅ `npx tsc --noEmit` limpo em todas as etapas
- ✅ Testado em mobile (375×812), tablet (768×1024) e desktop (1440×900) via browser automatizado
- ✅ Espaçamento lateral confirmado simétrico numericamente: 31px/31px (mobile), 40px/40px
  (tablet)
- ✅ Hamburger menu testado: abre, fecha, todos os 4 itens funcionam
- ✅ Coluna sticky testada: rolando a tabela horizontalmente, "Ações" permanece visível; clique em
  "Editar" abre a linha editável corretamente com a coluna sticky mostrando ✓/✗
- ✅ Nenhum scroll horizontal indesejado (verificado via `body.scrollWidth`)

## Estado do Repositório

Estas mudanças **ainda não foram commitadas** no momento em que este arquivo foi escrito — rode
`git status` para confirmar. Arquivos modificados:

```
M  src/app/DashboardClient.tsx
M  src/app/editar-ativos/EditarAtivosClient.tsx
M  src/app/globals.css
M  src/app/page.tsx
M  src/components/DashboardTopLayout.tsx
M  src/components/Modals.tsx
+  architecture/materialdesign.md
```

## Próximos Passos (Se Necessário)

Nenhuma pendência conhecida. Se uma sessão futura for mexer em responsividade novamente:

1. Leia `architecture/materialdesign.md` primeiro (regras + armadilhas já mapeadas).
2. Ao testar com ferramentas de browser automatizado, aguarde ~1-2s após qualquer resize antes
   de tirar screenshot — o `react-grid-layout` anima a transição, e um screenshot no meio dela
   parece bug de sobreposição sem ser.
3. Nunca use `window.innerWidth` para lógica de breakpoint em JS neste projeto — use
   `document.documentElement.clientWidth` ou `ResizeObserver`.
