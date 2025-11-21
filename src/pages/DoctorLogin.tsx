import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { supabase } from '@/api/supabaseClient';
import { generateDrId, createDoctorRow, getDoctorByAuthId } from '@/api/doctorApi';
import { setDoctor } from '@/features/doctor/doctorSlice';
import { saveDoctorToStorage } from '@/features/doctor/doctorStorage';

// --- Minimalist Icons ---
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const BadgeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884.5 2 2 2 2.5 0 2-1.116 2-2" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

export const DoctorLoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [drId, setDrId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const authUser = authData.user;
      if (!authUser) throw new Error('Authentication failed.');

      const doctorProfile = await getDoctorByAuthId(authUser.id);
      if (!doctorProfile) throw new Error('Doctor profile not found.');

      if (doctorProfile.dr_id !== drId) {
        await supabase.auth.signOut();
        throw new Error('The provided Doctor ID is incorrect.');
      }

      dispatch(setDoctor(doctorProfile));
      saveDoctorToStorage(doctorProfile);
      navigate('/doctor-dashboard');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const generatedDrId = generateDrId();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      const authUser = authData.user;
      if (!authUser) throw new Error('Sign-up failed.');

      const newDoctor = await createDoctorRow(authUser.id, email, name, generatedDrId);
      
      alert(`Sign-up successful! Your Doctor ID is: ${generatedDrId}. Please save it for login.`);
      
      dispatch(setDoctor(newDoctor));
      saveDoctorToStorage(newDoctor);
      
      // Auto-login logic reused but we need to set drId first for validation to pass if we were strictly calling handleLogin
      setDrId(generatedDrId); 
      navigate('/doctor-dashboard');

    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Simple Nav to return to User Login */}
      <div className="absolute left-4 top-6 z-10">
        <button 
          onClick={() => navigate('/login')} 
          className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-2 text-sm font-medium text-blue-600 backdrop-blur-sm transition hover:bg-white"
        >
          <ChevronLeftIcon />
          <span>Patient Login</span>
        </button>
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          
          <div className="rounded-[2rem] border border-blue-100 bg-white/80 p-8 shadow-2xl shadow-blue-100/50 backdrop-blur-xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <BadgeIcon />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                {isSignUp ? 'Doctor Registration' : 'Doctor Portal'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {isSignUp ? 'Create your professional profile' : 'Access your patient dashboard'}
              </p>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
              
              {/* Name Field (Sign Up Only) */}
              {isSignUp && (
                <div className="group relative animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <UserIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="block w-full rounded-xl border-0 bg-blue-50/50 py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 ring-1 ring-inset ring-blue-100 transition-all focus:bg-white focus:ring-2 focus:ring-blue-400 sm:text-sm sm:leading-6"
                  />
                </div>
              )}

              {/* Email Field */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <MailIcon />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-xl border-0 bg-blue-50/50 py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 ring-1 ring-inset ring-blue-100 transition-all focus:bg-white focus:ring-2 focus:ring-blue-400 sm:text-sm sm:leading-6"
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border-0 bg-blue-50/50 py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 ring-1 ring-inset ring-blue-100 transition-all focus:bg-white focus:ring-2 focus:ring-blue-400 sm:text-sm sm:leading-6"
                />
              </div>

              {/* Doctor ID Field (Login Only) */}
              {!isSignUp && (
                <div className="relative animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <BadgeIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Doctor ID"
                    value={drId}
                    onChange={(e) => setDrId(e.target.value)}
                    required
                    className="block w-full rounded-xl border-0 bg-blue-50/50 py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 ring-1 ring-inset ring-blue-100 transition-all focus:bg-white focus:ring-2 focus:ring-blue-400 sm:text-sm sm:leading-6"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading} 
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Secure Login'}
              </button>
            </form>

            <div className="mt-8 border-t border-blue-50 pt-6 text-center">
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  // clear errors or specific fields if needed
                }} 
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline underline-offset-4"
              >
                {isSignUp ? 'Already have an account? Sign in' : "New doctor? Create an account"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};