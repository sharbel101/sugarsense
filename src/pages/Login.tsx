import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/app/hooks';
import { selectUser } from '@/features/user/userSlice';
import Header from "@/components/Header/Header";
import { signIn, signUp, createUserRow, getUserRow, upsertUserRow } from '@/api/userApi';
import { setUser } from '@/features/user/userSlice';
import { saveUserToStorage } from '@/features/user/userStorage';

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
    // If user already authenticated, redirect them to the appropriate page
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

      // Attempt to create the auth user
      await signUp(email, signUpPassword);

      // Immediately sign the user in so they have an active session
      const authAfter = await signIn(email, signUpPassword);
      const userId = (authAfter as any).user?.id;

      if (!userId) {
        throw new Error('No user id returned from signup/signin');
      }

      // create users row with email and password (profile)
      await createUserRow(userId, email, signUpPassword);

      // dispatch into store and persist so user stays logged in across reloads
      const userProfile = {
        id: userId,
        age: null,
        insulinRatio: null,
        fastInsulin: null,
        basalInsulin: null,
        isProfileComplete: false,
      } as any;

      dispatch(setUser(userProfile));
      saveUserToStorage(userProfile);

      setIsSignUpMode(false);
      setEmail('');
      setPassword('');
      setSignUpPassword('');
      setSignUpPasswordConfirm('');
      // After signing up, require the user to complete profile details
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

      if (!userId) {
        throw new Error('No user id returned from auth');
      }

      // ensure a users row exists
      let row = await getUserRow(userId);
      if (!row) {
        // create minimal row
        const created = await upsertUserRow(userId, { id: userId });
        row = created as any;
      }

      // dispatch into store (keep fields nullable)
      dispatch(
        setUser({
          id: userId,
          age: (row as any)?.age ?? null,
          insulinRatio: (row as any)?.insulin_ratio ?? null,
          fastInsulin: (row as any)?.fast_insulin ?? null,
          basalInsulin: (row as any)?.basal_insulin ?? null,
        })
      );

      saveUserToStorage({
        id: userId,
        age: (row as any)?.age ?? null,
        insulinRatio: (row as any)?.insulin_ratio ?? null,
        fastInsulin: (row as any)?.fast_insulin ?? null,
        basalInsulin: (row as any)?.basal_insulin ?? null,
        isProfileComplete: !!row,
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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50 to-white">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 pt-24 pb-16">
        <div className="w-full max-w-md rounded-3xl border border-green-100 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-green-800">
              {isSignUpMode ? 'Create Account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm text-green-600">
              {isSignUpMode
                ? 'Sign up to start tracking your meals with SugarSense.'
                : 'Sign in to continue tracking your meals with SugarSense.'}
            </p>
          </div>

          <form onSubmit={isSignUpMode ? handleSignUp : handleSubmit} className="space-y-6">
            <label className="block text-sm font-medium text-green-900">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-900 shadow-inner outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block text-sm font-medium text-green-900">
              Password
              <input
                type="password"
                autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
                value={isSignUpMode ? signUpPassword : password}
                onChange={(event) =>
                  isSignUpMode
                    ? setSignUpPassword(event.target.value)
                    : setPassword(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-900 shadow-inner outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                placeholder="Enter your password"
                required
              />
            </label>

            {isSignUpMode && (
              <label className="block text-sm font-medium text-green-900">
                Confirm Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={signUpPasswordConfirm}
                  onChange={(event) => setSignUpPasswordConfirm(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm text-green-900 shadow-inner outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                  placeholder="Confirm your password"
                  required
                />
              </label>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-green-500 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : isSignUpMode ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 space-y-2 text-center text-xs text-green-500">
            {!isSignUpMode ? (
              <>
                <p>No account? Create one now.</p>
                <button
                  type="button"
                  disabled={isLoading}
                  className="font-medium text-green-600 underline-offset-4 hover:underline disabled:opacity-50"
                  onClick={() => setIsSignUpMode(true)}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                <p>Already have an account?</p>
                <button
                  type="button"
                  disabled={isLoading}
                  className="font-medium text-green-600 underline-offset-4 hover:underline disabled:opacity-50"
                  onClick={() => {
                    setIsSignUpMode(false);
                    setSignUpPassword('');
                    setSignUpPasswordConfirm('');
                  }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>

          {!isSignUpMode && (
            <div className="mt-4 pt-4 border-t border-green-100 text-center text-xs text-green-500">
              <p>Want to skip? Continue as a guest.</p>
              <button
                type="button"
                className="font-medium text-green-600 underline-offset-4 hover:underline"
                onClick={() => navigate("/login-values")}
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
