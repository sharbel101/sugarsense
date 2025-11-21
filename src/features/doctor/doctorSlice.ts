import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { DoctorProfile } from '@/api/doctorApi';

export interface DoctorState {
  id: string | null;
  authUserId: string | null;
  drId: string | null;
  name: string | null;
  email: string | null;
}

const initialState: DoctorState = {
  id: null,
  authUserId: null,
  drId: null,
  name: null,
  email: null,
};

type DoctorPayload = Partial<DoctorProfile> & {
  id?: string | null;
  auth_user_id?: string | null;
  dr_id?: string | null;
};

const doctorSlice = createSlice({
  name: 'doctor',
  initialState,
  reducers: {
    setDoctor: (state, action: PayloadAction<DoctorPayload>) => {
      state.id = (action.payload.id as string | null) ?? null;
      state.authUserId = (action.payload.auth_user_id as string | null) ?? null;
      state.drId = (action.payload.dr_id as string | null) ?? null;
      state.name = (action.payload.name as string | null) ?? null;
      state.email = (action.payload.email as string | null) ?? null;
    },
    resetDoctor: () => initialState,
  },
});

export const { setDoctor, resetDoctor } = doctorSlice.actions;

export const selectDoctor = (state: RootState) => state.doctor;
export const selectIsDoctorAuthenticated = (state: RootState) => Boolean(state.doctor?.drId);

export default doctorSlice.reducer;
