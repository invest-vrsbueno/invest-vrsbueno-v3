'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, XAxis, Tooltip, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

const CORES_ANO = ["#00bfa5", "#6c63ff", "#f97316", "#3b82f6", "#ec4899", "#14b8a6"];

export function ResumoAnualChart({ barData, formatBRL }: { barData: any[]; formatBRL: (v: number) => string }) {
  return (
    <>
      <div style={{ display: 'flex', gap: '16px', padding: '20px 20px 0' }}>
        <div style={{ flex: '1 1 60%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barGap={0} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b8fa8' }} axisLine={{ stroke: '#e2e4f0' }} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} formatter={(val: any) => formatBRL(Number(val))} />
              <Bar dataKey="vence" fill="#00bfa5" radius={[2, 2, 0, 0]} name="Vence no Ano" />
              <Bar dataKey="gerado" fill="#6c63ff" radius={[2, 2, 0, 0]} name="Gerado no Ano" />
              <Legend iconType="square" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: '1 1 40%', height: '220px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.7rem', color: '#8b8fa8', textAlign: 'center', marginBottom: '4px' }}>% do valor vencendo por ano</div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={barData} dataKey="vence" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} stroke="none" label={({ percent }) => (percent || 0) > 0.05 ? `${((percent || 0) * 100).toFixed(0)}%` : ''} labelLine={false}>
                {barData.map((entry: any, index: number) => (
                  <Cell key={`cell-ano-${index}`} fill={CORES_ANO[index % CORES_ANO.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatBRL(Number(value))} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 10 }} iconType="square" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ padding: '16px 20px 20px', fontSize: '0.8rem' }}>
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
    </>
  );
}
