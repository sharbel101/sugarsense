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
  image_data?: string; // Base64 compressed image stored in DB
  created_at?: string;
}

/**
 * Get or create today's daily log for the user
 * Single upsert operation - minimal DB roundtrips
 */
export const getOrCreateDailyLog = async (userId: string): Promise<DailyLog> => {
  const today = new Date().toISOString().split('T')[0];

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
 * Save a meal with optional compressed image - optimized for mobile
 * Minimal database operations, fast execution
 */
export const saveMeal = async (
  userId: string,
  foodName: string,
  carbsGrams: number,
  insulinTaken: number = 0,
  glycemicIndex?: number,
  currentGlucose?: number,
  imageData?: string | null
): Promise<Meal> => {
  // Get or create today's daily log
  const dailyLog = await getOrCreateDailyLog(userId);

  // Insert the meal with optional compressed image data
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
        image_data: imageData ?? null, // Store compressed base64 in DB
      },
    ])
    .select()
    .maybeSingle();

  if (mealError) throw mealError;

  // Update daily log totals in single operation
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
 * Fetch all meals for a user on a specific date
 * Single query with join
 */
export const fetchMealsForDateWithDetails = async (userId: string, date: string): Promise<Meal[]> => {
  const { data, error } = await supabase
    .from('meals')
    .select('*, daily_logs!inner(id, user_id, log_date)')
    .eq('daily_logs.user_id', userId)
    .eq('daily_logs.log_date', date)
    .order('meal_timestamp', { ascending: true });

  if (error) throw error;

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
