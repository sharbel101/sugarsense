
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { supabase } from '@/api/supabaseClient';
import { generateDrId, createDoctorRow, getDoctorByAuthId } from '@/api/doctorApi';
import { setDoctor } from '@/features/doctor/doctorSlice';
import { saveDoctorToStorage } from '@/features/doctor/doctorStorage';

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
      
      // Sign in the new doctor automatically
      await handleLogin(e);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white">
      <main className="flex flex-1 items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <h2 className="text-center text-2xl font-semibold text-blue-800">
            {isSignUp ? 'Doctor Sign Up' : 'Doctor Login'}
          </h2>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="mt-8 space-y-6">
            {isSignUp && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
            />
            {!isSignUp && (
              <input
                type="text"
                placeholder="Doctor ID"
                value={drId}
                onChange={(e) => setDrId(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900 shadow-inner outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            )}
            <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 disabled:opacity-50">
              {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
            </button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="mt-4 w-full text-center text-sm text-blue-600 hover:underline">
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </main>
    </div>
  );
};
