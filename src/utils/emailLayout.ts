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

// Tokens copiados de src/app/globals.css (:root) — mesma paleta/tipografia do dashboard.
const FONT_STACK = "'Inter','Segoe UI',-apple-system,Roboto,Arial,sans-serif";
const FONT_STACK_BRAND = "'Outfit','Inter','Segoe UI',-apple-system,Roboto,Arial,sans-serif";
const COR_BG_PAGINA = '#dfe3ea'; // aproximação sólida do --bg-main (gradient não é confiável em e-mail)
const COR_TEXTO = '#1a1d27'; // --text-main
const COR_TEXTO_MUTED = '#8b8fa8'; // --text-muted
const COR_BORDA = 'rgba(139,143,168,0.35)'; // mesmo tom da borda do .grid-card

export function montarEmailBase({ badgeLabel, badgeBg, badgeColor, titulo, introducao, conteudoHtml, isTeste = false }: EmailBaseParams) {
  return `
<div style="background:${COR_BG_PAGINA};padding:32px 16px;font-family:${FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:separate;">
    <tr>
      <td style="background:#12141c;border-radius:14px 14px 0 0;padding:22px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#ffffff;font-size:15px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;font-family:${FONT_STACK_BRAND};">
              vrsbueno&nbsp;<span style="color:#00bfa5;">Invest</span>
            </td>
            <td align="right">
              <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${badgeBg};color:${badgeColor};white-space:nowrap;font-family:${FONT_STACK};">
                ${badgeLabel}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${isTeste ? `
    <tr>
      <td style="background:#fef3c7;padding:10px 28px;border-left:1px solid ${COR_BORDA};border-right:1px solid ${COR_BORDA};">
        <span style="font-size:11px;color:#f97316;font-weight:700;font-family:${FONT_STACK};">🧪&nbsp;E-MAIL DE TESTE — dados fictícios, não reflete a carteira real.</span>
      </td>
    </tr>` : ''}
    <tr>
      <td style="background:#ffffff;padding:28px;border-left:1px solid ${COR_BORDA};border-right:1px solid ${COR_BORDA};">
        <h1 style="margin:0 0 8px;font-size:19px;line-height:1.3;color:${COR_TEXTO};font-weight:700;font-family:${FONT_STACK};">${titulo}</h1>
        <p style="margin:0 0 22px;font-size:13.5px;color:${COR_TEXTO_MUTED};line-height:1.6;font-family:${FONT_STACK};">${introducao}</p>
        ${conteudoHtml}
      </td>
    </tr>
    <tr>
      <td style="background:#f9fafb;border-radius:0 0 14px 14px;padding:16px 28px;border:1px solid ${COR_BORDA};border-top:1px solid rgba(139,143,168,0.15);">
        <p style="margin:0;font-size:11px;color:${COR_TEXTO_MUTED};font-family:${FONT_STACK};">Alerta automático · Dashboard vrsbueno Invest</p>
      </td>
    </tr>
  </table>
</div>`;
}
