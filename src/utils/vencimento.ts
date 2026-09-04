import { aliquotaIR } from './fgc';

export const DIAS_ALERTA_VENCIMENTO = 30;

export interface InvestimentoVencendo {
  id: string;
  emissor: string;
  tipo: string;
  instituicao_agrupadora: string;
  posicaoHoje: number;
  data_vencimento: string;
  diasRestantes: number;
}

// Lista todos os investimentos com vencimento definido, ordenados do mais
// próximo para o mais distante. Filtragem por horizonte/top-N fica a cargo
// de quem consome (card no dashboard, rota de alerta).
export function investimentosPorVencimento(dataEnriquecida: any[], today: Date): InvestimentoVencendo[] {
  const hojeSemHora = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return dataEnriquecida
    .filter((item) => !!item.data_vencimento)
    .map((item) => {
      const venc = new Date(item.data_vencimento);
      const diasRestantes = Math.round((venc.getTime() - hojeSemHora.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: item.id,
        emissor: item.emissor,
        tipo: item.tipo,
        instituicao_agrupadora: item.instituicao_agrupadora,
        posicaoHoje: item.posicaoHoje,
        data_vencimento: item.data_vencimento,
        diasRestantes,
      };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

export interface InvestimentoAno {
  id: string;
  emissor: string;
  tipo: string;
  data_vencimento: string;
  venceBruto: number;
  venceLiquido: number;
}

export interface InstituicaoAno {
  name: string;
  venceBruto: number;
  venceLiquido: number;
  investimentos: InvestimentoAno[];
}

export interface AnoVencimento {
  name: string;
  venceBruto: number;
  venceLiquido: number;
  instituicoes: InstituicaoAno[];
}

// Agrupa por ano de vencimento e, dentro de cada ano, por instituição, calculando o valor
// bruto (principal + rendimento, sem desconto) e o valor líquido (rendimento menos o IR da
// tabela regressiva, considerando o prazo total da aplicação até o vencimento).
export function agruparPorAnoVencimento(dataEnriquecida: any[]): AnoVencimento[] {
  const anos: Record<string, AnoVencimento> = {};

  for (const obj of dataEnriquecida) {
    const ano = String(obj.anoVencimento);
    if (!anos[ano]) anos[ano] = { name: ano, venceBruto: 0, venceLiquido: 0, instituicoes: [] };

    const dataVencimentoRef = obj.data_vencimento ? new Date(obj.data_vencimento) : new Date(obj.data_aplicacao);
    const rendimentoBrutoVencimento = obj.projetadoVencimento - obj.aplicado;
    const aliquota = aliquotaIR(obj.tipo, obj.data_aplicacao, dataVencimentoRef);
    const venceLiquido = obj.aplicado + rendimentoBrutoVencimento * (1 - aliquota);

    anos[ano].venceBruto += obj.projetadoVencimento;
    anos[ano].venceLiquido += venceLiquido;

    let inst = anos[ano].instituicoes.find((i) => i.name === obj.instituicao_agrupadora);
    if (!inst) {
      inst = { name: obj.instituicao_agrupadora, venceBruto: 0, venceLiquido: 0, investimentos: [] };
      anos[ano].instituicoes.push(inst);
    }
    inst.venceBruto += obj.projetadoVencimento;
    inst.venceLiquido += venceLiquido;
    inst.investimentos.push({
      id: obj.id,
      emissor: obj.emissor,
      tipo: obj.tipo,
      data_vencimento: obj.data_vencimento,
      venceBruto: obj.projetadoVencimento,
      venceLiquido,
    });
  }

  for (const ano of Object.values(anos)) {
    ano.instituicoes.sort((a, b) => b.venceBruto - a.venceBruto);
    for (const inst of ano.instituicoes) {
      inst.investimentos.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    }
  }

  return Object.values(anos).sort((a, b) => parseInt(a.name) - parseInt(b.name));
}
