import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface MealPayload {
  user_id: string;
  food_name: string;
  carbs_grams: number;
  glycemic_index: number;
  insulin_taken: number;
  current_glucose: number;
  time_of_day: string;
  meal_timestamp?: string;
}

interface MealRow {
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

interface DailyLogRow {
  id: string;
  user_id: string;
  log_date: string;
  total_carbs: number;
  total_insulin: number;
}

const databaseUrl = Deno.env.get('SUPABASE_DB_URL');

if (!databaseUrl) {
  throw new Error('SUPABASE_DB_URL is not configured for the saveMeal function.');
}

const pool = new Pool(databaseUrl, 2, true);

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return buildErrorResponse('Method not allowed', 405);
  }

  let payload: MealPayload;

  try {
    payload = (await req.json()) as MealPayload;
  } catch {
    return buildErrorResponse('Invalid JSON body.');
  }

  const requiredFields: Array<keyof MealPayload> = [
    'user_id',
    'food_name',
    'carbs_grams',
    'glycemic_index',
    'insulin_taken',
    'current_glucose',
    'time_of_day',
  ];

  const missing = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null);

  if (missing.length > 0) {
    return buildErrorResponse(`Missing required fields: ${missing.join(', ')}`);
  }

  const numericFields: Array<keyof MealPayload> = [
    'carbs_grams',
    'glycemic_index',
    'insulin_taken',
    'current_glucose',
  ];

  for (const field of numericFields) {
    const value = Number(payload[field]);
    if (Number.isNaN(value)) {
      return buildErrorResponse(`Invalid numeric value for ${field}`);
    }
    payload[field] = value as never;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const mealTimestamp = payload.meal_timestamp
    ? new Date(payload.meal_timestamp).toISOString()
    : new Date().toISOString();

  const client = await pool.connect();

  try {
    await client.queryArray('BEGIN');

    const existingDailyLogResult = await client.queryObject<DailyLogRow>({
      text: `
        SELECT id, user_id, log_date, total_carbs, total_insulin
        FROM daily_logs
        WHERE user_id = $1 AND log_date = $2
        LIMIT 1
      `,
      args: [payload.user_id, todayIso],
    });

    let dailyLog = existingDailyLogResult.rows[0];

    if (!dailyLog) {
      const insertDailyLogResult = await client.queryObject<DailyLogRow>({
        text: `
          INSERT INTO daily_logs (user_id, log_date, total_carbs, total_insulin)
          VALUES ($1, $2, 0, 0)
          RETURNING id, user_id, log_date, total_carbs, total_insulin
        `,
        args: [payload.user_id, todayIso],
      });
      dailyLog = insertDailyLogResult.rows[0];
    }

    if (!dailyLog) {
      throw new Error('Unable to create or retrieve daily log.');
    }

    const mealInsertResult = await client.queryObject<MealRow>({
      text: `
        INSERT INTO meals (
          daily_log_id,
          food_name,
          carbs_grams,
          glycemic_index,
          insulin_taken,
          current_glucose,
          time_of_day,
          meal_timestamp
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, daily_log_id, food_name, carbs_grams, glycemic_index, insulin_taken, current_glucose, time_of_day, meal_timestamp
      `,
      args: [
        dailyLog.id,
        payload.food_name,
        payload.carbs_grams,
        payload.glycemic_index,
        payload.insulin_taken,
        payload.current_glucose,
        payload.time_of_day,
        mealTimestamp,
      ],
    });

    const meal = mealInsertResult.rows[0];

    if (!meal) {
      throw new Error('Meal insert failed.');
    }

    const totalsUpdateResult = await client.queryObject<DailyLogRow>({
      text: `
        UPDATE daily_logs
        SET
          total_carbs = COALESCE((SELECT SUM(carbs_grams) FROM meals WHERE daily_log_id = $1), 0),
          total_insulin = COALESCE((SELECT SUM(insulin_taken) FROM meals WHERE daily_log_id = $1), 0)
        WHERE id = $1
        RETURNING id, user_id, log_date, total_carbs, total_insulin
      `,
      args: [dailyLog.id],
    });

    const updatedDailyLog = totalsUpdateResult.rows[0];

    await client.queryArray('COMMIT');

    return new Response(JSON.stringify({ meal, daily_log: updatedDailyLog }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  } catch (error) {
    await client.queryArray('ROLLBACK');
    console.error('saveMeal error:', error);
    return buildErrorResponse(error instanceof Error ? error.message : 'Unexpected error', 500);
  } finally {
    client.release();
  }
});
