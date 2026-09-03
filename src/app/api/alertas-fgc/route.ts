import { NextResponse } from 'next/server';
import { calculateAsset } from '../../../utils/finance';
import { agruparPorInstituicaoFGC, LIMIT_FGC } from '../../../utils/fgc';
import { enviarEmailAlerta } from '../../../utils/emailFgc';
import { podeEnviarAlerta, registrarAlerta } from '../../../utils/alertaControl';
import { buscarInvestimentos } from '../../../utils/investimentosApi';

export async function POST() {
  const raw = await buscarInvestimentos();
  const today = new Date();
  const enriquecido = raw.map((item: any) => calculateAsset(item, today));
  const byInstArray = agruparPorInstituicaoFGC(enriquecido);
  const emRisco = byInstArray.filter((i) => i.value >= LIMIT_FGC);

  const alertadosAgora: string[] = [];
  const jaAlertadosRecentemente: string[] = [];
  const novosParaEmail: typeof emRisco = [];

  for (const inst of emRisco) {
    const pode = await podeEnviarAlerta('fgc', inst.name);
    if (pode) {
      alertadosAgora.push(inst.name);
      novosParaEmail.push(inst);
      await registrarAlerta('fgc', inst.name, inst.value);
    } else {
      jaAlertadosRecentemente.push(inst.name);
    }
  }

  if (novosParaEmail.length > 0) {
    try {
      await enviarEmailAlerta(novosParaEmail);
    } catch (err) {
      console.error('Falha ao enviar e-mail de alerta FGC:', err);
    }
  }

  return NextResponse.json({ alertadosAgora, jaAlertadosRecentemente });
}
