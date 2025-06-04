import { supabase } from '../supabase';
import { Database } from '../database.types';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export const getPatients = async (): Promise<Patient[]> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patients:', error);
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching patients:', error);
    throw error;
  }
};

export const getPatient = async (id: string): Promise<Patient> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      throw new Error(`Failed to fetch patient: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching patient:', error);
    throw error;
  }
};

export const createPatient = async (patient: PatientInsert): Promise<Patient> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        ...patient,
        status: patient.status || 'active',
        risk_level: patient.risk_level || 'low',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      throw new Error(`Failed to create patient: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating patient:', error);
    throw error;
  }
};

export const updatePatient = async (id: string, patient: PatientUpdate): Promise<Patient> => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .update({
        ...patient,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient:', error);
      throw new Error(`Failed to update patient: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating patient:', error);
    throw error;
  }
};

export const deletePatient = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting patient:', error);
      throw new Error(`Failed to delete patient: ${error.message}`);
    }
  } catch (error) {
    console.error('Unexpected error deleting patient:', error);
    throw error;
  }
};