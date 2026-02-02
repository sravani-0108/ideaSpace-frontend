import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ideaService } from '../../services/idea.service';
import { projectService } from '../../services/project.service';
import { hackathonService } from '../../services/hackathon.service';
import { Idea, Project, Hackathon, IdeaStatus, ProjectStatus, HackathonType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDisplayName, getUserInitials, getProfilePictureUrl } from '../../utils/user.util';

type ViewType = 'ideas' | 'projects';

const JudgeDashboard = () => {
  const { user } = useAuth();
  const [viewType, setViewType] = useState<ViewType>('ideas');
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHackathons();
  }, []);

  useEffect(() => {
    if (selectedHackathonId) {
      if (viewType === 'ideas') {
        loadIdeas();
      } else {
        loadProjects();
      }
    }
  }, [selectedHackathonId, viewType]);

  const loadHackathons = async () => {
    try {
      setIsLoading(true);
      const data = await hackathonService.getAllHackathons();
      // Filter only Hands-On hackathons
      const handsOnHackathons = data.filter(h => h.hackathonType === HackathonType.HANDS_ON);
      setHackathons(handsOnHackathons);
      if (handsOnHackathons.length > 0 && !selectedHackathonId) {
        setSelectedHackathonId(handsOnHackathons[0].id);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load hackathons');
    } finally {
      setIsLoading(false);
    }
  };

  const loadIdeas = async () => {
    if (!selectedHackathonId) return;
    try {
      setIsLoading(true);
      const data = await ideaService.getHandsOnHackathonIdeas(selectedHackathonId);
      setIdeas(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      if (selectedHackathonId) {
        // Load projects for specific hackathon
        const data = await projectService.getProjectsByHackathon(selectedHackathonId);
        setProjects(data);
      } else {
        // Load all projects needing review if no hackathon selected
        const data = await projectService.getProjectsNeedingReview();
        setProjects(data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: IdeaStatus | ProjectStatus) => {
    const badges: Record<string, string> = {
      [IdeaStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [IdeaStatus.APPROVED]: 'bg-green-100 text-green-800',
      [IdeaStatus.REJECTED]: 'bg-red-100 text-red-800',
      [ProjectStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [ProjectStatus.LATE]: 'bg-orange-100 text-orange-800',
      [ProjectStatus.UNDER_REVIEW]: 'bg-purple-100 text-purple-800',
      [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [ProjectStatus.NEEDS_CHANGES]: 'bg-yellow-100 text-yellow-800',
      [ProjectStatus.DISQUALIFIED]: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const pendingIdeas = ideas.filter(i => i.status === IdeaStatus.PENDING);
  const submittedProjects = projects.filter(p => 
    p.status === ProjectStatus.SUBMITTED || 
    p.status === ProjectStatus.LATE || 
    p.status === ProjectStatus.UNDER_REVIEW
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Judge Dashboard</h1>
          <p className="mt-2 text-gray-600">Review ideas and projects for Hands-On hackathons</p>
        </div>

        {/* Hackathon Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {viewType === 'projects' ? 'Filter by Hackathon (Optional)' : 'Select Hackathon'}
          </label>
          <select
            value={selectedHackathonId || ''}
            onChange={(e) => setSelectedHackathonId(e.target.value || null)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {viewType === 'projects' && (
              <option value="">All Projects Needing Review</option>
            )}
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setViewType('ideas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewType === 'ideas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Ideas ({pendingIdeas.length} pending)
            </button>
            <button
              onClick={() => setViewType('projects')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewType === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Projects ({submittedProjects.length} submitted)
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : viewType === 'ideas' ? (
          <div className="space-y-4">
            {ideas.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500 text-lg">No ideas found</p>
              </div>
            ) : (
              ideas.map((idea) => {
                const author = idea.user || idea.author;
                const authorName = getUserDisplayName(author);
                const authorInitials = getUserInitials(author);
                const profilePicUrl = getProfilePictureUrl(author);

                return (
                  <div
                    key={idea.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        {profilePicUrl ? (
                          <img
                            src={profilePicUrl}
                            alt={authorName}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0';
                              fallback.textContent = authorInitials;
                              target.parentNode?.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                            {authorInitials}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{authorName}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(idea.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(idea.status)}`}>
                        {idea.status}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{idea.title}</h2>
                    <p className="text-gray-700 mb-4">{idea.description}</p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <Link
                        to={`/judge/ideas/${idea.id}/review`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                      >
                        Review Idea
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500 text-lg">No projects found</p>
              </div>
            ) : (
              projects.map((project) => {
                const author = project.user || project.submitter;
                const authorName = getUserDisplayName(author);
                const authorInitials = getUserInitials(author);
                const profilePicUrl = getProfilePictureUrl(author);

                return (
                  <div
                    key={project.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        {profilePicUrl ? (
                          <img
                            src={profilePicUrl}
                            alt={authorName}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0';
                              fallback.textContent = authorInitials;
                              target.parentNode?.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                            {authorInitials}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{authorName}</h3>
                          <p className="text-sm text-gray-500">
                            {project.submittedAt 
                              ? new Date(project.submittedAt).toLocaleDateString()
                              : 'Not submitted'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(project.status)}`}>
                        {project.status}
                      </span>
                    </div>

                    {project.idea && (
                      <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">{project.idea.title}</h2>
                        {project.projectDescription && (
                          <p className="text-gray-700 mb-4">{project.projectDescription}</p>
                        )}
                      </>
                    )}

                    {project.judgeFeedback && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <p className="text-sm font-medium text-gray-800">Previous Feedback:</p>
                        <p className="text-sm text-gray-700">{project.judgeFeedback}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <Link
                        to={`/judge/projects/${project.id}/review`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                      >
                        Review Project
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
    </div>
  );
};

export default JudgeDashboard;

