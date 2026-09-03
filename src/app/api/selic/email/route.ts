import { NextResponse } from 'next/server';
import { enviarEmailSelic } from '../../../../utils/emailSelic';

export async function POST(request: Request) {
  try {
    const dados = await request.json();
    await enviarEmailSelic(dados);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Falha ao enviar e-mail de simulação Selic:', err);
    return NextResponse.json({ ok: false, erro: err?.message }, { status: 500 });
  }
}
