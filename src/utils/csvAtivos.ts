// Utilitários de CSV para a página de Ativos (preview-v2) — export/import de investimentos.
// Cabeçalho amigável (mesmos rótulos da tabela). Os 8 primeiros são os campos reais da
// tabela `investimentos`; os 2 últimos são calculados (só aparecem na exportação, nunca
// são exigidos/usados na importação).
export const CSV_HEADERS = [
  'Tipo', 'Ativo', 'Instituição', 'Indexador', 'Taxa', 'Aplicado', 'Aplicação', 'Vencimento',
  'Rendimento Final', 'Rendimento Final Líquido',
];
export const CSV_HEADERS_IMPORTAVEIS = CSV_HEADERS.slice(0, 8);

function escapeCsvField(value: string): string {
  if (/[",\n;]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function stringifyCsv(rows: string[][]): string {
  // ﻿ (BOM) garante que o Excel abra acentos (UTF-8) corretamente no Windows.
  return '﻿' + rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

// Parser simples de CSV com suporte a campos entre aspas (contendo vírgulas/quebras de linha).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  while (i < s.length) {
    const char = s[i];
    if (inQuotes) {
      if (char === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += char; i++; continue;
    }
    if (char === '"') { inQuotes = true; i++; continue; }
    if (char === ',') { row.push(field); field = ''; i++; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += char; i++;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

export function formatDataBRCsv(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// dd/mm/aaaa -> yyyy-mm-dd. Retorna null se vazio, undefined se inválido.
export function parseDataBRCsv(str: string): string | null | undefined {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo}-${d}`;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(y)) return undefined;
  return iso;
}

export function parseNumeroCsv(str: string): number | undefined {
  const trimmed = str.trim().replace(',', '.');
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}
