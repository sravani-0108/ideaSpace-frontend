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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Next Hackathon</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(nextHackathon.status)}`}>
                  {getStatusDisplayName(nextHackathon.status)}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{nextHackathon.title}</h3>
              <p className="text-gray-700 mb-4">{nextHackathon.purpose}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Event Date:</span>
                  <span className="text-gray-600 ml-1">{formatDate(nextHackathon.startDate)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Location:</span>
                  <span className="text-gray-600 ml-1">{nextHackathon.location}</span>
                </div>
                {nextHackathon.onlineLink && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-gray-700">Microsoft Teams:</span>{' '}
                    <a href={nextHackathon.onlineLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                      Join Teams
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Link
                  to={`/admin/hackathons/${nextHackathon.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Details →
                </Link>
              </div>
            </div>
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
                <div key={hackathon.id} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{hackathon.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(hackathon.status)}`}>
                          {getStatusDisplayName(hackathon.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3 text-sm">{hackathon.purpose}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-2">
                        <div>
                          <span className="font-medium">Start:</span> {formatDateShort(hackathon.startDate)}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {formatDateShort(hackathon.endDate)}
                        </div>
                        {hackathon.registrationDeadline && (
                          <div>
                            <span className="font-medium">Register By:</span> {formatDateShort(hackathon.registrationDeadline)}
                          </div>
                        )}
                        {hackathon.location && (
                          <div>
                            <span className="font-medium">Location:</span> {hackathon.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                    <Link
                      to={`/admin/hackathons/${hackathon.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hackathons;


