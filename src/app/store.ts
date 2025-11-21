import { configureStore } from "@reduxjs/toolkit";
import userReducer from '@/features/user/userSlice';
import mealsReducer from '@/features/meals/mealsSlice';
import doctorReducer from '@/features/doctor/doctorSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    meals: mealsReducer,
    doctor: doctorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
