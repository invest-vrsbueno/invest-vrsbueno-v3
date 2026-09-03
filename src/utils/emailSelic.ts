import nodemailer from 'nodemailer';
import { montarEmailBase } from './emailLayout';
import type { ProjecaoResultado, SelicPeriodo } from './selic';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
}
function formatDataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export interface DadosSimulacaoSelic {
  atual: { data: string; valor: number } | null;
  valorProjetado: number;
  dataInicio: string;
  dataFinal: string;
  resultado: ProjecaoResultado | null;
  tabelaOficial: SelicPeriodo[];
}

export function montarHtmlSelic({ atual, valorProjetado, dataInicio, dataFinal, resultado, tabelaOficial }: DadosSimulacaoSelic) {
  const linhasTabela = tabelaOficial
    .map(
      (p, idx) => `
      <tr>
        <td style="padding:7px 0;${idx > 0 ? 'border-top:1px solid #e2e4f0;' : ''}font-size:12.5px;color:#1a1d27;">${formatDataBR(p.inicio)} — ${formatDataBR(p.fim)}</td>
        <td align="right" style="padding:7px 0;${idx > 0 ? 'border-top:1px solid #e2e4f0;' : ''}font-size:12.5px;color:#1a1d27;font-weight:600;">${p.taxa.toFixed(2)}%</td>
        <td align="right" style="padding:7px 0;${idx > 0 ? 'border-top:1px solid #e2e4f0;' : ''}font-size:11px;color:#8b8fa8;white-space:nowrap;">${p.origem}</td>
      </tr>`
    )
    .join('');

  const resultadoHtml =
    resultado && !resultado.gapDetectado
      ? `<div style="border:1px solid #a7f3d0;background:#ecfdf5;border-radius:10px;padding:16px 18px;margin-bottom:16px;">
          <div style="font-size:12px;color:#065f46;">Valor projetado em ${formatDataBR(dataFinal)}</div>
          <div style="font-size:20px;font-weight:700;color:#059669;">${formatBRL(resultado.valorFinal)}</div>
          <div style="font-size:12px;color:#065f46;">Rendimento estimado: ${formatBRL(resultado.rendimento)}</div>
        </div>`
      : `<div style="border:1px solid #fecaca;background:#fef2f2;border-radius:10px;padding:16px 18px;margin-bottom:16px;font-size:12.5px;color:#b91c1c;">
          Projeção incompleta: cobertura de dados disponível apenas até ${resultado?.dataCobertaAte ? formatDataBR(resultado.dataCobertaAte) : '-'}.
        </div>`;

  const conteudo = `
    <div style="border:1px solid #e2e4f0;background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:16px;font-size:12.5px;color:#5a5d7a;">
      Taxa oficial vigente: <strong>${atual ? `${atual.valor.toFixed(2)}%` : '-'}</strong> (BCB${atual ? `, ${formatDataBR(atual.data)}` : ''})<br/>
      Valor simulado: <strong>${formatBRL(valorProjetado)}</strong> · Período: <strong>${formatDataBR(dataInicio)} a ${formatDataBR(dataFinal)}</strong>
    </div>
    ${resultadoHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:11px;color:#8b8fa8;padding-bottom:6px;">PERÍODO</td><td align="right" style="font-size:11px;color:#8b8fa8;padding-bottom:6px;">TAXA</td><td align="right" style="font-size:11px;color:#8b8fa8;padding-bottom:6px;">ORIGEM</td></tr>
      ${linhasTabela}
    </table>`;

  return montarEmailBase({
    badgeLabel: '📈 SIMULAÇÃO SELIC',
    badgeBg: '#dbeafe',
    badgeColor: '#1d4ed8',
    titulo: 'Simulador de Projeções — Meta Selic',
    introducao: 'Resumo da simulação gerada no dashboard vrsbueno Invest.',
    conteudoHtml: conteudo,
  });
}

export async function enviarEmailSelic(dados: DadosSimulacaoSelic) {
  const { EMAIL_SENDER, EMAIL_PASSWORD, EMAIL_RECEIVER } = process.env;
  if (!EMAIL_SENDER || !EMAIL_PASSWORD || !EMAIL_RECEIVER) {
    throw new Error('Credenciais de e-mail (EMAIL_SENDER/EMAIL_PASSWORD/EMAIL_RECEIVER) ausentes em .env.local');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: EMAIL_SENDER, pass: EMAIL_PASSWORD },
  });

  await transporter.sendMail({
    from: EMAIL_SENDER,
    to: EMAIL_RECEIVER.split(',').map((s) => s.trim()),
    subject: '📈 Simulação Selic — vrsbueno Invest',
    html: montarHtmlSelic(dados),
  });
}
