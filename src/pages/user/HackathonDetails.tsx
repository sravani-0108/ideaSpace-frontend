import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { hackathonService } from '../../services/hackathon.service';
import { registrationService } from '../../services/registration.service';
import { teamService } from '../../services/team.service';
import { meetingService } from '../../services/meeting.service';
import { Hackathon, HackathonStatus, Team, Meeting } from '../../types';
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
            Back to Dashboard
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
              <Link
                to={`/dashboard?tab=hackathons${searchParams.get('subtab') ? `&subtab=${searchParams.get('subtab')}` : ''}`}
                className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
            </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Title */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{hackathon.title}</h1>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(hackathon.status)}`}>
                {getStatusDisplayName(hackathon.status)}
              </span>
            </div>
            {user && hackathon.status !== HackathonStatus.COMPLETED && (
              <div>
                {isRegistered ? (
                  <button
                    disabled={true}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-not-allowed"
                  >
                    Registered
                  </button>
                ) : (
                  <button
                    onClick={handleRegister}
                    disabled={isRegistering || !canRegister() || isRegistered}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isRegistering ? 'Registering...' : 'Register'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Purpose */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Purpose</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{hackathon.purpose}</p>
        </div>

        {/* Description */}
        {hackathon.description && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{hackathon.description}</p>
          </div>
        )}

        {/* When and Where */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Start Date</h3>
              <p className="text-gray-900">{formatDate(hackathon.startDate)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">End Date</h3>
              <p className="text-gray-900">{formatDate(hackathon.endDate)}</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Location</h3>
              <p className="text-gray-900">{hackathon.location}</p>
            </div>
            {hackathon.onlineLink && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Microsoft Teams Link</h3>
                <a
                  href={hackathon.onlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {hackathon.onlineLink}
                </a>
              </div>
            )}
            {hackathon.registrationDeadline && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Register By</h3>
                <p className="text-gray-900">{formatDate(hackathon.registrationDeadline)}</p>
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

