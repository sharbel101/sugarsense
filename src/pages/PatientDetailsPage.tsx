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

  // -----------------------------------
  // Fetch Patient + Logs
  // -----------------------------------
  useEffect(() => {
    const load = async () => {
      if (!patientId) {
        setError('Patient ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const patientData = await getPatientDetails(patientId);
        const logsData = await getPatientDailyLogs(patientId);

        setPatient(patientData);
        setLogs(logsData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch patient data');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [patientId]);

  // -----------------------------------
  // Loading State
  // -----------------------------------
  if (isLoading) {
    return (
      <PageWrapper>
        <LoadingState />
      </PageWrapper>
    );
  }

  // -----------------------------------
  // Error State
  // -----------------------------------
  if (error || !patient) {
    return (
      <PageWrapper>
        <ErrorState message={error || 'Patient not found'} />
      </PageWrapper>
    );
  }

  // -----------------------------------
  // Computed Totals
  // -----------------------------------
  const totalCarbs = logs.reduce((s, l) => s + l.total_carbs, 0);
  const totalInsulin = logs.reduce((s, l) => s + l.total_insulin, 0);

  return (
    <PageWrapper>
      <main className="flex-1 overflow-y-auto p-6 pt-24 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* Back Button */}
          <BackButton onClick={() => navigate('/doctor-dashboard')} />

          {/* Patient Card */}
          <PatientHeaderCard patient={patient} />

          {/* Summary Stats */}
          <SummaryStats
            logsCount={logs.length}
            totalCarbs={totalCarbs}
            totalInsulin={totalInsulin}
          />

          {/* Meal History */}
          <MealHistory logs={logs} />
        </div>
      </main>
    </PageWrapper>
  );
};

//
// ------------------------------------------------------
// Sub-Components (Clean, Modular, Reusable)
// ------------------------------------------------------
//

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
    <Header />
    {children}
  </div>
);

const LoadingState = () => (
  <div className="flex flex-1 items-center justify-center pt-24">
    <div className="text-center">
      <svg
        className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          className="opacity-75"
          d="M4 12a8 8 0 018-8V0C5.3 0 0 5.3 0 12h4z"
        />
      </svg>
      <p className="text-blue-600 font-medium">Loading patient details...</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <main className="flex flex-1 items-center justify-center pt-24 px-6">
    <div className="text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <p className="text-lg font-semibold text-red-600 mb-4">{message}</p>
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center rounded-lg bg-blue-500 px-6 py-3 text-white font-semibold hover:bg-blue-600 transition"
      >
        ← Back
      </button>
    </div>
  </main>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="mb-6 inline-flex items-center rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-200 transition"
  >
    ← Back to Patients
  </button>
);

const PatientHeaderCard = ({ patient }: { patient: any }) => (
  <div className="mb-8">
    <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-lg backdrop-blur-sm">

      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-1 break-words">
          {patient.email}
        </h1>
        <p className="text-sm text-gray-500">Patient ID: {patient.id.slice(0, 12)}...</p>
      </div>

      {/* Stat Grid */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Age" color="blue" value={patient.age ?? 'N/A'} />
        <StatCard label="Insulin Ratio" color="emerald" value={patient.insulin_ratio ?? 'N/A'} />
        <StatCard label="Fast Insulin" color="purple" value={patient.fast_insulin ?? 'N/A'} />
        <StatCard label="Basal Insulin" color="orange" value={patient.basal_insulin ?? 'N/A'} />
      </div>
    </div>
  </div>
);

const StatCard = ({
  label,
  color,
  value
}: {
  label: string;
  color: string;
  value: any;
}) => (
  <div className={`rounded-2xl bg-gradient-to-br from-${color}-100 to-${color}-50 p-5`}>
    <p className={`text-[11px] font-semibold text-${color}-600 uppercase tracking-wider`}>
      {label}
    </p>
    <p className={`mt-2 text-lg font-bold text-${color}-900 leading-snug break-words`}>
      {value}
    </p>
  </div>
);

const SummaryStats = ({
  logsCount,
  totalCarbs,
  totalInsulin
}: {
  logsCount: number;
  totalCarbs: number;
  totalInsulin: number;
}) => (
  <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
    <SummaryCard label="Total Logs" color="blue" value={logsCount} />
    <SummaryCard label="Total Carbs" color="emerald" value={`${totalCarbs}g`} />
    <SummaryCard label="Total Insulin" color="teal" value={`${Math.round(totalInsulin)} units`} />
  </div>
);

const SummaryCard = ({
  label,
  value,
  color
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
    <p className={`text-sm font-semibold uppercase tracking-wide text-${color}-600`}>{label}</p>
    <p className={`mt-3 text-4xl font-bold text-${color}-900`}>{value}</p>
  </div>
);

const MealHistory = ({ logs }: { logs: DailyLog[] }) => (
  <div>
    <h2 className="mb-6 text-3xl font-bold text-blue-900">Meal History</h2>

    {logs.length === 0 ? (
      <EmptyMealHistory />
    ) : (
      <div className="space-y-6">
        {logs.map(log => (
          <MealLogCard key={log.id} log={log} />
        ))}
      </div>
    )}
  </div>
);

const EmptyMealHistory = () => (
  <div className="rounded-2xl border border-blue-100 bg-white/90 p-12 text-center shadow-lg backdrop-blur-sm">
    <div className="mb-4 text-5xl">📊</div>
    <p className="text-lg font-semibold text-blue-900 mb-2">No meal history available</p>
    <p className="text-gray-600">This patient hasn't logged any meals yet.</p>
  </div>
);

const MealLogCard = ({ log }: { log: DailyLog }) => (
  <div className="rounded-2xl border border-blue-100 bg-white/90 shadow-lg hover:shadow-xl transition backdrop-blur-sm overflow-hidden">
    <div className="p-6">

      {/* Date */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-6 border-b border-blue-100">
        <div>
          <h3 className="text-2xl font-bold text-blue-900">
            {new Date(log.log_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {log.meals.length} meal{log.meals.length !== 1 ? 's' : ''} logged
          </p>
        </div>

        <div className="flex gap-4">
          <MealStatBox label="Carbs" color="emerald" value={`${log.total_carbs}g`} />
          <MealStatBox label="Insulin" color="teal" value={`${Math.round(log.total_insulin)} units`} />
        </div>
      </div>

      {/* Meals */}
      {log.meals.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No meals recorded for this day</p>
      ) : (
        <div className="space-y-4">
          {log.meals.map(meal => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  </div>
);

const MealStatBox = ({
  label,
  value,
  color
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <div className={`rounded-xl bg-${color}-100 px-6 py-3`}>
    <p className={`text-xs font-bold text-${color}-600 uppercase tracking-wide`}>{label}</p>
    <p className={`mt-1 text-2xl font-bold text-${color}-900`}>{value}</p>
  </div>
);

const MealCard = ({ meal }: { meal: Meal }) => (
  <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-emerald-50 p-5 hover:shadow-md transition">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

      {/* Text */}
      <div className="flex-1">
        <h4 className="text-lg font-bold text-blue-900 mb-3">{meal.food_name}</h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <InfoBox label="Carbs" value={`${meal.carbs_grams}g`} color="emerald" />

          {meal.insulin_taken && (
            <InfoBox label="Insulin" value={`${Math.round(meal.insulin_taken)} units`} color="teal" />
          )}

          {meal.current_glucose && (
            <InfoBox label="Glucose" value={`${meal.current_glucose} mg/dL`} color="blue" />
          )}
        </div>

        {/* Extra Info */}
        {meal.glycemic_index && (
          <div className="mt-3 text-sm text-gray-600 space-y-1">
            {meal.glycemic_index && <p>📊 GI: <strong>{meal.glycemic_index}</strong></p>}
          </div>
        )}
      </div>

      {/* Image */}
      {meal.image_url && (
        <img
          src={meal.image_url}
          alt={meal.food_name}
          className="h-24 w-24 rounded-lg object-cover shadow-md"
        />
      )}
    </div>
  </div>
);

const InfoBox = ({
  label,
  value,
  color
}: {
  label: string;
  value: string;
  color: string;
}) => (
  <div>
    <p className="text-xs font-semibold text-gray-600">{label}</p>
    <p className={`text-lg font-bold text-${color}-900`}>{value}</p>
  </div>
);
