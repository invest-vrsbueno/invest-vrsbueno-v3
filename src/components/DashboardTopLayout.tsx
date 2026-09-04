'use client';
import React from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { Lock, FileText, BarChart3, Settings2, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { FgcDetalhe } from './FgcDetalhe';
import { InvestimentosAVencerV3 } from './InvestimentosAVencerV3';
import { ResumoAnualChartV2 } from './ResumoAnualChartV2';
import { DistribuicaoInstituicoes } from './DistribuicaoInstituicoes';

function formatTaxaKpi(taxa: number) {
  return taxa.toFixed(2).replace('.', ',');
}
function nomeInvestimentoKpi(inv: any) {
  return `${inv.tipo} ${inv.emissor} ${inv.indexador_tipo} - ${formatTaxaKpi(inv.taxa)}%`;
}

export function DashboardTopLayout({
  patrimonioTotal, totalAplicado, rendAcumulado, projVencimento,
  saldoCaixaMock, instComRisco, formatBRL, CORES,
  evolutionData, byInstArray, barData, anoVencimentoArray, LIMIT_FGC, investimentosVencendo
}: any) {
  const [width, setWidth] = React.useState(1200);
  const [showFgcModal, setShowFgcModal] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // Mede o container INTERNO (sem padding próprio), não a tela inteira — o grid fica
    // dentro de um wrapper com padding lateral, então usar document.clientWidth faria o
    // grid calcular colunas para um espaço maior do que o realmente disponível, sobrando
    // conteúdo para fora do lado direito (cards encostando na borda).
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  
  const lgLayout = [
    { i: 'kpi1', x: 0, y: 0, w: 2, h: 4 },
    { i: 'kpi2', x: 2, y: 0, w: 2, h: 4 },
    { i: 'kpi3', x: 4, y: 0, w: 2, h: 4 },
    { i: 'kpi4', x: 6, y: 0, w: 2, h: 4 },
    { i: 'kpi5', x: 8, y: 0, w: 2, h: 4 },
    { i: 'kpi6', x: 10, y: 0, w: 2, h: 4 },

    { i: 'chartArea', x: 0, y: 4, w: 8, h: 10 },
    { i: 'chartPie', x: 8, y: 4, w: 4, h: 10 },

    { i: 'chartBar', x: 0, y: 14, w: 8, h: 16 },
    { i: 'saldoList', x: 8, y: 14, w: 4, h: 16 },

    { i: 'distList', x: 0, y: 30, w: 12, h: 14 }
  ];

  // Breakpoints menores precisam de um layout PRÓPRIO e explícito: o react-grid-layout
  // não sabe reposicionar itens com segurança a partir do layout "lg" quando a largura em
  // colunas (w) do item excede o número de colunas do breakpoint menor — isso causa
  // sobreposição de cards. Empilha em coluna única (mobile) ou 2 colunas (tablet estreito).
  function stackedLayout(cols: number, kpiPerRow: number) {
    const kpis = ['kpi1', 'kpi2', 'kpi3', 'kpi4', 'kpi5', 'kpi6'];
    const kpiW = cols / kpiPerRow;
    const items: { i: string; x: number; y: number; w: number; h: number }[] = [];
    let y = 0;
    kpis.forEach((id, idx) => {
      const col = idx % kpiPerRow;
      if (col === 0 && idx > 0) y += 4;
      items.push({ i: id, x: col * kpiW, y, w: kpiW, h: 4 });
    });
    y += 4;
    const panels: [string, number][] = [
      ['chartArea', 10], ['chartPie', 10], ['chartBar', 16], ['saldoList', 16], ['distList', 14],
    ];
    panels.forEach(([id, h]) => {
      items.push({ i: id, x: 0, y, w: cols, h });
      y += h;
    });
    return items;
  }

  const layouts = {
    lg: lgLayout,
    md: stackedLayout(10, 2),
    sm: stackedLayout(6, 2),
    xs: stackedLayout(4, 1),
    xxs: stackedLayout(2, 1),
  };

  return (
    <div style={{ padding: 'clamp(12px, 4vw, 24px)', maxWidth: '1440px', margin: '0 auto' }}>
      <div ref={containerRef}>
      <ResponsiveGridLayout
        className="layout"
        width={width}
        layouts={layouts}
        // Estes números são calibrados para a largura do CONTEÚDO (já sem o padding do
        // wrapper, ~48px em telas >= 600px — ver clamp() no style acima), não a largura
        // total da tela. Por isso são ~48px menores que os breakpoints "nominais" do MD3.
        breakpoints={{ lg: 1150, md: 950, sm: 690, xs: 430, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        margin={[16, 16]}
      >
        {/* KPI 1 */}
        <div key="kpi1" className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Patrimônio Total</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={{ padding: '12px 18px' }}><div className="text-value-large">{formatBRL(patrimonioTotal)}</div><div className="kpi-subtitle">Posição atual</div><div style={{ marginTop: '12px' }}><span className="badge-pill badge-teal">↑ 5.3% s/ aplicado</span></div></div>
        </div>

        <div key="kpi2" className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Capital Aplicado</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={{ padding: '12px 18px' }}><div className="text-value-large">{formatBRL(totalAplicado)}</div><div className="kpi-subtitle">Ativos de renda fixa</div><div style={{ marginTop: '12px' }}><span className="badge-pill badge-yellow">💼 Principal</span></div></div>
        </div>

        <div key="kpi3" className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Rend. Acumulado</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={{ padding: '12px 18px' }}><div className="text-value-large">{formatBRL(rendAcumulado)}</div><div className="kpi-subtitle">Até hoje</div><div style={{ marginTop: '12px' }}><span className="badge-pill badge-teal">↑ acumulado</span></div></div>
        </div>

        <div key="kpi4" className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Proj. Vencimento</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={{ padding: '12px 18px' }}><div className="text-value-large">{formatBRL(projVencimento)}</div><div className="kpi-subtitle">Rendimento esperado</div><div style={{ marginTop: '12px' }}><span className="badge-pill badge-purple">✨ lucro estimado</span></div></div>
        </div>

        <div key="kpi5" className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Saldo / Caixa</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={{ padding: '12px 18px' }}><div className="text-value-large">{formatBRL(saldoCaixaMock)}</div><div className="kpi-subtitle">Liquidez imediata</div><div style={{ marginTop: '12px' }}><span className="badge-pill badge-blue">🏦 disponível</span></div></div>
        </div>

        <div
          key="kpi6"
          className="grid-card"
          onClick={() => setShowFgcModal(true)}
          style={{
            cursor: 'pointer',
            background: instComRisco > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)',
            border: `1px solid ${instComRisco > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
          }}
          title="Clique para ver o detalhamento por instituição"
        >
          <div className="grid-card-header" style={{ borderBottom: `1px solid ${instComRisco > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
            <span className="grid-card-title">Cobertura FGC</span>
            <div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
            {instComRisco === 0 ? (
              <>
                <div className="text-value-large">0 bancos</div>
                <div className="kpi-subtitle">Acima do Limite de Proteção</div>
                <div style={{ marginTop: '12px' }}><span className="badge-pill badge-teal">✅ Protegido</span></div>
              </>
            ) : (
              <>
                <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
                  {byInstArray.filter((i: any) => i.value >= LIMIT_FGC).map((inst: any) => (
                    <div key={inst.name} style={{ marginBottom: '6px' }}>
                      <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>{inst.name}</div>
                      {inst.investimentos.map((inv: any) => (
                        <div key={inv.id} style={{ fontSize: '0.68rem', color: '#8b8fa8', lineHeight: 1.4, marginTop: '2px' }}>{nomeInvestimentoKpi(inv)}</div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', flexShrink: 0 }}><span className="badge-pill badge-red">⚠️ Risco Ativo</span></div>
              </>
            )}
          </div>
        </div>

        <div key="chartArea" className="grid-card" style={{ display: 'flex' }}>
          <div className="grid-card-header"><span className="grid-card-title">EVOLUÇÃO PATRIMONIAL ESTIMADA</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><BarChart3 size={14}/></div></div>
          <div style={{ flex: 1, padding: '20px 20px 10px 0', minHeight: 0 }}>
             <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolutionData}>
                <XAxis dataKey="month" tick={{fontSize: 11, fill: '#8b8fa8'}} axisLine={false} tickLine={false} minTickGap={30} />
                <YAxis hide domain={['dataMin', 'dataMax + 100000']} />
                <Tooltip formatter={(val: any) => formatBRL(Number(val))} labelStyle={{color: '#1a1d27'}} />
                <Area type="monotone" dataKey="patrimonio" stroke="#00bfa5" strokeWidth={3} fillOpacity={0.15} fill="#00bfa5" />
                <Line type="stepAfter" dataKey="aplicado" stroke="#8b8fa8" strokeWidth={1} strokeDasharray="5 5" dot={false} activeDot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div key="chartPie" className="grid-card" style={{ display: 'flex' }}>
          <div className="grid-card-header"><span className="grid-card-title">ALOCAÇÃO %</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><Settings2 size={14}/></div></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
            <div style={{ height: '220px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byInstArray} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={81} stroke="none" labelLine={false} label={({percent}) => (percent || 0) > 0.05 ? `${((percent || 0) * 100).toFixed(1)}%` : ''}>
                    {byInstArray.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 10px', padding: '4px 16px 12px', overflowY: 'auto' }}>
              {byInstArray.map((inst: any, i: number) => (
                <div key={inst.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '2px', backgroundColor: CORES[i % CORES.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.65rem', color: '#1a1d27', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div key="chartBar" className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">RESUMO ANUAL — VENCIMENTO VS. GERADO</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/></div></div>
          <ResumoAnualChartV2 barData={barData} anoVencimentoArray={anoVencimentoArray} formatBRL={formatBRL} />
        </div>

        <div key="saldoList" className="grid-card">
           <div className="grid-card-header"><span className="grid-card-title">INVESTIMENTOS A VENCER</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/></div></div>
          <InvestimentosAVencerV3 investimentos={investimentosVencendo} />
        </div>

        <div key="distList" className="grid-card">
           <div className="grid-card-header"><span className="grid-card-title">DISTRIBUIÇÃO POR INSTITUIÇÃO</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/></div></div>
          <DistribuicaoInstituicoes byInstArray={byInstArray} patrimonioTotal={patrimonioTotal} CORES={CORES} />
        </div>

      </ResponsiveGridLayout>
      </div>

      {showFgcModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,7,10,0.99)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }} onClick={() => setShowFgcModal(false)}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: 'min(640px, 100%)', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #d1d5db' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="grid-card-title">COBERTURA FGC POR INSTITUIÇÃO</span>
              <button onClick={() => setShowFgcModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8b8fa8' }}><X size={20} /></button>
            </div>
            <div style={{ height: `${Math.max(220, byInstArray.length * 34)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byInstArray} layout="vertical" barSize={16} barCategoryGap="35%">
                  <XAxis type="number" tickFormatter={(v)=>`${v/1000}k`} tick={{fontSize:10, fill:'#8b8fa8'}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{fontSize:9, fill:'#1a1d27', fontWeight: 600}} axisLine={false} tickLine={false} width={110} interval={0} />
                  <Tooltip formatter={(value: any) => formatBRL(Number(value))} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                  <ReferenceLine x={LIMIT_FGC} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Limite FGC', fill: '#ef4444', fontSize: 9 }} />
                  <Bar dataKey="value">
                    {byInstArray.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.value >= LIMIT_FGC ? '#ef4444' : '#00bfa5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <FgcDetalhe byInstArray={byInstArray} LIMIT_FGC={LIMIT_FGC} />
          </div>
        </div>
      )}
    </div>
  );
}
