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
  time_of_day?: string;
  meal_timestamp?: string;
  image_url?: string;
  created_at?: string;
}

/**
 * Get or create today's daily log for the user
 */
export const getOrCreateDailyLog = async (userId: string): Promise<DailyLog> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Try to find existing log for today
  const { data: existingLog, error: selectError } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existingLog) {
    return existingLog as DailyLog;
  }

  // Create new log for today
  const { data: newLog, error: insertError } = await supabase
    .from('daily_logs')
    .insert([{ user_id: userId, log_date: today, total_carbs: 0, total_insulin: 0 }])
    .select()
    .maybeSingle();

  if (insertError) throw insertError;
  return newLog as DailyLog;
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
  timeOfDay?: string,
  imageUrl?: string | null
): Promise<Meal> => {
  console.log('saveMeal called with:', { userId, foodName, carbsGrams, insulinTaken });

  // Get or create today's daily log
  const dailyLog = await getOrCreateDailyLog(userId);
  console.log('Daily log:', dailyLog);

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
        time_of_day: timeOfDay ?? null,
        image_url: imageUrl ?? null,
      },
    ])
    .select()
    .maybeSingle();

  if (mealError) throw mealError;
  console.log('Meal saved:', meal);

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
  console.log('Daily log updated with totals:', { newTotalCarbs, newTotalInsulin });

  return meal as Meal;
};

/**
 * Fetch all meals for a user on a specific date with full details
 */
export const fetchMealsForDateWithDetails = async (userId: string, date: string): Promise<Meal[]> => {
  // First get the daily log for this date
  const { data: dailyLog, error: logError } = await supabase
    .from('daily_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', date)
    .maybeSingle();

  if (logError) throw logError;
  if (!dailyLog) return [];

  // Then fetch all meals for that daily log
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('*')
    .eq('daily_log_id', dailyLog.id)
    .order('meal_timestamp', { ascending: true });

  if (mealsError) throw mealsError;
  return (meals || []) as Meal[];
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
