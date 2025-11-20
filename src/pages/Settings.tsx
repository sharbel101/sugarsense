import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, setUser } from '@/features/user/userSlice';
import { saveUserToStorage } from '@/features/user/userStorage';
import Header from '@/components/Header/Header';
import { supabase } from '@/api/supabaseClient';
import { updateUserRow } from '@/api/userApi';

export const SettingsPage: React.FC = () => {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [insulinRatio, setInsulinRatio] = useState<number | ''>('');
  const [age, setAge] = useState<number | ''>('');
  const [fastInsulin, setFastInsulin] = useState('');
  const [basalInsulin, setBasalInsulin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fastInsulinOptions = [
    'Humalog (Lispro)',
    'Novorapid (Aspart)',
    'Apidra (Glulisine)',
    'Fiasp',
    'Lyumjev',
  ];

  const basalInsulinOptions = [
    'Lantus (Glargine)',
    'Levemir (Detemir)',
    'Tresiba (Degludec)',
    'Toujeo',
    'Basaglar',
  ];

  useEffect(() => {
    // Load user info from supabase auth
    const loadUserInfo = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          setEmail(authUser.email);
        }

        // Load user profile data
        if (user?.id) {
          // These come from Redux state
          setAge(user.age || '');
          setInsulinRatio(user.insulinRatio || '');
          setFastInsulin(user.fastInsulin || '');
          setBasalInsulin(user.basalInsulin || '');
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    };

    loadUserInfo();
  }, [user?.id]);

  const handleProfileUpdate = async () => {
    if (!user?.id) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload: any = {
        age: age === '' ? null : age,
        insulin_ratio: insulinRatio === '' ? null : insulinRatio,
        fast_insulin: fastInsulin || null,
        basal_insulin: basalInsulin || null,
      };

      await updateUserRow(user.id, payload);

      // Update Redux state
      dispatch(
        setUser({
          id: user.id,
          age: payload.age,
          insulinRatio: payload.insulin_ratio,
          fastInsulin: payload.fast_insulin,
          basalInsulin: payload.basal_insulin,
          isProfileComplete: true,
        })
      );

      // Update local storage
      saveUserToStorage({
        id: user.id,
        age: payload.age,
        insulinRatio: payload.insulin_ratio,
        fastInsulin: payload.fast_insulin,
        basalInsulin: payload.basal_insulin,
        isProfileComplete: true,
      } as any);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // First, verify current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email || '',
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <Header onBack={() => navigate('/chat')} />

      <div className="flex-1 overflow-y-auto p-4 pt-20">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Messages */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Account Section */}
          <section className="rounded-lg border border-green-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-green-800">Account</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-2 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
            </div>
          </section>

          {/* Change Password Section */}
          <section className="rounded-lg border border-green-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-green-800">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="mt-2 w-full rounded-lg border border-green-200 bg-white px-4 py-2 text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-2 w-full rounded-lg border border-green-200 bg-white px-4 py-2 text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-2 w-full rounded-lg border border-green-200 bg-white px-4 py-2 text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={loading}
                className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white shadow transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </section>

          {/* Profile Settings Section */}
          <section className="rounded-lg border border-green-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-green-800">Profile Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value) || '')}
                  placeholder="Enter your age"
                  className="mt-2 w-full rounded-lg border border-green-200 bg-white px-4 py-2 text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">
                  Insulin per 15g carbs
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={insulinRatio}
                  onChange={(e) => setInsulinRatio(Number(e.target.value) || '')}
                  placeholder="Units per 15g carbs"
                  className="mt-2 w-full rounded-lg border border-green-200 bg-white px-4 py-2 text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">Fast-acting insulin</label>
                <select
                  value={fastInsulin}
                  onChange={(e) => setFastInsulin(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-green-200 bg-white px-4 py-2 text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                >
                  <option value="">Select fast-acting insulin</option>
                  {fastInsulinOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800">
                  Basal (slow-acting) insulin
                </label>
                <select
                  value={basalInsulin}
                  onChange={(e) => setBasalInsulin(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-green-200 bg-white px-4 py-2 text-gray-800 outline-none transition focus:border-green-400 focus:ring-2 focus:ring-green-200"
                >
                  <option value="">Select basal insulin</option>
                  {basalInsulinOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleProfileUpdate}
                disabled={loading}
                className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white shadow transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
