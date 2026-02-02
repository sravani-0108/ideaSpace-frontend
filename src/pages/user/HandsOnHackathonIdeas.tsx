import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ideaService } from '../../services/idea.service';
import { hackathonService } from '../../services/hackathon.service';
import { projectService } from '../../services/project.service';
import { Idea, Hackathon, IdeaStatus, HackathonType, Project, ProjectStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import FeedPost from '../../components/FeedPost';

type TabType = 'ideas' | 'solutions';

const HandsOnHackathonIdeas = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [solutions, setSolutions] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('ideas');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);
  const [error, setError] = useState('');

  const handleIdeaUpdate = async (updatedIdea: Idea) => {
    // Update local state
    setIdeas(prevIdeas => 
      prevIdeas.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea)
    );
    // Also reload from server to ensure we have the latest data
    if (hackathonId) {
      try {
        const data = await ideaService.getHandsOnHackathonIdeas(hackathonId);
        setIdeas(data);
      } catch (error: any) {
      }
    }
  };

  useEffect(() => {
    if (hackathonId) {
      loadHackathon();
      loadIdeas();
    }
  }, [hackathonId]);

  useEffect(() => {
    if (activeTab === 'solutions' && hackathonId && solutions.length === 0) {
      loadSolutions();
    }
  }, [activeTab, hackathonId]);

  const loadHackathon = async () => {
    if (!hackathonId) return;
    try {
      const data = await hackathonService.getHackathonById(hackathonId);
      setHackathon(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load hackathon');
    }
  };

  const loadIdeas = async () => {
    if (!hackathonId) return;
    try {
      setIsLoading(true);
      const data = await ideaService.getHandsOnHackathonIdeas(hackathonId);
      setIdeas(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSolutions = async () => {
    if (!hackathonId) return;
    try {
      setIsLoadingSolutions(true);
      const data = await projectService.getProjectsByHackathon(hackathonId);
      setSolutions(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load solutions');
    } finally {
      setIsLoadingSolutions(false);
    }
  };

  // Sort ideas: Approved first, then Pending, then Rejected
  const sortedIdeas = [...ideas].sort((a, b) => {
    const statusOrder: Record<IdeaStatus, number> = {
      [IdeaStatus.APPROVED]: 1,
      [IdeaStatus.PENDING]: 2,
      [IdeaStatus.REJECTED]: 3,
      [IdeaStatus.PUBLISHED]: 0, // Published comes before Approved
      [IdeaStatus.UNDER_REVIEW]: 4,
      [IdeaStatus.PITCHING]: 5,
      [IdeaStatus.ENHANCEMENTS]: 6,
      [IdeaStatus.IMPLEMENTATION]: 7,
      [IdeaStatus.COMPLETED]: 8,
    };
    
    const orderA = statusOrder[a.status] ?? 999;
    const orderB = statusOrder[b.status] ?? 999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // If same status, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const canSubmitIdea = () => {
    if (!hackathon || hackathon.hackathonType !== HackathonType.HANDS_ON) return false;
    const now = new Date();
    if (hackathon.registrationDeadline && now > new Date(hackathon.registrationDeadline)) return false;
    return true;
  };

  const getStatusBadge = (status: IdeaStatus) => {
    const badges: Record<IdeaStatus, string> = {
      [IdeaStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [IdeaStatus.APPROVED]: 'bg-green-100 text-green-800',
      [IdeaStatus.REJECTED]: 'bg-red-100 text-red-800',
      [IdeaStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
      [IdeaStatus.UNDER_REVIEW]: 'bg-purple-100 text-purple-800',
      [IdeaStatus.PITCHING]: 'bg-indigo-100 text-indigo-800',
      [IdeaStatus.ENHANCEMENTS]: 'bg-orange-100 text-orange-800',
      [IdeaStatus.IMPLEMENTATION]: 'bg-indigo-100 text-indigo-800',
      [IdeaStatus.COMPLETED]: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getProjectStatusBadge = (status: ProjectStatus) => {
    const badges: Record<string, string> = {
      [ProjectStatus.NOT_SUBMITTED]: 'bg-gray-100 text-gray-800',
      [ProjectStatus.SUBMITTED]: 'bg-blue-100 text-blue-800',
      [ProjectStatus.LATE]: 'bg-orange-100 text-orange-800',
      [ProjectStatus.UNDER_REVIEW]: 'bg-purple-100 text-purple-800',
      [ProjectStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [ProjectStatus.NEEDS_CHANGES]: 'bg-yellow-100 text-yellow-800',
      [ProjectStatus.DISQUALIFIED]: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading && !hackathon) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/hackathons/${hackathonId}`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Hackathon
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {hackathon?.title}
          </h1>
          <p className="mt-2 text-gray-600">Submitted ideas and solutions for this Hands-On hackathon</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('ideas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ideas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ideas
            </button>
            <button
              onClick={() => setActiveTab('solutions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'solutions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Solutions
            </button>
          </nav>
        </div>

        {canSubmitIdea() && activeTab === 'ideas' && (
          <div className="mb-6">
            <Link
              to={`/hackathons/${hackathonId}/submit-idea`}
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              + Submit New Idea
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Ideas Tab Content */}
        {activeTab === 'ideas' && (
          <>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading ideas...</p>
          </div>
        ) : sortedIdeas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-lg">No ideas found</p>
            {canSubmitIdea() && (
              <Link
                to={`/hackathons/${hackathonId}/submit-idea`}
                className="mt-4 inline-block text-blue-600 hover:text-blue-700"
              >
                Be the first to submit an idea!
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedIdeas.map((idea) => {
              const isOwner = user ? (user.id === idea.user?.id || user.id === idea.author?.id) : false;
              const canEdit = isOwner && canSubmitIdea(); // Can edit if owner and registration is still open
              
              return (
                <div key={idea.id} className="relative">
                  <FeedPost 
                    idea={idea} 
                    onUpdate={handleIdeaUpdate}
                    hideAuthor={isOwner} // Always hide author for owner's ideas
                    showEditButton={isOwner && canEdit} // Show edit button only if can edit
                    showRegistrationEndDate={isOwner && canEdit && !!hackathon?.registrationDeadline}
                    registrationEndDate={hackathon?.registrationDeadline || undefined}
                    showContent={isOwner} // Show title/description for owner's ideas
                  />
                  {/* Status Badge - positioned to the left of the date */}
                  <div className="absolute top-4 right-20 z-10">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shadow-sm ${getStatusBadge(idea.status)}`}>
                      {idea.status}
                    </span>
                  </div>

                {/* Rejection Reason - shown below FeedPost */}
                {idea.rejectionReason && idea.status === IdeaStatus.REJECTED && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{idea.rejectionReason}</p>
                  </div>
                )}

                {/* Project Deadline - only show to the idea owner */}
                {idea.projectDeadline && 
                 user && (user.id === idea.user?.id || user.id === idea.author?.id) && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-800">Project Deadline:</p>
                    <p className="text-sm text-blue-700">
                      {new Date(idea.projectDeadline).toLocaleString()}
                    </p>
                  </div>
                )}
                </div>
              );
            })}
          </div>
            )}
          </>
        )}

        {/* Solutions Tab Content */}
        {activeTab === 'solutions' && (
          <>
            {isLoadingSolutions ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading solutions...</p>
              </div>
            ) : solutions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-500 text-lg">No solutions submitted yet</p>
                <p className="text-gray-400 mt-2">Solutions will appear here once ideas are approved and projects are submitted</p>
              </div>
            ) : (
              <div className="space-y-4">
                {solutions.map((solution) => (
                  <div
                    key={solution.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    {solution.idea && (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                              {solution.idea.title}
                            </h2>
                            {solution.projectDescription && (
                              <p className="text-gray-700 mb-4 line-clamp-2">
                                {solution.projectDescription}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getProjectStatusBadge(solution.status)}`}>
                            {solution.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {solution.githubUrl && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">GitHub</p>
                              <a
                                href={solution.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm break-all"
                              >
                                {solution.githubUrl}
                              </a>
                            </div>
                          )}
                          {solution.demoVideoUrl && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Demo Video</p>
                              <a
                                href={solution.demoVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-sm break-all"
                              >
                                {solution.demoVideoUrl}
                              </a>
                            </div>
                          )}
                          {solution.submittedAt && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">Submitted</p>
                              <p className="text-sm text-gray-600">
                                {new Date(solution.submittedAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {solution.judgeFeedback && (
                          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <p className="text-sm font-medium text-gray-800 mb-1">Judge Feedback:</p>
                            <p className="text-sm text-gray-700">{solution.judgeFeedback}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <Link
                            to={`/ideas/${solution.ideaId}`}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                          >
                            View Idea →
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default HandsOnHackathonIdeas;

