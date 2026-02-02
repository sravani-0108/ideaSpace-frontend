import { useEffect, useState } from 'react';
import { registrationService } from '../../services/registration.service';
import { teamService } from '../../services/team.service';
import { meetingService } from '../../services/meeting.service';
import { Team, Meeting, HackathonRegistration } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDisplayName } from '../../utils/user.util';
import LeftSidebar from '../../components/LeftSidebar';

const MyTeams = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<HackathonRegistration[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadTeamsData();
    }
  }, [user]);

  const loadTeamsData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Get user registrations
      const userRegistrations = await registrationService.getUserRegistrations();
      setRegistrations(userRegistrations);

      // Get teams for hackathons user is registered for
      const teamPromises = userRegistrations
        .filter(reg => reg.teamId)
        .map(reg => teamService.getTeamById(reg.teamId!));
      
      const userTeams = await Promise.all(teamPromises);
      setTeams(userTeams);

      // Get meetings for user's teams
      const meetingPromises = userTeams.map(team => 
        meetingService.getTeamMeetings(team.id).catch(() => [])
      );
      const allMeetings = await Promise.all(meetingPromises);
      setMeetings(allMeetings.flat());
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load teams');
    } finally {
      setIsLoading(false);
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

  // Group teams by hackathon with members and meetings
  const [teamsByHackathon, setTeamsByHackathon] = useState<Record<string, { team: Team; members: HackathonRegistration[]; meetings: Meeting[] }>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const loadTeamDetails = async () => {
      if (teams.length === 0) {
        setTeamsByHackathon({});
        return;
      }
      
      setLoadingDetails(true);
      const grouped: Record<string, { team: Team; members: HackathonRegistration[]; meetings: Meeting[] }> = {};

      for (const team of teams) {
        if (!grouped[team.hackathonId]) {
          grouped[team.hackathonId] = {
            team,
            members: [],
            meetings: [],
          };
        }
        
        // Load team members
        try {
          const members = await teamService.getTeamMembers(team.id);
          grouped[team.hackathonId].members = members;
        } catch {}

        // Get meetings for this team
        const teamMeetings = meetings.filter(m => m.teamId === team.id);
        grouped[team.hackathonId].meetings = teamMeetings;
      }

      setTeamsByHackathon(grouped);
      setLoadingDetails(false);
    };

    loadTeamDetails();
  }, [teams, meetings]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <LeftSidebar />
          
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
              <p className="mt-1 text-gray-600 text-sm">Microsoft Teams and team details</p>
            </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isLoading || loadingDetails ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-500 text-lg">No teams yet</p>
          <p className="text-gray-400 text-sm mt-2">Join a team in a hackathon to see it here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(teamsByHackathon).map(({ team, members, meetings: teamMeetings }) => (
            <div key={team.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{team.name}</h3>
                {team.description && (
                  <p className="text-gray-600 mb-4">{team.description}</p>
                )}
                {team.hackathon && (
                  <p className="text-sm text-gray-500">
                    Hackathon: <span className="font-medium">{team.hackathon.title}</span>
                  </p>
                )}
              </div>

              {/* Team Members */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Team Members</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        {member.user?.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getUserDisplayName(member.user)}
                        </p>
                        <p className="text-xs text-gray-500">{member.user?.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Microsoft Teams Meetings */}
              {teamMeetings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Microsoft Teams Meetings</h4>
                  <div className="space-y-3">
                    {teamMeetings.map((meeting) => (
                      <div key={meeting.id} className="p-4 bg-blue-50 rounded-md border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 mb-1">{meeting.title}</h5>
                            {meeting.description && (
                              <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(meeting.scheduledDate)}
                              </span>
                              <span>
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatTime(meeting.scheduledDate)}
                              </span>
                            </div>
                          </div>
                          {meeting.meetingLink && (
                            <a
                              href={meeting.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
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

              {teamMeetings.length === 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No Microsoft Teams meetings scheduled
                </div>
              )}
            </div>
          ))}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyTeams;

