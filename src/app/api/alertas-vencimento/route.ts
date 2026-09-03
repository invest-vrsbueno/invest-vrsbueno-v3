import { NextResponse } from 'next/server';
import { calculateAsset } from '../../../utils/finance';
import { investimentosPorVencimento, DIAS_ALERTA_VENCIMENTO } from '../../../utils/vencimento';
import { enviarEmailVencimento } from '../../../utils/emailVencimento';
import { podeEnviarAlerta, registrarAlerta } from '../../../utils/alertaControl';
import { buscarInvestimentos } from '../../../utils/investimentosApi';

export async function POST() {
  const raw = await buscarInvestimentos();
  const today = new Date();
  const enriquecido = raw.map((item: any) => calculateAsset(item, today));
  const vencendo = investimentosPorVencimento(enriquecido, today).filter(
    (i) => i.diasRestantes >= 0 && i.diasRestantes <= DIAS_ALERTA_VENCIMENTO
  );

  const alertadosAgora: string[] = [];
  const jaAlertadosRecentemente: string[] = [];
  const novosParaEmail: typeof vencendo = [];

  for (const inv of vencendo) {
    const pode = await podeEnviarAlerta('vencimento', inv.id);
    if (pode) {
      alertadosAgora.push(inv.emissor);
      novosParaEmail.push(inv);
      await registrarAlerta('vencimento', inv.id, inv.posicaoHoje);
    } else {
      jaAlertadosRecentemente.push(inv.emissor);
    }
  }

  if (novosParaEmail.length > 0) {
    try {
      await enviarEmailVencimento(novosParaEmail);
    } catch (err) {
      console.error('Falha ao enviar e-mail de alerta de vencimento:', err);
    }
  }

  return NextResponse.json({ alertadosAgora, jaAlertadosRecentemente });
}
