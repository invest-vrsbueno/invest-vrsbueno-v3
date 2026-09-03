import { NextResponse } from 'next/server';
import { enviarEmailVencimento } from '../../../../utils/emailVencimento';
import type { InvestimentoVencendo } from '../../../../utils/vencimento';

// Rota de teste: usa dados FICTÍCIOS, não consulta investimentos reais
// nem grava em alertas_enviados, só para validar o envio de e-mail.
const DADOS_MOCK: InvestimentoVencendo[] = [
  { id: 'teste-1', emissor: 'CDB TESTE', tipo: 'CDB', instituicao_agrupadora: 'BANCO TESTE', posicaoHoje: 50000, data_vencimento: new Date(Date.now() + 5 * 86400000).toISOString(), diasRestantes: 5 },
  { id: 'teste-2', emissor: 'LCA TESTE', tipo: 'LCA', instituicao_agrupadora: 'BANCO TESTE', posicaoHoje: 32000, data_vencimento: new Date(Date.now() + 18 * 86400000).toISOString(), diasRestantes: 18 },
];

export async function POST() {
  try {
    await enviarEmailVencimento(DADOS_MOCK, true);
    return NextResponse.json({ ok: true, mensagem: 'E-mail de teste enviado.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, erro: err.message }, { status: 500 });
  }
}
