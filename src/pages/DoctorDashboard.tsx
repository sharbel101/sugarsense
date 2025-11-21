
import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { selectDoctor, resetDoctor } from '@/features/doctor/doctorSlice';
import { getPatientsByDrId } from '@/api/doctorApi';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header/Header';
import { supabase } from '@/api/supabaseClient';
import { clearDoctorFromStorage } from '@/features/doctor/doctorStorage';

interface Patient {
  id: string;
  email: string;
  age: number | null;
}

export const DoctorDashboard: React.FC = () => {
  const doctor = useAppSelector(selectDoctor);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      if (doctor && doctor.drId) {
        try {
          const patientData = await getPatientsByDrId(doctor.drId);
          setPatients(patientData || []);
        } catch (error: any) {
          console.error('Failed to fetch patients:', error.message);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPatients();
  }, [doctor]);

  const filteredPatients = patients.filter(patient =>
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(resetDoctor());
      clearDoctorFromStorage();
      navigate('/doctor-login');
    } catch (error: any) {
      alert('Failed to logout: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <main className="flex flex-1 items-center justify-center pt-24">
          <div className="text-lg text-gray-600">Loading patients...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-1 p-6 pt-24 md:p-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-blue-900">Your Patients</h1>
              <p className="mt-2 text-gray-600">
                Doctor ID: <span className="font-semibold text-blue-600">{doctor?.drId}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-6 py-2 font-semibold text-white hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search patients by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-blue-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Patients Grid */}
        {filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <Link key={patient.id} to={`/patient/${patient.id}`}>
                <div className="h-full rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg hover:shadow-xl transition cursor-pointer backdrop-blur-sm">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Patient Email
                      </p>
                      <p className="mt-1 text-lg font-semibold text-blue-900 break-all">
                        {patient.email}
                      </p>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Age
                      </p>
                      <p className="mt-1 text-2xl font-bold text-blue-600">
                        {patient.age ?? 'N/A'} years
                      </p>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <p className="text-sm text-gray-600">View meal history</p>
                      <span className="text-blue-500 text-lg">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-12 text-center shadow-lg backdrop-blur-sm">
            <p className="text-lg text-gray-600">
              {searchTerm ? 'No patients match your search.' : 'No patients assigned yet.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
