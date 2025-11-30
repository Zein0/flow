import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  CalendarDaysIcon,
  ClockIcon,
  CogIcon,
  UserGroupIcon,
  UserIcon,
  DocumentChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/auth';
import { useLogout } from '../hooks/useAuth';
import { useRoleAccess } from './RoleProtectedRoute';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['admin'] },
  { name: 'Calendar', href: '/calendar', icon: CalendarDaysIcon, roles: ['admin'] },
  { name: 'My Schedule', href: '/doctor-calendar', icon: CalendarDaysIcon, roles: ['doctor'] },
  { name: 'Appointments', href: '/appointments', icon: ClockIcon, roles: ['admin'] },
  { name: 'Services', href: '/services', icon: CogIcon, roles: ['admin'] },
  { name: 'Patients', href: '/patients', icon: UserGroupIcon, roles: ['admin'] },
  { name: 'Doctors', href: '/doctors', icon: UserIcon, roles: ['admin'] },
  { name: 'Bundles', href: '/bundles', icon: CubeIcon, roles: ['admin'] },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon, roles: ['admin', 'accounting'] },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useLogout();
  const { isAdmin, isDoctor, isAccounting } = useRoleAccess();

  const getFilteredNavigation = () => {
    return navigation.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(user?.role);
    });
  };

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col flex-1 w-full max-w-xs bg-white">
            <div className="absolute top-0 right-0 p-1 -mr-12">
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-900">Clinic</h1>
              </div>
              <nav className="mt-5 space-y-1">
                {getFilteredNavigation().map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-3 ${
                      location.pathname === item.href
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center h-16 px-4 bg-white border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">Clinic</h1>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto">
              <nav className="px-3 py-4 space-y-1">
                {getFilteredNavigation().map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                      location.pathname === item.href
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="p-3 border-t border-gray-200">
                <div className="px-3 py-2 text-xs text-gray-500">
                  {user?.name} ({user?.role})
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-gray-500 border-r border-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex items-center flex-1 px-4">
            <h1 className="text-lg font-semibold text-gray-900">Clinic</h1>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}