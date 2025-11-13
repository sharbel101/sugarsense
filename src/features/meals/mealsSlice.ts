import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { MealWithLog, MealRecord, DailyLogRecord } from '@/api/mealService';

interface MealsState {
  items: MealWithLog[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MealsState = {
  items: [],
  isLoading: false,
  error: null,
};

const mealsSlice = createSlice({
  name: 'meals',
  initialState,
  reducers: {
    setMeals(state, action: PayloadAction<MealWithLog[]>) {
      state.items = action.payload;
      state.error = null;
    },
    setMealsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setMealsError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    addMeal(state, action: PayloadAction<{ meal: MealRecord; dailyLog: DailyLogRecord }>) {
      const { meal, dailyLog } = action.payload;
      const enrichedMeal: MealWithLog = {
        ...meal,
        daily_logs: {
          id: dailyLog.id,
          log_date: dailyLog.log_date,
          total_carbs: dailyLog.total_carbs,
          total_insulin: dailyLog.total_insulin,
        },
      };

      state.items = [enrichedMeal, ...state.items.filter((existing) => existing.id !== meal.id)];
      state.error = null;
    },
    resetMeals: () => initialState,
  },
});

export const { setMeals, setMealsLoading, setMealsError, addMeal, resetMeals } = mealsSlice.actions;

export const selectMeals = (state: RootState) => state.meals.items;
export const selectMealsLoading = (state: RootState) => state.meals.isLoading;
export const selectMealsError = (state: RootState) => state.meals.error;

export default mealsSlice.reducer;
