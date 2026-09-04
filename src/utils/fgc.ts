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
}

export interface InstituicaoFGC {
  name: string;
  value: number;
  valorAplicado: number;
  rendimentoBruto: number;
  rendimentoLiquidoSemIR: number;
  posicaoAtualLiquida: number;
  investimentos: InvestimentoFGC[];
}

export function agruparPorInstituicaoFGC(dataEnriquecida: any[], hoje: Date = new Date()): InstituicaoFGC[] {
  const acc: Record<string, InstituicaoFGC> = {};

  for (const obj of dataEnriquecida) {
    const inst = obj.instituicao_agrupadora;
    if (!acc[inst]) {
      acc[inst] = { name: inst, value: 0, valorAplicado: 0, rendimentoBruto: 0, rendimentoLiquidoSemIR: 0, posicaoAtualLiquida: 0, investimentos: [] };
    }

    const rendimentoBruto: number = obj.rendimentoAcumulado ?? Math.max(0, obj.posicaoHoje - obj.aplicado);
    const aliquota = aliquotaIR(obj.tipo, obj.data_aplicacao, hoje);
    // Rendimento líquido = rendimento bruto menos o IR devido.
    const rendimentoLiquidoSemIR = rendimentoBruto - rendimentoBruto * aliquota;
    // Posição atual líquida = posição atual (aplicado + rendimento bruto) menos o IR devido sobre o rendimento.
    const posicaoAtualLiquida = obj.posicaoHoje - rendimentoBruto * aliquota;

    acc[inst].value += obj.posicaoHoje;
    acc[inst].valorAplicado += obj.aplicado;
    acc[inst].rendimentoBruto += rendimentoBruto;
    acc[inst].rendimentoLiquidoSemIR += rendimentoLiquidoSemIR;
    acc[inst].posicaoAtualLiquida += posicaoAtualLiquida;

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
    });
  }

  return Object.values(acc).sort((a, b) => b.value - a.value);
}
