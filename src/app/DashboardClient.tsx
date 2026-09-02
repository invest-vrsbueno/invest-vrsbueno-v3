'use client';

import React, { useMemo, useState } from 'react';
import { FileDown, Plus, Minus, Calculator } from 'lucide-react';
import { calculateAsset, generateEvolutionCurve } from '../utils/finance';
import { DashboardTopLayout } from '../components/DashboardTopLayout';
import { ModalAdicionar, ModalRemover, ModalSelic } from '../components/Modals';

const CORES = ["#00bfa5", "#6c63ff", "#f97316", "#3b82f6", "#ec4899", "#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

export default function DashboardClient({ initialData }: { initialData: any[] }) {
  const TODAY = new Date();
  
  // Data Enriching
  const data = useMemo(() => {
    return initialData.map(item => calculateAsset(item, TODAY));
  }, [initialData]);

  // Modals State
  const [showAdd, setShowAdd] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [showSelic, setShowSelic] = useState(false);

  // Metrics
  const totalAplicado = data.reduce((acc, obj) => acc + obj.aplicado, 0);
  const patrimonioTotal = data.reduce((acc, obj) => acc + obj.posicaoHoje, 0);
  const rendAcumulado = data.reduce((acc, obj) => acc + obj.rendimentoAcumulado, 0);
  const projVencimento = data.reduce((acc, obj) => acc + obj.projetadoVencimento, 0);
  const saldoCaixaMock = 101750;

  const agrupaFGC = data.reduce((acc: any, obj) => {
    const inst = obj.instituicao_agrupadora;
    if (!acc[inst]) acc[inst] = 0;
    acc[inst] += obj.posicaoHoje;
    return acc;
  }, {});
  
  const byInstArray = Object.keys(agrupaFGC).map(k => ({ name: k, value: agrupaFGC[k] })).sort((a,b)=>b.value - a.value);
  let instComRisco = 0;
  const LIMIT_FGC = 250000;
  byInstArray.forEach(i => { if (i.value >= LIMIT_FGC) instComRisco++; });

  const byYear = data.reduce((acc: any, obj) => {
    const y = obj.anoVencimento || 2026;
    if (!acc[y]) acc[y] = { name: String(y), vence: 0, gerado: 0 };
    acc[y].vence += obj.projetadoVencimento;
    acc[y].gerado += (obj.projetadoVencimento - obj.aplicado);
    return acc;
  }, {});
  const barData = Object.values(byYear).sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));

  const evolutionData = useMemo(() => {
    if(data.length === 0) return [];
    const startObj = data.reduce((a, b) => new Date(a.data_aplicacao) < new Date(b.data_aplicacao) ? a : b, {data_aplicacao: '2023-01-01'});
    const startDate = new Date(startObj.data_aplicacao);
    const endDate = new Date(); endDate.setFullYear(endDate.getFullYear() + 2);
    return generateEvolutionCurve(data, startDate, endDate);
  }, [data]);

  return (
    <div className="fade-in">
      {/* HEADER NOVO */}
      <div style={{ padding: '0 24px', background: '#e9ebf0', borderBottom: '1px solid #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
         <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1d27', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
           vrsbueno Invest
         </div>
         <button onClick={() => setShowSelic(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1d27', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
           <Calculator size={16} /> Calculadora Selic
         </button>
      </div>

      {/* ZONE 1 (LIGHT GRID) */}
      <DashboardTopLayout 
        patrimonioTotal={patrimonioTotal} totalAplicado={totalAplicado} 
        rendAcumulado={rendAcumulado} projVencimento={projVencimento}
        saldoCaixaMock={saldoCaixaMock} instComRisco={instComRisco}
        formatBRL={formatBRL} CORES={CORES}
        evolutionData={evolutionData} byInstArray={byInstArray}
        barData={barData} LIMIT_FGC={LIMIT_FGC}
      />

      {/* ZONE 2 - DARK Theme */}
      <div className="dark-zone">
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          
          <div className="dark-card" style={{ background: '#14151a', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #23253b', background: '#1b1d27' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileDown size={22} color="#fff" />
                <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>Tabela Completa — Renda Fixa</h2>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                  <Plus size={18} strokeWidth={3} /> ATIVO
                </button>
                <button onClick={() => setShowRemove(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
                  <Minus size={18} strokeWidth={3} /> ATIVO
                </button>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto', background: '#12141c', padding: '4px' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
                <thead>
                  <tr>
                    <th style={{ color: '#8b8fa8' }}>Ativo</th>
                    <th style={{ color: '#8b8fa8' }}>Tipo</th>
                    <th style={{ color: '#8b8fa8' }}>Instituição</th>
                    <th style={{ color: '#8b8fa8' }}>Indexador</th>
                    <th style={{ color: '#8b8fa8' }}>Taxa</th>
                    <th style={{ color: '#8b8fa8' }}>Aplicado</th>
                    <th style={{ color: '#8b8fa8' }}>Posição Hoje</th>
                    <th style={{ color: '#8b8fa8' }}>Rend. Acum.</th>
                    <th style={{ color: '#8b8fa8' }}>Proj. Venc.</th>
                    <th style={{ color: '#8b8fa8' }}>Aplicação</th>
                    <th style={{ color: '#8b8fa8' }}>Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item.id}>
                      <td style={{ color: '#e2e4f0' }}>{item.emissor}</td>
                      <td style={{ color: '#e2e4f0' }}>{item.tipo}</td>
                      <td style={{ color: '#e2e4f0' }}>{item.instituicao_agrupadora}</td>
                      <td style={{ color: '#e2e4f0' }}>{item.indexador_tipo}</td>
                      <td style={{ color: '#e2e4f0' }}>{item.taxa}%</td>
                      <td style={{ color: '#e2e4f0' }}>{formatBRL(item.aplicado)}</td>
                      <td style={{ color: '#e2e4f0' }}>{formatBRL(item.posicaoHoje)}</td>
                      <td style={{ color: '#e2e4f0' }}>{formatBRL(item.rendimentoAcumulado)}</td>
                      <td style={{ color: '#e2e4f0' }}>{formatBRL(item.projetadoVencimento)}</td>
                      <td style={{ color: '#8b8fa8' }}>{new Date(item.data_aplicacao).toLocaleDateString('pt-BR')}</td>
                      <td style={{ color: '#8b8fa8' }}>{item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>

      {showAdd && <ModalAdicionar onClose={() => setShowAdd(false)} />}
      {showRemove && <ModalRemover onClose={() => setShowRemove(false)} ativos={data} />}
      {showSelic && <ModalSelic onClose={() => setShowSelic(false)} />}
    </div>
  );
}
