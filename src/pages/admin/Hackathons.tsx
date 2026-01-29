import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { Hackathon, HackathonStatus } from '../../types';
import AdminSidebar from '../../components/AdminSidebar';
import { useAuth } from '../../contexts/AuthContext';

const Hackathons = () => {
  const { isAdmin } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [nextHackathon, setNextHackathon] = useState<Hackathon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHackathons();
    loadNextHackathon();
  }, []);

  const loadHackathons = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await hackathonService.getAllHackathons();
      setHackathons(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load hackathons');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextHackathon = async () => {
    try {
      const data = await hackathonService.getNextHackathon();
      setNextHackathon(data);
    } catch (err: any) {
      // Silently fail - not critical
    }
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case HackathonStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case HackathonStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.PENDING:
        return 'Upcoming';
      case HackathonStatus.ACTIVE:
        return 'Active';
      case HackathonStatus.COMPLETED:
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Hackathons</h1>
              <p className="mt-2 text-gray-600">Manage and view all hackathons</p>
            </div>
            {isAdmin && (
              <Link
                to="/admin/hackathons/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Hackathon
              </Link>
            )}
          </div>

          {/* Next Hackathon Card */}
          {nextHackathon && (
            <Link
              to={`/admin/hackathons/${nextHackathon.id}`}
              className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6 block hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{nextHackathon.title}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(nextHackathon.status)}`}>
                      {getStatusDisplayName(nextHackathon.status)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">{nextHackathon.purpose}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2.5">
                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-700"><span className="font-medium">Start:</span> {formatDateShort(nextHackathon.startDate)}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-700"><span className="font-medium">End:</span> {formatDateShort(nextHackathon.endDate)}</span>
                    </div>
                    {nextHackathon.registrationDeadline && (
                      <div className="flex items-start gap-2.5">
                        <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700"><span className="font-medium">Register:</span> {formatDateShort(nextHackathon.registrationDeadline)}</span>
                      </div>
                    )}
                    {nextHackathon.location && (
                      <div className="flex items-start gap-2.5">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-700"><span className="font-medium">Location:</span> {nextHackathon.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )}

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading hackathons...</p>
            </div>
          ) : hackathons.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No hackathons found</p>
              {isAdmin && (
                <Link
                  to="/admin/hackathons/create"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Your First Hackathon
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {hackathons
                .filter(hackathon => !nextHackathon || hackathon.id !== nextHackathon.id)
                .sort((a, b) => {
                  // Sort order: Active first, then Upcoming, then Completed
                  const statusOrder = {
                    [HackathonStatus.ACTIVE]: 1,
                    [HackathonStatus.PENDING]: 2,
                    [HackathonStatus.COMPLETED]: 3,
                  };
                  
                  const orderA = statusOrder[a.status] || 999;
                  const orderB = statusOrder[b.status] || 999;
                  
                  if (orderA !== orderB) {
                    return orderA - orderB;
                  }
                  
                  // If same status, sort by start date (earliest first)
                  return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                })
                .map((hackathon) => (
                <Link
                  key={hackathon.id}
                  to={`/admin/hackathons/${hackathon.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 block hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{hackathon.title}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(hackathon.status)}`}>
                          {getStatusDisplayName(hackathon.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">{hackathon.purpose}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-start gap-2.5">
                          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-700"><span className="font-medium">Start:</span> {formatDateShort(hackathon.startDate)}</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-700"><span className="font-medium">End:</span> {formatDateShort(hackathon.endDate)}</span>
                        </div>
                        {hackathon.registrationDeadline && (
                          <div className="flex items-start gap-2.5">
                            <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-700"><span className="font-medium">Register:</span> {formatDateShort(hackathon.registrationDeadline)}</span>
                          </div>
                        )}
                        {hackathon.location && (
                          <div className="flex items-start gap-2.5">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-gray-700"><span className="font-medium">Location:</span> {hackathon.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hackathons;


