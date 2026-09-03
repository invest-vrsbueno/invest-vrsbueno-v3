# Material Design — Referência de Layout Responsivo para este Projeto

Documento de referência local para não depender de consulta constante à internet.
Fonte primária: [Material Design 3 — Breakpoints](https://m3.material.io/foundations/layout/breakpoints) e
[Material Design 3 — Grids & Spacing](https://m3.material.io/foundations/layout/grids-spacing) (Google).
O [MaterialDesignInXamlToolkit](https://github.com/MaterialDesignInXAML/MaterialDesignInXamlToolkit) (WPF/XAML)
não define breakpoints/grid próprios — ele implementa os componentes visuais do Material Design e aponta
para material.io como fonte de verdade, então usamos a doc oficial do Google diretamente.

---

## 1. Breakpoints (Material Design 3)

O MD3 define 5 breakpoints por largura de janela (dp ≈ px em contexto web/CSS):

| Breakpoint  | Largura       | Dispositivo típico                          |
|-------------|---------------|----------------------------------------------|
| Compact     | < 600px       | Celular em retrato                           |
| Medium      | 600–839px     | Tablet em retrato, foldable aberto retrato   |
| Expanded    | 840–1199px    | Celular paisagem, tablet paisagem, desktop   |
| Large       | 1200–1599px   | Desktop                                       |
| Extra-large | ≥ 1600px      | Desktop, monitores ultrawide                 |

**Mapeamento simplificado usado neste projeto** (3 faixas, o suficiente para um dashboard web):

| Nome do projeto | Largura       | Equivale a MD3        |
|------------------|---------------|------------------------|
| `mobile`         | < 600px       | Compact                |
| `tablet`         | 600–1023px    | Medium + parte Expanded|
| `desktop`        | ≥ 1024px      | Expanded/Large/XL      |

> Regra MD3: **projetar por breakpoint, não por dispositivo específico** — a mesma lógica deve
> funcionar em qualquer largura de janela, não só nos tamanhos "oficiais" de iPhone/iPad.

### O que muda em cada breakpoint (regras gerais MD3)

1. **O que revelar** — elementos escondidos no compact podem aparecer no expandido (ex.: texto
   completo do botão em vez de só ícone).
2. **Como dividir a tela** — compact/medium: 1 painel (single column). Expanded+: 2+ painéis.
3. **O que redimensionar** — cards, fontes e imagens crescem com o breakpoint; manter **40–60
   caracteres por linha** de texto em qualquer tamanho.
4. **O que reposicionar** — ex.: ações que ficam embaixo no compact podem ir para o topo/lateral
   no expandido (mobile-first reflow).
5. **O que trocar (swap)** — navegação: `bottom navigation` / **hamburger menu** no compact →
   `navigation rail` no medium/expanded → barra horizontal completa no desktop. Só trocar
   componentes que sejam **funcionalmente equivalentes** (não trocar botão por menu se elas não
   fizerem a mesma coisa).

### Navegação por breakpoint (aplicado neste projeto)

| Breakpoint | Navegação                                                        |
|------------|-------------------------------------------------------------------|
| mobile     | Header compacto + **hamburger menu** (drawer/dropdown com os 4 itens) |
| tablet     | Header com botões visíveis, compactados (ícone + texto reduzido)  |
| desktop    | Header completo, todos os botões com texto (estado atual)         |

---

## 2. Grid & Spacing

### Escala de espaçamento (base 8dp, ajustes finos em 4dp)

Sistema consolidado do Material Design (M2/M3): usar múltiplos de **8px**, com **4px** para ajustes
finos entre elementos muito próximos (ex.: ícone + label).

```
4px   — micro-ajuste (gap entre ícone e texto)
8px   — espaçamento mínimo entre elementos relacionados
12px  — espaçamento pequeno (padding interno compacto)
16px  — unidade padrão (padding de card mobile, gutter mobile)
24px  — espaçamento médio (padding de card desktop, gutter tablet+)
32px  — separação entre seções
40px  — separação grande
48px  — ALVO DE TOQUE MÍNIMO (altura/largura mínima de botões/links clicáveis)
64px  — espaçamento amplo (hero, topo de página)
```

**Regra prática:** desktop pode (e deve) usar espaçamento mais generoso que mobile — não é só
"encolher tudo proporcionalmente", é uma escolha deliberada de densidade por breakpoint.

### Margens de página por breakpoint

| Breakpoint | Margem lateral | Gutter entre cards |
|------------|-----------------|----------------------|
| mobile     | 16px            | 16px                 |
| tablet     | 24px            | 16px                 |
| desktop    | 24px (max-width central 1440px) | 16px |

### Colunas de grid recomendadas

| Breakpoint | Colunas sugeridas para conteúdo geral |
|------------|------------------------------------------|
| mobile     | 1 (empilhado)                              |
| tablet     | 2                                          |
| desktop    | 3–6 (conforme densidade do conteúdo)       |

### Alvo de toque (touch target)

Todo elemento clicável/tocável deve ter **no mínimo 48×48px** de área de toque, mesmo que o
conteúdo visual (ícone) seja menor — usar padding para atingir essa área. Crítico em mobile.

### Cards

- **Nunca sobrepor** cards uns aos outros em nenhum breakpoint (ver seção 3 sobre o bug do
  `react-grid-layout`).
- Cards devem ter **largura fluida** (`100%` do container disponível), nunca `px` fixo.
- Padding interno do card: `16px` mobile → `18-20px` desktop.
- Tipografia dentro do card deve usar `clamp()` para reduzir suavemente em telas menores, nunca
  quebrar palavras ou vazar do container.

---

## 3. Aplicação Neste Projeto (invest-vrsbueno-v3)

### 3.1 Grid de KPIs/Cards (`DashboardTopLayout.tsx`)

Usa `react-grid-layout` (`ResponsiveGridLayout`). **Problema 1 identificado:** só havia um layout
definido (`layouts={{ lg: layout }}`), então em breakpoints menores a lib faz auto-compactação e
os itens com `w` (largura em colunas) maior que o `cols` disponível **se sobrepõem**.

**Solução:** fornecer um objeto `layouts` com uma definição explícita por breakpoint
(`lg`, `md`, `sm`, `xs`, `xxs`), sempre com `w` ≤ `cols` daquele breakpoint, empilhando em coluna
única no `xs`/`xxs` (mobile) e 2 colunas no `sm` (tablet estreito).

**Problema 2 identificado (espaçamento assimétrico — cards encostando na borda direita):**
o componente media `document.documentElement.clientWidth` (a tela inteira) e passava isso como
`width` para o `ResponsiveGridLayout`, só que o grid vive **dentro** de um `<div>` com padding
lateral. Resultado: o grid calculava colunas para um espaço maior do que o realmente disponível
dentro do padding, sobrando conteúdo para fora à direita.

**Solução:** medir a largura do **container real** (um `<div ref={containerRef}>` sem padding
próprio, dentro do wrapper com padding) via `ResizeObserver`, nunca a tela inteira:

```js
const containerRef = React.useRef<HTMLDivElement>(null);
React.useEffect(() => {
  const el = containerRef.current;
  if (!el) return;
  const ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width;
    if (w) setWidth(w);
  });
  ro.observe(el);
  setWidth(el.clientWidth);
  return () => ro.disconnect();
}, []);
```

**Consequência importante:** como `width` agora reflete o conteúdo (já sem padding) e não a tela
cheia, os breakpoints do `react-grid-layout` precisam ser ~48px MENORES que os breakpoints
"nominais" MD3/CSS (o padding lateral do wrapper é `clamp(12px,4vw,24px)`, que vira 24px fixo de
cada lado — 48px total — para qualquer tela ≥ 600px):

```js
breakpoints: { lg: 1150, md: 950, sm: 690, xs: 430, xxs: 0 }  // já descontado o padding
cols:        { lg: 12,   md: 10,  sm: 6,   xs: 4,   xxs: 2 }
```

Regra: no breakpoint `xs`/`xxs` (mobile), todo item deve ter `w` igual ao total de `cols`
daquele breakpoint (ocupar 100% da largura, 1 coluna lógica).

> **Armadilha de teste (não é bug de produção):** ferramentas de emulação de viewport (CDP
> `Emulation.setDeviceMetricsOverride`, usado por navegadores automatizados) podem deixar
> `window.innerWidth` desatualizado mesmo depois de mudar o tamanho da janela, enquanto
> `document.documentElement.clientWidth`/`ResizeObserver` sempre refletem o valor real. Prefira
> sempre `clientWidth`/`ResizeObserver` a `window.innerWidth` para lógica de breakpoint em JS —
> além de mais robusto em produção (não é afetado por scrollbar em todos os navegadores), evita
> esse artefato ao testar com ferramentas automatizadas.

### 3.2 Header (`DashboardClient.tsx`)

- **< 600px (mobile):** hamburger menu. Logo reduzida (sem o "— Dashboard" ou com fonte menor),
  ícone de menu (☰) que abre um dropdown/drawer com os 4 itens de navegação empilhados
  verticalmente, cada um com alvo de toque ≥ 48px de altura.
- **600–1023px (tablet):** botões visíveis mas compactos — ícone sempre visível, texto pode
  reduzir ou os botões quebrarem em 2 linhas de forma controlada (não é o caso ideal, mas
  aceitável se não há espaço; preferir esconder texto secundário antes de deixar quebrar feio).
- **≥ 1024px (desktop):** layout atual, todos os botões com texto completo.

### 3.3 Tipografia Fluida

Usar `clamp(min, preferred, max)` nos elementos de valor grande (`.text-value-large`) e títulos,
em vez de `font-size` fixo, para uma transição suave entre breakpoints sem "saltos" bruscos:

```css
.text-value-large {
  font-size: clamp(1.25rem, 4vw, 1.6rem);
}
```

### 3.4 Regra de Não-Quebra

- Nenhum texto de valor monetário (`R$ 450.652`) pode quebrar linha — usar `white-space: nowrap`
  combinado com `clamp()` de fonte, ou permitir a fonte encolher antes de quebrar.
- Botões com ícone + texto: em telas muito estreitas, esconder o texto e manter só o ícone
  (com `aria-label`/`title` para acessibilidade), nunca deixar o texto quebrar em 2 linhas dentro
  de um botão pill.
- Em flex containers, um filho com `overflow:hidden` + `text-overflow:ellipsis` só encolhe de
  verdade se tiver `minWidth: 0` explícito — sem isso, o texto intrínseco força o container a
  vazar mesmo com `overflow:hidden` (regra padrão do flexbox: `min-width` default é `auto`, não
  `0`). Aplicado no logo do header (`DashboardClient.tsx`) para não cortar feio no tablet.

### 3.5 Tabelas densas: coluna de ações "sticky" (`EditarAtivosClient.tsx`)

Tabela com muitas colunas (`minWidth: 1100px`) dentro de um container `overflow-x: auto` — em
mobile/tablet o usuário precisava rolar até o fim da tabela para alcançar os botões de
editar/remover. Padrão do Material Design para data tables densas: **fixar a última coluna**
(`position: sticky; right: 0`) para que fique sempre visível, com um fundo opaco explícito
(igual ao da linha) e uma sombra sutil indicando que há mais conteúdo por baixo:

```jsx
<td style={{
  position: 'sticky', right: 0,
  background: '#1f2029', // precisa ser opaco e IGUAL ao bg real da linha, senão vaza
  boxShadow: '-6px 0 8px -6px rgba(0,0,0,0.5)',
}}>
  {/* botões de ação */}
</td>
```

Aplicar tanto no `<th>` do cabeçalho quanto em **todas as variações de linha** (normal e em
edição) — cada uma pode ter uma cor de fundo diferente, e o `background` do `td` sticky precisa
casar exatamente com a cor real da linha por trás dele.

### 3.6 Modais: nunca largura fixa em `px`

Modais com `width: '900px'` ou `width: '640px'` fixos estouram a tela em mobile. Usar
`width: 'min(NNNpx, 100%)'` + `padding` no overlay externo (`position:fixed; inset:0`) para
garantir respiro nas bordas em qualquer tela. Grids internos com colunas fixas
(`gridTemplateColumns: '1fr 1fr 1fr'`) também devem virar `repeat(auto-fit, minmax(140px, 1fr))`
para colapsar em 1 coluna quando não há espaço, sem precisar de media query em JS.

---

## 4. Checklist de Validação (usar a cada mudança de layout)

- [ ] Testado em mobile (375×812), tablet (768×1024) e desktop (1440×900)
- [ ] Nenhum scroll horizontal indesejado no `body` (verificar `body.scrollWidth` vs
      `document.documentElement.clientWidth`; `overflow-x: hidden` no `html`/`body` já está
      aplicado como rede de segurança contra arredondamento de pixel)
- [ ] Nenhum card sobrepondo outro card
- [ ] Espaçamento lateral **simétrico** (medir `getBoundingClientRect().left` do primeiro card
      contra `clientWidth - rect.right` do último — devem ser iguais)
- [ ] Nenhum texto cortado, vazando do container, ou quebrando de forma feia
- [ ] Todos os alvos de toque ≥ 48×48px em mobile
- [ ] Header vira hamburger menu abaixo de 600px
- [ ] Tabelas largas: coluna de ações continua acessível sem scroll até o fim (sticky)
- [ ] Nenhum modal com `width` fixo em `px` — usar `min(NNNpx, 100%)`
- [ ] Medir breakpoints via `ResizeObserver`/`clientWidth`, nunca `window.innerWidth` puro
- [ ] `npx tsc --noEmit` limpo
- [ ] Ao testar com ferramentas de browser automatizado: aguardar ~1-2s após resize antes do
      screenshot (react-grid-layout anima a transição de posição dos cards; um screenshot
      tirado no meio da transição parece um bug de sobreposição mas não é)
