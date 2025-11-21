import type { DoctorProfile } from '@/api/doctorApi';

const DOCTOR_STORAGE_KEY = 'doctorProfile';

export const saveDoctorToStorage = (profile: DoctorProfile) => {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(DOCTOR_STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('Could not save doctor profile to storage', e);
  }
};

export const loadDoctorFromStorage = (): DoctorProfile | null => {
  try {
    const serialized = localStorage.getItem(DOCTOR_STORAGE_KEY);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized);
  } catch (e) {
    console.warn('Could not load doctor profile from storage', e);
    return null;
  }
};

export const clearDoctorFromStorage = () => {
  try {
    localStorage.removeItem(DOCTOR_STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear doctor profile from storage', e);
  }
};