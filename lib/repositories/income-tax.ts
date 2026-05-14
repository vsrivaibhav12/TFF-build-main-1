import { createClient } from '@/lib/supabase/server';

export interface IncomeTaxSlab {
  id?: string;
  assessment_year: string;
  category: string;
  min_income: number;
  max_income: number | null;
  rate_percent: number;
  surcharge_percent: number;
  cess_percent: number;
  created_by?: string;
}

export async function listIncomeTaxSlabs(assessmentYear?: string) {
  const sb = createClient();
  let q = sb.from('income_tax_slabs').select('*').order('assessment_year', { ascending: false }).order('category').order('min_income');
  if (assessmentYear) q = q.eq('assessment_year', assessmentYear);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as IncomeTaxSlab[];
}

export async function upsertIncomeTaxSlab(slab: IncomeTaxSlab) {
  const sb = createClient();
  const payload = {
    assessment_year: slab.assessment_year,
    category: slab.category,
    min_income: slab.min_income,
    max_income: slab.max_income,
    rate_percent: slab.rate_percent,
    surcharge_percent: slab.surcharge_percent,
    cess_percent: slab.cess_percent,
    created_by: slab.created_by,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from('income_tax_slabs')
    .upsert(payload, { onConflict: 'assessment_year,category,min_income' })
    .select()
    .single();
  if (error) throw error;
  return data as IncomeTaxSlab;
}

export async function deleteIncomeTaxSlab(id: string) {
  const sb = createClient();
  const { error } = await sb.from('income_tax_slabs').delete().eq('id', id);
  if (error) throw error;
}
