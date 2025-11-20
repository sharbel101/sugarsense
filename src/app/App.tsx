import { FC, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { ChatPage, LoginPage, LoginValuesPage, HistoryPage, SettingsPage } from "@/pages";
import { setUser } from '@/features/user/userSlice';
import { loadUserFromStorage, saveUserToStorage, clearUserFromStorage } from '@/features/user/userStorage';
import { supabase } from '@/api/supabaseClient';
import { getUserRow } from '@/api/userApi';

const App: FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;

    const restoreFromStorage = async () => {
      // First try restoring from our saved local profile
      const savedUser = loadUserFromStorage();
      console.log('Restored user from storage:', savedUser);
      if (savedUser && savedUser.id) {
        dispatch(
          setUser({
            id: savedUser.id,
            age: savedUser.age,
            insulinRatio: savedUser.insulinRatio,
            fastInsulin: savedUser.fastInsulin,
            basalInsulin: savedUser.basalInsulin,
          })
        );
        console.log('✓ User restored to Redux store');
      }

      // Then check Supabase session to ensure the user is still authenticated
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data?.session?.user ?? null;
        if (sessionUser && mounted) {
          console.log('Supabase session found for user:', sessionUser.id);
          // Try to fetch the user's profile row from the users table
          const row = await getUserRow(sessionUser.id);
          const payload = {
            id: sessionUser.id,
            age: (row as any)?.age ?? null,
            insulinRatio: (row as any)?.insulin_ratio ?? null,
            fastInsulin: (row as any)?.fast_insulin ?? null,
            basalInsulin: (row as any)?.basal_insulin ?? null,
          };
          dispatch(setUser(payload));
          // persist unified profile to storage
          saveUserToStorage({ ...(payload as any), isProfileComplete: !!row });
        } else {
          console.log('No active Supabase session');
        }
      } catch (e) {
        console.warn('Error checking supabase session:', e);
      }
    };

    restoreFromStorage();

    // Listen for auth state changes and update storage/store accordingly
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        (async () => {
          try {
            const row = await getUserRow(session.user.id);
            const payload = {
              id: session.user.id,
              age: (row as any)?.age ?? null,
              insulinRatio: (row as any)?.insulin_ratio ?? null,
              fastInsulin: (row as any)?.fast_insulin ?? null,
              basalInsulin: (row as any)?.basal_insulin ?? null,
            };
            dispatch(setUser(payload));
            saveUserToStorage({ ...(payload as any), isProfileComplete: !!row });
          } catch (err) {
            console.warn('Error handling SIGNED_IN event:', err);
          }
        })();
      } else if (event === 'SIGNED_OUT') {
        // clear any stored profile
        clearUserFromStorage();
        // dispatch an empty user (optional)
        dispatch(setUser({ id: '', age: null, insulinRatio: null, fastInsulin: null, basalInsulin: null } as any));
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login-values" element={<LoginValuesPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/history/:date" element={<HistoryPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
