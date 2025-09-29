import { FC } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ChatPage } from "@/pages";

const App: FC = () => {
  return (
    <div className="app-root">
      <Routes>
        {/* Render ChatPage at root */}
        <Route path="/" element={<ChatPage />} />
        {/* Redirect any unknown path to root chat */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
