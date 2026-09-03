# Plano — Adaptar o sistema de tema dark (referência: tweakcn) às cores do vrsbueno

**Status:** ✅ IMPLEMENTADO (aprovado pelo usuário e aplicado no design principal).
**Referência de contexto:** [architecture/STATUS_responsividade_mobile.md](STATUS_responsividade_mobile.md)
(sessão anterior — responsividade mobile/tablet/desktop, já concluída e commitada).

## Implementação — resumo

Tokens adicionados em `:root` de `src/app/globals.css` (`--dark-bg`, `--dark-fg`, `--dark-card`,
`--dark-popover`, `--dark-secondary`, `--dark-border`, `--dark-warning`, `--dark-ring`,
`--dark-shadow-popover`) e aplicados via `var(--token)` em:

- `src/app/globals.css` — `.dark-zone`, `.dark-card`, `select.dark-select`, regra global
  `:focus-visible` (anel de foco novo, acessibilidade)
- `src/app/DashboardClient.tsx` — dropdown do hamburger menu (mobile)
- `src/components/Modals.tsx` — modal Calculadora Selic (fundo popover + sombra + inputs)
- `src/components/ConfirmModal.tsx` — popover + sombra + `width: min(420px,100%)`
- `src/components/Mfa2FAAlert.tsx` — popover + sombra + corrigido `width: 380px` fixo →
  `min(380px,100%)` + `maxHeight/overflowY` (mesmo bug de mobile corrigido antes em outros modais)
- `src/app/editar-ativos/EditarAtivosClient.tsx` — tabela (header/linhas/coluna sticky) usando
  os tokens unificados

**Fora de escopo, não tocado (conforme planejado):** modal de Cobertura FGC em
`DashboardTopLayout.tsx` (é um modal **claro**, parte do dashboard principal — confirmado antes de
implementar), dashboard principal (glassmorphism claro), cores dos gráficos, fontes, ícones.

Validado com `npx tsc --noEmit` limpo e testes visuais em desktop/mobile (modal Selic, ConfirmModal
via fluxo real de edição, alerta 2FA, dropdown do hamburger, tabela Editar Ativos). Preview
temporário `/preview-v6` removido após aprovação, exceção do `proxy.ts` revertida.

---

## O que foi pesquisado

Repositório: [github.com/jnsahaj/tweakcn](https://github.com/jnsahaj/tweakcn) — um editor visual de
temas para shadcn/ui. Não é uma biblioteca para instalar; é uma ferramenta que gera **tokens de
cor em CSS custom properties** seguindo o sistema semântico do shadcn/ui.

Verifiquei o tema "Default" da ferramenta (`tweakcn.com`) no modo dark — **confirmado que é dark**
(fundo quase preto, texto quase branco), então, conforme pedido, a proposta é **adaptar essa
estrutura às cores já vigentes no vrsbueno**, não trocar a paleta por uma nova.

### Estrutura de tokens do tweakcn (o que vale a pena copiar)

O que o tweakcn tem de valioso não é a cor em si (é cinza neutro por padrão), é a **organização em
papéis semânticos** — algo que o vrsbueno hoje não tem (as cores são hex soltos, repetidos e
ligeiramente inconsistentes em cada arquivo: `#1a1d27`, `#1f2029`, `#1b1d27` usados de forma
intercambiável para "a mesma coisa"):

```
--background        fundo da página/app
--foreground         texto principal
--card                superfície elevada (cards, linhas de tabela)
--card-foreground
--popover             modais, dropdowns, tooltips (um degrau ACIMA do card)
--popover-foreground
--primary             cor de ação principal (botões CTA)
--secondary           ação secundária
--muted-foreground    texto de apoio/legenda
--destructive         erro/remover
--border / --input / --ring (anel de foco — o vrsbueno não tem isso hoje)
--chart-1..5
--radius
--shadow (escala de sombra para elevação)
```

Essa é a mudança de fundo real: passar de "cores hex espalhadas" para um **pequeno sistema de
tokens** com 3 níveis de profundidade (fundo → card → popover), que é exatamente o que falta hoje
(modais usam a MESMA cor de fundo do header, sem nenhuma sensação de estarem "flutuando" acima do
conteúdo).

---

## Onde isso se aplica (escopo)

**Só nas áreas que já são dark hoje** — não mexe no dashboard principal (fundo claro em
glassmorphism, já aprovado e fora de escopo aqui):

| Área | Arquivo |
|---|---|
| Header/navbar | `src/app/DashboardClient.tsx` |
| Modal Calculadora Selic | `src/components/Modals.tsx` |
| Modal Cobertura FGC | `src/components/DashboardTopLayout.tsx` |
| Modal de confirmação (genérico) | `src/components/ConfirmModal.tsx` |
| Alerta de 2FA | `src/components/Mfa2FAAlert.tsx` |
| Página Editar Ativos (tabela) | `src/app/editar-ativos/EditarAtivosClient.tsx` |
| Dropdown do hamburger menu (mobile) | `src/app/DashboardClient.tsx` |

**Assets mantidos exatamente como estão** (conforme pedido): fontes (Outfit para logo/headings,
Inter para corpo), ícones (`lucide-react`), biblioteca de gráficos (`recharts`), e as cores dos
gráficos (`CORES[]`) — nada disso muda.

---

## Mapeamento de cores (tweakcn → vrsbueno atual → proposto)

| Token | Papel | Valor hoje no vrsbueno | Proposto | O que muda |
|---|---|---|---|---|
| `--background` | fundo do app (dark) | `#12141c` / `#14151a` (2 valores quase iguais, usados sem critério) | `#12141c` | Unifica em um só valor |
| `--foreground` | texto principal | `#fff` / `#e2e4f0` misturados | `#f1f2f8` | Levemente mais suave que branco puro (menos cansativo) |
| `--card` | superfície elevada (cards, linhas) | `#1a1d27` / `#1f2029` / `#1b1d27` (3 tons quase iguais) | `#1a1d27` | Unifica |
| `--popover` | modais, dropdowns | hoje = **igual ao background** (`#12141c`) → modal não parece "flutuar" | `#1f2230` | **Novo**: um degrau acima do card, dá profundidade |
| `--primary` | botão de ação principal | `#3b82f6` | `#3b82f6` | Mantido — já é a cor de ação real |
| `--secondary` | botão de ação secundária | `#1f2029` | `#232635` | Ajuste fino p/ diferenciar de `--card` |
| `--accent` (marca) | teal da logo, indicadores positivos | `#00bfa5` | `#00bfa5` | Mantido — cor de marca |
| `--muted-foreground` | texto de apoio | `#8b8fa8` | `#8b8fa8` | Mantido, já é consistente |
| `--destructive` | erro / remover | `#ef4444` | `#ef4444` | Mantido |
| `--warning` | alerta (2FA) | `#f59e0b` | `#f59e0b` | Mantido, formalizado como token |
| `--border` | bordas | `#323546` / `#23253b` | `#2b2e3f` | Unifica |
| `--ring` (foco de teclado) | anel de foco visível | **não existe hoje** | `#00bfa5` (teal da marca) | **Novo** — acessibilidade: hoje não dá pra ver onde o foco do teclado está |
| `--chart-1..5` | gráficos | `CORES[]` existente | **inalterado** | Fora de escopo — já aprovado |
| `--radius` | cantos arredondados | varia entre 8–14px sem padrão claro | 10px (cards) / 12px (modais) | Leve padronização |
| sombra de elevação (popover) | — | modais hoje só têm borda, sem sombra | sombra sutil nova (`0 24px 60px rgba(0,0,0,0.5)`) | **Novo** — reforça a sensação de modal "flutuando" |

## Correção incluída no pacote (mesma classe de bug já corrigida antes)

`Mfa2FAAlert.tsx` tem `width: '380px'` fixo — estoura em mobile, igual ao que já corrigi nos
outros modais na sessão anterior. Vou corrigir junto (`min(380px, 100%)` + padding), já que é o
mesmo tipo de ajuste e está na mesma área de arquivos.

---

## O que NÃO muda

- Nenhuma cor de marca (teal `#00bfa5`, azul `#3b82f6`, vermelho `#ef4444`) muda de valor.
- Nenhum ícone, fonte, ou biblioteca é trocada.
- O dashboard principal (fundo claro/glassmorphism) não é tocado.
- Nenhum layout é reestruturado (o tweakcn usa sidebar lateral no exemplo de dashboard dele — **não
  vamos adotar isso**, o vrsbueno mantém a navbar superior).

## Próximo passo

Vou montar uma **página de preview temporária** (`/preview-v6`, mesmo padrão usado antes em
`/preview-v4` e `/preview-v5`) mostrando lado a lado o estilo **atual** vs. **proposto** para:
header, modal/popover, tabela com coluna de ações, e botões com anel de foco visível — para
aprovação visual antes de tocar em qualquer arquivo real.
