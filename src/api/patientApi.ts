import { supabase } from './supabaseClient';

export interface Patient {
  id: string;
  name: string;
  age: number;
  meals: string[];
}

export const getPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase.from('patients').select('*');
  if (error) throw error;
  return data as Patient[];
};