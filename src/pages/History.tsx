import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '@/features/user/userSlice';
import Header from '@/components/Header/Header';
import { fetchMealsForDateWithDetails } from '@/api/mealsApi';
import type { Meal } from '@/api/mealsApi';

export const HistoryPage: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMeals = async () => {
      if (!user?.id || !date) return;
      
      try {
        setLoading(true);
        const mealData = await fetchMealsForDateWithDetails(user.id, date);
        setMeals(mealData);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load meals for date:', err);
        setError(err?.message || 'Failed to load meal history');
      } finally {
        setLoading(false);
      }
    };

    loadMeals();
  }, [user?.id, date]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate totals
  const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs_grams || 0), 0);
  const totalInsulin = meals.reduce((sum, meal) => sum + (meal.insulin_taken || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <Header onBack={() => navigate('/chat')} />

      <main className="flex-1 overflow-y-auto p-6 pt-24 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Date Header Card */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/chat')}
              className="inline-flex items-center rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-200 transition mb-6"
            >
              ← Back
            </button>

            <div className="rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-lg backdrop-blur-sm">
              <h1 className="text-4xl font-bold text-emerald-900 mb-6">
                {date ? formatDate(date) : 'Meal History'}
              </h1>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-6">
                  <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Total Carbs</p>
                  <p className="mt-2 text-4xl font-bold text-emerald-900">{totalCarbs.toFixed(1)}<span className="text-lg">g</span></p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 p-6">
                  <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide">Total Insulin</p>
                  <p className="mt-2 text-4xl font-bold text-teal-900">{Math.round(totalInsulin)}<span className="text-lg">units</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <svg className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-emerald-600 font-medium">Loading meals...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}
          
          {/* Empty State */}
          {!loading && meals.length === 0 && !error && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-12 text-center">
              <p className="text-emerald-600 font-medium text-lg">No meals recorded for this day.</p>
            </div>
          )}

          {/* Meals List */}
          <div className="space-y-6">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-2xl border border-emerald-100 bg-white/90 shadow-lg hover:shadow-xl transition backdrop-blur-sm overflow-hidden"
              >
                <div className="p-6">
                  {/* Meal Header */}
                  <div className="flex items-start justify-between mb-6">
                    <h2 className="text-2xl font-bold text-emerald-900">
                      {meal.food_name}
                    </h2>
                    {(meal.image_data || meal.image_url) && (
                      <img
                        src={meal.image_data || meal.image_url}
                        alt={meal.food_name}
                        className="h-24 w-24 rounded-xl object-cover shadow-md"
                      />
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-4">
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Carbs</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-900">{meal.carbs_grams}g</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 p-4">
                      <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Insulin</p>
                      <p className="mt-2 text-2xl font-bold text-teal-900">{Math.round(meal.insulin_taken || 0)} units</p>
                    </div>
                    {meal.current_glucose && (
                      <div className="rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Glucose</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{meal.current_glucose} mg/dL</p>
                      </div>
                    )}
                    {meal.glycemic_index && (
                      <div className="rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 p-4">
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">GI Index</p>
                        <p className="mt-2 text-2xl font-bold text-orange-900">{meal.glycemic_index}</p>
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  {meal.meal_timestamp && (
                    <div className="border-t border-emerald-100 pt-4">
                      <div className="flex flex-wrap gap-6 text-sm">
                        {meal.meal_timestamp && (
                          <div>
                            <p className="text-emerald-600 font-semibold">Logged at</p>
                            <p className="text-emerald-900">{new Date(meal.meal_timestamp).toLocaleTimeString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
