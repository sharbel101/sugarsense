import { supabase } from './supabaseClient';
import type { UserState } from '@/features/user/userSlice';

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const getUserRow = async (userId: string): Promise<UserState | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as UserState) ?? null;
};

export const createUserRow = async (userId: string, email: string, password: string) => {
  const { data, error } = await supabase
    .from('users')
    .insert([{ id: userId, email, password_hash: password }])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertUserRow = async (userId: string, payload: Partial<UserState>) => {
  const toUpdate = { ...payload } as any;
  // ensure id present
  toUpdate.id = userId;

  const { data, error } = await supabase
    .from('users')
    .upsert(toUpdate, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateUserRow = async (userId: string, payload: Partial<UserState>) => {
  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};
