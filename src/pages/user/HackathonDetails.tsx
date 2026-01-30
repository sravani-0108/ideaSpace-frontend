import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { registrationService } from '../../services/registration.service';
import { teamService } from '../../services/team.service';
import { meetingService } from '../../services/meeting.service';
import { Hackathon, HackathonStatus, HackathonType, Team, Meeting } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import Calendar from '../../components/Calendar';
import LeftSidebar from '../../components/LeftSidebar';
import RightSidebar from '../../components/RightSidebar';

const HackathonDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

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

        // Load teams and meetings if registered
        if (registered) {
          const hackathonTeams = await teamService.getTeamsByHackathon(id!);
          setTeams(hackathonTeams);

          const hackathonMeetings = await meetingService.getHackathonMeetings(id!);
          setMeetings(hackathonMeetings);
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
      console.log('✅ Successfully registered for hackathon:', hackathon.id);
      await loadHackathonData(); // Reload to get teams/meetings
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register for hackathon');
      console.error('❌ Failed to register:', err);
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: HackathonStatus) => {
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

  const canRegister = () => {
    if (!hackathon) return false;
    if (hackathon.status === HackathonStatus.COMPLETED) return false;
    if (hackathon.registrationDeadline) {
      return new Date() < new Date(hackathon.registrationDeadline);
    }
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
            {user && hackathon.status !== HackathonStatus.COMPLETED && !isRegistered && (
              <button
                onClick={handleRegister}
                disabled={isRegistering || !canRegister() || isRegistered}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow-md"
              >
                {isRegistering ? 'Registering...' : 'Register'}
              </button>
            )}
          </div>
        </div>

        {/* Hands-On Hackathon Actions */}
        {hackathon.hackathonType === HackathonType.HANDS_ON && isRegistered && (() => {
          // Check if registration is closed
          const now = new Date();
          const registrationEnded = hackathon.registrationEndDate 
            ? now > new Date(hackathon.registrationEndDate)
            : false;
          
          if (registrationEnded) {
            // Registration closed - show "View All Ideas"
            return (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">View Idea</h2>
                    <p className="text-sm text-gray-600">See all submitted ideas for this hackathon</p>
                  </div>
                  <Link
                    to={`/hackathons/${hackathon.id}/ideas`}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Idea
                  </Link>
                </div>
              </div>
            );
          } else {
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
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Microsoft Teams Link</h3>
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
            {hackathon.registrationDeadline && (
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
            {hackathon.hackathonType === HackathonType.HANDS_ON && hackathon.registrationStartDate && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Registration Starts</h3>
                  <p className="text-gray-900 font-medium">{formatDate(hackathon.registrationStartDate)}</p>
                </div>
              </div>
            )}
            {hackathon.hackathonType === HackathonType.HANDS_ON && hackathon.registrationEndDate && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Registration Ends</h3>
                  <p className="text-gray-900 font-medium">{formatDate(hackathon.registrationEndDate)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar View - Show calendar for this specific hackathon */}
        {isRegistered && (
          <div className="mb-6">
            <Calendar hackathons={[hackathon]} meetings={meetings} />
          </div>
        )}

        {/* Teams Section - Only show if registered */}
        {isRegistered && teams.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Teams</h2>
            <div className="space-y-4">
              {teams.map((team) => (
                <div key={team.id} className="p-4 border border-gray-200 rounded-md">
                  <h3 className="font-medium text-gray-900 mb-2">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-600 mb-2">{team.description}</p>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        await teamService.addMemberToTeam(team.id, user!.id, hackathon.id);
                        loadHackathonData();
                      } catch (err: any) {
                        setError(err.response?.data?.message || 'Failed to join team');
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Join Team →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meetings Section - Only show if registered */}
        {isRegistered && meetings.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Microsoft Teams Meetings</h2>
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="p-4 bg-blue-50 rounded-md border border-blue-200">
                  <h3 className="font-medium text-gray-900 mb-2">{meeting.title}</h3>
                  {meeting.description && (
                    <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span>{formatDate(meeting.scheduledDate)}</span>
                      <span className="ml-4">{formatTime(meeting.scheduledDate)}</span>
                    </div>
                    {meeting.meetingLink && (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Join Teams</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>

          {/* Right Sidebar - Show calendar for this specific hackathon if registered */}
          <RightSidebar 
            specificHackathon={isRegistered ? hackathon : undefined}
            specificMeetings={isRegistered ? meetings : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default HackathonDetails;

