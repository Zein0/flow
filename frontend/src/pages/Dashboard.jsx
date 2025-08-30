import { 
  CalendarDaysIcon, 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useReports';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: "Today's Appointments",
      value: dashboardData?.todaysAppointments || 0,
      icon: CalendarDaysIcon,
      color: 'text-primary-600 bg-primary-100'
    },
    {
      name: 'Collected Today',
      value: `$${(dashboardData?.collectedToday || 0).toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'text-green-600 bg-green-100'
    },
    {
      name: 'Outstanding Balance',
      value: `$${(dashboardData?.outstandingBalance || 0).toFixed(2)}`,
      icon: ExclamationTriangleIcon,
      color: 'text-amber-600 bg-amber-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`inline-flex items-center justify-center p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-body space-y-3">
            <Link to="/calendar" className="btn-primary w-full justify-center">
              <CalendarDaysIcon className="w-4 h-4 mr-2" />
              View Calendar
            </Link>
            <Link to="/patients" className="btn-secondary w-full justify-center">
              <UserGroupIcon className="w-4 h-4 mr-2" />
              Manage Patients
            </Link>
            <Link to="/reports" className="btn-secondary w-full justify-center">
              <DocumentChartBarIcon className="w-4 h-4 mr-2" />
              View Reports
            </Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">System Status</h3>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">System</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">Database</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">Reminders</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}