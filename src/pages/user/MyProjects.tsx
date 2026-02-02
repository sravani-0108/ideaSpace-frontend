import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../../services/project.service';
import { ideaService } from '../../services/idea.service';
import { hackathonService } from '../../services/hackathon.service';
import { Project, ProjectStatus, Idea, IdeaStatus, HackathonType, HackathonStatus, Hackathon } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LeftSidebar from '../../components/LeftSidebar';

const MyProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [hackathonIdeas, setHackathonIdeas] = useState<Idea[]>([]);
  const [hackathonsMap, setHackathonsMap] = useState<Record<string, Hackathon>>({});
  const [teamsMap, setTeamsMap] = useState<Record<string, any[]>>({}); // hackathonId -> team members
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
    loadHackathonIdeas();
  }, []);

  const loadProjects = async () => {
    try {
      const allProjects = await projectService.getAllProjects();
      // Filter projects for current user
      const userProjects = allProjects.filter(p => p.userId === user?.id);
      setProjects(userProjects);
    } catch (error: any) {
    }
  };

  const loadHackathonIdeas = async () => {
    try {
      setIsLoading(true);
      
      // For Hands-On hackathons, we need to fetch ideas per hackathon to get team members' ideas
      const { registrationService } = await import('../../services/registration.service');
      const { teamService } = await import('../../services/team.service');
      const userRegistrations = await registrationService.getUserRegistrations();
      const handsOnRegistrations = userRegistrations.filter(
        reg => reg.hackathon?.hackathonType === HackathonType.HANDS_ON
      );
      
      const teamsDataMap: Record<string, any[]> = {};
      
      // Fetch ideas for each Hands-On hackathon (this will include team members' ideas)
      const ideasPromises = handsOnRegistrations.map(async (reg) => {
        try {
          // Get team members for this hackathon if user is in a team
          if (reg.teamId) {
            try {
              const teamMembers = await teamService.getTeamMembers(reg.teamId);
              teamsDataMap[reg.hackathonId] = teamMembers;
            } catch {
              // Team not found or error, continue without team info
            }
          }
          
          const ideas = await ideaService.getHandsOnHackathonIdeas(reg.hackathonId);
          return ideas || [];
        } catch {
          return [];
        }
      });
      
      const ideasArrays = await Promise.all(ideasPromises);
      const handsOnIdeas = ideasArrays.flat();
      
      // Set teams map
      setTeamsMap(teamsDataMap);
      
      // Load hackathon details for ALL ideas to ensure we have status information
      const hackathonsToLoad: Record<string, Hackathon> = {};
      const uniqueHackathonIds = new Set<string>();
      
      // Collect all hackathon IDs
      for (const idea of handsOnIdeas) {
        if (idea.hackathonId) {
          uniqueHackathonIds.add(idea.hackathonId);
          // Also use the loaded hackathon if available
          if (idea.hackathon) {
            hackathonsToLoad[idea.hackathonId] = idea.hackathon;
          }
        }
      }
      
      // Fetch all unique hackathons that aren't already loaded
      for (const hackathonId of uniqueHackathonIds) {
        if (!hackathonsToLoad[hackathonId]) {
          try {
            const hackathon = await hackathonService.getHackathonById(hackathonId);
            hackathonsToLoad[hackathonId] = hackathon;
          } catch (error) {
            // Skip if hackathon can't be loaded
          }
        }
      }
      
      // Update hackathonsMap first
      if (Object.keys(hackathonsToLoad).length > 0) {
        setHackathonsMap(hackathonsToLoad);
      }
      
      // Then set ideas
      setHackathonIdeas(handsOnIdeas);
    } catch (error: any) {
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: ProjectStatus | IdeaStatus) => {
    const badges: Record<string, string> = {
      [ProjectStatus.NOT_SUBMITTED]: 'bg-gray-100 text-gray-800',
      [ProjectStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [ProjectStatus.LATE]: 'bg-orange-100 text-orange-800',
      [ProjectStatus.UNDER_REVIEW]: 'bg-purple-100 text-purple-800',
      [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [ProjectStatus.NEEDS_CHANGES]: 'bg-yellow-100 text-yellow-800',
      [ProjectStatus.DISQUALIFIED]: 'bg-red-100 text-red-800',
      [IdeaStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [IdeaStatus.APPROVED]: 'bg-green-100 text-green-800',
      [IdeaStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
      [IdeaStatus.REJECTED]: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

                  const getStatusDisplay = (status: ProjectStatus | IdeaStatus, isIdea?: boolean) => {
                    if (isIdea) {
                      const statusMap: Record<string, string> = {
                        [IdeaStatus.PENDING]: 'Submitted',
                        [IdeaStatus.UNDER_REVIEW]: 'Under Review',
                        [IdeaStatus.PITCHING]: 'Pitching',
                        [IdeaStatus.ENHANCEMENTS]: 'Enhancements',
                        [IdeaStatus.IMPLEMENTATION]: 'Implementation',
                        [IdeaStatus.COMPLETED]: 'Completed',
                        [IdeaStatus.APPROVED]: 'Approved',
                        [IdeaStatus.REJECTED]: 'Rejected',
                        [IdeaStatus.PUBLISHED]: 'Published',
                      };
                      return statusMap[status] || status;
                    }
                    return status;
                  };

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            <LeftSidebar />
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">My Solutions</h1>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading solutions...</p>
                </div>
              ) : projects.length === 0 && hackathonIdeas.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <p className="text-gray-500 text-lg">No solutions submitted yet</p>
                  <p className="text-gray-400 mt-2">Submit solutions for your approved ideas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Hands-On Hackathon Ideas */}
                  {hackathonIdeas.map((idea) => {
                    // Get team info if this is a team idea
                    const ideaHackathonId = idea.hackathonId;
                    const teamMembers = ideaHackathonId ? teamsMap[ideaHackathonId] : null;
                    const isTeamIdea = teamMembers && teamMembers.length > 1;
                    const submitterName = idea.user 
                      ? `${idea.user.firstName || ''} ${idea.user.lastName || ''}`.trim() || idea.user.email
                      : 'Unknown';
                    
                    return (
                      <div
                        key={idea.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                              {idea.title}
                            </h2>
                            <p className="text-gray-700 mb-4 line-clamp-2">
                              {idea.description}
                            </p>
                            {/* Show team info */}
                            {isTeamIdea && teamMembers && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs font-medium text-blue-700 mb-1">
                                  Team Submission
                                </p>
                                <p className="text-xs text-gray-600 mb-1">
                                  Team Members: {teamMembers.map(m => {
                                    const name = m.user 
                                      ? `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim() || m.user.email
                                      : 'Unknown';
                                    return name;
                                  }).join(', ')}
                                </p>
                                <p className="text-xs text-gray-500 italic">
                                  Submitted by: {submitterName}
                                </p>
                              </div>
                            )}
                            {!isTeamIdea && idea.user?.id !== user?.id && (
                              <p className="text-xs text-gray-500 mt-2">
                                Submitted by: {submitterName}
                              </p>
                            )}
                          </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(idea.status)}`}>
                          {getStatusDisplay(idea.status, true)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {idea.gitRepositoryUrl && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Git Repository</p>
                            <a
                              href={idea.gitRepositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm break-all"
                            >
                              {idea.gitRepositoryUrl}
                            </a>
                          </div>
                        )}
                        {idea.documentationUrl && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Documentation</p>
                            <a
                              href={idea.documentationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm break-all"
                            >
                              View Documentation
                            </a>
                          </div>
                        )}
                        {idea.videoUrl && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Video</p>
                            <a
                              href={idea.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm break-all"
                            >
                              View Video
                            </a>
                          </div>
                        )}
                        {idea.zipFilePath && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">ZIP File</p>
                            <a
                              href={idea.zipFilePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm break-all"
                            >
                              Download ZIP
                            </a>
                          </div>
                        )}
                        {idea.createdAt && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Submitted</p>
                            <p className="text-sm text-gray-600">
                              {new Date(idea.createdAt).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {idea.statusDeadline && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              {idea.status === IdeaStatus.PITCHING && 'Pitching Deadline'}
                              {idea.status === IdeaStatus.ENHANCEMENTS && 'Enhancements Deadline'}
                              {idea.status === IdeaStatus.IMPLEMENTATION && 'Implementation Deadline'}
                            </p>
                            <p className={`text-sm ${
                              new Date() > new Date(idea.statusDeadline) 
                                ? 'text-red-600 font-medium' 
                                : 'text-gray-600'
                            }`}>
                              {new Date(idea.statusDeadline).toLocaleString()}
                              {new Date() > new Date(idea.statusDeadline) && ' ⚠️ Passed'}
                            </p>
                          </div>
                        )}
                      </div>

                      {idea.hackathon && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm font-medium text-blue-800 mb-1">Hackathon:</p>
                          <p className="text-sm text-blue-700">{idea.hackathon.title}</p>
                        </div>
                      )}

                      {idea.rejectionReason && idea.status === IdeaStatus.REJECTED && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason:</p>
                          <p className="text-sm text-red-700">{idea.rejectionReason}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <Link
                          to={`/ideas/${idea.id}`}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View Idea →
                        </Link>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            // Only show Edit Submission button if hackathon exists, is Hands-On, and conditions are met
                            if (!idea.hackathonId) return null;
                            
                            // Get hackathon from map first (most up-to-date), then fallback to relation
                            const hackathon = hackathonsMap[idea.hackathonId] || idea.hackathon;
                            if (!hackathon) {
                              // Hackathon not loaded yet, don't show button to be safe
                              return null;
                            }
                            
                            const isHandsOn = hackathon.hackathonType === HackathonType.HANDS_ON;
                            if (!isHandsOn) return null;
                            
                            // Hide if hackathon is COMPLETED or CLOSED
                            // Handle both enum and string comparisons - normalize to uppercase for comparison
                            const hackathonStatus = String(hackathon.status || '').trim().toUpperCase();
                            const isCompleted = hackathonStatus === HackathonStatus.COMPLETED || hackathonStatus === 'COMPLETED';
                            const isClosed = hackathonStatus === HackathonStatus.CLOSED || hackathonStatus === 'CLOSED';
                            
                            // Also hide if idea status is COMPLETED (as an additional safety check)
                            const ideaStatus = String(idea.status || '').trim().toUpperCase();
                            const isIdeaCompleted = ideaStatus === IdeaStatus.COMPLETED || ideaStatus === 'COMPLETED';
                            
                            if (isCompleted || isClosed || isIdeaCompleted) {
                              return null;
                            }
                            
                            // Hide if any deadline has passed (pitching, enhancements, implementation)
                            const now = new Date();
                            if (idea.statusDeadline) {
                              const deadline = new Date(idea.statusDeadline);
                              if (now > deadline) {
                                // Deadline has passed, don't show edit button
                                return null;
                              }
                            }
                            
                            return (
                              <Link
                                to={`/hackathons/${idea.hackathonId}/submit-idea`}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                              >
                                Edit Submission
                              </Link>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    );
                  })}

                  {/* Projects */}
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      {project.idea && (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                {project.idea.title}
                              </h2>
                              {project.projectDescription && (
                                <p className="text-gray-700 mb-4 line-clamp-2">
                                  {project.projectDescription}
                                </p>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(project.status)}`}>
                              {project.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {project.githubUrl && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">GitHub</p>
                                <a
                                  href={project.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm break-all"
                                >
                                  {project.githubUrl}
                                </a>
                              </div>
                            )}
                            {project.demoVideoUrl && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Demo Video</p>
                                <a
                                  href={project.demoVideoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 text-sm break-all"
                                >
                                  {project.demoVideoUrl}
                                </a>
                              </div>
                            )}
                            {project.submittedAt && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Submitted</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(project.submittedAt).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>

                          {project.judgeFeedback && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                              <p className="text-sm font-medium text-gray-800 mb-1">Judge Feedback:</p>
                              <p className="text-sm text-gray-700">{project.judgeFeedback}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <Link
                              to={`/ideas/${project.ideaId}`}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              View Idea →
                            </Link>
                            <Link
                              to={`/ideas/${project.ideaId}/submit-project`}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                            >
                              {project.status === ProjectStatus.NEEDS_CHANGES ? 'Update Project' : 'View/Edit'}
                            </Link>
                          </div>
                        </>
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

export default MyProjects;

