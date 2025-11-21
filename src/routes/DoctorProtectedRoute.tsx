import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectIsDoctorAuthenticated } from '@/features/doctor/doctorSlice';
import React from 'react';

interface DoctorProtectedRouteProps {
  children: React.ReactNode;
}

const DoctorProtectedRoute = ({ children }: DoctorProtectedRouteProps) => {
  const isDoctor = useAppSelector(selectIsDoctorAuthenticated);
  const location = useLocation();

  if (!isDoctor) {
    return <Navigate to="/doctor-login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default DoctorProtectedRoute;
