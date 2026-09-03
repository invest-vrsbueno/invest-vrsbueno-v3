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
