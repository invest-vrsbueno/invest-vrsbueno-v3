# Fonte de dados: Meta Selic (Banco Central do Brasil)

Documenta as APIs oficiais e gratuitas do BCB usadas (ou a usar) pelo modal
**"Calculadora Selic"** ([src/components/Modals.tsx](../src/components/Modals.tsx) —
`ModalSelic`). Objetivo: evitar repetir essa pesquisa toda vez que a feature for
retomada.

Nenhuma das duas APIs abaixo exige autenticação/API key — são dados abertos do BCB.

## 1. Meta Selic oficial (histórico + valor vigente) — SGS série 432

Fonte oficial do valor da Meta Selic definida pelo Copom, dia a dia, desde 05/03/1999
até a última decisão vigente (o valor "empurra" para frente até a próxima reunião do
Copom alterá-lo — não é uma projeção, é o dado real decidido).

```
GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=DD/MM/AAAA&dataFinal=DD/MM/AAAA
GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/N?formato=json
```

Exemplo real (testado em 2026-09-01):

```
GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json
→ [{"data":"16/09/2026","valor":"14.00"}]
```

Campos: `data` (dd/mm/aaaa), `valor` (string numérica, % a.a.).

**Limitação importante (desde 26/03/2025):** consultas por período são limitadas a
10 anos — sempre informar `dataInicial`/`dataFinal` (ou usar `/ultimos/N`) em vez de
buscar a série inteira de uma vez.

Use esta série para: preencher o valor "conhecido/oficial" até a data de hoje (ou até
a última decisão do Copom) — é o que preenche a régua até onde o modal hoje trava com
"não foi prevista pelo banco central".

## 2. Projeção futura (mercado) — Boletim Focus / Expectativas de Mercado (Olinda/OData)

Para datas **além** da última decisão oficial do Copom, o BCB não "prevê" — quem projeta
é o mercado, via a pesquisa semanal Focus, publicada oficialmente pelo BCB. É a fonte
correta para preencher tranches futuras de Meta Selic no simulador.

Base: `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/`

### 2a. Por reunião do Copom (mais granular — recomendado para tranches)

```
GET {base}/ExpectativasMercadoSelic?$filter=Indicador eq 'Selic'&$orderby=Data desc&$top=N&$format=json
```

Exemplo real (testado em 2026-09-01, consulta sem filtro de indicador porque a série já é só Selic):

```json
{
  "Indicador": "Selic",
  "Data": "2026-08-28",
  "Reuniao": "R5/2028",
  "Media": 11.0265,
  "Mediana": 11.0000,
  "DesvioPadrao": 0.9702,
  "Minimo": 8.75,
  "Maximo": 13.75,
  "numeroRespondentes": 85,
  "baseCalculo": 0
}
```

- `Reuniao`: identifica a reunião do Copom (`R{n}/{ano}`), não uma data de calendário direta —
  para virar "Data Inicial/Data Final" de uma tranche, cruzar com o calendário oficial de
  reuniões do Copom (publicado em bcb.gov.br/copom, 8 reuniões/ano).
- `baseCalculo`: `0` = usa todas as respostas dos últimos 30 dias; `1` = só respostas
  atualizadas nos últimos 4 dias úteis (mais "fresca", menos respondentes). Preferir
  `baseCalculo = 0` para robustez, a menos que se queira o consenso mais recente.
- Use **`Mediana`**, não `Media`, como taxa da tranche (é o padrão de mercado para Focus,
  menos sensível a outliers).

### 2b. Por ano-calendário (mais simples — fallback)

```
GET {base}/ExpectativasMercadoAnuais?$filter=Indicador eq 'Selic'&$orderby=Data desc&$top=N&$format=json
```

Exemplo real (testado em 2026-09-01, topo 4 registros mais recentes):

| DataReferencia | Mediana |
|---|---|
| 2026 | 13.75 |
| 2027 | 12.00 |
| 2028 | 10.50 |
| 2029 | 10.00 |

Mais simples de mapear (1 taxa por ano-calendário), mas menos preciso que o endpoint
por reunião para simular tranches curtas dentro do mesmo ano.

**Cadência de atualização:** a pesquisa Focus é publicada toda segunda-feira (1º dia útil
da semana); não adianta consultar com frequência maior que isso.

## Sintaxe OData (Olinda) — pegadinhas

- Parâmetros usam `$` (ex.: `$filter`, `$orderby`, `$top`) — em query string precisam
  vir URL-encoded (`%24filter=...`) dependendo do client HTTP usado.
- Strings em `$filter` usam aspas simples: `Indicador eq 'Selic'`.
- Sempre terminar com `$format=json` (senão retorna XML/Atom por padrão).

## Mapeamento sugerido para o modal `ModalSelic`

O modal tem um formulário "+ Inserir Nova Tranche Meta Selic" com `Data Inicial`,
`Data Final`, `Nova Taxa Selic (% a.a.)`. Fluxo sugerido para popular automaticamente
em vez de digitação manual:

1. Para o intervalo até hoje (ou até a última decisão do Copom): buscar SGS 432
   (`/dados/ultimos/1` já basta, é o valor vigente).
2. Para tranches futuras: buscar `ExpectativasMercadoSelic`, ordenar por `Reuniao`,
   e para cada reunião futura gerar uma tranche com `Data Inicial` = data da reunião
   anterior (ou hoje, na primeira), `Data Final` = data da próxima reunião, `Nova Taxa
   Selic` = `Mediana`.
3. Fallback se a granularidade por reunião não estiver disponível: usar
   `ExpectativasMercadoAnuais` com uma tranche por ano-calendário.

Isso elimina a mensagem hardcoded atual ("não foi prevista pelo banco central. Limite
da planilha: 05/08/2026") — o limite deixa de ser fixo e passa a ser "até onde o Focus
tem consenso publicado" (tipicamente 3-4 anos à frente).

## Status de implementação

Neste momento (2026-09-01) o `ModalSelic` é **estático/mock** — não tem `useState`,
`fetch` nem submit real; os campos são só `defaultValue`. Este documento cobre a
pesquisa da fonte de dados; a integração (fetch client-side ou rota de API Next.js
fazendo proxy dessas chamadas + lógica de merge de tranches) ainda não foi implementada.
