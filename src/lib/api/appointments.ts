import { supabase } from '../supabase';
import { Database } from '../database.types';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export const getAppointments = async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, first_name, last_name),
      users (id, first_name, last_name)
    `)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data;
};

export const getAppointment = async (id: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients (id, first_name, last_name),
      users (id, first_name, last_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createAppointment = async (appointment: AppointmentInsert) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointment)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAppointment = async ({ id, ...appointment }: AppointmentUpdate & { id: string }) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(appointment)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAppointment = async (id: string) => {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};