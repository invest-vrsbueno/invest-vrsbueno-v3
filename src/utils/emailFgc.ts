import nodemailer from 'nodemailer';
import { LIMIT_FGC } from './fgc';
import { montarEmailBase } from './emailLayout';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
}

export interface InstituicaoParaEmail {
  name: string;
  value: number;
  investimentos: { emissor: string; tipo: string; posicaoHoje: number }[];
}

export function montarHtmlAlerta(instituicoes: InstituicaoParaEmail[], isTeste = false) {
  const cards = instituicoes
    .map((inst) => {
      const excesso = inst.value - LIMIT_FGC;
      const linhasInvest = inst.investimentos
        .map(
          (i, idx) => `
          <tr>
            <td style="padding:7px 0;${idx > 0 ? 'border-top:1px solid rgba(239,68,68,0.15);' : ''}font-size:13px;color:#1a1d27;">${i.emissor} <span style="color:#8b8fa8;">(${i.tipo})</span></td>
            <td align="right" style="padding:7px 0;${idx > 0 ? 'border-top:1px solid rgba(239,68,68,0.15);' : ''}font-size:13px;color:#1a1d27;font-weight:600;white-space:nowrap;">${formatBRL(i.posicaoHoje)}</td>
          </tr>`
        )
        .join('');

      return `
      <div style="border:1px solid rgba(239,68,68,0.18);background:rgba(239,68,68,0.08);border-radius:10px;padding:16px 18px;margin-bottom:12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-weight:700;font-size:14px;color:#1a1d27;">⚠️&nbsp;${inst.name}</td>
            <td align="right" style="font-weight:700;font-size:14px;color:#ef4444;white-space:nowrap;">${formatBRL(inst.value)}</td>
          </tr>
        </table>
        <div style="display:inline-block;margin:8px 0 12px;padding:6px 10px;border-radius:8px;background:rgba(239,68,68,0.14);">
          <div style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:0.05em;">Excedido</div>
          <div style="font-size:13px;font-weight:800;color:#ef4444;">${formatBRL(excesso)} <span style="font-weight:600;font-size:11px;">acima do limite de ${formatBRL(LIMIT_FGC)}</span></div>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhasInvest}</table>
      </div>`;
    })
    .join('');

  return montarEmailBase({
    badgeLabel: '⚠️ RISCO FGC',
    badgeBg: '#fee2e2',
    badgeColor: '#ef4444',
    titulo: 'Cobertura FGC excedida',
    introducao: `As instituições abaixo ultrapassaram o limite de proteção do FGC (${formatBRL(LIMIT_FGC)}):`,
    conteudoHtml: cards,
    isTeste,
  });
}

export async function enviarEmailAlerta(instituicoes: InstituicaoParaEmail[], isTeste = false) {
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
    subject: `${isTeste ? '🧪 [TESTE] ' : '⚠️ '}Cobertura FGC excedida — vrsbueno Invest`,
    html: montarHtmlAlerta(instituicoes, isTeste),
  });
}
