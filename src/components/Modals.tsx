'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Mail } from 'lucide-react';
import { montarTabelaOficial, projetarComTabela } from '../utils/selic';
import { gerarPdfSelic } from '../utils/pdfSelic';

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);
}
function formatDataBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function parseValorBR(s: string) {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', color: 'var(--dark-fg)', borderRadius: '6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', marginBottom: '8px' };

export function ModalSelic({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atual, setAtual] = useState<{ data: string; valor: number } | null>(null);
  const [projecoesFocus, setProjecoesFocus] = useState<{ ano: number; mediana: number }[]>([]);

  const hoje = new Date().toISOString().slice(0, 10);
  const [valorProjetado, setValorProjetado] = useState('10000,00');
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFinal, setDataFinal] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  });

  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [statusEmail, setStatusEmail] = useState<'ok' | 'erro' | null>(null);

  useEffect(() => {
    fetch('/api/selic')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setErro(data.error); return; }
        setAtual(data.atual);
        setProjecoesFocus(data.projecoes || []);
      })
      .catch((e) => setErro(e.message || 'Falha ao consultar o Banco Central'))
      .finally(() => setLoading(false));
  }, []);

  const tabelaOficial = useMemo(() => montarTabelaOficial(atual, projecoesFocus), [atual, projecoesFocus]);

  const resultado = useMemo(() => {
    if (!dataInicio || !dataFinal || tabelaOficial.length === 0) return null;
    return projetarComTabela(parseValorBR(valorProjetado), dataInicio, dataFinal, tabelaOficial);
  }, [valorProjetado, dataInicio, dataFinal, tabelaOficial]);

  function baixarPdf() {
    gerarPdfSelic({ atual, valorProjetado: parseValorBR(valorProjetado), dataInicio, dataFinal, resultado, tabelaOficial });
  }

  async function enviarPorEmail() {
    setEnviandoEmail(true);
    setStatusEmail(null);
    try {
      const res = await fetch('/api/selic/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atual, valorProjetado: parseValorBR(valorProjetado), dataInicio, dataFinal, resultado, tabelaOficial }),
      });
      setStatusEmail(res.ok ? 'ok' : 'erro');
    } catch {
      setStatusEmail('erro');
    } finally {
      setEnviandoEmail(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,7,10,0.99)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div style={{ background: 'var(--dark-popover)', padding: 'clamp(16px, 4vw, 24px)', borderRadius: '12px', width: 'min(900px, 100%)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--dark-border)', color: 'var(--dark-fg)', boxShadow: 'var(--dark-shadow-popover)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Simulador Avançado de Projeções (Meta Selic)</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--dark-fg)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
        </div>

        {loading && <p style={{ fontSize: '0.85rem', color: '#8b8fa8' }}>Consultando Meta Selic e projeções do Banco Central...</p>}

        {!loading && erro && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#ef4444', fontSize: '1.2rem' }}>!</span>
            <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Não foi possível consultar o Banco Central agora ({erro}). Tente novamente em instantes.</span>
          </div>
        )}

        {!loading && !erro && (
          <>
            <p style={{ fontSize: '0.85rem', marginBottom: '16px', color: 'var(--dark-fg)' }}>
              Taxa oficial vigente: <strong>{atual ? `${atual.valor.toFixed(2)}%` : '-'}</strong> (BCB, {atual ? formatDataBR(atual.data) : '-'}).
              Projeções de mercado (Focus) disponíveis até <strong>{tabelaOficial.length ? tabelaOficial[tabelaOficial.length - 1].fim.slice(0, 4) : '-'}</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div><label style={labelStyle}>Valor Projetado (R$)</label>
                   <input value={valorProjetado} onChange={(e) => setValorProjetado(e.target.value)} style={inputStyle} />
              </div>
              <div><label style={labelStyle}>Data de Início</label>
                   <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={inputStyle} />
              </div>
              <div><label style={labelStyle}>Data Final (Vencimento)</label>
                   <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {resultado && resultado.gapDetectado && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#ef4444', fontSize: '1.2rem' }}>!</span>
                <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                  Infelizmente não é possível projetar até {formatDataBR(dataFinal)} pois essa data vai além do que o Banco Central/Focus já projeta
                  {resultado.dataCobertaAte ? ` (cobertura automática vai até ${formatDataBR(resultado.dataCobertaAte)})` : ''}. Escolha uma data final dentro do período coberto.
                </span>
              </div>
            )}

            {resultado && !resultado.gapDetectado && (
              <div style={{ background: '#10b981', borderRadius: '10px', padding: '18px 20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>Valor projetado em {formatDataBR(dataFinal)}:</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fff' }}>{formatBRL(resultado.valorFinal)}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>Rendimento estimado: {formatBRL(resultado.rendimento)}</div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.25)', margin: '12px 0' }} />
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>Valor projetado líquido (com IR):</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>{formatBRL(resultado.valorFinalLiquido)}</div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>Rendimento líquido estimado: {formatBRL(resultado.rendimentoLiquido)}</div>
              </div>
            )}

            <div style={{ border: '1px solid var(--dark-border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'var(--dark-card)', borderBottom: '1px solid var(--dark-border)', fontSize: '0.85rem', fontWeight: 500 }}>
                Tabela Oficial do BC (Meta Selic + projeções Focus)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ color: '#8b8fa8', textAlign: 'left' }}>
                    <th style={{ padding: '8px 16px' }}>Início</th>
                    <th style={{ padding: '8px 16px' }}>Fim</th>
                    <th style={{ padding: '8px 16px' }}>Taxa</th>
                    <th style={{ padding: '8px 16px' }}>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {tabelaOficial.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--dark-border)', color: 'var(--dark-fg)' }}>
                      <td style={{ padding: '8px 16px' }}>{formatDataBR(p.inicio)}</td>
                      <td style={{ padding: '8px 16px' }}>{formatDataBR(p.fim)}</td>
                      <td style={{ padding: '8px 16px' }}>{p.taxa.toFixed(2)}%</td>
                      <td style={{ padding: '8px 16px', color: '#8b8fa8' }}>{p.origem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={baixarPdf} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--dark-card)', color: 'var(--dark-fg)', border: '1px solid var(--dark-border)', padding: '11px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                <Download size={16} /> Download PDF
              </button>
              <button onClick={enviarPorEmail} disabled={enviandoEmail} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-blue)', color: '#fff', border: '1px solid transparent', padding: '11px 18px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: enviandoEmail ? 'default' : 'pointer', opacity: enviandoEmail ? 0.6 : 1 }}>
                <Mail size={16} /> {enviandoEmail ? 'Enviando...' : 'Enviar por e-mail'}
              </button>
              {statusEmail === 'ok' && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>E-mail enviado.</span>}
              {statusEmail === 'erro' && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Falha ao enviar. Tente novamente.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
