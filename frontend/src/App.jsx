import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Appointments from './pages/Appointments';
import Services from './pages/Services';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Doctors from './pages/Doctors';
import Reports from './pages/Reports';
import DoctorCalendar from './pages/DoctorCalendar';
import Bundles from './pages/Bundles';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const RoleBasedRedirect = () => {
  const user = useAuthStore(state => state.user);
  
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'admin':
      return <Navigate to="/" replace />;
    case 'doctor':
      return <Navigate to="/doctor-calendar" replace />;
    case 'accounting':
      return <Navigate to="/reports" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<RoleBasedRedirect />} />
          <Route path="dashboard" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </RoleProtectedRoute>
          } />
          <Route path="calendar" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Calendar />
            </RoleProtectedRoute>
          } />
          <Route path="doctor-calendar" element={
            <RoleProtectedRoute allowedRoles={['doctor']}>
              <DoctorCalendar />
            </RoleProtectedRoute>
          } />
          <Route path="appointments" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Appointments />
            </RoleProtectedRoute>
          } />
          <Route path="services" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Services />
            </RoleProtectedRoute>
          } />
          <Route path="patients" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Patients />
            </RoleProtectedRoute>
          } />
          <Route path="patients/:patientId" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <PatientDetail />
            </RoleProtectedRoute>
          } />
          <Route path="doctors" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Doctors />
            </RoleProtectedRoute>
          } />
          <Route path="bundles" element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <Bundles />
            </RoleProtectedRoute>
          } />
          <Route path="reports" element={
            <RoleProtectedRoute allowedRoles={['admin', 'accounting']}>
              <Reports />
            </RoleProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}