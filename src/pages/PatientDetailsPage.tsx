import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientDetails, getPatientDailyLogs } from '@/api/doctorApi';
import Header from '@/components/Header/Header';

interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  total_carbs: number;
  total_insulin: number;
  meals: Meal[];
}

interface Meal {
  id: string;
  food_name: string;
  carbs_grams: number;
  glycemic_index?: number;
  insulin_taken?: number;
  current_glucose?: number;
  time_of_day?: string;
  meal_timestamp?: string;
  image_url?: string;
}

interface Patient {
  id: string;
  email: string;
  age: number | null;
  insulin_ratio?: number;
  fast_insulin?: number;
  basal_insulin?: number;
}

export const PatientDetailsPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId) {
        setError('Patient ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const patientData = await getPatientDetails(patientId);
        setPatient(patientData);

        const logsData = await getPatientDailyLogs(patientId);
        setLogs(logsData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch patient data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex flex-1 items-center justify-center pt-24">
          <div className="text-lg text-gray-600">Loading patient details...</div>
        </main>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex flex-1 items-center justify-center pt-24">
          <div className="text-lg text-red-600">{error || 'Patient not found'}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-1 p-6 pt-24 md:p-8">
        {/* Patient Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/doctor-dashboard')}
            className="mb-6 inline-flex items-center rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-200 transition"
          >
            ← Back to Patients
          </button>

          <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h1 className="text-3xl font-bold text-blue-900">{patient.email}</h1>
                <p className="mt-2 text-gray-600">Patient ID: {patient.id.substring(0, 8)}...</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 p-4">
                  <p className="text-sm text-gray-600">Age</p>
                  <p className="text-2xl font-bold text-blue-700">{patient.age ?? 'N/A'}</p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-green-100 to-green-50 p-4">
                  <p className="text-sm text-gray-600">Insulin Ratio</p>
                  <p className="text-2xl font-bold text-green-700">{patient.insulin_ratio ?? 'N/A'}</p>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 p-4">
                  <p className="text-sm text-gray-600">Fast Insulin</p>
                  <p className="text-2xl font-bold text-purple-700">{patient.fast_insulin ?? 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Meal History */}
        <div>
          <h2 className="mb-6 text-2xl font-bold text-blue-900">Meal History</h2>
          {logs.length > 0 ? (
            <div className="space-y-6">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg backdrop-blur-sm hover:shadow-xl transition"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">
                        {new Date(log.log_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </h3>
                      <p className="text-sm text-gray-600">Total Carbs: {log.total_carbs}g</p>
                    </div>
                    <div className="rounded-lg bg-blue-100 px-4 py-2">
                      <p className="text-sm text-gray-600">Insulin Used</p>
                      <p className="text-xl font-bold text-blue-700">{log.total_insulin} units</p>
                    </div>
                  </div>

                  {log.meals && log.meals.length > 0 ? (
                    <div className="space-y-3 mt-4 pt-4 border-t border-blue-100">
                      {log.meals.map((meal) => (
                        <div
                          key={meal.id}
                          className="rounded-lg bg-gradient-to-r from-blue-50 to-green-50 p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-blue-900">{meal.food_name}</p>
                              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                                <span>
                                  🍞 <strong>{meal.carbs_grams}g</strong> carbs
                                </span>
                                {meal.time_of_day && (
                                  <span>
                                    🕐 <strong>{meal.time_of_day}</strong>
                                  </span>
                                )}
                                {meal.current_glucose && (
                                  <span>
                                    📊 <strong>{meal.current_glucose}</strong> mg/dL
                                  </span>
                                )}
                                {meal.insulin_taken && (
                                  <span>
                                    💊 <strong>{meal.insulin_taken}</strong> units
                                  </span>
                                )}
                              </div>
                            </div>
                            {meal.image_url && (
                              <img
                                src={meal.image_url}
                                alt={meal.food_name}
                                className="ml-4 h-16 w-16 rounded-lg object-cover"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No meals recorded for this day</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-100 bg-white/90 p-8 text-center shadow-lg backdrop-blur-sm">
              <p className="text-lg text-gray-500">No meal history available for this patient yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
