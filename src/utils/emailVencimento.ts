import nodemailer from 'nodemailer';
import { DIAS_ALERTA_VENCIMENTO, type InvestimentoVencendo } from './vencimento';
import { montarEmailBase } from './emailLayout';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
}

function formatDataBR(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function montarHtmlVencimento(investimentos: InvestimentoVencendo[], isTeste = false) {
  const linhas = investimentos
    .map(
      (i, idx) => `
      <tr>
        <td style="padding:12px 0;${idx > 0 ? 'border-top:1px solid #fde68a;' : ''}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <div style="font-weight:700;font-size:13.5px;color:#1a1d27;">${i.emissor} <span style="font-weight:500;color:#8b8fa8;">(${i.tipo})</span></div>
                <div style="font-size:11.5px;color:#92400e;margin-top:2px;">${i.instituicao_agrupadora} · vence em ${formatDataBR(i.data_vencimento)} (${i.diasRestantes === 0 ? 'hoje' : `${i.diasRestantes}d`})</div>
              </td>
              <td align="right" style="font-weight:700;font-size:13.5px;color:#1a1d27;white-space:nowrap;vertical-align:top;">${formatBRL(i.posicaoHoje)}</td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join('');

  const cardConteudo = `
    <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:6px 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table>
    </div>`;

  return montarEmailBase({
    badgeLabel: '⏰ VENCIMENTO PRÓXIMO',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    titulo: 'Investimentos próximos do vencimento',
    introducao: `Os investimentos abaixo vencem em até ${DIAS_ALERTA_VENCIMENTO} dias:`,
    conteudoHtml: cardConteudo,
    isTeste,
  });
}

export async function enviarEmailVencimento(investimentos: InvestimentoVencendo[], isTeste = false) {
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
    subject: `${isTeste ? '🧪 [TESTE] ' : '⏰ '}Investimentos próximos do vencimento — Investimentos BUD`,
    html: montarHtmlVencimento(investimentos, isTeste),
  });
}
