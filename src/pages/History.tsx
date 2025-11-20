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
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <Header onBack={() => navigate('/chat')} />

      <div className="flex-1 overflow-y-auto p-4 pt-20">
        <div className="max-w-3xl mx-auto">
          {/* Date header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-green-800">
              {date ? formatDate(date) : 'History'}
            </h1>
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-green-50 p-4">
              <div>
                <p className="text-sm text-green-600">Total Carbs</p>
                <p className="text-2xl font-bold text-green-800">{totalCarbs.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Total Insulin</p>
                <p className="text-2xl font-bold text-green-800">{totalInsulin.toFixed(1)} units</p>
              </div>
            </div>
          </div>

          {/* Meals list */}
          {loading && <p className="text-center text-green-600">Loading meals...</p>}
          {error && <p className="text-center text-red-600">{error}</p>}
          
          {!loading && meals.length === 0 && (
            <p className="text-center text-green-600">No meals recorded for this day.</p>
          )}

          <div className="space-y-4">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-lg border border-green-200 bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                {/* Image and basic info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Image */}
                  {meal.image_url && (
                    <div className="md:col-span-1">
                      <img
                        src={meal.image_url}
                        alt={meal.food_name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className={meal.image_url ? 'md:col-span-2' : 'md:col-span-3'}>
                    <h2 className="text-lg font-semibold text-green-800 mb-3">
                      {meal.food_name}
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-green-600">Carbs</p>
                        <p className="text-xl font-bold text-green-800">
                          {meal.carbs_grams}g
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-600">Insulin</p>
                        <p className="text-xl font-bold text-green-800">
                          {meal.insulin_taken?.toFixed(2)} units
                        </p>
                      </div>
                    </div>

                    {/* Additional details */}
                    <div className="text-sm text-green-700 space-y-1">
                      {meal.time_of_day && (
                        <p>
                          <span className="font-semibold">Time:</span> {meal.time_of_day}
                        </p>
                      )}
                      {meal.current_glucose && (
                        <p>
                          <span className="font-semibold">Glucose:</span> {meal.current_glucose} mg/dL
                        </p>
                      )}
                      {meal.glycemic_index && (
                        <p>
                          <span className="font-semibold">Glycemic Index:</span> {meal.glycemic_index}
                        </p>
                      )}
                      {meal.meal_timestamp && (
                        <p>
                          <span className="font-semibold">Logged at:</span>{' '}
                          {new Date(meal.meal_timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
