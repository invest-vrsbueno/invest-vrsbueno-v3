import { NextResponse } from 'next/server';

// Fontes documentadas em architecture/BCB_SELIC_API.md
const SGS_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json';
const FOCUS_URL =
  "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoAnuais?%24filter=Indicador%20eq%20%27Selic%27%20and%20baseCalculo%20eq%200&%24orderby=Data%20desc&%24top=60&%24format=json";

export async function GET() {
  try {
    const [sgsRes, focusRes] = await Promise.all([
      fetch(SGS_URL, { next: { revalidate: 3600 } }),
      fetch(FOCUS_URL, { next: { revalidate: 3600 } }),
    ]);

    if (!sgsRes.ok) throw new Error(`BCB SGS respondeu ${sgsRes.status}`);
    if (!focusRes.ok) throw new Error(`BCB Focus respondeu ${focusRes.status}`);

    const sgsData = await sgsRes.json();
    const focusData = await focusRes.json();

    const atual = sgsData?.[0]
      ? {
          data: sgsData[0].data.split('/').reverse().join('-'),
          valor: parseFloat(sgsData[0].valor),
        }
      : null;

    // O Focus publica várias rodadas por ano; ficamos só com a mais recente por ano de referência.
    const porAno = new Map<number, { data: string; mediana: number }>();
    for (const item of focusData.value || []) {
      const ano = parseInt(item.DataReferencia, 10);
      if (Number.isNaN(ano)) continue;
      const existente = porAno.get(ano);
      if (!existente || item.Data > existente.data) {
        porAno.set(ano, { data: item.Data, mediana: item.Mediana });
      }
    }
    const projecoes = Array.from(porAno.entries())
      .map(([ano, v]) => ({ ano, mediana: v.mediana, dataConsulta: v.data }))
      .sort((a, b) => a.ano - b.ano);

    return NextResponse.json({
      atual,
      projecoes,
      fonte: {
        atual: 'BCB SGS série 432 (Meta Selic definida pelo Copom)',
        projecoes: 'BCB Focus - Expectativas de Mercado Anuais (mediana)',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Falha ao consultar API do Banco Central' },
      { status: 502 }
    );
  }
}
