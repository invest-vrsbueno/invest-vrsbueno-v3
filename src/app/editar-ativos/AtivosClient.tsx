'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, ArrowLeft, Download, Upload, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { ConfirmModal } from '../../components/ConfirmModal';
import { calculateAsset } from '../../utils/finance';
import { aliquotaIR } from '../../utils/fgc';
import { CSV_HEADERS, CSV_HEADERS_IMPORTAVEIS, stringifyCsv, parseCsv, formatDataBRCsv, parseDataBRCsv, parseNumeroCsv } from '../../utils/csvAtivos';

interface Investimento {
  id: string;
  tipo: string;
  emissor: string;
  indexador_tipo: string;
  taxa: number;
  instituicao_agrupadora: string;
  valor_aplicado: number;
  data_aplicacao: string;
  data_vencimento: string | null;
}

type Rascunho = Omit<Investimento, 'id'>;

const CAMPOS_LABEL: Record<keyof Rascunho, string> = {
  tipo: 'Tipo',
  emissor: 'Ativo / Emissor',
  indexador_tipo: 'Indexador',
  taxa: 'Taxa (%)',
  instituicao_agrupadora: 'Instituição',
  valor_aplicado: 'Valor Aplicado',
  data_aplicacao: 'Data de Aplicação',
  data_vencimento: 'Data de Vencimento',
};

const RASCUNHO_VAZIO: Rascunho = {
  tipo: 'CDB',
  emissor: '',
  indexador_tipo: 'PRÉ',
  taxa: 0,
  instituicao_agrupadora: '',
  valor_aplicado: 0,
  data_aplicacao: new Date().toISOString().slice(0, 10),
  data_vencimento: '',
};

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
}
const formatDataBR = formatDataBRCsv;

const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 8px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', color: 'var(--dark-fg)', borderRadius: '5px', fontSize: '0.8rem' };
const NOVO_ID = '__novo__';

type Acao =
  | { tipo: 'editar'; id: string; original: Investimento; novo: Rascunho }
  | { tipo: 'remover'; item: Investimento }
  | { tipo: 'adicionar'; novo: Rascunho }
  | { tipo: 'importar'; itens: Rascunho[] };

type CampoOrdenavel = keyof Rascunho | 'rendimentoFinal' | 'rendimentoFinalLiquido';

// Prazo padrão (365 dias) quando não há data_vencimento — mesmo fallback do finance.ts,
// pra manter o líquido do vencimento consistente com o resto do dashboard.
function resolveDtVencimento(item: Investimento, today: Date): Date {
  return item.data_vencimento ? new Date(item.data_vencimento) : new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
}

function Th({ label, campo, sortField, sortDir, onSort }: {
  label: string;
  campo: CampoOrdenavel;
  sortField: CampoOrdenavel | null;
  sortDir: 'asc' | 'desc';
  onSort: (campo: CampoOrdenavel) => void;
}) {
  const ativo = sortField === campo;
  return (
    <th
      onClick={() => onSort(campo)}
      style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--dark-popover)', color: ativo ? '#fff' : '#8b8fa8', padding: '10px 8px', fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      title="Clique para ordenar"
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        {ativo ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.35 }} />}
      </span>
    </th>
  );
}

function comRendimentoFinal(item: Investimento, today: Date) {
  const enriched = calculateAsset(item, today);
  const dtVencimento = resolveDtVencimento(item, today);
  const rendimentoFinal = Math.max(0, enriched.projetadoVencimento - enriched.aplicado);
  const aliquota = aliquotaIR(item.tipo, item.data_aplicacao, dtVencimento);
  const rendimentoFinalLiquido = rendimentoFinal - rendimentoFinal * aliquota;
  return { ...item, rendimentoFinal, rendimentoFinalLiquido };
}

export default function AtivosClient({ initialData }: { initialData: Investimento[] }) {
  const supabase = createClient();
  const [data, setData] = useState<Investimento[]>(initialData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_VAZIO);
  const [acaoConfirmar, setAcaoConfirmar] = useState<Acao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sortField, setSortField] = useState<CampoOrdenavel | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TODAY = useMemo(() => new Date(), []);
  const enriquecidos = useMemo(() => data.map((item) => comRendimentoFinal(item, TODAY)), [data, TODAY]);

  const linhas = useMemo(() => {
    if (!sortField) return enriquecidos;
    const mult = sortDir === 'asc' ? 1 : -1;
    return [...enriquecidos].sort((a, b) => {
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
      return String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR') * mult;
    });
  }, [enriquecidos, sortField, sortDir]);

  function alternarOrdenacao(campo: CampoOrdenavel) {
    if (sortField === campo) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(campo);
      setSortDir('asc');
    }
  }

  function iniciarEdicao(item: Investimento) {
    setErro(null);
    setEditingId(item.id);
    setRascunho({
      tipo: item.tipo,
      emissor: item.emissor,
      indexador_tipo: item.indexador_tipo,
      taxa: item.taxa,
      instituicao_agrupadora: item.instituicao_agrupadora,
      valor_aplicado: item.valor_aplicado,
      data_aplicacao: item.data_aplicacao.slice(0, 10),
      data_vencimento: item.data_vencimento ? item.data_vencimento.slice(0, 10) : '',
    });
  }

  function iniciarNovo() {
    setErro(null);
    setEditingId(NOVO_ID);
    setRascunho(RASCUNHO_VAZIO);
  }

  function cancelarEdicao() {
    setEditingId(null);
    setRascunho(RASCUNHO_VAZIO);
    setErro(null);
  }

  function validar(r: Rascunho): string | null {
    if (!r.emissor.trim()) return 'Informe o ativo/emissor.';
    if (!r.instituicao_agrupadora.trim()) return 'Informe a instituição.';
    if (!r.data_aplicacao) return 'Informe a data de aplicação.';
    if (r.valor_aplicado <= 0) return 'O valor aplicado deve ser maior que zero.';
    if (r.taxa <= 0) return 'A taxa deve ser maior que zero.';
    return null;
  }

  function pedirConfirmacaoSalvar() {
    const msg = validar(rascunho);
    if (msg) { setErro(msg); return; }
    setErro(null);

    if (editingId === NOVO_ID) {
      setAcaoConfirmar({ tipo: 'adicionar', novo: rascunho });
    } else {
      const original = data.find((d) => d.id === editingId);
      if (!original) return;
      setAcaoConfirmar({ tipo: 'editar', id: original.id, original, novo: rascunho });
    }
  }

  function pedirConfirmacaoRemover(item: Investimento) {
    setAcaoConfirmar({ tipo: 'remover', item });
  }

  async function confirmarAcao() {
    if (!acaoConfirmar) return;
    setSalvando(true);
    setErro(null);

    try {
      if (acaoConfirmar.tipo === 'adicionar') {
        const payload = { ...acaoConfirmar.novo, data_vencimento: acaoConfirmar.novo.data_vencimento || null };
        const { data: inserido, error } = await supabase.from('investimentos').insert(payload).select().single();
        if (error) throw error;
        setData((prev) => [...prev, inserido as Investimento]);
      } else if (acaoConfirmar.tipo === 'editar') {
        const payload = { ...acaoConfirmar.novo, data_vencimento: acaoConfirmar.novo.data_vencimento || null };
        const { error } = await supabase.from('investimentos').update(payload).eq('id', acaoConfirmar.id);
        if (error) throw error;
        setData((prev) => prev.map((d) => (d.id === acaoConfirmar.id ? { ...d, ...payload } : d)));
      } else if (acaoConfirmar.tipo === 'remover') {
        const { error } = await supabase.from('investimentos').delete().eq('id', acaoConfirmar.item.id);
        if (error) throw error;
        setData((prev) => prev.filter((d) => d.id !== acaoConfirmar.item.id));
      } else if (acaoConfirmar.tipo === 'importar') {
        const payload = acaoConfirmar.itens.map((it) => ({ ...it, data_vencimento: it.data_vencimento || null }));
        const { data: inseridos, error } = await supabase.from('investimentos').insert(payload).select();
        if (error) throw error;
        setData((prev) => [...prev, ...((inseridos as Investimento[]) || [])]);
      }
      setAcaoConfirmar(null);
      setEditingId(null);
      setRascunho(RASCUNHO_VAZIO);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar. Tente novamente.');
      setAcaoConfirmar(null);
    } finally {
      setSalvando(false);
    }
  }

  function alteracoes(original: Investimento, novo: Rascunho) {
    const chaves = Object.keys(CAMPOS_LABEL) as (keyof Rascunho)[];
    return chaves
      .map((k) => {
        const valorOriginal = k === 'data_vencimento' ? (original.data_vencimento || '') : String((original as any)[k]);
        const valorNovo = String(novo[k]);
        if (valorOriginal === valorNovo) return null;
        return { campo: CAMPOS_LABEL[k], de: valorOriginal, para: valorNovo };
      })
      .filter(Boolean) as { campo: string; de: string; para: string }[];
  }

  function exportarCsv() {
    const linhasCsv = [CSV_HEADERS, ...linhas.map((item) => [
      item.tipo,
      item.emissor,
      item.instituicao_agrupadora,
      item.indexador_tipo,
      String(item.taxa),
      String(item.valor_aplicado),
      formatDataBRCsv(item.data_aplicacao),
      formatDataBRCsv(item.data_vencimento),
      item.rendimentoFinal.toFixed(2),
      item.rendimentoFinalLiquido.toFixed(2),
    ])];
    const csv = stringifyCsv(linhasCsv);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ativos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function iniciarImportacao() {
    setErro(null);
    fileInputRef.current?.click();
  }

  async function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErro(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErro('Envie um arquivo .csv — outros formatos não são aceitos.');
      return;
    }

    const texto = await file.text();
    const linhasArquivo = parseCsv(texto);
    if (linhasArquivo.length === 0) {
      setErro('O arquivo está vazio.');
      return;
    }

    const cabecalho = linhasArquivo[0].map((h) => h.trim());
    const cabecalhoOk = CSV_HEADERS_IMPORTAVEIS.every((h, i) => cabecalho[i] === h);
    if (!cabecalhoOk) {
      setErro(`Formato de planilha não reconhecido. As 8 primeiras colunas precisam ser exatamente: ${CSV_HEADERS_IMPORTAVEIS.join(', ')}.`);
      return;
    }

    const linhasDados = linhasArquivo.slice(1).filter((r) => r.some((c) => c.trim() !== ''));
    if (linhasDados.length === 0) {
      setErro('Nenhuma linha de dados encontrada no arquivo.');
      return;
    }

    const itens: Rascunho[] = [];
    for (let idx = 0; idx < linhasDados.length; idx++) {
      const l = linhasDados[idx];
      const numLinha = idx + 2;
      const [tipo, emissor, instituicao, indexador, taxaStr, aplicadoStr, aplicacaoStr, vencimentoStr] = l;

      if (!['CDB', 'LCA', 'LCI', 'LF'].includes((tipo || '').trim())) {
        setErro(`Linha ${numLinha}: Tipo "${tipo}" inválido (use CDB, LCA, LCI ou LF).`); return;
      }
      if (!emissor?.trim()) { setErro(`Linha ${numLinha}: Ativo vazio.`); return; }
      if (!instituicao?.trim()) { setErro(`Linha ${numLinha}: Instituição vazia.`); return; }
      if (!['PRÉ', 'PÓS'].includes((indexador || '').trim())) {
        setErro(`Linha ${numLinha}: Indexador "${indexador}" inválido (use PRÉ ou PÓS).`); return;
      }
      const taxa = parseNumeroCsv(taxaStr || '');
      if (taxa === undefined || taxa <= 0) { setErro(`Linha ${numLinha}: Taxa inválida.`); return; }
      const valorAplicado = parseNumeroCsv(aplicadoStr || '');
      if (valorAplicado === undefined || valorAplicado <= 0) { setErro(`Linha ${numLinha}: Aplicado inválido.`); return; }
      const dataAplicacao = parseDataBRCsv(aplicacaoStr || '');
      if (!dataAplicacao) { setErro(`Linha ${numLinha}: Aplicação inválida (use dd/mm/aaaa).`); return; }
      const dataVencimento = parseDataBRCsv(vencimentoStr || '');
      if (dataVencimento === undefined) { setErro(`Linha ${numLinha}: Vencimento inválido (use dd/mm/aaaa ou deixe em branco).`); return; }

      itens.push({
        tipo: tipo.trim(), emissor: emissor.trim(), indexador_tipo: indexador.trim(), taxa,
        instituicao_agrupadora: instituicao.trim(), valor_aplicado: valorAplicado,
        data_aplicacao: dataAplicacao, data_vencimento: dataVencimento,
      });
    }

    setAcaoConfirmar({ tipo: 'importar', itens });
  }

  const linhaEditavel = (id: string) => (
    <tr key={id} style={{ background: 'var(--dark-popover)' }}>
      <td style={{ padding: '8px' }}>
        <select value={rascunho.tipo} onChange={(e) => setRascunho({ ...rascunho, tipo: e.target.value })} style={inputStyle}>
          <option>CDB</option><option>LCA</option><option>LCI</option><option>LF</option>
        </select>
      </td>
      <td style={{ padding: '8px' }}><input value={rascunho.emissor} onChange={(e) => setRascunho({ ...rascunho, emissor: e.target.value })} style={inputStyle} /></td>
      <td style={{ padding: '8px' }}><input value={rascunho.instituicao_agrupadora} onChange={(e) => setRascunho({ ...rascunho, instituicao_agrupadora: e.target.value })} style={inputStyle} /></td>
      <td style={{ padding: '8px' }}>
        <select value={rascunho.indexador_tipo} onChange={(e) => setRascunho({ ...rascunho, indexador_tipo: e.target.value })} style={inputStyle}>
          <option value="PRÉ">PRÉ</option><option value="PÓS">PÓS</option>
        </select>
      </td>
      <td style={{ padding: '8px' }}><input type="number" step="0.0001" value={rascunho.taxa} onChange={(e) => setRascunho({ ...rascunho, taxa: parseFloat(e.target.value) || 0 })} style={inputStyle} /></td>
      <td style={{ padding: '8px' }}><input type="number" step="0.01" value={rascunho.valor_aplicado} onChange={(e) => setRascunho({ ...rascunho, valor_aplicado: parseFloat(e.target.value) || 0 })} style={inputStyle} /></td>
      <td style={{ padding: '8px' }}><input type="date" value={rascunho.data_aplicacao} onChange={(e) => setRascunho({ ...rascunho, data_aplicacao: e.target.value })} style={inputStyle} /></td>
      <td style={{ padding: '8px' }}><input type="date" value={rascunho.data_vencimento || ''} onChange={(e) => setRascunho({ ...rascunho, data_vencimento: e.target.value })} style={inputStyle} /></td>
      <td style={{ padding: '8px', color: '#4b4e5c', fontSize: '0.75rem' }}>—</td>
      <td style={{ padding: '8px', color: '#4b4e5c', fontSize: '0.75rem' }}>—</td>
      <td style={{ padding: '8px', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: 'var(--dark-popover)', boxShadow: '-6px 0 8px -6px rgba(0,0,0,0.5)' }}>
        <button onClick={pedirConfirmacaoSalvar} title="Salvar" style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: '#10b981', marginRight: '8px' }}><Check size={18} /></button>
        <button onClick={cancelarEdicao} title="Cancelar" style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: '#8b8fa8' }}><X size={18} /></button>
      </td>
    </tr>
  );

  return (
    <div className="fade-in dark-zone" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <input ref={fileInputRef} type="file" accept=".csv" onChange={onArquivoSelecionado} style={{ display: 'none' }} />
      <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
          <div>
            <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b8fa8', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '8px' }}>
              <ArrowLeft size={14} /> Voltar ao dashboard
            </a>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Ativos</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={exportarCsv}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#e2e4f0', border: '1px solid var(--dark-border)', padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              <Download size={16} /> Exportar CSV
            </button>
            <button
              onClick={iniciarImportacao}
              disabled={editingId !== null}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#e2e4f0', border: '1px solid var(--dark-border)', padding: '10px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: editingId !== null ? 'default' : 'pointer', opacity: editingId !== null ? 0.5 : 1 }}
            >
              <Upload size={16} /> Importar CSV
            </button>
            <button
              onClick={iniciarNovo}
              disabled={editingId !== null}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: '#fff', border: '1px solid transparent', padding: '10px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: editingId !== null ? 'default' : 'pointer', opacity: editingId !== null ? 0.5 : 1 }}
            >
              <Plus size={18} strokeWidth={3} /> Adicionar Investimento
            </button>
          </div>
        </div>

        {erro && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', flexShrink: 0 }}>{erro}</div>}

        {/* Área "estilo planilha": só esta caixa rola (vertical e horizontal). Cabeçalho da
            tabela e coluna de Ações ficam fixos via position:sticky — ver
            architecture/EDITAR_ATIVOS_scroll_planilha.md */}
        <div className="dark-card" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1360px' }}>
            <thead>
              <tr>
                <Th label="Tipo" campo="tipo" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Ativo" campo="emissor" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Instituição" campo="instituicao_agrupadora" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Indexador" campo="indexador_tipo" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Taxa" campo="taxa" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Aplicado" campo="valor_aplicado" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Aplicação" campo="data_aplicacao" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Vencimento" campo="data_vencimento" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Rendimento Final" campo="rendimentoFinal" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <Th label="Rendimento Final Líquido" campo="rendimentoFinalLiquido" sortField={sortField} sortDir={sortDir} onSort={alternarOrdenacao} />
                <th style={{ position: 'sticky', top: 0, right: 0, zIndex: 3, background: 'var(--dark-popover)', color: '#8b8fa8', padding: '10px 8px', fontSize: '0.75rem', boxShadow: '-6px 0 8px -6px rgba(0,0,0,0.5)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {editingId === NOVO_ID && linhaEditavel(NOVO_ID)}
              {linhas.map((item) =>
                editingId === item.id ? (
                  linhaEditavel(item.id)
                ) : (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--dark-border)' }}>
                    <td style={{ color: 'var(--dark-fg)', padding: '10px 8px' }}>{item.tipo}</td>
                    <td style={{ color: 'var(--dark-fg)', padding: '10px 8px' }}>{item.emissor}</td>
                    <td style={{ color: 'var(--dark-fg)', padding: '10px 8px' }}>{item.instituicao_agrupadora}</td>
                    <td style={{ color: 'var(--dark-fg)', padding: '10px 8px' }}>{item.indexador_tipo}</td>
                    <td style={{ color: 'var(--dark-fg)', padding: '10px 8px' }}>{item.taxa}%</td>
                    <td style={{ color: 'var(--dark-fg)', padding: '10px 8px' }}>{formatBRL(item.valor_aplicado)}</td>
                    <td style={{ color: '#8b8fa8', padding: '10px 8px' }}>{formatDataBR(item.data_aplicacao)}</td>
                    <td style={{ color: '#8b8fa8', padding: '10px 8px' }}>{formatDataBR(item.data_vencimento)}</td>
                    <td style={{ color: '#00d4b8', padding: '10px 8px', fontWeight: 600 }}>{formatBRL(item.rendimentoFinal)}</td>
                    <td style={{ color: '#00d4b8', padding: '10px 8px', fontWeight: 600 }}>{formatBRL(item.rendimentoFinalLiquido)}</td>
                    <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', position: 'sticky', right: 0, zIndex: 1, background: 'var(--dark-card)', boxShadow: '-6px 0 8px -6px rgba(0,0,0,0.5)' }}>
                      <button onClick={() => iniciarEdicao(item)} disabled={editingId !== null} title="Editar" style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '6px', padding: '4px', cursor: editingId !== null ? 'default' : 'pointer', color: '#8b8fa8', marginRight: '10px', opacity: editingId !== null ? 0.4 : 1 }}><Pencil size={16} /></button>
                      <button onClick={() => pedirConfirmacaoRemover(item)} disabled={editingId !== null} title="Remover" style={{ background: 'transparent', border: '1px solid transparent', borderRadius: '6px', padding: '4px', cursor: editingId !== null ? 'default' : 'pointer', color: '#ef4444', opacity: editingId !== null ? 0.4 : 1 }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {acaoConfirmar?.tipo === 'adicionar' && (
        <ConfirmModal titulo="Confirmar novo investimento" onConfirm={confirmarAcao} onCancel={() => setAcaoConfirmar(null)} corConfirmar="#3b82f6" textoConfirmar="Adicionar" carregando={salvando}>
          <div>{acaoConfirmar.novo.emissor} — {acaoConfirmar.novo.instituicao_agrupadora}</div>
          <div style={{ color: '#8b8fa8', marginTop: '4px' }}>{formatBRL(acaoConfirmar.novo.valor_aplicado)} aplicados em {formatDataBR(acaoConfirmar.novo.data_aplicacao)}</div>
        </ConfirmModal>
      )}

      {acaoConfirmar?.tipo === 'editar' && (
        <ConfirmModal titulo="Confirmar alterações" onConfirm={confirmarAcao} onCancel={() => setAcaoConfirmar(null)} corConfirmar="#3b82f6" textoConfirmar="Salvar alterações" carregando={salvando}>
          {alteracoes(acaoConfirmar.original, acaoConfirmar.novo).length === 0 ? (
            <div>Nenhum campo foi alterado.</div>
          ) : (
            alteracoes(acaoConfirmar.original, acaoConfirmar.novo).map((a) => (
              <div key={a.campo} style={{ marginBottom: '6px' }}>
                <strong>{a.campo}:</strong> <span style={{ color: '#8b8fa8' }}>{a.de || '—'}</span> → <span style={{ color: '#10b981' }}>{a.para || '—'}</span>
              </div>
            ))
          )}
        </ConfirmModal>
      )}

      {acaoConfirmar?.tipo === 'remover' && (
        <ConfirmModal titulo="Remover investimento" onConfirm={confirmarAcao} onCancel={() => setAcaoConfirmar(null)} corConfirmar="#ef4444" textoConfirmar="Remover" carregando={salvando}>
          Tem certeza que deseja remover <strong>{acaoConfirmar.item.emissor}</strong> ({acaoConfirmar.item.instituicao_agrupadora})? Esta ação não pode ser desfeita.
        </ConfirmModal>
      )}

      {acaoConfirmar?.tipo === 'importar' && (
        <ConfirmModal titulo={`Confirmar importação de ${acaoConfirmar.itens.length} investimento(s)`} onConfirm={confirmarAcao} onCancel={() => setAcaoConfirmar(null)} corConfirmar="#3b82f6" textoConfirmar="Importar" carregando={salvando}>
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {acaoConfirmar.itens.slice(0, 8).map((it, i) => (
              <div key={i} style={{ marginBottom: '6px' }}>
                {it.tipo} {it.emissor} — {it.instituicao_agrupadora} — {formatBRL(it.valor_aplicado)}
              </div>
            ))}
            {acaoConfirmar.itens.length > 8 && (
              <div style={{ color: '#8b8fa8' }}>... e mais {acaoConfirmar.itens.length - 8} investimento(s).</div>
            )}
          </div>
          <div style={{ marginTop: '12px', color: '#8b8fa8' }}>
            Esses investimentos serão adicionados como novos registros — nada do que já existe será alterado ou removido.
          </div>
        </ConfirmModal>
      )}
    </div>
  );
}
