import { supabase } from '../supabase';
import { Database } from '../database.types';

type Treatment = Database['public']['Tables']['treatments']['Row'];
type TreatmentInsert = Database['public']['Tables']['treatments']['Insert'];
type TreatmentUpdate = Database['public']['Tables']['treatments']['Update'];

export const getTreatments = async () => {
  const { data, error } = await supabase
    .from('treatments')
    .select(`
      *,
      patients (id, first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getTreatment = async (id: string) => {
  const { data, error } = await supabase
    .from('treatments')
    .select(`
      *,
      patients (id, first_name, last_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createTreatment = async (treatment: TreatmentInsert) => {
  const { data, error } = await supabase
    .from('treatments')
    .insert(treatment)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTreatment = async ({ id, ...treatment }: TreatmentUpdate & { id: string }) => {
  const { data, error } = await supabase
    .from('treatments')
    .update(treatment)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTreatment = async (id: string) => {
  const { error } = await supabase
    .from('treatments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};