'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { montarTabelaOficial, projetarComTabela, SelicPeriodo } from '../utils/selic';

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

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', background: '#1f2029', border: '1px solid #323546', color: '#fff', borderRadius: '6px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', marginBottom: '8px' };

export function ModalAdicionar({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#12141c', padding: '24px', borderRadius: '12px', width: '500px', border: '1px solid #323546', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Adicionar Ativo</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Tipo</label>
               <select style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px'}}><option>CDB</option></select>
          </div>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Instituição</label>
               <input placeholder="Ex: DAYCOVAL" style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px'}}/>
          </div>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Indexador</label>
               <select style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px'}}><option>Pré-Fixado</option></select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Taxa (%)</label>
               <input defaultValue="14,00" style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px', textAlign:'center'}}/>
          </div>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Valor Aplicado (R$)</label>
               <input defaultValue="1000,00" style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px', textAlign:'center'}}/>
          </div>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Corretora</label>
               <input placeholder="Ex: XP" style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px'}}/>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Data de Aplicação</label>
               <input defaultValue="01/09/2026" style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px'}}/>
          </div>
          <div><label style={{display:'block', fontSize:'0.75rem', marginBottom:'8px'}}>Data de Vencimento</label>
               <input defaultValue="01/09/2027" style={{width:'100%', padding:'10px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px'}}/>
          </div>
        </div>
        <button style={{ width: '100%', padding: '12px', background: '#1a1d27', border: '1px solid #323546', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Atualizar Ativos</button>
      </div>
    </div>
  );
}

export function ModalRemover({ onClose, ativos }: { onClose: () => void, ativos: any[] }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#12141c', padding: '24px', borderRadius: '12px', width: '500px', border: '1px solid #323546', color: '#e2e4f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>Remover Ativo</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
        </div>
        <p style={{ fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.5 }}>Selecione o ativo que deseja remover. <strong>Esta ação excluirá a linha completa no Supabase/Database.</strong></p>
        
        <label style={{display:'block', fontSize:'0.85rem', marginBottom:'8px'}}>Selecione o ativo:</label>
        <select style={{width:'100%', padding:'12px', background:'#1f2029', border:'1px solid #323546', color:'#fff', borderRadius:'6px', marginBottom:'24px', fontSize: '0.85rem'}}>
          {ativos.map(a => <option key={a.id}>{a.emissor}</option>)}
        </select>
        
        <button style={{ width: '100%', padding: '14px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Confirmar Remoção</button>
      </div>
    </div>
  );
}

export function ModalSelic({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atual, setAtual] = useState<{ data: string; valor: number } | null>(null);
  const [projecoesFocus, setProjecoesFocus] = useState<{ ano: number; mediana: number }[]>([]);
  const [tranchesManuais, setTranchesManuais] = useState<SelicPeriodo[]>([]);

  const hoje = new Date().toISOString().slice(0, 10);
  const [valorProjetado, setValorProjetado] = useState('10000,00');
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFinal, setDataFinal] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().slice(0, 10);
  });

  const [novaInicio, setNovaInicio] = useState('');
  const [novaFim, setNovaFim] = useState('');
  const [novaTaxa, setNovaTaxa] = useState('');

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
  const tabelaCompleta = useMemo(() => [...tabelaOficial, ...tranchesManuais], [tabelaOficial, tranchesManuais]);

  const resultado = useMemo(() => {
    if (!dataInicio || !dataFinal || tabelaCompleta.length === 0) return null;
    return projetarComTabela(parseValorBR(valorProjetado), dataInicio, dataFinal, tabelaCompleta);
  }, [valorProjetado, dataInicio, dataFinal, tabelaCompleta]);

  function adicionarTranche() {
    if (!novaInicio || !novaFim || !novaTaxa) return;
    setTranchesManuais((prev) => [...prev, { inicio: novaInicio, fim: novaFim, taxa: parseValorBR(novaTaxa), origem: 'Manual' }]);
    setNovaInicio(''); setNovaFim(''); setNovaTaxa('');
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#12141c', padding: '24px', borderRadius: '12px', width: '900px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #323546', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Simulador Avançado de Projeções (Meta Selic)</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
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
            <p style={{ fontSize: '0.85rem', marginBottom: '16px', color: '#e2e4f0' }}>
              Taxa oficial vigente: <strong>{atual ? `${atual.valor.toFixed(2)}%` : '-'}</strong> (BCB, {atual ? formatDataBR(atual.data) : '-'}).
              Projeções de mercado (Focus) disponíveis até <strong>{tabelaOficial.length ? tabelaOficial[tabelaOficial.length - 1].fim.slice(0, 4) : '-'}</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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
                  {resultado.dataCobertaAte ? ` (cobertura automática vai até ${formatDataBR(resultado.dataCobertaAte)})` : ''}. Adicione uma tranche manual abaixo para estender a projeção.
                </span>
              </div>
            )}

            {resultado && !resultado.gapDetectado && (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.85rem', color: '#e2e4f0' }}>Valor projetado em {formatDataBR(dataFinal)}:</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>{formatBRL(resultado.valorFinal)}</div>
                <div style={{ fontSize: '0.8rem', color: '#8b8fa8' }}>Rendimento estimado: {formatBRL(resultado.rendimento)}</div>
              </div>
            )}

            <div style={{ border: '1px solid #323546', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: '#1c1e28', borderBottom: '1px solid #323546', fontSize: '0.85rem', fontWeight: 500 }}>
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
                  {tabelaCompleta.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #23253b', color: '#e2e4f0' }}>
                      <td style={{ padding: '8px 16px' }}>{formatDataBR(p.inicio)}</td>
                      <td style={{ padding: '8px 16px' }}>{formatDataBR(p.fim)}</td>
                      <td style={{ padding: '8px 16px' }}>{p.taxa.toFixed(2)}%</td>
                      <td style={{ padding: '8px 16px', color: '#8b8fa8' }}>{p.origem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ border: '1px solid #323546', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '16px', background: '#1c1e28', borderBottom: '1px solid #323546', fontSize: '0.85rem', fontWeight: 500 }}>
                 + Inserir Nova Tranche Meta Selic
              </div>
              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
                <div><label style={labelStyle}>Data Inicial</label>
                     <input type="date" value={novaInicio} onChange={(e) => setNovaInicio(e.target.value)} style={inputStyle} />
                </div>
                <div><label style={labelStyle}>Data Final</label>
                     <input type="date" value={novaFim} onChange={(e) => setNovaFim(e.target.value)} style={inputStyle} />
                </div>
                <div><label style={labelStyle}>Nova Taxa Selic (% a.a.)</label>
                     <input value={novaTaxa} onChange={(e) => setNovaTaxa(e.target.value)} placeholder="10,50" style={inputStyle} />
                </div>
              </div>
              <div style={{ padding: '0 24px 24px' }}>
                <button onClick={adicionarTranche} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>+ Adicionar Projeção à Tabela Oficial do BC</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
