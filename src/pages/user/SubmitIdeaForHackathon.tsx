import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ideaService } from '../../services/idea.service';
import { hackathonService } from '../../services/hackathon.service';
import { projectService } from '../../services/project.service';
import { Hackathon, HackathonType, Idea, IdeaStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const SubmitIdeaForHackathon = () => {
  const { hackathonId } = useParams<{ hackathonId: string }>();
  const navigate = useNavigate();
  useAuth(); // Keep auth context active
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHackathon, setIsLoadingHackathon] = useState(true);
  const [message, setMessage] = useState('');
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [existingIdea, setExistingIdea] = useState<Idea | null>(null);
  const [ideasWithProjects, setIdeasWithProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (hackathonId) {
      loadHackathon();
      loadMyIdeas();
    }
  }, [hackathonId]);

  // Reload ideas when page becomes visible (in case idea was updated from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && hackathonId) {
        loadMyIdeas();
      }
    };

    const handleFocus = () => {
      if (hackathonId) {
        loadMyIdeas();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [hackathonId]);

  // Update form data when myIdeas changes (e.g., after update from modal)
  useEffect(() => {
    if (myIdeas.length > 0) {
      const latestIdea = myIdeas[0];
      setExistingIdea(latestIdea);
      setFormData({
        title: latestIdea.title,
        description: latestIdea.description,
      });
    } else {
      setExistingIdea(null);
      setFormData({ title: '', description: '' });
    }
  }, [myIdeas]);

  useEffect(() => {
    // Check for projects for approved/published ideas
    const checkProjects = async () => {
      const projectChecks = myIdeas
        .filter(idea => 
          idea.status === IdeaStatus.APPROVED || idea.status === IdeaStatus.PUBLISHED
        )
        .map(async (idea) => {
          try {
            const project = await projectService.getProjectByIdeaId(idea.id);
            return { ideaId: idea.id, hasProject: !!project };
          } catch {
            return { ideaId: idea.id, hasProject: false };
          }
        });

      const results = await Promise.all(projectChecks);
      const ideasWithProjectsSet = new Set(
        results.filter(r => r.hasProject).map(r => r.ideaId)
      );
      setIdeasWithProjects(ideasWithProjectsSet);
    };

    if (myIdeas.length > 0) {
      checkProjects();
    }
  }, [myIdeas]);

  const loadHackathon = async () => {
    if (!hackathonId) return;
    try {
      setIsLoadingHackathon(true);
      const data = await hackathonService.getHackathonById(hackathonId);
      setHackathon(data);
      
      // Check if registration period is active
      if (data.hackathonType === HackathonType.HANDS_ON) {
        const now = new Date();
        const regStart = data.registrationStartDate ? new Date(data.registrationStartDate) : null;
        const regEnd = data.registrationEndDate ? new Date(data.registrationEndDate) : null;
        
        if (regStart && now < regStart) {
          setMessage('Idea submission has not started yet');
        } else if (regEnd && now > regEnd) {
          setMessage('Idea submission period has ended');
        }
      }
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load hackathon');
    } finally {
      setIsLoadingHackathon(false);
    }
  };

  const loadMyIdeas = async () => {
    if (!hackathonId) return;
    try {
      setIsLoadingIdeas(true);
      const allIdeas = await ideaService.getMyIdeas();
      // Filter ideas for this hackathon
      const hackathonIdeas = allIdeas.filter(idea => idea.hackathonId === hackathonId);
      setMyIdeas(hackathonIdeas);
      
      // If user has an existing idea, pre-fill the form
      if (hackathonIdeas.length > 0) {
        const latestIdea = hackathonIdeas[0]; // Get the first/most recent idea
        setExistingIdea(latestIdea);
        // Always update form data with latest idea data
        setFormData({
          title: latestIdea.title,
          description: latestIdea.description,
        });
      } else {
        setExistingIdea(null);
        // Clear form if no idea exists
        setFormData({ title: '', description: '' });
      }
    } catch (error: any) {
      console.error('Failed to load ideas:', error);
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canSubmit = () => {
    if (!hackathon || hackathon.hackathonType !== HackathonType.HANDS_ON) return false;
    
    const now = new Date();
    const regStart = hackathon.registrationStartDate ? new Date(hackathon.registrationStartDate) : null;
    const regEnd = hackathon.registrationEndDate ? new Date(hackathon.registrationEndDate) : null;
    
    if (regStart && now < regStart) return false;
    if (regEnd && now > regEnd) return false;
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (!validateForm() || !canSubmit() || !hackathonId) {
      return;
    }

    setIsLoading(true);
    try {
      await ideaService.createIdea({
        title: formData.title.trim(),
        description: formData.description.trim(),
        hackathonId: hackathonId,
      });
      setMessage(existingIdea 
        ? 'Idea updated successfully! It will be reviewed by judges.' 
        : 'Idea submitted successfully! It will be reviewed by judges.');
      // Reload ideas to show the updated submission
      loadMyIdeas();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to submit idea. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingHackathon) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Hackathon not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const submissionAllowed = canSubmit();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/hackathons/${hackathonId}`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Hackathon
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {existingIdea ? 'Update Idea for' : 'Submit Idea for'} {hackathon.title}
          </h1>
          <p className="mt-2 text-gray-600">
            {existingIdea 
              ? 'Update your idea for this Hands-On hackathon. Submitting will replace your previous submission.' 
              : 'Share your innovative idea for this Hands-On hackathon'}
          </p>
        </div>

        {hackathon.hackathonType === HackathonType.HANDS_ON && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Registration Period</h3>
            <div className="text-sm text-blue-800">
              {hackathon.registrationStartDate && (
                <p>Start: {new Date(hackathon.registrationStartDate).toLocaleString()}</p>
              )}
              {hackathon.registrationEndDate && (
                <p>End: {new Date(hackathon.registrationEndDate).toLocaleString()}</p>
              )}
              {!submissionAllowed && (
                <p className="mt-2 font-medium text-red-600">
                  {message || 'Idea submission is not currently available'}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {message && (
            <div className={`mb-4 rounded-md p-3 text-sm ${
              message.includes('successfully') 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Idea Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your idea title"
                disabled={!submissionAllowed}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                rows={8}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe your idea in detail. What problem does it solve? How will it work?"
                disabled={!submissionAllowed}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => navigate(`/hackathons/${hackathonId}`)}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !submissionAllowed}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (existingIdea ? 'Updating...' : 'Submitting...') : (existingIdea ? 'Update Idea' : 'Submit')}
              </button>
            </div>
          </div>
        </form>

        {/* My Submitted Idea */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Submitted Idea</h2>
          
          {isLoadingIdeas ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading your idea...</p>
            </div>
          ) : myIdeas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">You haven't submitted any idea yet for this hackathon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myIdeas.slice(0, 1).map((idea) => {
                const getStatusBadge = (status: IdeaStatus) => {
                  const styles = {
                    [IdeaStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
                    [IdeaStatus.APPROVED]: 'bg-green-100 text-green-800',
                    [IdeaStatus.PUBLISHED]: 'bg-blue-100 text-blue-800',
                    [IdeaStatus.REJECTED]: 'bg-red-100 text-red-800',
                  };
                  return styles[status] || 'bg-gray-100 text-gray-800';
                };

                const getStatusDisplay = (status: IdeaStatus) => {
                  return status.charAt(0) + status.slice(1).toLowerCase();
                };

                return (
                  <div key={idea.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{idea.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(idea.status)}`}>
                        {getStatusDisplay(idea.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-3">{idea.description}</p>
                    <div className="text-xs text-gray-500 mb-3">
                      Submitted: {new Date(idea.createdAt).toLocaleString()}
                    </div>
                    
                    {/* Approval Message with Project Deadline */}
                    {/* Only show if idea is approved/published AND no project has been submitted */}
                    {(idea.status === IdeaStatus.APPROVED || idea.status === IdeaStatus.PUBLISHED) &&
                     !ideasWithProjects.has(idea.id) && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-green-800 mb-1">Your idea is approved!</p>
                            {idea.projectDeadline ? (
                              <div className="text-sm text-green-700">
                                <p className="mb-1">Project Submission Deadline: <span className="font-medium">{new Date(idea.projectDeadline).toLocaleString()}</span></p>
                                {new Date() < new Date(idea.projectDeadline) ? (
                                  <Link
                                    to={`/ideas/${idea.id}/submit-project`}
                                    className="inline-block mt-2 px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                                  >
                                    Submit Project →
                                  </Link>
                                ) : (
                                  <p className="text-xs text-red-600 mt-1">⚠️ Deadline has passed</p>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-green-700">
                                <p className="mb-2">You can now submit your project implementation.</p>
                                <Link
                                  to={`/ideas/${idea.id}/submit-project`}
                                  className="inline-block px-4 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                                >
                                  Submit Project →
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {idea.rejectionReason && idea.status === IdeaStatus.REJECTED && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        <strong>Rejection Reason:</strong> {idea.rejectionReason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
};

export default SubmitIdeaForHackathon;

