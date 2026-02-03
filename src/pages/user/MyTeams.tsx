import { useEffect, useState } from 'react';
import { registrationService } from '../../services/registration.service';
import { teamService } from '../../services/team.service';
import { Team, HackathonRegistration } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDisplayName } from '../../utils/user.util';
import LeftSidebar from '../../components/LeftSidebar';

const MyTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
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

      // Get teams for hackathons user is registered for
      const teamPromises = userRegistrations
        .filter(reg => reg.teamId)
        .map(reg => teamService.getTeamById(reg.teamId!));
      
      const userTeams = await Promise.all(teamPromises);
      setTeams(userTeams);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  // Group teams by hackathon with members
  const [teamsByHackathon, setTeamsByHackathon] = useState<Record<string, { team: Team; members: HackathonRegistration[] }>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const loadTeamDetails = async () => {
      if (teams.length === 0) {
        setTeamsByHackathon({});
        return;
      }
      
      setLoadingDetails(true);
      const grouped: Record<string, { team: Team; members: HackathonRegistration[] }> = {};

      for (const team of teams) {
        if (!grouped[team.hackathonId]) {
          grouped[team.hackathonId] = {
            team,
            members: [],
          };
        }
        
        // Load team members
        try {
          const members = await teamService.getTeamMembers(team.id);
          grouped[team.hackathonId].members = members;
        } catch {}
      }

      setTeamsByHackathon(grouped);
      setLoadingDetails(false);
    };

    loadTeamDetails();
  }, [teams]);

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
          {Object.values(teamsByHackathon).map(({ team, members }) => (
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

