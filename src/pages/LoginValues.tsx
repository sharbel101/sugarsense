import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import Header from "@/components/Header/Header";
import { updateUserRow } from '@/api/userApi';
import { setUser, selectUser } from '@/features/user/userSlice';
import { saveUserToStorage } from '@/features/user/userStorage';

export const LoginValuesPage: React.FC = () => {
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [insulinRatio, setInsulinRatio] = useState<number | "">("");
  const [fastInsulin, setFastInsulin] = useState("");
  const [basalInsulin, setBasalInsulin] = useState("");
  const [drId, setDrId] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const storedUser = useSelector(selectUser);

  const fastInsulinOptions = [
    "Humalog (Lispro)",
    "Novorapid (Aspart)",
    "Apidra (Glulisine)",
    "Fiasp",
    "Lyumjev",
  ];

  const basalInsulinOptions = [
    "Lantus (Glargine)",
    "Levemir (Detemir)",
    "Tresiba (Degludec)",
    "Toujeo",
    "Basaglar",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50 via-white to-white">
      <Header onBack={() => navigate("/")} />

      <main className="flex-1 px-4 pb-24 pt-24">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <section className="rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <header className="mb-6">
              <h2 className="text-2xl font-semibold text-green-800">
                Let’s personalize SugarSense for you
              </h2>
              <p className="mt-2 text-sm text-green-600">
                Provide your key insulin and age details to start.
              </p>
            </header>

            <div className="grid gap-6">
              {/* Patient Name input */}
              <label className="flex flex-col text-sm text-green-900">
                Full Name
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </label>

              {/* Age input */}
              <label className="flex flex-col text-sm text-green-900">
                Age
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  placeholder="Enter your age"
                  className="mt-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </label>

              {/* Insulin ratio input */}
              <label className="flex flex-col text-sm text-green-900">
                Insulin per 15g carbs
                <input
                  type="number"
                  step="0.1"
                  value={insulinRatio}
                  onChange={(e) => setInsulinRatio(Number(e.target.value))}
                  placeholder="Units per 15g carbs"
                  className="mt-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </label>

              {/* Fast-acting insulin dropdown */}
              <label className="flex flex-col text-sm text-green-900">
                Fast-acting insulin
                <select
                  value={fastInsulin}
                  onChange={(e) => setFastInsulin(e.target.value)}
                  className="mt-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                >
                  <option value="">Select fast-acting insulin</option>
                  {fastInsulinOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {/* Basal insulin dropdown */}
              <label className="flex flex-col text-sm text-green-900">
                Basal (slow-acting) insulin
                <select
                  value={basalInsulin}
                  onChange={(e) => setBasalInsulin(e.target.value)}
                  className="mt-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                >
                  <option value="">Select basal insulin</option>
                  {basalInsulinOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              {/* Doctor ID input */}
              <label className="flex flex-col text-sm text-green-900">
                Doctor ID (Optional)
                <input
                  type="text"
                  value={drId}
                  onChange={(e) => setDrId(e.target.value)}
                  placeholder="Enter your doctor ID or code"
                  className="mt-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </label>
            </div>
          </section>
        </div>
      </main>

      <footer className="sticky bottom-0 left-0 w-full border-t border-green-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl justify-end px-4 py-4">
          <button
            type="button"
            onClick={async () => {
              try {
                // determine user id
                const userId = storedUser?.id;
                if (!userId) {
                  alert('Not authenticated — please login first');
                  navigate('/login');
                  return;
                }

                const payload: any = {
                  patient_name: patientName || null,
                  age: age === '' ? null : age,
                  insulin_ratio: insulinRatio === '' ? null : Number(insulinRatio),
                  fast_insulin: fastInsulin || null,
                  basal_insulin: basalInsulin ? Number(basalInsulin) : null,
                  dr_id: drId || null,
                };

                await updateUserRow(userId, payload);

                dispatch(
                  setUser({
                    id: userId,
                    patientName: payload.patient_name,
                    age: payload.age,
                    insulinRatio: payload.insulin_ratio,
                    fastInsulin: payload.fast_insulin,
                    basalInsulin: payload.basal_insulin,
                    drId: payload.dr_id,
                  })
                );

                saveUserToStorage({
                  id: userId,
                  patientName: payload.patient_name,
                  age: payload.age,
                  insulinRatio: payload.insulin_ratio,
                  fastInsulin: payload.fast_insulin,
                  basalInsulin: payload.basal_insulin,
                  drId: payload.dr_id,
                  isProfileComplete: true,
                } as any);

                navigate('/chat');
              } catch (err: any) {
                console.error('Failed to save profile', err);
                alert(err?.message ?? 'Failed to save profile');
              }
            }}
            className="rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2"
          >
            Continue
          </button>
        </div>
      </footer>
    </div>
  );
};
