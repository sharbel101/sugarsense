import { supabase } from './supabaseClient';

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  total_carbs: number;
  total_insulin: number;
  created_at?: string;
}

export interface Meal {
  id: string;
  daily_log_id: string;
  food_name: string;
  carbs_grams: number;
  glycemic_index?: number;
  insulin_taken?: number;
  current_glucose?: number;
  meal_timestamp?: string;
  image_url?: string;
  created_at?: string;
}

/**
 * Get or create today's daily log for the user
 */
export const getOrCreateDailyLog = async (userId: string): Promise<DailyLog> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Upsert avoids a separate select + insert roundtrip
  // Requires a unique constraint on (user_id, log_date) in daily_logs
  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      [{ user_id: userId, log_date: today, total_carbs: 0, total_insulin: 0 }],
      { onConflict: 'user_id,log_date' }
    )
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle();

  if (error) throw error;
  return data as DailyLog;
};

/**
 * Save a meal and update the daily log totals
 */
export const saveMeal = async (
  userId: string,
  foodName: string,
  carbsGrams: number,
  insulinTaken: number = 0,
  glycemicIndex?: number,
  currentGlucose?: number,
  imageUrl?: string | null
): Promise<Meal> => {
  // Get or create today's daily log
  const dailyLog = await getOrCreateDailyLog(userId);

  // Insert the meal (include optional image_url)
  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .insert([
      {
        daily_log_id: dailyLog.id,
        food_name: foodName,
        carbs_grams: carbsGrams,
        insulin_taken: insulinTaken,
        glycemic_index: glycemicIndex ?? null,
        current_glucose: currentGlucose ?? null,
        image_url: imageUrl ?? null,
      },
    ])
    .select()
    .maybeSingle();

  if (mealError) throw mealError;
  // Update daily log totals
  const newTotalCarbs = (dailyLog.total_carbs || 0) + carbsGrams;
  const newTotalInsulin = (dailyLog.total_insulin || 0) + insulinTaken;

  const { error: updateError } = await supabase
    .from('daily_logs')
    .update({
      total_carbs: newTotalCarbs,
      total_insulin: newTotalInsulin,
    })
    .eq('id', dailyLog.id);

  if (updateError) throw updateError;

  return meal as Meal;
};

/**
 * Fetch all meals for a user on a specific date with full details
 */
export const fetchMealsForDateWithDetails = async (userId: string, date: string): Promise<Meal[]> => {
  // Single roundtrip using an inner join to filter meals by the user's daily log
  const { data, error } = await supabase
    .from('meals')
    .select('*, daily_logs!inner(id, user_id, log_date)')
    .eq('daily_logs.user_id', userId)
    .eq('daily_logs.log_date', date)
    .order('meal_timestamp', { ascending: true });

  if (error) throw error;
  // Strip the joined daily_logs object if present
  const meals = (data || []).map((m: any) => {
    const { daily_logs, ...rest } = m;
    return rest as Meal;
  });
  return meals as Meal[];
};

/**
 * Fetch all daily logs for a user
 */
export const fetchDailyLogs = async (userId: string): Promise<DailyLog[]> => {
  const { data: logs, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });

  if (error) throw error;
  return (logs || []) as DailyLog[];
};
