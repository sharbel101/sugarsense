import { supabase } from './supabaseClient';

export interface SaveMealPayload {
  user_id: string;
  food_name: string;
  carbs_grams: number;
  glycemic_index: number;
  insulin_taken: number;
  current_glucose: number;
  time_of_day: string;
  meal_timestamp?: string;
}

export interface MealRecord {
  id: string;
  daily_log_id: string;
  food_name: string;
  carbs_grams: number;
  glycemic_index: number;
  insulin_taken: number;
  current_glucose: number;
  time_of_day: string;
  meal_timestamp: string;
}

export interface DailyLogRecord {
  id: string;
  user_id: string;
  log_date: string;
  total_carbs: number;
  total_insulin: number;
}

export interface SaveMealResponse {
  meal: MealRecord;
  daily_log: DailyLogRecord;
}

export interface MealWithLog extends MealRecord {
  daily_logs?: {
    id: string;
    log_date: string;
    total_carbs: number;
    total_insulin: number;
  };
}

export const saveMeal = async (payload: SaveMealPayload): Promise<SaveMealResponse> => {
  const { data, error } = await supabase.functions.invoke<SaveMealResponse>('saveMeal', {
    body: payload,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to save meal right now.');
  }

  return data;
};

export const fetchMealsWithLogs = async (userId: string): Promise<MealWithLog[]> => {
  const { data, error } = await supabase
    .from('meals')
    .select(
      [
        'id',
        'daily_log_id',
        'food_name',
        'carbs_grams',
        'glycemic_index',
        'insulin_taken',
        'current_glucose',
        'time_of_day',
        'meal_timestamp',
        'daily_logs(id,log_date,total_carbs,total_insulin)',
      ].join(', ')
    )
    .eq('daily_logs.user_id', userId)
    .order('meal_timestamp', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as MealWithLog[]) ?? [];
};
