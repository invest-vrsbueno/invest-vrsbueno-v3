export const LIMIT_FGC = 250000;

// LCI/LCA são isentos de IR para pessoa física; os demais tipos seguem a tabela regressiva.
const TIPOS_ISENTOS_IR = ['LCI', 'LCA'];

function diasCorridosDesde(dataAplicacao: string, hoje: Date): number {
  const inicio = new Date(`${String(dataAplicacao).slice(0, 10)}T00:00:00`);
  const dias = Math.floor((hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, dias);
}

// Tabela regressiva de IR para renda fixa (dias corridos desde a aplicação).
export function aliquotaIR(tipo: string, dataAplicacao: string, hoje: Date): number {
  if (TIPOS_ISENTOS_IR.includes(tipo)) return 0;
  const dias = diasCorridosDesde(dataAplicacao, hoje);
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.20;
  if (dias <= 720) return 0.175;
  return 0.15;
}

export interface InvestimentoFGC {
  id: string;
  emissor: string;
  tipo: string;
  indexador_tipo: string;
  taxa: number;
  posicaoHoje: number;
  valorAplicado: number;
  rendimentoBruto: number;
  rendimentoLiquidoSemIR: number;
  posicaoAtualLiquida: number;
  projecaoBruta: number;
  projecaoLiquida: number;
}

export interface InstituicaoFGC {
  name: string;
  value: number;
  valorAplicado: number;
  rendimentoBruto: number;
  rendimentoLiquidoSemIR: number;
  posicaoAtualLiquida: number;
  projecaoBruta: number;
  projecaoLiquida: number;
  margemFgc: number;
  investimentos: InvestimentoFGC[];
}

// Prazo padrão (365 dias) quando não há data_vencimento — mesmo fallback de calculateAsset/DashboardClient.
function resolveDtVencimento(obj: any, hoje: Date): Date {
  return obj.data_vencimento ? new Date(obj.data_vencimento) : new Date(hoje.getTime() + 365 * 24 * 60 * 60 * 1000);
}

export function agruparPorInstituicaoFGC(dataEnriquecida: any[], hoje: Date = new Date()): InstituicaoFGC[] {
  const acc: Record<string, InstituicaoFGC> = {};

  for (const obj of dataEnriquecida) {
    const inst = obj.instituicao_agrupadora;
    if (!acc[inst]) {
      acc[inst] = { name: inst, value: 0, valorAplicado: 0, rendimentoBruto: 0, rendimentoLiquidoSemIR: 0, posicaoAtualLiquida: 0, projecaoBruta: 0, projecaoLiquida: 0, margemFgc: 0, investimentos: [] };
    }

    const rendimentoBruto: number = obj.rendimentoAcumulado ?? Math.max(0, obj.posicaoHoje - obj.aplicado);
    const aliquota = aliquotaIR(obj.tipo, obj.data_aplicacao, hoje);
    // Rendimento líquido = rendimento bruto menos o IR devido.
    const rendimentoLiquidoSemIR = rendimentoBruto - rendimentoBruto * aliquota;
    // Posição atual líquida = posição atual (aplicado + rendimento bruto) menos o IR devido sobre o rendimento.
    const posicaoAtualLiquida = obj.posicaoHoje - rendimentoBruto * aliquota;

    // Projeção no vencimento: IR calculado pelos dias corridos até o VENCIMENTO (não até hoje).
    const projecaoBruta: number = obj.projetadoVencimento;
    const dtVencimento = resolveDtVencimento(obj, hoje);
    const rendimentoBrutoVencimento = Math.max(0, projecaoBruta - obj.aplicado);
    const aliquotaVencimento = aliquotaIR(obj.tipo, obj.data_aplicacao, dtVencimento);
    const projecaoLiquida = projecaoBruta - rendimentoBrutoVencimento * aliquotaVencimento;

    acc[inst].value += obj.posicaoHoje;
    acc[inst].valorAplicado += obj.aplicado;
    acc[inst].rendimentoBruto += rendimentoBruto;
    acc[inst].rendimentoLiquidoSemIR += rendimentoLiquidoSemIR;
    acc[inst].posicaoAtualLiquida += posicaoAtualLiquida;
    acc[inst].projecaoBruta += projecaoBruta;
    acc[inst].projecaoLiquida += projecaoLiquida;

    acc[inst].investimentos.push({
      id: obj.id,
      emissor: obj.emissor,
      tipo: obj.tipo,
      indexador_tipo: obj.indexador_tipo,
      taxa: obj.taxa,
      posicaoHoje: obj.posicaoHoje,
      valorAplicado: obj.aplicado,
      rendimentoBruto,
      rendimentoLiquidoSemIR,
      posicaoAtualLiquida,
      projecaoBruta,
      projecaoLiquida,
    });
  }

  // Margem P/FGC: quanto falta (ou quanto passou) do limite de R$ 250 mil de saldo bruto por instituição.
  for (const instituicao of Object.values(acc)) {
    instituicao.margemFgc = LIMIT_FGC - instituicao.value;
  }

  return Object.values(acc).sort((a, b) => b.value - a.value);
}
