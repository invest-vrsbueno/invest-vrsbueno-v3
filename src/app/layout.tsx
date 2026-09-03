import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-family-sans' });

export const metadata: Metadata = {
  title: 'vrsbueno Invest',
  description: 'Dashboard de Investimentos M3 (V.L.A.E.G)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
