export interface SelicPeriodo {
  inicio: string; // yyyy-mm-dd
  fim: string; // yyyy-mm-dd
  taxa: number; // % a.a.
  origem: 'BCB (oficial)' | 'Focus (projeção mercado)' | 'Manual';
}

// Monta a tabela oficial: ano corrente com a Meta Selic vigente (BCB SGS 432) +
// anos seguintes com a mediana das projeções de mercado (BCB Focus).
export function montarTabelaOficial(
  atual: { data: string; valor: number } | null,
  projecoesAnuais: { ano: number; mediana: number }[]
): SelicPeriodo[] {
  if (!atual) return [];
  const anoAtual = new Date(atual.data).getFullYear();

  const tabela: SelicPeriodo[] = [
    {
      inicio: `${anoAtual}-01-01`,
      fim: `${anoAtual}-12-31`,
      taxa: atual.valor,
      origem: 'BCB (oficial)',
    },
  ];

  projecoesAnuais
    .filter((p) => p.ano > anoAtual)
    .sort((a, b) => a.ano - b.ano)
    .forEach((p) => {
      tabela.push({
        inicio: `${p.ano}-01-01`,
        fim: `${p.ano}-12-31`,
        taxa: p.mediana,
        origem: 'Focus (projeção mercado)',
      });
    });

  return tabela;
}

function toDate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

function businessDays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start.getTime());
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export interface ProjecaoResultado {
  valorFinal: number;
  rendimento: number;
  segmentos: { inicio: string; fim: string; taxa: number; origem: string; dias: number }[];
  dataCobertaAte: string | null;
  gapDetectado: boolean;
}

// Projeta valorInicial de dataInicio até dataFinal, compondo juros diários (base 252)
// segmento a segmento conforme a tabela de taxas Selic aplicável a cada período.
// Se a tabela não cobrir todo o intervalo, para no último dia coberto e sinaliza o gap.
export function projetarComTabela(
  valorInicial: number,
  dataInicioStr: string,
  dataFinalStr: string,
  tabela: SelicPeriodo[]
): ProjecaoResultado {
  const dtFinal = toDate(dataFinalStr);
  let cursor = toDate(dataInicioStr);

  const ordenada = [...tabela]
    .filter((p) => toDate(p.fim) >= cursor && toDate(p.inicio) <= dtFinal)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));

  let valor = valorInicial;
  const segmentos: ProjecaoResultado['segmentos'] = [];

  for (const periodo of ordenada) {
    const pInicio = toDate(periodo.inicio);
    const pFim = toDate(periodo.fim);
    if (pInicio > cursor) break; // gap entre o cursor e o próximo período conhecido
    if (cursor > dtFinal) break;

    const segFim = pFim < dtFinal ? pFim : dtFinal;
    const dias = businessDays(cursor, segFim);
    if (dias > 0) {
      const taxaDiaria = Math.pow(1 + periodo.taxa / 100, 1 / 252) - 1;
      valor = valor * Math.pow(1 + taxaDiaria, dias);
      segmentos.push({
        inicio: cursor.toISOString().slice(0, 10),
        fim: segFim.toISOString().slice(0, 10),
        taxa: periodo.taxa,
        origem: periodo.origem,
        dias,
      });
    }
    cursor = new Date(segFim.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }

  const dataCobertaAte = segmentos.length ? segmentos[segmentos.length - 1].fim : null;
  const gapDetectado = cursor <= dtFinal;

  return {
    valorFinal: valor,
    rendimento: valor - valorInicial,
    segmentos,
    dataCobertaAte,
    gapDetectado,
  };
}
