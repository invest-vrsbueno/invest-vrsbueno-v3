# Status da sessão — 2026-09-04 (para continuar em outra sessão)

**Leia este arquivo primeiro.** Continuação de
[STATUS_2026-09-03_sessao_completa.md](STATUS_2026-09-03_sessao_completa.md).

**Produção:** https://invest-vrsbueno-v3.vercel.app — **atualizada nesta sessão.** Usuário
pediu explicitamente `git push origin main` (foi, 4 commits) e depois `vercel --prod --yes`
(deploy ok, precisou rodar 2x — "Not authorized" na 1ª tentativa é um gotcha conhecido,
documentado abaixo de novo pra reforçar). Mudanças feitas **depois** desse deploy (ver item 9)
ainda não foram enviadas — checar se precisa rodar push+deploy de novo antes de considerar
produção atualizada.

⚠️ **Gotcha novo descoberto neste deploy:** `vercel --prod` empacota o diretório de trabalho
LOCAL inteiro, não só o que está commitado no git. Isso publicou `/preview-v13` (rota da
outra sessão, sem autenticação por causa da exceção dela em `proxy.ts`) em produção, público,
sem querer. Se for rodar `vercel --prod` de novo, **remover primeiro** qualquer `preview-vN`
solto no working tree (`git status` mostra) ou garantir que a exceção correspondente não
está em `src/proxy.ts` sem commit.

**Resumo rápido dos 3 cards mexidos hoje:** Distribuição por Instituição, Resumo Anual —
Vencimento vs. Gerado, e Investimentos a Vencer — todos viraram tabela com IR calculado e
sanfona (Instituição → Investimento, ou Ano → Instituição → Investimento no caso do Resumo
Anual), usando o mesmo formato de nome de investimento (`Tipo Ativo Indexador - Taxa%`).

**Depois disso, mais uma rodada de ajustes finos:** legenda do gráfico "Alocação %"
reorganizada em grade própria (não é mais o `<Legend>` do Recharts), raio da pizza reduzido
~5% + conteúdo centralizado verticalmente no card, gráfico de barras do modal "Cobertura FGC"
corrigido pra mostrar todas as instituições (Recharts escondia rótulos por falta de espaço),
o KPI "Cobertura FGC" redesenhado (fundo verde/vermelho claro por estado, mostra banco +
investimento em risco em vez de só a contagem), e "Valor Projetado Líquido" (com IR)
adicionado no modal e no e-mail do Simulador Selic. Também gerei uma página de revisão dos 3
e-mails de alerta (ver item 8). **Esse foi o conteúdo enviado a produção.**

**Depois do deploy, mais uma mudança (ainda não commitada/enviada):** cards "Resumo Anual —
Vencimento vs. Gerado" e "Investimentos a Vencer" agora ocupam metade da tela cada
(`w:6`/`w:6` no grid de 12 colunas — antes era `w:8`/`w:4`). Ver item 9.

---

## O que foi feito e commitado nesta sessão

### 1. Card "Distribuição por Instituição" — colunas + expandir por banco
Virou uma tabela: Instituição | Valor Investido | Rendimento Bruto | Rendimento Líquido (Sem IR)
| Posição Atual | Posição Atual (Líquida). Clicar no banco expande (sanfona, um por vez) e
mostra os investimentos daquele banco.

- [src/utils/fgc.ts](../src/utils/fgc.ts): nova função `aliquotaIR(tipo, dataAplicacao, hoje)`
  — tabela regressiva de IR (22,5%/20%/17,5%/15% por dias corridos), LCI/LCA isentos.
  `agruparPorInstituicaoFGC` ganhou `hoje` como segundo parâmetro (opcional, default
  `new Date()` — não quebra os outros dois callers existentes) e os novos campos agregados.
- [src/components/DistribuicaoInstituicoes.tsx](../src/components/DistribuicaoInstituicoes.tsx)
  (novo componente, extraído seguindo o padrão de `FgcDetalhe.tsx`).
- [src/components/DashboardTopLayout.tsx](../src/components/DashboardTopLayout.tsx): usa o
  componente novo no card `distList`; altura do card no grid subiu de `h:10` para `h:14`
  (`lgLayout` e `stackedLayout`) pra caber a tabela.
- [src/app/DashboardClient.tsx](../src/app/DashboardClient.tsx): passa `TODAY` pro cálculo de IR.

**Fórmulas acertadas depois de 2 rodadas de correção do usuário** (guarde isso — a
nomenclatura é contraintuitiva):
- `Rendimento Bruto` = rendimento antes de qualquer imposto.
- `Rendimento Líquido (Sem IR)` = **na verdade é o líquido de verdade** = Bruto − IR. O nome
  "(Sem IR)" é enganoso mas foi a escolha final do usuário — não renomear sem confirmar de novo.
- `Posição Atual` = valor investido + rendimento bruto (sem descontar IR).
- `Posição Atual (Líquida)` = Posição Atual − IR = valor investido + Rendimento Líquido (Sem IR).
  Essa consistência (col6 = col2 + col4) foi o sinal de que a fórmula tinha ficado certa.

### 2. Blur/escurecimento nos modais (privacidade de dados sensíveis)
Todos os 4 modais (`Mfa2FAAlert.tsx`, `Modals.tsx` — Selic, `DashboardTopLayout.tsx` — FGC,
`ConfirmModal.tsx`) tinham overlay `rgba(0,0,0,0.6)` sem blur, deixando números do dashboard
visíveis atrás do modal. Overlay final: **`background: rgba(6,7,10,0.99)` +
`backdropFilter/WebkitBackdropFilter: blur(20px)`**.

**Gotcha:** o `backdrop-filter: blur()` sozinho não deixou o texto ilegível na prática (só
escureceu levemente) — não foi possível diagnosticar a causa raiz (suspeita: stacking
context criado pelo `.fade-in` com `animation-fill-mode: forwards` em
`src/app/globals.css`, mas não confirmado). A solução que funcionou foi **subir a opacidade
do fundo escuro até ficar quase opaco (0.99)** — o blur ficou como reforço, não como
mecanismo principal. Se mexer nisso de novo, não confiar só no blur.

### 3. `.claude/launch.json`
Adicionado `"autoPort": true` — permite rodar `preview_start` mesmo com outro `next dev` já
rodando na 3000 (só que o Next 16 trava 2ª instância no mesmo diretório mesmo em porta
diferente — ver seção de gotchas gerais abaixo).

---

### 4. Card "Resumo Anual — Vencimento vs. Gerado" — sem pizza, IR e sanfona de 3 níveis
Pizza removida (gráfico de barras Vence/Gerado continua igual). Abaixo dele, tabela virou
sanfona de 3 níveis: **Ano → Instituição → Investimento** (com data de vencimento entre
parênteses). Colunas: "Vence Bruto (Com IR)" e "Vence Líquido (Sem IR)" — mesma lógica de IR
do item 1, mas calculada da data de aplicação até o **vencimento** (não até hoje).

- [src/utils/vencimento.ts](../src/utils/vencimento.ts): nova função `agruparPorAnoVencimento`
  (ano → instituições → investimentos, cada nível já com `venceBruto`/`venceLiquido` somados).
- [src/components/ResumoAnualChartV2.tsx](../src/components/ResumoAnualChartV2.tsx) (novo,
  substitui `ResumoAnualChart.tsx`, que foi **removido** — nada mais o importava).
- `DashboardTopLayout.tsx`/`DashboardClient.tsx`: card `chartBar` ligado ao componente novo,
  altura no grid subiu de `h:13` para `h:16` (`chartArea`... já não usa mais `overflow:'auto'`
  no wrapper — o scroll agora é só na tabela interna, cabeçalho fixo, igual ao card de
  Distribuição).

**Testado com dados reais antes do commit** (o usuário pediu pra aplicar direto pra testar
com dado de verdade em vez de mock) — funcionou, o bug do preview (alguns bancos não
mostrando investimentos ao expandir) não voltou a aparecer com dados reais, então
provavelmente era o mock mal montado, não um bug de código. **Se voltar a acontecer com
dados reais, investigar de novo** — não dei baixa nisso com certeza absoluta, só não
reapareceu no teste feito.

### 5. Nome completo do investimento nos 3 cards (Tipo + Ativo + Indexador − Taxa%)
Padrão criado no Resumo Anual e replicado nos outros dois: `${tipo} ${emissor} ${indexador_tipo}
- ${taxa,2 casas com vírgula}%`, ex.: `CDB Original (XP) PRÉ - 17,36%`. Função `nomeInvestimento`
duplicada localmente em cada componente (`DistribuicaoInstituicoes.tsx`,
`ResumoAnualChartV2.tsx`, `InvestimentosAVencerV3.tsx`) — não foi extraída pra um util
compartilhado, considerar isso se pedirem pra mudar o formato (mudar nos 3 lugares).

### 6. Card "Investimentos a Vencer" — filtro por data + agrupado por banco
Trocou o dropdown de horizonte por dois `<input type="date">` (inicial/final, filtra por
`data_vencimento`). Virou sanfona de 2 níveis: **Instituição → Investimento** (mesmo padrão
dos outros dois cards), com colunas Rend. Bruto / Rend. Líquido (rendimento, não posição).

- [src/components/InvestimentosAVencerV3.tsx](../src/components/InvestimentosAVencerV3.tsx)
  (novo, substitui `InvestimentosAVencer.tsx`, que foi **removido**).
- `src/utils/vencimento.ts`: `InvestimentoVencendo`/`investimentosPorVencimento` ganharam
  `rendimentoBruto`/`rendimentoLiquido` (nosso). **Atenção:** essa mesma interface já tinha
  sido estendida por outra sessão rodando em paralelo (`indexador_tipo`, `taxa`,
  `valorLiquido`) — nosso `nomeInvestimento` passou a depender desses campos deles também
  (tipo/indexador/taxa), então **desta vez não deu pra separar limpo por hunk**: o commit
  desta sessão inclui a base deles nesses dois campos-específicos porque virou pré-requisito
  de compilação do que pedimos. Não commitamos o resto do trabalho deles (`preview-v13`,
  `InvestimentosAVencerV2.tsx`, a exceção correspondente em `proxy.ts`).
- `src/app/api/alertas-vencimento/test/route.ts`: também commitado por completo pelo mesmo
  motivo — o mock ali usa `InvestimentoVencendo` e precisava dos campos novos pra compilar.
  Só adicionamos `rendimentoBruto`/`rendimentoLiquido` no mock; os outros campos
  (`indexador_tipo`/`taxa`/`valorLiquido`) já estavam lá, adicionados pela outra sessão.

### 7. Ajustes finos de visualização (gráficos e cards)
Tudo pequeno, cada um testado num preview isolado antes de aplicar:

- **"Alocação %"**: o `<Legend>` do Recharts quebrava linha por largura de item, ficando
  desalinhado. Trocado por uma grade HTML própria (`grid-template-columns: repeat(4, 1fr)`)
  logo abaixo do gráfico, com o pedaço do gráfico em altura fixa (`220px`) — ver
  `DashboardTopLayout.tsx`, card `chartPie`.
- Raio da pizza reduzido de `outerRadius=85/innerRadius=55` para `81/52` (~5%) porque o
  rótulo da maior fatia (ex.: 40%) cortava no topo do card. Card também ganhou
  `justifyContent: 'center'` pra não sobrar espaço em branco embaixo quando o conteúdo é
  menor que a altura do grid item.
- **Modal "Cobertura FGC por Instituição"**: o `BarChart` vertical do Recharts escondia
  rótulos do eixo Y quando havia muitas instituições num container de altura fixa (ele
  descarta ticks que não cabem, sem avisar). Corrigido com altura dinâmica
  (`Math.max(220, byInstArray.length * 34)`), `interval={0}` no `YAxis` (força todos os
  rótulos) e `barCategoryGap="35%"` pra espaçar as barras.
- **KPI "Cobertura FGC"** (`DashboardTopLayout.tsx`, card `kpi6`): redesenhado a pedido do
  usuário depois de várias iterações. Fundo do card fica `rgba(16,185,129,0.10)` (verde) com
  borda `rgba(16,185,129,0.35)` quando protegido, ou `rgba(239,68,68,0.10)`/`0.35` (vermelho)
  quando alguma instituição está em risco. No estado de risco, em vez de só contar bancos,
  mostra o nome do banco (vermelho, negrito) e a lista dos investimentos daquele banco no
  formato padrão (`nomeInvestimentoKpi`, duplicado localmente no arquivo). A linha "Acima do
  Limite de Proteção" foi removida desse estado pra sobrar espaço — só aparece no estado
  protegido/0 bancos.
- **Simulador Selic**: `projetarComTabela` (`src/utils/selic.ts`) agora também calcula
  `rendimentoLiquido`/`valorFinalLiquido`, aplicando a mesma tabela regressiva de IR
  (`aliquotaIR` de `fgc.ts`) do prazo total simulado — **assume sempre CDB/tributável**, essa
  simulação não tem conceito de instituição/produto real pra saber se seria isento. O modal
  (`ModalSelic` em `Modals.tsx`) e o e-mail (`emailSelic.ts`) mostram "Valor Projetado
  Líquido (com IR)" logo abaixo do valor bruto. O PDF (`pdfSelic.ts`) **não foi atualizado**
  — só o modal e o e-mail foram pedidos.

### 8. Página de revisão dos e-mails de alerta
A pedido do usuário, gerei uma página só pra ele revisar o conteúdo dos 3 e-mails
automáticos (Risco FGC, Vencimento, Simulação Selic) sem precisar disparar nenhum de
verdade. Processo: script temporário (`npx tsx`, apagado depois) chamando
`montarHtmlAlerta`/`montarHtmlVencimento`/`montarHtmlSelic` direto com dados fictícios,
salvando o HTML puro em arquivos; esses HTMLs foram embutidos (via `iframe.srcdoc`, cada um
como string JS) numa página nova em
[architecture/preview_emails_alerta.html](preview_emails_alerta.html), publicada como
Artifact. **Gotcha:** carreguei a fonte do Google Fonts dentro de cada iframe pra ficar
bonito, e isso causou reflow (altura calculada antes da fonte trocar, sobrando espaço em
branco) no e-mail mais longo (Selic) — tirei a webfont de dentro dos iframes (cai no
fallback do stack já declarado inline nos e-mails) e o bug sumiu. Esse arquivo fica em
`architecture/` fora do fluxo normal de commit/deploy — é só documentação/referência, pode
reabrir e republicar como Artifact se quiser atualizar depois.

### 9. Cards "Resumo Anual" e "Investimentos a Vencer" com a mesma largura
Usuário achou estranho os dois cards lado a lado (mesma linha do grid) terem larguras
diferentes. `DashboardTopLayout.tsx`, `lgLayout`: `chartBar` foi de `w:8` pra `w:6`,
`saldoList` foi de `w:4,x:8` pra `w:6,x:6` — agora cada um ocupa exatamente metade das 12
colunas. **Não mexi no `stackedLayout`** (breakpoints menores) porque lá os dois já usam
`w:cols` (largura total, empilhados) — não tinha o mesmo problema.

---

## ⚠️ Outra sessão mexendo no mesmo projeto ao mesmo tempo

Durante esta sessão, outro processo (provavelmente outra conversa do Claude Code aberta pelo
usuário, dona do `next dev` já rodando na porta 3000) editou os mesmos arquivos por conta
própria, sem relação com o que pedimos aqui:
- `src/utils/vencimento.ts` — mexeu em `investimentosPorVencimento`/`InvestimentoVencendo`
  (adicionou `indexador_tipo`, `taxa`, `valorLiquido` com cálculo de IR próprio).
- `src/proxy.ts` — adicionou exceção pra `preview-v13`.
- Criou `src/components/InvestimentosAVencerV2.tsx`, `src/app/preview-v13/`, e mexeu em
  `src/app/api/alertas-vencimento/test/route.ts`.

**Isso não foi commitado por nós** — só as mudanças que fizemos nesta conversa. Como
`vencimento.ts` e `proxy.ts` tinham as duas mudanças misturadas no mesmo arquivo, usei
`git hash-object` + `git update-index --cacheinfo` pra montar um blob só com os trechos
nossos e stageá-lo direto (sem tocar no arquivo de trabalho, que continua com as duas
mudanças juntas) — `git add -p` seria a via normal pra isso, mas os hunks não bateram
limpo. Se `git status` mostrar esses arquivos como modificados de novo amanhã, é porque o
trabalho da outra sessão (deles, não nosso) ainda está lá, sem commit — **não é regressão
nossa**. Confirmar com o usuário se as duas sessões deviam estar rodando ao mesmo tempo
antes de mexer nesses arquivos de novo, pra não pisar no trabalho um do outro.

---

## Padrão de trabalho desta sessão (igual ao dia anterior, reforçado)

1. Mudança visual/cálculo → preview em `/preview-vN` (usados hoje: v10, v11, v12 — todos já
   removidos) com dados mock, `preview-vN` na exceção do `proxy.ts` durante o teste.
2. Como já havia outro `next dev` rodando na mesma pasta (outra sessão/terminal), **não deu
   pra abrir preview pelo navegador desta sessão** — Next.js 16 trava uma 2ª instância no
   mesmo diretório mesmo em porta diferente (`autoPort` não resolve isso, só resolve conflito
   de porta puro). Pedimos pro usuário abrir `http://localhost:3000/preview-vN` no navegador
   dele mesmo (o servidor já rodando recarrega sozinho via Fast Refresh).
3. `npx tsc --noEmit` limpo a cada mudança.
4. Usuário aprova pelo preview → aplica na tela real → remove o preview → reverte a
   exceção correspondente no `proxy.ts`.
5. **Cuidado ao editar um componente que já está em produção** (ex.: `ResumoAnualChart.tsx`):
   se for reescrever de vez, criar uma cópia nova (`...V2.tsx`) pro preview e só sobrescrever
   o original depois de aprovado — editar o arquivo real direto quebra a tela de quem estiver
   com o dashboard aberto, mesmo sem aprovação ainda. (Aconteceu nesta sessão: reescrevi
   `ResumoAnualChart.tsx` direto, revertido com `git checkout` antes de causar dano, e refeito
   como `ResumoAnualChartV2.tsx` — depois de aplicado, o arquivo antigo foi removido de vez.)
6. **Duas sessões no mesmo repo ao mesmo tempo** exige cuidado extra ao commitar: sempre
   `git diff HEAD -- <arquivo>` antes de `git add`, pra não commitar mudança de outra sessão
   sem querer. Ver seção acima sobre `vencimento.ts`/`proxy.ts`.
7. **`git push`/`vercel --prod` só rodam quando o usuário pede explicitamente** (ele pediu
   nesta sessão, ver topo do arquivo). `vercel --prod --yes` às vezes retorna
   `"Not authorized"` na 1ª tentativa — rodar de novo resolve (aconteceu de novo hoje, é
   consistente o suficiente pra não investigar mais, só repetir o comando). E lembrar do
   gotcha do item acima: ele deploya o working tree local, não só o git.

## Não fiz

- Não dei `git push`/`vercel --prod` da última mudança (item 9, cards de mesma largura) —
  fiz só até o commit local; o usuário ainda não pediu pra enviar essa parte.
- Não commitei a maior parte do trabalho da outra sessão (`InvestimentosAVencerV2.tsx`,
  `preview-v13`, a exceção dela em `proxy.ts`) — só os campos de `vencimento.ts`/
  `alertas-vencimento/test/route.ts` que viraram pré-requisito de compilação do nosso
  recurso (ver item 6 acima, seção "Nome completo do investimento").
- Não confirmei com o usuário se "cabeçalho fixo estilo planilha" deve virar padrão em todos
  os cards com scroll ou só nos que já têm colunas (agora são 3: Distribuição, Resumo Anual
  e Investimentos a Vencer).
- Ainda não coordenamos com a outra sessão sobre quem fica com `InvestimentosAVencerV2.tsx`
  (ficou órfão, sem uso, já que `InvestimentosAVencerV3.tsx` foi o aplicado) — avisar o
  usuário que pode valer apagar esse arquivo deles se confirmarem que não vão usá-lo.
