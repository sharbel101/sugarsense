
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
  patient_name: string | null;
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
          setPatients((patientData as Patient[]) || []);
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
    (patient.patient_name?.toLowerCase() || patient.email.toLowerCase()).includes(searchTerm.toLowerCase())
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
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex flex-1 items-center justify-center pt-24">
          <div className="text-center">
            <svg className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-blue-600 font-medium">Loading patients...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-1 overflow-y-auto p-6 pt-24 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Header Card */}
          <div className="mb-8">
            <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-bold text-blue-900">Your Patients</h1>
                  <p className="mt-3 text-base text-gray-600">
                    Doctor ID: <span className="font-bold text-blue-600 text-lg">{doctor?.drId}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} assigned
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-xl bg-gray-200 px-8 py-3 font-semibold text-gray-700 hover:bg-gray-300 transition active:scale-95"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <input
              type="text"
              placeholder="🔍 Search patients by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-blue-200 bg-white/90 px-6 py-4 text-blue-900 placeholder:text-blue-300 shadow-lg outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Patients Grid */}
          {filteredPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <Link key={patient.id} to={`/patient/${patient.id}`}>
                  <div className="h-full rounded-2xl border border-blue-100 bg-white/90 p-6 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition cursor-pointer backdrop-blur-sm">
                    <div className="space-y-5">
                      {/* Patient Name Section */}
                      <div>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">Patient Name</p>
                        <p className="mt-2 text-lg font-bold text-blue-900 break-all line-clamp-2">
                          {patient.patient_name || patient.email}
                        </p>
                      </div>

                      {/* Age Section */}
                      <div className="rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Age</p>
                        <p className="mt-2 text-3xl font-bold text-blue-900">
                          {patient.age ?? 'N/A'} <span className="text-sm font-normal text-blue-600">years</span>
                        </p>
                      </div>

                      {/* Action */}
                      <div className="pt-3 flex items-center justify-between border-t border-blue-100">
                        <p className="text-sm font-medium text-gray-600">View meal history</p>
                        <span className="text-blue-500 text-xl font-bold">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-blue-100 bg-white/90 p-16 text-center shadow-lg backdrop-blur-sm">
              <div className="mb-4 text-5xl">👥</div>
              <p className="text-xl font-semibold text-blue-900 mb-2">
                {searchTerm ? 'No patients match your search.' : 'No patients assigned yet.'}
              </p>
              <p className="text-gray-600">
                {!searchTerm && 'Patients will appear here once assigned to your account.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
