import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { registrationService } from '../../services/registration.service';
import { Hackathon, HackathonStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type HackathonTab = 'active' | 'upcoming' | 'completed';

const HackathonsView = () => {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [activeTab, setActiveTab] = useState<HackathonTab>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [registeringIds, setRegisteringIds] = useState<Set<string>>(new Set());
  const [registrationStatuses, setRegistrationStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadHackathons();
  }, []);

  useEffect(() => {
    // Check registration status for all hackathons
    if (user && hackathons.length > 0) {
      checkRegistrationStatuses();
    }
  }, [hackathons, user]);

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

  const checkRegistrationStatuses = async () => {
    const statuses: Record<string, boolean> = {};
    for (const hackathon of hackathons) {
      try {
        const isRegistered = await registrationService.checkRegistrationStatus(hackathon.id);
        statuses[hackathon.id] = isRegistered;
      } catch {
        statuses[hackathon.id] = false;
      }
    }
    setRegistrationStatuses(statuses);
  };

  const handleRegister = async (hackathonId: string) => {
    if (!user) return;

    setRegisteringIds(prev => new Set(prev).add(hackathonId));
    try {
      await registrationService.registerForHackathon(hackathonId);
      // Update registration status immediately to disable button
      setRegistrationStatuses(prev => ({ ...prev, [hackathonId]: true }));
      console.log('✅ Successfully registered for hackathon:', hackathonId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register for hackathon');
      console.error('❌ Failed to register:', err);
    } finally {
      setRegisteringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(hackathonId);
        return newSet;
      });
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

  const filteredHackathons = hackathons.filter(hackathon => {
    if (activeTab === 'active') return hackathon.status === HackathonStatus.ACTIVE;
    if (activeTab === 'upcoming') return hackathon.status === HackathonStatus.PENDING;
    if (activeTab === 'completed') return hackathon.status === HackathonStatus.COMPLETED;
    return true;
  });

  const canRegister = (hackathon: Hackathon) => {
    if (!hackathon.registrationDeadline) return true;
    return new Date() < new Date(hackathon.registrationDeadline);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hackathons</h1>
        <p className="mt-1 text-gray-600 text-sm">Discover and join hackathons</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'upcoming'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Completed
          </button>
        </nav>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hackathons...</p>
        </div>
      ) : filteredHackathons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">No {activeTab} hackathons found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredHackathons.map((hackathon) => {
            const isRegistered = registrationStatuses[hackathon.id] || false;
            const isRegistering = registeringIds.has(hackathon.id);

            return (
              <div key={hackathon.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{hackathon.title}</h3>
                    <p className="text-gray-600 mb-2">{hackathon.purpose}</p>
                    {hackathon.description && (
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{hackathon.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <span className="font-medium">Start:</span> {formatDate(hackathon.startDate)}
                      </div>
                      <div>
                        <span className="font-medium">End:</span> {formatDate(hackathon.endDate)}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {hackathon.location}
                      </div>
                      {hackathon.registrationDeadline && (
                        <div>
                          <span className="font-medium">Register By:</span>{' '}
                          {formatDate(hackathon.registrationDeadline)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(hackathon.status)}`}>
                    {getStatusDisplayName(hackathon.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Link
                    to={`/hackathons/${hackathon.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View Details →
                  </Link>
                  {user && hackathon.status !== HackathonStatus.COMPLETED && (
                    <div className="flex items-center space-x-3">
                      {isRegistered ? (
                        <button
                          disabled={true}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-not-allowed"
                        >
                          Registered
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegister(hackathon.id)}
                          disabled={isRegistering || !canRegister(hackathon) || isRegistered}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {isRegistering ? 'Registering...' : 'Register'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HackathonsView;

