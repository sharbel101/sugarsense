import type { UserState } from './userSlice';

const STORAGE_KEY = 'sugarsense:user-profile';

const isBrowserEnvironment = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadUserFromStorage = (): UserState | undefined => {
  if (!isBrowserEnvironment()) {
    return undefined;
  }

  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return undefined;
    }

    return JSON.parse(serialized) as UserState;
  } catch (error) {
    console.warn('[userStorage] Failed to parse stored user profile', error);
    return undefined;
  }
};

export const saveUserToStorage = (user: UserState) => {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn('[userStorage] Failed to persist user profile', error);
  }
};

export const clearUserFromStorage = () => {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[userStorage] Failed to clear stored user profile', error);
  }
};
