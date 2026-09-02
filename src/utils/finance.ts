export const CDI_MOCK_RATE = 0.105; // 10.5% ao ano fallback

// Pega dias uteis aproximados
function getBusinessDaysCount(startDate: Date, endDate: Date): number {
  let count = 0;
  let curDate = new Date(startDate.getTime());
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

export function calculateAsset(item: any, today: Date) {
  const dtAplicacao = new Date(item.data_aplicacao);
  const dtVencimento = item.data_vencimento ? new Date(item.data_vencimento) : new Date(today.getTime() + 365*24*60*60*1000);
  
  const diasAteHoje = getBusinessDaysCount(dtAplicacao, today > dtVencimento ? dtVencimento : today);
  const diasAteVencimento = getBusinessDaysCount(dtAplicacao, dtVencimento);
  
  // Taxa diária simplificada
  let taxaAoAno = item.taxa / 100;
  if (item.indexador_tipo?.toLowerCase().includes('cdi')) {
    taxaAoAno = taxaAoAno * CDI_MOCK_RATE;
  }
  const taxaDiaria = Math.pow(1 + taxaAoAno, 1/252) - 1;

  const aplicado = item.valor_aplicado || 0;
  const posicaoHoje = aplicado * Math.pow(1 + taxaDiaria, diasAteHoje);
  const projetadoVencimento = aplicado * Math.pow(1 + taxaDiaria, diasAteVencimento);

  return {
    ...item,
    aplicado,
    posicaoHoje,
    rendimentoAcumulado: Math.max(0, posicaoHoje - aplicado),
    projetadoVencimento,
    anoVencimento: dtVencimento.getFullYear()
  };
}

export function generateEvolutionCurve(assets: any[], startDate: Date, endDate: Date) {
  const curve = [];
  let curDate = new Date(startDate.getTime());
  
  // Aproximando evolução por meses para performance do chart
  while (curDate <= endDate) {
    let sumAplicado = 0;
    let sumPosicao = 0;
    
    for (const asset of assets) {
      const start = new Date(asset.data_aplicacao);
      const end = asset.data_vencimento ? new Date(asset.data_vencimento) : new Date(8640000000000000);
      
      if (curDate >= start && curDate <= end) {
        sumAplicado += asset.aplicado;
        const dias = getBusinessDaysCount(start, curDate);
        
        let taxaAoAno = asset.taxa / 100;
        if (asset.indexador_tipo?.toLowerCase().includes('cdi')) {
          taxaAoAno = taxaAoAno * CDI_MOCK_RATE;
        }
        const taxaDiaria = Math.pow(1 + taxaAoAno, 1/252) - 1;
        sumPosicao += asset.aplicado * Math.pow(1 + taxaDiaria, dias);
      } else if (curDate > end) {
        // Se ja venceu e (simplificadamente) o dinheiro nao saiu da conta
        sumPosicao += asset.projetadoVencimento;
        sumAplicado += asset.aplicado;
      }
    }

    if(sumPosicao > 0) {
      curve.push({
        date: curDate.toISOString().split('T')[0],
        month: curDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        aplicado: sumAplicado,
        patrimonio: sumPosicao
      });
    }

    // Pular de 15 em 15 dias ou 1 mes
    curDate.setDate(curDate.getDate() + 15);
  }
  
  return curve;
}
