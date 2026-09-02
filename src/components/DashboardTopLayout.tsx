'use client';
import React from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { Lock, FileText, BarChart3, Settings2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, BarChart, Bar, Legend, ComposedChart, Line } from 'recharts';

export function DashboardTopLayout({ 
  patrimonioTotal, totalAplicado, rendAcumulado, projVencimento, 
  saldoCaixaMock, instComRisco, formatBRL, CORES,
  evolutionData, byInstArray, barData, LIMIT_FGC 
}: any) {
  const [width, setWidth] = React.useState(1200);
  React.useEffect(() => {
    setWidth(window.innerWidth > 1440 ? 1440 : window.innerWidth);
    const cb = () => setWidth(window.innerWidth > 1440 ? 1440 : window.innerWidth);
    window.addEventListener('resize', cb);
    return () => window.removeEventListener('resize', cb);
  }, []);
  
  const layout = [
    { i: 'kpi1', x: 0, y: 0, w: 2, h: 4 },
    { i: 'kpi2', x: 2, y: 0, w: 2, h: 4 },
    { i: 'kpi3', x: 4, y: 0, w: 2, h: 4 },
    { i: 'kpi4', x: 6, y: 0, w: 2, h: 4 },
    { i: 'kpi5', x: 8, y: 0, w: 2, h: 4 },
    { i: 'kpi6', x: 10, y: 0, w: 2, h: 4 },
    
    { i: 'chartArea', x: 0, y: 4, w: 8, h: 10 },
    { i: 'chartPie', x: 8, y: 4, w: 4, h: 10 },
    
    { i: 'chartBar', x: 0, y: 14, w: 8, h: 10 },
    { i: 'saldoList', x: 8, y: 14, w: 4, h: 10 },

    { i: 'chartFGC', x: 0, y: 24, w: 8, h: 12 },
    { i: 'distList', x: 8, y: 24, w: 4, h: 12 }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <ResponsiveGridLayout
        className="layout"
        width={width}
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
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

        <div key="kpi6" className="grid-card">
          <div className="grid-card-header"><span className="grid-card-title">Cobertura FGC</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/><FileText size={14}/></div></div>
          <div style={{ padding: '12px 18px' }}><div className="text-value-large">{instComRisco} banco{(instComRisco > 1 || instComRisco === 0) ? 's': ''}</div><div className="kpi-subtitle">Acima do Limite de Proteção</div><div style={{ marginTop: '12px' }}><span className={`badge-pill ${instComRisco > 0 ? 'badge-red' : 'badge-teal'}`}>{instComRisco > 0 ? '⚠️ Risco Ativo' : '✅ Protegido'}</span></div></div>
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 0 }}>
             <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                  <Pie data={byInstArray} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} stroke="none" labelLine={false} label={({percent}) => (percent || 0) > 0.05 ? `${((percent || 0) * 100).toFixed(1)}%` : ''}>
                  {byInstArray.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />)}
                </Pie>
                <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 10, color: '#1a1d27' }} iconType="square" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div key="chartBar" className="grid-card" style={{ overflow: 'auto' }}>
          <div className="grid-card-header"><span className="grid-card-title">RESUMO ANUAL — VENCIMENTO VS. GERADO</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/></div></div>
          <div style={{ padding: '20px 20px 0 0', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={0} barSize={28}>
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#8b8fa8'}} axisLine={{stroke: '#e2e4f0'}} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(val: any) => formatBRL(Number(val))} />
                <Bar dataKey="vence" fill="#00bfa5" radius={[2,2,0,0]} name="Vence no Ano" />
                <Bar dataKey="gerado" fill="#6c63ff" radius={[2,2,0,0]} name="Gerado no Ano" />
                <Legend iconType="square" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ padding: '0 20px 20px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e4f0', padding: '6px 0', color: '#8b8fa8' }}>
               <span>Ano</span> <span>Vence (Principal + Rend)</span> <span>Gerado no Ano</span>
            </div>
            {barData.map((y: any) => (
              <div key={y.name} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e4f0', padding: '8px 0', fontWeight: 500 }}>
                 <span style={{ color: '#00bfa5', fontWeight: 600 }}>{y.name}</span>
                 <span>{formatBRL(y.vence)}</span>
                 <span>{formatBRL(y.gerado)}</span>
              </div>
            ))}
          </div>
        </div>

        <div key="saldoList" className="grid-card">
           <div className="grid-card-header"><span className="grid-card-title">SALDO / CAIXA</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/></div></div>
          <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e4f0', fontSize: '0.85rem' }}><b style={{ color: '#5a5d7a' }}>SALDO MP</b> <b>R$ 12</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e4f0', fontSize: '0.85rem' }}><b style={{ color: '#5a5d7a' }}>RM MERCADO PAGO</b> <b>R$ 20.276</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e4f0', fontSize: '0.85rem' }}><b style={{ color: '#5a5d7a' }}>SALDO XP</b> <b>R$ 0</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e2e4f0', fontSize: '0.85rem' }}><span style={{ color: '#5a5d7a', textTransform: 'uppercase' }}>fgts</span> <b>R$ 74.730</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '0.85rem' }}><b style={{ color: '#00bfa5' }}>Total:</b> <b style={{ color: '#00bfa5' }}>{formatBRL(saldoCaixaMock)}</b></div>
          </div>
        </div>

        <div key="chartFGC" className="grid-card" style={{ display: 'flex' }}>
          <div className="grid-card-header"><span className="grid-card-title">COBERTURA FGC POR INSTITUIÇÃO</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/></div></div>
          <div style={{ flex: 1, padding: '20px 20px 10px 0', minHeight: 0 }}>
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byInstArray} layout="vertical" barSize={16}>
                <XAxis type="number" tickFormatter={(v)=>`${v/1000}k`} tick={{fontSize:10, fill:'#8b8fa8'}} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{fontSize:9, fill:'#1a1d27', fontWeight: 600}} axisLine={false} tickLine={false} width={80} />
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
        </div>

        <div key="distList" className="grid-card">
           <div className="grid-card-header"><span className="grid-card-title">DISTRIBUIÇÃO POR INSTITUIÇÃO</span><div style={{ display: 'flex', gap: '6px', color: '#c4c8d8' }}><Lock size={14}/></div></div>
          <div style={{ padding: '0 16px', overflowY: 'auto', flex: 1 }}>
            {byInstArray.map((inst: any, i: number) => (
               <div key={inst.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #e2e4f0' }}>
                 <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: CORES[i%CORES.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                   {inst.name.substring(0,2)}
                 </div>
                 <div>
                   <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{inst.name}</div>
                   <div style={{ fontSize: '0.7rem', color: '#8b8fa8' }}>{((inst.value / patrimonioTotal) * 100).toFixed(0)}% do portfólio</div>
                 </div>
                 <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.85rem' }}>
                   {formatBRL(inst.value)}
                 </div>
               </div>
            ))}
          </div>
        </div>

      </ResponsiveGridLayout>
    </div>
  );
}
