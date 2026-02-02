import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hackathonService } from '../services/hackathon.service';
import { registrationService } from '../services/registration.service';
import { Hackathon, HackathonStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

type HackathonTab = 'active' | 'upcoming' | 'completed';

interface HackathonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const HackathonsModal = ({ isOpen, onClose, isAdmin = false }: HackathonsModalProps) => {
  const { user } = useAuth();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [activeTab, setActiveTab] = useState<HackathonTab>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [registeringIds, setRegisteringIds] = useState<Set<string>>(new Set());
  const [registrationStatuses, setRegistrationStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      loadHackathons();
    }
  }, [isOpen]);

  useEffect(() => {
    if (user && hackathons.length > 0 && isOpen) {
      checkRegistrationStatuses();
    }
  }, [hackathons, user, isOpen]);

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
    if (isAdmin) return; // Admin/Judge doesn't need registration status
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
    if (!user || isAdmin) return; // Admin/Judge can't register

    setRegisteringIds(prev => new Set(prev).add(hackathonId));
    try {
      await registrationService.registerForHackathon(hackathonId);
      setRegistrationStatuses(prev => ({ ...prev, [hackathonId]: true }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register for hackathon');
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
      month: 'short',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Hackathons</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-gray-200">
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

          {/* Content */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading hackathons...</p>
              </div>
            ) : filteredHackathons.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No {activeTab} hackathons found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHackathons.map((hackathon) => {
                  const isRegistered = registrationStatuses[hackathon.id] || false;
                  const isRegistering = registeringIds.has(hackathon.id);

                  return (
                    <div key={hackathon.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 mb-1">{hackathon.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{hackathon.purpose}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                            <div>
                              <span className="font-medium">Event Date:</span>{' '}
                              {formatDate(hackathon.startDate)}
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
                        <span className={`ml-4 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(hackathon.status)}`}>
                          {getStatusDisplayName(hackathon.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <Link
                          to={isAdmin ? `/admin/hackathons/${hackathon.id}` : `/hackathons/${hackathon.id}`}
                          onClick={onClose}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View Details →
                        </Link>
                        {!isAdmin && user && hackathon.status !== HackathonStatus.COMPLETED && (
                          <div>
                            {isRegistered ? (
                              <button
                                disabled={true}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-not-allowed"
                              >
                                Registered
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRegister(hackathon.id)}
                                disabled={isRegistering || !canRegister(hackathon) || isRegistered}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
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
        </div>
      </div>
    </div>
  );
};

export default HackathonsModal;

