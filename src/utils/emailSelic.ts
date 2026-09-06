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
        <td style="padding:7px 0;${idx > 0 ? 'border-top:1px solid rgba(139,143,168,0.25);' : ''}font-size:12.5px;color:#1a1d27;">${formatDataBR(p.inicio)} — ${formatDataBR(p.fim)}</td>
        <td align="right" style="padding:7px 0;${idx > 0 ? 'border-top:1px solid rgba(139,143,168,0.25);' : ''}font-size:12.5px;color:#1a1d27;font-weight:600;">${p.taxa.toFixed(2)}%</td>
        <td align="right" style="padding:7px 0;${idx > 0 ? 'border-top:1px solid rgba(139,143,168,0.25);' : ''}font-size:11px;color:#8b8fa8;white-space:nowrap;">${p.origem}</td>
      </tr>`
    )
    .join('');

  // Mesmo padrão dos cards de KPI do dashboard: valor bruto grande (preto) + caixa
  // líquida em destaque (teal), em vez de um bloco sólido colorido.
  const resultadoHtml =
    resultado && !resultado.gapDetectado
      ? `<div style="border:1px solid rgba(139,143,168,0.35);background:#ffffff;border-radius:10px;padding:18px 20px;margin-bottom:16px;">
          <div style="font-size:11px;color:#8b8fa8;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Valor projetado em ${formatDataBR(dataFinal)}</div>
          <div style="font-size:22px;font-weight:800;color:#1a1d27;margin-top:2px;">${formatBRL(resultado.valorFinal)}</div>
          <div style="font-size:12px;color:#8b8fa8;margin-top:2px;">Rendimento estimado: ${formatBRL(resultado.rendimento)}</div>
          <div style="margin-top:14px;padding:10px 14px;border-radius:8px;background:rgba(0,166,147,0.14);">
            <div style="font-size:10.5px;font-weight:700;color:#00a693;text-transform:uppercase;letter-spacing:0.05em;">Líquido (com IR)</div>
            <div style="font-size:17px;font-weight:800;color:#00a693;">${formatBRL(resultado.valorFinalLiquido)}</div>
            <div style="font-size:11.5px;color:#00a693;">Rendimento líquido: ${formatBRL(resultado.rendimentoLiquido)}</div>
          </div>
        </div>`
      : `<div style="border:1px solid rgba(239,68,68,0.18);background:rgba(239,68,68,0.08);border-radius:10px;padding:16px 18px;margin-bottom:16px;font-size:12.5px;color:#b91c1c;">
          Projeção incompleta: cobertura de dados disponível apenas até ${resultado?.dataCobertaAte ? formatDataBR(resultado.dataCobertaAte) : '-'}.
        </div>`;

  const conteudo = `
    <div style="border:1px solid rgba(139,143,168,0.35);background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:16px;font-size:12.5px;color:#8b8fa8;">
      Taxa oficial vigente: <strong style="color:#1a1d27;">${atual ? `${atual.valor.toFixed(2)}%` : '-'}</strong> (BCB${atual ? `, ${formatDataBR(atual.data)}` : ''})<br/>
      Valor simulado: <strong style="color:#1a1d27;">${formatBRL(valorProjetado)}</strong> · Período: <strong style="color:#1a1d27;">${formatDataBR(dataInicio)} a ${formatDataBR(dataFinal)}</strong>
    </div>
    ${resultadoHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:11px;color:#8b8fa8;padding-bottom:6px;">PERÍODO</td><td align="right" style="font-size:11px;color:#8b8fa8;padding-bottom:6px;">TAXA</td><td align="right" style="font-size:11px;color:#8b8fa8;padding-bottom:6px;">ORIGEM</td></tr>
      ${linhasTabela}
    </table>`;

  return montarEmailBase({
    badgeLabel: '📈 SIMULAÇÃO SELIC',
    badgeBg: '#eff6ff',
    badgeColor: '#3b82f6',
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
