import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/app/hooks";
import { selectIsUserProfileComplete } from "@/features/user/userSlice";

interface RequireProfileCompletionProps {
  children: ReactNode;
}

const RequireProfileCompletion = ({ children }: RequireProfileCompletionProps) => {
  const isProfileComplete = useAppSelector(selectIsUserProfileComplete);
  const location = useLocation();

  if (!isProfileComplete) {
    return <Navigate to="/login-values" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default RequireProfileCompletion;
