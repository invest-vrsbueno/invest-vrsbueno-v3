import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
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

export function gerarPdfSelic({ atual, valorProjetado, dataInicio, dataFinal, resultado, tabelaOficial }: DadosSimulacaoSelic) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(26, 29, 39);
  doc.text('vrsbueno Invest — Simulador de Projeções (Meta Selic)', 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(139, 143, 168);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 24);

  doc.setFontSize(10);
  doc.setTextColor(60, 63, 80);
  doc.text(
    atual ? `Taxa oficial vigente: ${atual.valor.toFixed(2)}% (BCB, ${formatDataBR(atual.data)})` : 'Taxa oficial vigente: indisponível',
    14,
    34
  );
  doc.text(`Valor projetado: ${formatBRL(valorProjetado)}`, 14, 40);
  doc.text(`Período: ${formatDataBR(dataInicio)} até ${formatDataBR(dataFinal)}`, 14, 46);

  let y = 56;
  if (resultado && !resultado.gapDetectado) {
    // Mesmo verde sólido (#10b981) + texto branco do card de resultado na tela e no e-mail.
    const boxY = y - 6;
    const boxHeight = 27;
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(14, boxY, 182, boxHeight, 3, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Valor projetado em ${formatDataBR(dataFinal)}:`, 20, boxY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(formatBRL(resultado.valorFinal), 20, boxY + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Rendimento estimado: ${formatBRL(resultado.rendimento)}`, 20, boxY + 24);

    doc.setTextColor(60, 63, 80);
    y = boxY + boxHeight + 8;
  } else if (resultado?.gapDetectado) {
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text(
      `Projeção incompleta: cobertura de dados disponível apenas até ${resultado.dataCobertaAte ? formatDataBR(resultado.dataCobertaAte) : '-'}.`,
      14,
      y
    );
    y += 10;
  }

  autoTable(doc, {
    startY: y,
    head: [['Início', 'Fim', 'Taxa', 'Origem']],
    body: tabelaOficial.map((p) => [formatDataBR(p.inicio), formatDataBR(p.fim), `${p.taxa.toFixed(2)}%`, p.origem]),
    headStyles: { fillColor: [26, 29, 39] },
    styles: { fontSize: 9 },
  });

  doc.save(`simulacao-selic-${dataFinal}.pdf`);
}
