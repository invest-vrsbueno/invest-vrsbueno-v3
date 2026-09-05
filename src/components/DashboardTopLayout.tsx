'use client';
import React from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { Lock, FileText, BarChart3, Settings2, X } from 'lucide-react';
import { Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line } from 'recharts';
import { FgcDetalhe } from './FgcDetalhe';
import { InvestimentosAVencerV3 } from './InvestimentosAVencerV3';
import { ResumoAnualChartV2 } from './ResumoAnualChartV2';
import { DistribuicaoInstituicoes } from './DistribuicaoInstituicoes';
import { FitText } from './FitText';

function formatDataBRKpi(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Fileira de KPIs fora do react-grid-layout (grade CSS de largura igual, 5 caixas) —
// mais fácil de balancear espaço do que colunas inteiras do grid arrastável. Cada valor
// bruto usa FitText (encolhe a fonte em vez de cortar com "...") e ganha uma caixa de
// destaque com o valor líquido (sem IR — ver regras_matematicas_investimentos.md). O
// card Cobertura FGC mostra, por instituição em risco: valor aplicado, projeção de
// vencimento e quanto excedeu o limite (com percentual).
export function DashboardTopLayout({
  patrimonioTotal, patrimonioTotalLiquido,
  totalAplicado,
  rendAcumulado, rendAcumuladoLiquido,
  projVencimento, projVencimentoLiquido,
  instComRisco, formatBRL, CORES,
  evolutionData, byInstArray, projVencimentoPorBanco, barData, anoVencimentoArray, LIMIT_FGC, investimentosVencendo, datasPorInvestimento
}: any) {
  const [width, setWidth] = React.useState(1200);
  const [showFgcModal, setShowFgcModal] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
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
    { i: 'chartArea', x: 0, y: 0, w: 8, h: 10 },
    { i: 'chartPie', x: 8, y: 0, w: 4, h: 10 },

    { i: 'chartBar', x: 0, y: 10, w: 6, h: 16 },
    { i: 'saldoList', x: 6, y: 10, w: 6, h: 16 },

    { i: 'distList', x: 0, y: 26, w: 12, h: 14 }
  ];

  function stackedLayout(cols: number) {
    const items: { i: string; x: number; y: number; w: number; h: number }[] = [];
    let y = 0;
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
    md: stackedLayout(10),
    sm: stackedLayout(6),
    xs: stackedLayout(4),
    xxs: stackedLayout(2),
  };

  // Card body vira uma coluna flex que ocupa a altura toda disponível (herdada do
  // .grid-card, que já é flex-column) e distribui os 3 grupos de informação (valor+
  // subtítulo / líquido / badge) em espaços equivalentes — em vez de ficarem colados no
  // topo com um vão vazio embaixo.
  const kpiCardStyle: React.CSSProperties = { padding: '14px 18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' };
  // Fonte do valor principal um pouco menor que o padrão de .text-value-large, para dar
  // folga às caixas depois que a 2ª linha (líquido) e o card FGC redesenhado ocupam mais
  // espaço vertical.
  const kpiValueStyle: React.CSSProperties = { fontSize: 'clamp(0.875rem, 4vw, 1.1875rem)' };
  // Hierarquia: valor bruto (preto) > rótulo de contexto (kpi-subtitle, cinza) > valor
  // líquido (destacado em teal, com rótulo e divisor próprios — não é uma legenda, é um
  // segundo dado relevante) > badge de status (decorativo, menor prioridade).
  const kpiLiquidoWrapStyle: React.CSSProperties = { padding: '6px 10px', borderRadius: '8px', background: 'rgba(0,166,147,0.14)' };
  const kpiLiquidoWrapStyle_excedido: React.CSSProperties = { padding: '6px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.14)' };
  const kpiLiquidoLabelStyle: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 700, color: '#00a693', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const kpiLiquidoValueStyle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 800, color: '#00a693' };

  return (
    <div style={{ padding: 'clamp(12px, 4vw, 24px)', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Fileira de KPIs: 5 caixas de largura igual, fora da grade arrastável. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <div className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Patrimônio Total</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={kpiCardStyle}>
            <div>
              <FitText text={formatBRL(patrimonioTotal)} className="text-value-large" style={kpiValueStyle} />
              <div className="kpi-subtitle">Posição atual</div>
            </div>
            <div style={kpiLiquidoWrapStyle}>
              <div style={kpiLiquidoLabelStyle}>Líquido</div>
              <div style={kpiLiquidoValueStyle}>{formatBRL(patrimonioTotalLiquido)}</div>
            </div>
            <div><span className="badge-pill badge-teal">↑ 5.3% s/ aplicado</span></div>
          </div>
        </div>

        <div className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Capital Aplicado</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={kpiCardStyle}>
            <div>
              <FitText text={formatBRL(totalAplicado)} className="text-value-large" style={kpiValueStyle} />
              <div className="kpi-subtitle">Ativos de renda fixa</div>
            </div>
            <div style={kpiLiquidoWrapStyle}>
              <div style={kpiLiquidoLabelStyle}>Líquido</div>
              <div style={kpiLiquidoValueStyle}>{formatBRL(totalAplicado)}</div>
            </div>
            <div><span className="badge-pill badge-yellow">💼 Principal</span></div>
          </div>
        </div>

        <div className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Rend. Acumulado</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={kpiCardStyle}>
            <div>
              <FitText text={formatBRL(rendAcumulado)} className="text-value-large" style={kpiValueStyle} />
              <div className="kpi-subtitle">Até hoje</div>
            </div>
            <div style={kpiLiquidoWrapStyle}>
              <div style={kpiLiquidoLabelStyle}>Líquido</div>
              <div style={kpiLiquidoValueStyle}>{formatBRL(rendAcumuladoLiquido)}</div>
            </div>
            <div><span className="badge-pill badge-teal">↑ acumulado</span></div>
          </div>
        </div>

        <div className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Proj. Vencimento</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={kpiCardStyle}>
            <div>
              <FitText text={formatBRL(projVencimento)} className="text-value-large" style={kpiValueStyle} />
              <div className="kpi-subtitle">Rendimento esperado</div>
            </div>
            <div style={kpiLiquidoWrapStyle}>
              <div style={kpiLiquidoLabelStyle}>Líquido</div>
              <div style={kpiLiquidoValueStyle}>{formatBRL(projVencimentoLiquido)}</div>
            </div>
            <div><span className="badge-pill badge-purple">✨ lucro estimado</span></div>
          </div>
        </div>

        <div
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
          <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, justifyContent: instComRisco === 0 ? 'space-between' : undefined }}>
            {instComRisco === 0 ? (
              <>
                <div>
                  <div className="text-value-large" style={kpiValueStyle}>0 bancos</div>
                  <div className="kpi-subtitle">Acima do Limite de Proteção</div>
                </div>
                <div><span className="badge-pill badge-teal">✅ Protegido</span></div>
              </>
            ) : (
              <>
                <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {(() => {
                    const riscoList = byInstArray.filter((i: any) => i.value >= LIMIT_FGC);
                    return riscoList.map((inst: any) => {
                      const excedido = inst.value - LIMIT_FGC;
                      const percentualExcedido = (excedido / LIMIT_FGC) * 100;
                      const projVencBanco = projVencimentoPorBanco[inst.name] || 0;
                      // Data de vencimento só faz sentido quando o banco tem exatamente 1
                      // investimento em risco — com vários, cada um vence numa data diferente,
                      // então omitimos (pedido do cliente).
                      const umInvestimento = inst.investimentos.length === 1;
                      const dataVencUnico = umInvestimento ? datasPorInvestimento[inst.investimentos[0].id]?.dataVencimento : null;
                      // Mesma ordem de slots dos outros 4 cards (valor primário → subtítulo →
                      // caixa colorida de destaque). Com um único banco em risco (caso comum),
                      // o bloco ocupa a altura toda e distribui os 2 grupos em espaços
                      // equivalentes, igual às outras caixas da fileira.
                      const single = riscoList.length === 1;
                      return (
                      <div key={inst.name} style={single ? { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } : { marginBottom: '14px' }}>
                        <div>
                          <FitText text={inst.name} className="text-value-large" style={{ ...kpiValueStyle, color: '#1a1d27' }} />
                          <div className="kpi-subtitle">
                            {formatBRL(inst.valorAplicado)}{dataVencUnico ? ` - vence (${formatDataBRKpi(dataVencUnico)})` : ''}
                          </div>
                          <div className="kpi-subtitle" style={{ marginTop: '1px' }}>{formatBRL(projVencBanco)}</div>
                        </div>
                        <div style={kpiLiquidoWrapStyle_excedido}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Excedido</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ef4444' }}>
                            {formatBRL(excedido)} <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>({percentualExcedido.toFixed(0)}%)</span>
                          </div>
                        </div>
                      </div>
                      );
                    });
                  })()}
                </div>
                <div style={{ marginTop: '8px', flexShrink: 0 }}><span className="badge-pill badge-red">⚠️ Risco Ativo</span></div>
              </>
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef}>
      <ResponsiveGridLayout
        className="layout"
        width={width}
        layouts={layouts}
        breakpoints={{ lg: 1150, md: 950, sm: 690, xs: 430, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        margin={[16, 16]}
      >
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
          <DistribuicaoInstituicoes byInstArray={byInstArray} patrimonioTotal={patrimonioTotal} CORES={CORES} datasPorInvestimento={datasPorInvestimento} />
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
