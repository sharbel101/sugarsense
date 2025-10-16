import { FC } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ChatPage, LoginPage, LoginValuesPage } from "@/pages";

const App: FC = () => {
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
