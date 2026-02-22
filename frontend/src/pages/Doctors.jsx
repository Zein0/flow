import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  UserIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useDoctors } from '../hooks/useDoctors';
import { useAuthStore } from '../stores/auth';

export default function Doctors() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const { data: doctors = [], isLoading } = useDoctors();

  const filtered = useMemo(() => {
    let list = doctors;
    if (statusFilter === 'active') list = list.filter((d) => d.active);
    else if (statusFilter === 'inactive') list = list.filter((d) => !d.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.specialty && d.specialty.toLowerCase().includes(q))
      );
    }
    return list;
  }, [doctors, statusFilter, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage doctor profiles and their session offerings
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => navigate('/doctors/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Doctor
          </button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex rounded-md shadow-sm">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' },
          ].map((opt, i) => (
            <button
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              className={`px-4 py-2 text-sm font-medium border ${
                i === 0 ? 'rounded-l-md' : i === 2 ? 'rounded-r-md -ml-px' : '-ml-px'
              } ${
                statusFilter === opt.key
                  ? 'bg-primary-600 text-white border-primary-600 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {doctors.length === 0 ? (
              <>
                <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p className="text-lg font-medium">No doctors found</p>
                <p className="text-sm">Add your first doctor to get started.</p>
              </>
            ) : (
              <p className="text-sm">No doctors match your search.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((doctor) => (
                  <tr
                    key={doctor.id}
                    onClick={() => navigate(`/doctors/${doctor.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-4 h-4 text-primary-600" />
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          Dr. {doctor.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doctor.specialty || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doctor.sessionLists?.length || 0} service{doctor.sessionLists?.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          doctor.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {doctor.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}