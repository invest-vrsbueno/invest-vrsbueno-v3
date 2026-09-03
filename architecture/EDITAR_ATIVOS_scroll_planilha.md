# Editar Ativos — scroll "estilo planilha" (Google Sheets mobile)

**Status:** ✅ IMPLEMENTADO (validado pelo usuário via preview e aplicado na página real).
**Arquivo alterado:** [src/app/editar-ativos/EditarAtivosClient.tsx](../src/app/editar-ativos/EditarAtivosClient.tsx)
**Referência de contexto:** [architecture/STATUS_responsividade_mobile.md](STATUS_responsividade_mobile.md)

## O problema

A tabela de Editar Ativos tem 9 colunas (`minWidth: 1100px`) e a página inteira rolava junto com
os dados. Em mobile, isso significava: para rolar a tabela para o lado (ver colunas escondidas) o
usuário precisava primeiro rolar a página inteira até o fim para alcançar a barra de rolagem
horizontal, que só aparecia embaixo de tudo.

## A referência

Testado ao vivo o Google Sheets mobile (versão web, viewport estreito) para confirmar o padrão
exato antes de implementar:

1. O cabeçalho de colunas (linha 1) fica **fixo verticalmente** — não rola para cima quando o
   corpo de dados rola.
2. A barra de rolagem horizontal fica **sempre visível**, ancorada na base da área de dados
   (entre o corpo de linhas e a barra de abas) — nunca no fim de uma página gigante.
3. Só o **corpo de dados** (linhas × colunas, exceto cabeçalho) rola — tanto na vertical quanto
   na horizontal.

## A implementação

Nenhuma biblioteca nova. Só CSS: `position: sticky` dentro de um container com **altura própria
delimitada** (não a página inteira rolando).

### 1. A página vira um layout flex de altura total da tela

```tsx
<div className="fade-in dark-zone" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
  <div style={{ ...conteúdo interno, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
    <div style={{ ...header da página (Voltar/Título/Botão), flexShrink: 0 }}>...</div>
    <div className="dark-card" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {/* tabela aqui */}
    </div>
  </div>
</div>
```

`100dvh` (dynamic viewport height) em vez de `100vh` — mais robusto em navegadores mobile reais,
onde a barra de endereço aparece/desaparece e muda a altura da viewport dinamicamente.

**Por que `flex: 1, minHeight: 0` e não uma altura fixa em `calc(100vh - 200px)`:** um valor fixo
"chutado" em pixels quebra assim que qualquer coisa acima (aviso de erro, quebra de linha no
header em telas estreitas) muda de altura — ele passa a exigir mais espaço do que o cálculo
previu, e a PÁGINA volta a rolar inteira (foi exatamente o bug encontrado e corrigido durante o
preview de validação `/preview-v7`, antes de aplicar na página real). `flex: 1` faz a área da
tabela ocupar automaticamente "o que sobrar" da tela, ajustando-se sozinha.

### 2. Cabeçalho da tabela fixo (`position: sticky`)

```tsx
<th style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--dark-popover)', ... }}>
```

Precisa de `background` opaco explícito (senão o conteúdo que rola por baixo aparece
"vazando" através do cabeçalho semi-transparente).

### 3. Coluna "Ações" fixa à direita (já existia) + célula de canto

A coluna de ações já era sticky (`right: 0`) desde a correção anterior. Agora, combinada com o
cabeçalho sticky no topo, a célula de **canto** (cabeçalho da coluna Ações) precisa ficar fixa
nos **dois eixos ao mesmo tempo**:

```tsx
<th style={{ position: 'sticky', top: 0, right: 0, zIndex: 3, background: 'var(--dark-popover)', ... }}>Ações</th>
```

Hierarquia de `zIndex` (maior = mais acima): célula de canto (3) > cabeçalho de coluna comum (2)
= coluna Ações nas linhas de dados (1) > conteúdo normal da tabela (0, implícito).

## O que NÃO muda

- Nenhuma coluna, cor, ou funcionalidade de editar/remover/adicionar foi alterada.
- Os tokens de tema dark (`--dark-card`, `--dark-popover`, `--dark-border` etc., ver
  [architecture/PLANO_tema_dark_tweakcn.md](PLANO_tema_dark_tweakcn.md)) continuam os mesmos.

## Validado

- `npx tsc --noEmit` limpo.
- Testado com dados reais (não só o preview com dados fictícios) em mobile (375×812) e desktop
  (1440×900): scroll interno confirmado via `scrollTop`/`scrollLeft` (a página em si não rola,
  `window.scrollY` permanece `0`), cabeçalho e coluna de ações permanecem fixos durante o scroll
  em ambos os eixos, fluxo real de edição (abrir linha editável → salvar → ConfirmModal →
  cancelar) funciona normalmente dentro da nova estrutura.
- Preview temporário `/preview-v7` (dados fictícios) usado para validação removido após
  aprovação; exceção do `proxy.ts` revertida.

## Nota para sessões futuras

Se for mexer nessa página de novo: **não** troque `flex: 1, minHeight: 0` por uma altura fixa em
`calc(100vh - Npx)` — foi tentado, quebrou (ver seção acima), e o `flex` é a solução robusta.
Qualquer novo elemento adicionado ACIMA da caixa da tabela (novos avisos, filtros, etc.) deve ter
`flexShrink: 0` para não ser espremido pelo `flex: 1` da área de tabela.
