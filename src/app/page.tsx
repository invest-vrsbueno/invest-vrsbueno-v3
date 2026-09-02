import DashboardClient from './DashboardClient';

async function getInvestimentos() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return [];
  const endpoint = `${url}/rest/v1/investimentos?select=*&order=data_vencimento.asc.nullsfirst`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 }
    });

    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

export default async function DashboardPage() {
  const rawInvestimentos = await getInvestimentos();
  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <DashboardClient initialData={rawInvestimentos} />
    </div>
  );
}
