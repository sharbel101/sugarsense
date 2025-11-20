import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';

export interface UserState {
  id: string | null;
  age: number | null;
  insulinRatio: number | null;
  fastInsulin: string | null;
  basalInsulin: string | null;
  drId: string | null;
  isProfileComplete: boolean;
}

const initialState: UserState = {
  id: null,
  age: null,
  insulinRatio: null,
  fastInsulin: null,
  basalInsulin: null,
  drId: null,
  isProfileComplete: false,
};

type UserProfilePayload = {
  id: string | null;
  age?: number | null;
  insulinRatio?: number | null;
  fastInsulin?: string | null;
  basalInsulin?: string | null;
  drId?: string | null;
  isProfileComplete?: boolean;
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfilePayload>) => {
      state.id = action.payload.id;
      state.age = action.payload.age ?? null;
      state.insulinRatio = action.payload.insulinRatio ?? null;
      state.fastInsulin = action.payload.fastInsulin ?? null;
      state.basalInsulin = action.payload.basalInsulin ?? null;
      state.drId = action.payload.drId ?? null;
      state.isProfileComplete = action.payload.isProfileComplete ?? true;
    },
    resetUser: () => initialState,
  },
});

export const { setUser, resetUser } = userSlice.actions;

export const selectUser = (state: RootState) => state.user;
export const selectIsUserProfileComplete = (state: RootState) =>
  state.user.isProfileComplete;

export default userSlice.reducer;
