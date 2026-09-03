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
            <td style="padding:7px 0;${idx > 0 ? 'border-top:1px solid #fecaca;' : ''}font-size:13px;color:#1a1d27;">${i.emissor} <span style="color:#8b8fa8;">(${i.tipo})</span></td>
            <td align="right" style="padding:7px 0;${idx > 0 ? 'border-top:1px solid #fecaca;' : ''}font-size:13px;color:#1a1d27;font-weight:600;white-space:nowrap;">${formatBRL(i.posicaoHoje)}</td>
          </tr>`
        )
        .join('');

      return `
      <div style="border:1px solid #fecaca;background:#fef2f2;border-radius:10px;padding:16px 18px;margin-bottom:12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-weight:700;font-size:14px;color:#1a1d27;">⚠️&nbsp;${inst.name}</td>
            <td align="right" style="font-weight:700;font-size:14px;color:#ef4444;white-space:nowrap;">${formatBRL(inst.value)}</td>
          </tr>
        </table>
        <div style="font-size:11.5px;color:#ef4444;margin:2px 0 12px;">Excesso de ${formatBRL(excesso)} acima do limite de ${formatBRL(LIMIT_FGC)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhasInvest}</table>
      </div>`;
    })
    .join('');

  return montarEmailBase({
    badgeLabel: '⚠️ RISCO FGC',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
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
    subject: `${isTeste ? '🧪 [TESTE] ' : '⚠️ '}Cobertura FGC excedida — Investimentos BUD`,
    html: montarHtmlAlerta(instituicoes, isTeste),
  });
}
