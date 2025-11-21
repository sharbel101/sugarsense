import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/user/userSlice';
import { signIn, signUp, createUserRow, getUserRow, upsertUserRow } from '@/api/userApi';
import { setUser } from '@/features/user/userSlice';
import { saveUserToStorage } from '@/features/user/userStorage';

// Internal Icon Components for a cleaner look without external dependencies
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const DoctorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    if (user && user.id) {
      if (user.isProfileComplete) {
        navigate('/chat', { replace: true });
      } else {
        navigate('/login-values', { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.isProfileComplete]);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (signUpPassword !== signUpPasswordConfirm) {
        throw new Error('Passwords do not match');
      }
      if (signUpPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      await signUp(email, signUpPassword);
      const authAfter = await signIn(email, signUpPassword);
      const userId = (authAfter as any).user?.id;

      if (!userId) throw new Error('No user id returned from signup/signin');

      await createUserRow(userId, email, signUpPassword);

      const userProfile = {
        id: userId,
        age: null,
        insulinRatio: null,
        fastInsulin: null,
        basalInsulin: null,
        drId: null,
        isProfileComplete: false,
      } as any;

      dispatch(setUser(userProfile));
      saveUserToStorage(userProfile);

      setIsSignUpMode(false);
      setEmail('');
      setPassword('');
      setSignUpPassword('');
      setSignUpPasswordConfirm('');
      navigate('/login-values');
    } catch (error: any) {
      console.error('Sign-up error', error);
      alert(error?.message ?? 'Sign-up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const auth = await signIn(email, password);
      const userId = (auth as any).user?.id;

      if (!userId) throw new Error('No user id returned from auth');

      let row = await getUserRow(userId);
      if (!row) {
        const created = await upsertUserRow(userId, { id: userId });
        row = created as any;
      }

      const isProfileComplete = !!(row as any)?.insulin_ratio;

      dispatch(
        setUser({
          id: userId,
          age: (row as any)?.age ?? null,
          insulinRatio: (row as any)?.insulin_ratio ?? null,
          fastInsulin: (row as any)?.fast_insulin ?? null,
          basalInsulin: (row as any)?.basal_insulin ?? null,
          drId: (row as any)?.dr_id ?? null,
          isProfileComplete,
        })
      );

      saveUserToStorage({
        id: userId,
        age: (row as any)?.age ?? null,
        insulinRatio: (row as any)?.insulin_ratio ?? null,
        fastInsulin: (row as any)?.fast_insulin ?? null,
        basalInsulin: (row as any)?.basal_insulin ?? null,
        drId: (row as any)?.dr_id ?? null,
        isProfileComplete,
      } as any);

      navigate('/chat');
    } catch (error: any) {
      console.error('Login error', error);
      alert(error?.message ?? 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Added 'touch-none' to prevent bouncing on some mobile browsers if not desired, 
    // otherwise remove it. Using 'min-h-[100dvh]' handles mobile viewport height perfectly.
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          
          {/* Main Card */}
          <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-8 shadow-xl shadow-emerald-100/50 backdrop-blur-md">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-emerald-900">
                {isSignUpMode ? 'Create Account' : 'SugarSense'}
              </h2>
              <p className="mt-2 text-sm font-medium text-emerald-600/80">
                {isSignUpMode
                  ? 'Start tracking your health journey.'
                  : 'Welcome back to your daily tracker.'}
              </p>
            </div>

            <form onSubmit={isSignUpMode ? handleSignUp : handleSubmit} className="space-y-5">
              
              {/* Email Input */}
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <MailIcon />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="block w-full rounded-2xl border-0 bg-emerald-50/50 py-4 pl-11 pr-4 text-emerald-900 placeholder:text-emerald-400 ring-1 ring-inset ring-emerald-100 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-400 sm:text-sm sm:leading-6"
                  placeholder="Email address"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <LockIcon />
                </div>
                <input
                  type="password"
                  autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
                  value={isSignUpMode ? signUpPassword : password}
                  onChange={(event) =>
                    isSignUpMode
                      ? setSignUpPassword(event.target.value)
                      : setPassword(event.target.value)
                  }
                  className="block w-full rounded-2xl border-0 bg-emerald-50/50 py-4 pl-11 pr-4 text-emerald-900 placeholder:text-emerald-400 ring-1 ring-inset ring-emerald-100 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-400 sm:text-sm sm:leading-6"
                  placeholder="Password"
                  required
                />
              </div>

              {/* Confirm Password (Sign Up Only) */}
              {isSignUpMode && (
                <div className="group relative animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <LockIcon />
                  </div>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={signUpPasswordConfirm}
                    onChange={(event) => setSignUpPasswordConfirm(event.target.value)}
                    className="block w-full rounded-2xl border-0 bg-emerald-50/50 py-4 pl-11 pr-4 text-emerald-900 placeholder:text-emerald-400 ring-1 ring-inset ring-emerald-100 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-400 sm:text-sm sm:leading-6"
                    placeholder="Confirm Password"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full transform rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isSignUpMode ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <div className="mt-6 text-center">
              <p className="text-sm text-emerald-600">
                {isSignUpMode ? "Already have an account?" : "Don't have an account?"}
              </p>
              <button
                type="button"
                disabled={isLoading}
                className="mt-1 text-sm font-bold text-emerald-700 transition hover:text-emerald-500 active:scale-95 disabled:opacity-50"
                onClick={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setSignUpPassword('');
                  setSignUpPasswordConfirm('');
                }}
              >
                {isSignUpMode ? "Sign In here" : "Create one now"}
              </button>
            </div>
          </div>

          {/* Bottom Actions Container */}
          <div className="mt-6 space-y-4">
            
            {/* Guest Mode - Subtle */}
            {!isSignUpMode && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs font-medium text-emerald-400 transition hover:text-emerald-600 active:scale-95"
                  onClick={() => navigate("/login-values")}
                >
                  Skip for now & continue as guest
                </button>
              </div>
            )}

            {/* Doctor Login - Distinct Blue Card */}
            <button
              type="button"
              onClick={() => navigate('/doctor-login')}
              className="group flex w-full items-center justify-between rounded-xl border border-blue-100 bg-blue-50/80 px-5 py-4 transition-all active:scale-[0.98] active:bg-blue-100"
            >
              <div className="flex flex-col items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Professional</span>
                <span className="font-semibold text-blue-700">Sign in as Doctor</span>
              </div>
              <div className="rounded-full bg-blue-100 p-2 transition-colors group-active:bg-white">
                 <DoctorIcon />
              </div>
            </button>

          </div>
        </div>
      </main>
    </div>
  );
};