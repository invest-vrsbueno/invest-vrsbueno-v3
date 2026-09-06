'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, LogOut, ShieldCheck, Pencil, Menu, X } from 'lucide-react';
import { calculateAsset, generateEvolutionCurve } from '../utils/finance';
import { createClient } from '../utils/supabase/client';
import { agruparPorInstituicaoFGC, aliquotaIR, LIMIT_FGC } from '../utils/fgc';
import { investimentosPorVencimento, agruparPorAnoVencimento } from '../utils/vencimento';
import { DashboardTopLayout } from '../components/DashboardTopLayout';
import { ModalSelic } from '../components/Modals';
import { Mfa2FAAlert } from '../components/Mfa2FAAlert';

const CORES = ["#00bfa5", "#6c63ff", "#f97316", "#3b82f6", "#ec4899", "#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
}

export default function DashboardClient({ initialData, userEmail }: { initialData: any[]; userEmail: string }) {
  const TODAY = new Date();
  const router = useRouter();
  const supabase = createClient();

  // Data Enriching
  const data = useMemo(() => {
    return initialData.map(item => calculateAsset(item, TODAY));
  }, [initialData]);

  // Modals State
  const [showSelic, setShowSelic] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Metrics
  const totalAplicado = data.reduce((acc, obj) => acc + obj.aplicado, 0);
  const patrimonioTotal = data.reduce((acc, obj) => acc + obj.posicaoHoje, 0);
  const rendAcumulado = data.reduce((acc, obj) => acc + obj.rendimentoAcumulado, 0);
  const projVencimento = data.reduce((acc, obj) => acc + obj.projetadoVencimento, 0);

  const byInstArray = useMemo(() => agruparPorInstituicaoFGC(data, TODAY), [data]);
  const instComRisco = byInstArray.filter(i => i.value >= LIMIT_FGC).length;

  // Totais líquidos (sem IR) para a 2ª linha dos KPIs. Patrimônio e Rend. Acumulado
  // reaproveitam o que agruparPorInstituicaoFGC já calcula (posicaoAtualLiquida /
  // rendimentoLiquidoSemIR); ver regras_matematicas_investimentos.md — Valor_Liquido = M - IR,
  // IR = Lucro_Bruto * aliquota regressiva.
  const patrimonioTotalLiquido = byInstArray.reduce((acc, i) => acc + i.posicaoAtualLiquida, 0);
  const rendAcumuladoLiquido = byInstArray.reduce((acc, i) => acc + i.rendimentoLiquidoSemIR, 0);

  // Prazo padrão (365 dias) quando não há data_vencimento — mesmo fallback de calculateAsset.
  function resolveDtVencimento(item: any): Date {
    return item.data_vencimento ? new Date(item.data_vencimento) : new Date(TODAY.getTime() + 365 * 24 * 60 * 60 * 1000);
  }

  // Proj. Vencimento líquido: mesma fórmula, mas a alíquota é calculada pelos dias corridos
  // até o VENCIMENTO (não até hoje) — é o IR que efetivamente incidirá quando o investimento vencer.
  const projVencimentoLiquido = useMemo(() => {
    return data.reduce((acc, obj) => {
      const dtVencimento = resolveDtVencimento(obj);
      const lucroBrutoVencimento = Math.max(0, obj.projetadoVencimento - obj.aplicado);
      const aliquota = aliquotaIR(obj.tipo, obj.data_aplicacao, dtVencimento);
      const irVencimento = lucroBrutoVencimento * aliquota;
      return acc + (obj.projetadoVencimento - irVencimento);
    }, 0);
  }, [data]);

  // Datas por investimento (id -> data_aplicacao/data_vencimento), para o card Cobertura
  // FGC (data de vencimento quando o banco tem 1 investimento em risco) e para o card
  // Distribuição por Instituição (colunas Data do Invest. / Data do Vencimento).
  const datasPorInvestimento = useMemo(() => {
    const acc: Record<string, { dataAplicacao: string; dataVencimento: string | null }> = {};
    for (const obj of data) {
      acc[obj.id] = { dataAplicacao: obj.data_aplicacao, dataVencimento: obj.data_vencimento };
    }
    return acc;
  }, [data]);

  const investimentosVencendo = useMemo(() => investimentosPorVencimento(data, TODAY), [data]);

  // Dispara a checagem dos alertas (FGC e vencimento) uma vez após os dados carregarem.
  // O controle de reenvio (24h corridas desde o último envio) fica no banco,
  // então mesmo múltiplas visitas/abas não geram e-mails duplicados.
  const alertaDisparado = useRef(false);
  useEffect(() => {
    if (alertaDisparado.current || data.length === 0) return;
    alertaDisparado.current = true;
    fetch('/api/alertas-fgc', { method: 'POST' }).catch(() => {});
    fetch('/api/alertas-vencimento', { method: 'POST' }).catch(() => {});
  }, [data]);

  const byYear = data.reduce((acc: any, obj) => {
    const y = obj.anoVencimento || 2026;
    if (!acc[y]) acc[y] = { name: String(y), vence: 0, gerado: 0 };
    acc[y].vence += obj.projetadoVencimento;
    acc[y].gerado += (obj.projetadoVencimento - obj.aplicado);
    return acc;
  }, {});
  const barData = Object.values(byYear).sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name));

  const anoVencimentoArray = useMemo(() => agruparPorAnoVencimento(data), [data]);

  const evolutionData = useMemo(() => {
    if(data.length === 0) return [];
    const startObj = data.reduce((a, b) => new Date(a.data_aplicacao) < new Date(b.data_aplicacao) ? a : b, {data_aplicacao: '2023-01-01'});
    const startDate = new Date(startObj.data_aplicacao);
    const endDate = new Date(); endDate.setFullYear(endDate.getFullYear() + 2);
    return generateEvolutionCurve(data, startDate, endDate);
  }, [data]);

  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Breakpoint "mobile" deste projeto: < 600px (MD3 "Compact", ver architecture/materialdesign.md).
  // Abaixo disso o header vira hamburger menu para não quebrar/estourar. O sufixo
  // "— Dashboard" some um pouco antes (< 900px) para não ser truncado com "..." no tablet,
  // onde os 4 botões já ocupam boa parte da largura disponível.
  useEffect(() => {
    const onResize = () => {
      const w = document.documentElement.clientWidth;
      setIsMobile(w < 600);
      setShowSubtitle(w >= 900);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navItems = [
    { key: 'selic', label: 'Calculadora Selic', icon: Calculator, onClick: () => { setShowSelic(true); setMobileMenuOpen(false); } },
    { key: 'editar', label: 'Ativos', icon: Pencil, href: '/editar-ativos' },
    { key: 'seguranca', label: 'Segurança', icon: ShieldCheck, href: '/settings' },
    { key: 'sair', label: 'Sair', icon: LogOut, onClick: () => { setMobileMenuOpen(false); handleLogout(); } },
  ];

  return (
    <div className="fade-in">
      {/* HEADER NOVO */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          margin: '24px',
          background: scrolled ? 'rgba(18,20,28,0.8)' : '#12141c',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(10px)' : 'none',
          borderRadius: '14px',
          padding: scrolled ? '10px 28px' : '18px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: scrolled ? '0 8px 24px rgba(0,0,0,0.25)' : 'none',
          transition: 'background 0.25s ease, padding 0.25s ease, box-shadow 0.25s ease, backdrop-filter 0.25s ease',
        }}
      >
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(0.85rem, 2.4vw, 1.25rem)', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
          <span style={{ fontWeight: 700, color: '#fff' }}>VRSBUENO</span>{' '}
          <span style={{ fontWeight: 700, color: '#00bfa5' }}>INVEST</span>
          {showSubtitle && <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.55)' }}> — Dashboard</span>}
        </div>

        {isMobile ? (
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            style={{ width: '44px', height: '44px', boxSizing: 'border-box', background: 'transparent', color: '#fff', border: '1px solid #323546', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <button onClick={() => setShowSelic(true)} style={{ height: '38px', boxSizing: 'border-box', background: '#1f2029', color: '#fff', border: '1px solid #323546', padding: '0 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Calculadora Selic</button>
            <a className="btn" href="/editar-ativos" style={{ height: '38px', boxSizing: 'border-box', background: '#3b82f6', color: '#fff', border: '1px solid transparent', padding: '0 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>Ativos</a>
            <a className="btn" href="/settings" title="Segurança da conta" style={{ height: '38px', boxSizing: 'border-box', background: 'transparent', color: '#e2e4f0', border: '1px solid #323546', padding: '0 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>Segurança</a>
            <button onClick={handleLogout} title={userEmail} style={{ height: '38px', boxSizing: 'border-box', background: 'transparent', color: '#e2e4f0', border: '1px solid #323546', padding: '0 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Sair</button>
          </div>
        )}

        {isMobile && mobileMenuOpen && (
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              background: 'var(--dark-popover)', border: '1px solid var(--dark-border)', borderRadius: '12px',
              padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px',
              boxShadow: 'var(--dark-shadow-popover)',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </>
              );
              const itemStyle: React.CSSProperties = {
                display: 'flex', alignItems: 'center', gap: '12px', minHeight: '48px',
                padding: '0 16px', borderRadius: '8px', color: 'var(--dark-fg)', fontSize: '0.9rem',
                fontWeight: 600, textDecoration: 'none', background: 'transparent', border: 'none',
                cursor: 'pointer', width: '100%', textAlign: 'left',
              };
              return item.href ? (
                <a key={item.key} href={item.href} title={item.key === 'seguranca' ? 'Segurança da conta' : undefined} style={itemStyle} onClick={() => setMobileMenuOpen(false)}>
                  {content}
                </a>
              ) : (
                <button key={item.key} onClick={item.onClick} title={item.key === 'sair' ? userEmail : undefined} style={itemStyle}>
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ZONE 1 (LIGHT GRID) */}
      <DashboardTopLayout
        patrimonioTotal={patrimonioTotal} patrimonioTotalLiquido={patrimonioTotalLiquido}
        totalAplicado={totalAplicado}
        rendAcumulado={rendAcumulado} rendAcumuladoLiquido={rendAcumuladoLiquido}
        projVencimento={projVencimento} projVencimentoLiquido={projVencimentoLiquido}
        instComRisco={instComRisco}
        formatBRL={formatBRL} CORES={CORES}
        evolutionData={evolutionData} byInstArray={byInstArray}
        barData={barData} anoVencimentoArray={anoVencimentoArray} LIMIT_FGC={LIMIT_FGC}
        investimentosVencendo={investimentosVencendo} datasPorInvestimento={datasPorInvestimento}
      />

      {showSelic && <ModalSelic onClose={() => setShowSelic(false)} />}
      <Mfa2FAAlert />
    </div>
  );
}
