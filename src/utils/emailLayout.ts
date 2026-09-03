// Layout compartilhado dos e-mails de alerta, seguindo o design system do
// dashboard: cabeçalho escuro de marca (#12141c), conteúdo em card claro
// com bordas suaves, badges de status e paleta consistente com o app.
// HTML com estilos inline + tabelas, para compatibilidade com clientes de e-mail.

export interface EmailBaseParams {
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
  titulo: string;
  introducao: string;
  conteudoHtml: string;
  isTeste?: boolean;
}

const FONT_STACK = "'Inter','Segoe UI',-apple-system,Roboto,Arial,sans-serif";

export function montarEmailBase({ badgeLabel, badgeBg, badgeColor, titulo, introducao, conteudoHtml, isTeste = false }: EmailBaseParams) {
  return `
<div style="background:#f4f5f8;padding:32px 16px;font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:separate;">
    <tr>
      <td style="background:#12141c;border-radius:14px 14px 0 0;padding:22px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#ffffff;font-size:15px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-family:${FONT_STACK};">
              vrsbueno&nbsp;<span style="color:#00bfa5;">Invest</span>
            </td>
            <td align="right">
              <span style="display:inline-block;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${badgeBg};color:${badgeColor};white-space:nowrap;font-family:${FONT_STACK};">
                ${badgeLabel}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${isTeste ? `
    <tr>
      <td style="background:#fef3c7;padding:10px 28px;border-left:1px solid #e2e4f0;border-right:1px solid #e2e4f0;">
        <span style="font-size:11px;color:#92400e;font-weight:700;font-family:${FONT_STACK};">🧪&nbsp;E-MAIL DE TESTE — dados fictícios, não reflete a carteira real.</span>
      </td>
    </tr>` : ''}
    <tr>
      <td style="background:#ffffff;padding:28px;border-left:1px solid #e2e4f0;border-right:1px solid #e2e4f0;">
        <h1 style="margin:0 0 8px;font-size:19px;line-height:1.3;color:#1a1d27;font-weight:700;font-family:${FONT_STACK};">${titulo}</h1>
        <p style="margin:0 0 22px;font-size:13.5px;color:#5a5d7a;line-height:1.6;font-family:${FONT_STACK};">${introducao}</p>
        ${conteudoHtml}
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;border-radius:0 0 14px 14px;padding:16px 28px;border:1px solid #e2e4f0;border-top:1px solid #f0f1f4;">
        <p style="margin:0;font-size:11px;color:#8b8fa8;font-family:${FONT_STACK};">Alerta automático · Dashboard vrsbueno Invest</p>
      </td>
    </tr>
  </table>
</div>`;
}
