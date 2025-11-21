import { supabase } from './supabaseClient';

export interface DoctorProfile {
  id: string;
  auth_user_id: string;
  dr_id: string;
  name: string;
  email: string;
}

/**
 * Generates a random 4-character alphanumeric string (A-Z, 0-9).
 */
export const generateDrId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createDoctorRow = async (
  authUserId: string,
  email: string,
  name: string,
  drId: string
) => {
  const { data, error } = await supabase
    .from('doctors')
    .insert([{ auth_user_id: authUserId, email, name, dr_id: drId }])
    .select()
    .single();

  if (error) throw error;
  return data as DoctorProfile;
};

export const getDoctorByAuthId = async (authUserId: string): Promise<DoctorProfile | null> => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getPatientsByDrId = async (drId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, age, insulin_ratio, fast_insulin, patient_name')
    .eq('dr_id', drId);

  if (error) throw error;
  return data;
};

export const getPatientDetails = async (patientId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error) throw error;
  return data;
};

export const getPatientDailyLogs = async (patientId: string) => {
    const { data, error } = await supabase
        .from('daily_logs')
        .select('*, meals(*)')
        .eq('user_id', patientId)
        .order('log_date', { ascending: false });

    if (error) throw error;
    return data;
};

export const getPatientMeals = async (patientId: string) => {
    const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('daily_log_id', (
            await supabase
                .from('daily_logs')
                .select('id')
                .eq('user_id', patientId)
                .then(res => res.data ? res.data.map(log => log.id) : [])
        ))
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const getPatientGlucoseTrend = async (patientId: string, days: number = 30) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('meals')
        .select('current_glucose, meal_timestamp, created_at')
        .in('daily_log_id', (
            await supabase
                .from('daily_logs')
                .select('id')
                .eq('user_id', patientId)
                .gte('log_date', startDateStr)
                .then(res => res.data ? res.data.map(log => log.id) : [])
        ))
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};