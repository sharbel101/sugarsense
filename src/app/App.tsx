import { FC, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch } from 'react-redux';
import { ChatPage, LoginPage, LoginValuesPage } from "@/pages";
import { setUser } from '@/features/user/userSlice';
import { loadUserFromStorage } from '@/features/user/userStorage';

const App: FC = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // On app load, restore user from localStorage
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
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login-values" element={<LoginValuesPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
