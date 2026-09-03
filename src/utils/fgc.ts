export const LIMIT_FGC = 250000;

export interface InvestimentoFGC {
  id: string;
  emissor: string;
  tipo: string;
  posicaoHoje: number;
}

export interface InstituicaoFGC {
  name: string;
  value: number;
  investimentos: InvestimentoFGC[];
}

export function agruparPorInstituicaoFGC(dataEnriquecida: any[]): InstituicaoFGC[] {
  const acc: Record<string, InstituicaoFGC> = {};

  for (const obj of dataEnriquecida) {
    const inst = obj.instituicao_agrupadora;
    if (!acc[inst]) acc[inst] = { name: inst, value: 0, investimentos: [] };
    acc[inst].value += obj.posicaoHoje;
    acc[inst].investimentos.push({
      id: obj.id,
      emissor: obj.emissor,
      tipo: obj.tipo,
      posicaoHoje: obj.posicaoHoje,
    });
  }

  return Object.values(acc).sort((a, b) => b.value - a.value);
}
