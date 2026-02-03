import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { registrationService } from '../../services/registration.service';
import { teamService } from '../../services/team.service';
import { Hackathon, HackathonStatus, HackathonType, Team } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Calendar from '../../components/Calendar';
import LeftSidebar from '../../components/LeftSidebar';
import RightSidebar from '../../components/RightSidebar';
import CreateTeamModal from '../../components/CreateTeamModal';

const HackathonDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadHackathonData();
    }
  }, [id, user]);

  const loadHackathonData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await hackathonService.getHackathonById(id!);
      setHackathon(data);

      // Check registration status
      if (user) {
        const registered = await registrationService.checkRegistrationStatus(id!);
        setIsRegistered(registered);

        // Load teams if registered and hackathon is Hands-On
        if (registered && data.hackathonType === HackathonType.HANDS_ON) {
          const hackathonTeams = await teamService.getTeamsByHackathon(id!);
          setTeams(hackathonTeams);
        } else {
          setTeams([]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load hackathon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user || !hackathon || isRegistered) return; // Prevent double registration

    setIsRegistering(true);
    try {
      await registrationService.registerForHackathon(hackathon.id);
      setIsRegistered(true);
      await loadHackathonData(); // Reload to get teams
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register for hackathon');
    } finally {
      setIsRegistering(false);
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


  const getStatusColor = (status: HackathonStatus, hackathonType?: HackathonType) => {
    if (hackathonType === HackathonType.HANDS_ON) {
      switch (status) {
        case HackathonStatus.OPEN:
          return 'bg-green-100 text-green-800 border-green-300';
        case HackathonStatus.CLOSED:
          return 'bg-gray-100 text-gray-800 border-gray-300';
        case HackathonStatus.DRAFT:
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    } else {
      switch (status) {
        case HackathonStatus.PENDING:
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case HackathonStatus.ACTIVE:
          return 'bg-green-100 text-green-800 border-green-300';
        case HackathonStatus.COMPLETED:
          return 'bg-gray-100 text-gray-800 border-gray-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    }
  };

  const getStatusDisplayName = (status: HackathonStatus, hackathonType?: HackathonType) => {
    if (hackathonType === HackathonType.HANDS_ON) {
      switch (status) {
        case HackathonStatus.OPEN:
          return 'Open';
        case HackathonStatus.CLOSED:
          return 'Closed';
        case HackathonStatus.DRAFT:
          return 'Draft';
        default:
          return status;
      }
    } else {
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
    }
  };

  const canRegister = () => {
    if (!hackathon) return false;
    
    const now = new Date();
    
    // For Hands-On hackathons, check status and registration deadline
    if (hackathon.hackathonType === HackathonType.HANDS_ON) {
      // Must be OPEN status
      if (hackathon.status !== HackathonStatus.OPEN) {
        return false;
      }
      // Check registration deadline
      if (hackathon.registrationDeadline && now > new Date(hackathon.registrationDeadline)) {
        return false; // Registration deadline has passed
      }
      return true;
    }
    
    // For Learning hackathons, check status and registration deadline
    if (hackathon.status === HackathonStatus.COMPLETED) return false;
    
    if (hackathon.registrationDeadline) {
      const registrationDeadline = new Date(hackathon.registrationDeadline);
      return now < registrationDeadline;
    }
    
    // If no deadline specified, allow registration
    return true;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hackathon details...</p>
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Hackathon not found</p>
          <Link to="/dashboard" className="mt-4 text-blue-600 hover:text-blue-700">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <LeftSidebar />

          {/* Main Content */}
          <div className="flex-1">
            <div className="mb-6">
              {(() => {
                const subtab = searchParams.get('subtab') || 'active';
                const type = searchParams.get('type');
                // If hackathon is Hands-On and no type param, use handsOn
                const hackathonType = hackathon?.hackathonType === HackathonType.HANDS_ON ? 'handsOn' : 
                                     hackathon?.hackathonType === HackathonType.LEARNING ? 'learning' : null;
                const typeParam = type || hackathonType;
                
                let url = `/dashboard?tab=hackathons&subtab=${subtab}`;
                if (typeParam) {
                  url += `&type=${typeParam}`;
                }
                
                return (
                  <Link
                    to={url}
                    className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </Link>
                );
              })()}
            </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Title */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{hackathon.title}</h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(hackathon.status)}`}>
                  {getStatusDisplayName(hackathon.status)}
                </span>
                {user && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isRegistered 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isRegistered ? '✓ Registered' : 'Not Registered'}
                  </span>
                )}
              </div>
            </div>
            {user && 
             (hackathon.hackathonType === HackathonType.HANDS_ON 
               ? hackathon.status === HackathonStatus.OPEN 
               : hackathon.status !== HackathonStatus.COMPLETED) && 
             !isRegistered && canRegister() && 
             !(hackathon.judgeIds && hackathon.judgeIds.includes(user.id)) && (
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow-md"
              >
                {isRegistering ? 'Registering...' : 'Register'}
              </button>
            )}
            {user && hackathon.judgeIds && hackathon.judgeIds.includes(user.id) && (
              <div className="px-6 py-2.5 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                assigned as judge
              </div>
            )}
            {user && 
             (hackathon.hackathonType === HackathonType.HANDS_ON 
               ? hackathon.status !== HackathonStatus.OPEN 
               : hackathon.status === HackathonStatus.COMPLETED || !canRegister()) && 
             !isRegistered && (
              <div className="px-6 py-2.5 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium shadow-sm cursor-not-allowed">
                Registration Closed
              </div>
            )}
          </div>
        </div>

        {/* Hands-On Hackathon Actions */}
        {hackathon.hackathonType === HackathonType.HANDS_ON && isRegistered && (() => {
          // Check if registration is closed
          const now = new Date();
          const registrationEnded = hackathon.registrationDeadline 
            ? now > new Date(hackathon.registrationDeadline)
            : false;
          
          if (!registrationEnded) {
            // Registration open - show "Submit" button
            return (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Submit Your Solution</h2>
                    <p className="text-sm text-gray-600">Share your innovative idea for this hackathon</p>
                  </div>
                  <Link
                    to={`/hackathons/${hackathon.id}/submit-idea`}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Submit
                  </Link>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Purpose */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Purpose</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{hackathon.purpose}</p>
        </div>

        {/* Description */}
        {hackathon.description && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{hackathon.description}</p>
          </div>
        )}

        {/* Event Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Start Date</h3>
                <p className="text-gray-900 font-medium">{formatDate(hackathon.startDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">End Date</h3>
                <p className="text-gray-900 font-medium">{formatDate(hackathon.endDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Location</h3>
                <p className="text-gray-900 font-medium">{hackathon.location}</p>
              </div>
            </div>
            {hackathon.onlineLink && (
              <div className="flex items-start gap-3 md:col-span-2">
                <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Online Event Link</h3>
                  <a
                    href={hackathon.onlineLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 break-all font-medium"
                  >
                    {hackathon.onlineLink}
                  </a>
                </div>
              </div>
            )}
              {hackathon.hackathonType === HackathonType.HANDS_ON && hackathon.registrationDeadline && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Submission Deadline</h3>
                  <p className="text-gray-900 font-medium">{formatDate(hackathon.registrationDeadline)}</p>
                </div>
              </div>
            )}
            {hackathon.hackathonType === HackathonType.LEARNING && hackathon.registrationDeadline && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Register By</h3>
                  <p className="text-gray-900 font-medium">{formatDate(hackathon.registrationDeadline)}</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Calendar View - Show calendar for this specific hackathon */}
        {isRegistered && (
          <div className="mb-6">
            <Calendar hackathons={[hackathon]} />
          </div>
        )}

        {/* Teams Section - Only show if registered and hackathon is Hands-On */}
        {isRegistered && hackathon?.hackathonType === HackathonType.HANDS_ON && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Teams</h2>
              <button
                onClick={() => setShowCreateTeamModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                + Create Team
              </button>
            </div>
            
            {teams.length > 0 ? (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="p-4 border border-gray-200 rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-2">{team.name}</h3>
                        {team.description && (
                          <p className="text-sm text-gray-600 mb-2">{team.description}</p>
                        )}
                        {team.creator && (
                          <p className="text-xs text-gray-500">
                            Created by: {team.creator.firstName || team.creator.email}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await teamService.addMemberToTeam(team.id, user!.id, hackathon.id);
                            loadHackathonData();
                            setError('');
                          } catch (err: any) {
                            setError(err.response?.data?.message || 'Failed to join team');
                          }
                        }}
                        className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        Join Team
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No teams created yet. Be the first to create a team!</p>
              </div>
            )}
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateTeamModal && (
          <CreateTeamModal
            hackathonId={hackathon.id}
            onClose={() => setShowCreateTeamModal(false)}
            onSuccess={() => {
              setShowCreateTeamModal(false);
              loadHackathonData();
            }}
          />
        )}

          </div>

          {/* Right Sidebar - Show calendar for this specific hackathon if registered */}
          <RightSidebar 
            specificHackathon={isRegistered ? hackathon : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default HackathonDetails;

