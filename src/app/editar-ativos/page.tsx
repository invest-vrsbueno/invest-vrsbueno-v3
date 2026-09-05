import { redirect } from 'next/navigation';
import { createClient } from '../../utils/supabase/server';
import AtivosClient from './AtivosClient';

export default async function EditarAtivosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: investimentos } = await supabase
    .from('investimentos')
    .select('*')
    .order('data_vencimento', { ascending: true, nullsFirst: false });

  return (
    <div style={{ width: '100vw', minHeight: '100vh' }}>
      <AtivosClient initialData={investimentos || []} />
    </div>
  );
}
