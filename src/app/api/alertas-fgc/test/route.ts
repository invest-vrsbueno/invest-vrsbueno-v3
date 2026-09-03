import { NextResponse } from 'next/server';
import { enviarEmailAlerta, type InstituicaoParaEmail } from '../../../../utils/emailFgc';

// Rota de teste: usa dados FICTÍCIOS (não consulta a tabela real de investimentos
// nem grava em fgc_alertas_enviados), só para validar o envio de e-mail.
const DADOS_MOCK: InstituicaoParaEmail[] = [
  {
    name: 'BANCO TESTE (SIMULAÇÃO)',
    value: 317000,
    investimentos: [
      { emissor: 'CDB TESTE', tipo: 'CDB', posicaoHoje: 180000 },
      { emissor: 'LCA TESTE II', tipo: 'LCA', posicaoHoje: 95000 },
      { emissor: 'LF TESTE', tipo: 'LF', posicaoHoje: 42000 },
    ],
  },
];

export async function POST() {
  try {
    await enviarEmailAlerta(DADOS_MOCK, true);
    return NextResponse.json({ ok: true, mensagem: 'E-mail de teste enviado.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, erro: err.message }, { status: 500 });
  }
}
