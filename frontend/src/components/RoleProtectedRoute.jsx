import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const ROLE_ACCESS = {
  admin: ['dashboard', 'calendar', 'appointments', 'services', 'patients', 'doctors', 'reports'],
  doctor: ['doctor-calendar'],
  accounting: ['reports']
};

const ROLE_HOME_PAGES = {
  admin: '/',
  doctor: '/doctor-calendar',
  accounting: '/reports'
};

export const RoleProtectedRoute = ({ children, allowedRoles, currentPage }) => {
  const { user, logout } = useAuthStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role;
  
  // Check if user's role has access to this page
  const hasAccess = allowedRoles.includes(userRole);
  
  if (!hasAccess) {
    // For unauthorized access, redirect to their home page
    const homePage = ROLE_HOME_PAGES[userRole] || '/login';
    return <Navigate to={homePage} replace />;
  }

  return children;
};

export const useRoleAccess = () => {
  const { user } = useAuthStore();
  
  return {
    isAdmin: user?.role === 'admin',
    isDoctor: user?.role === 'doctor',
    isAccounting: user?.role === 'accounting',
    allowedPages: ROLE_ACCESS[user?.role] || [],
    homePage: ROLE_HOME_PAGES[user?.role] || '/login'
  };
};