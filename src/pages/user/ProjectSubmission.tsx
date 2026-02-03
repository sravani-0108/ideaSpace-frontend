import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ideaService } from '../../services/idea.service';
import { Idea, IdeaStatus, HackathonType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const ProjectSubmission = () => {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [formData, setFormData] = useState({
    githubUrl: '',
    demoVideoUrl: '',
    documentationUrl: '',
    projectDescription: '',
    implementationDetails: '',
    pitchVideoUrl: '',
    presentationUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (ideaId) {
      loadData();
    }
  }, [ideaId]);

  const loadData = async () => {
    if (!ideaId) return;
    try {
      setIsLoadingData(true);
      const ideaData = await ideaService.getIdeaById(ideaId);

      setIdea(ideaData);

      // Load existing project details from idea
      if (ideaData) {
        setFormData({
          githubUrl: ideaData.githubUrl || '',
          demoVideoUrl: ideaData.demoVideoUrl || '',
          documentationUrl: ideaData.documentationUrl || '',
          projectDescription: ideaData.projectDescription || '',
          implementationDetails: ideaData.implementationDetails || '',
          pitchVideoUrl: ideaData.pitchVideoUrl || '',
          presentationUrl: ideaData.presentationUrl || '',
        });
      }

      // Clear any previous error message - canSubmit() will determine if submission is allowed
      setMessage('');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to load data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // At least one submission field should be filled
    if (
      !formData.githubUrl &&
      !formData.demoVideoUrl &&
      !formData.documentationUrl &&
      !formData.projectDescription
    ) {
      newErrors.submission = 'Please provide at least one submission (GitHub URL, demo video, documentation, or description)';
    }

    // Validate URLs if provided
    if (formData.githubUrl && !isValidUrl(formData.githubUrl)) {
      newErrors.githubUrl = 'Please enter a valid URL';
    }
    if (formData.demoVideoUrl && !isValidUrl(formData.demoVideoUrl)) {
      newErrors.demoVideoUrl = 'Please enter a valid URL';
    }
    if (formData.documentationUrl && !isValidUrl(formData.documentationUrl)) {
      newErrors.documentationUrl = 'Please enter a valid URL';
    }
    if (formData.pitchVideoUrl && !isValidUrl(formData.pitchVideoUrl)) {
      newErrors.pitchVideoUrl = 'Please enter a valid URL';
    }
    if (formData.presentationUrl && !isValidUrl(formData.presentationUrl)) {
      newErrors.presentationUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const canSubmit = () => {
    if (!idea || !user) return false;
    
    // Check if user owns the idea
    const isOwner = idea.user?.id === user.id || idea.author?.id === user.id;
    
    const isHandsOnHackathon = idea.hackathonId && idea.hackathon?.hackathonType === HackathonType.HANDS_ON;
    
    // For Hands-On hackathons, allow submission only in ENHANCEMENTS or IMPLEMENTATION phases
    if (isHandsOnHackathon) {
      const canSubmitForHandsOn = idea.status === IdeaStatus.ENHANCEMENTS || idea.status === IdeaStatus.IMPLEMENTATION;
      if (!canSubmitForHandsOn) {
        return false;
      }
      
      // Check if statusDeadline has passed
      if (idea.statusDeadline) {
        const now = new Date();
        if (now > new Date(idea.statusDeadline)) {
          return false;
        }
      }
      
      return isOwner;
    }
    
    // For regular ideas, only allow if approved
    return idea.status === IdeaStatus.APPROVED && isOwner;
  };

  const isLate = () => {
    if (!idea?.projectDeadline) return false;
    return new Date() > new Date(idea.projectDeadline);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (!validateForm() || !canSubmit() || !ideaId) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedIdea = await ideaService.updateProjectDetails(ideaId, formData);
      setIdea(updatedIdea);
      setMessage(
        isLate()
          ? 'Project details updated successfully! Note: This is a late submission.'
          : 'Project details updated successfully!'
      );
      setTimeout(() => {
        navigate(`/ideas/${ideaId}`);
      }, 2000);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update project details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Idea not found</p>
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
            onClick={() => navigate(`/ideas/${ideaId}`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Idea
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Submit Project</h1>
          <p className="mt-2 text-gray-600">Submit your project implementation for: {idea.title}</p>
        </div>

        {idea.projectDeadline && (
          <div className={`mb-6 p-4 rounded-lg border ${
            isLate() ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <h3 className="font-semibold mb-2">
              {isLate() ? '⚠️ Late Submission' : 'Project Deadline'}
            </h3>
            <p className="text-sm">
              Deadline: {new Date(idea.projectDeadline).toLocaleString()}
              {isLate() && (
                <span className="ml-2 font-medium text-red-600">
                  (Deadline has passed)
                </span>
              )}
            </p>
          </div>
        )}

        {idea && (idea.githubUrl || idea.demoVideoUrl || idea.projectDescription || idea.judgeFeedback) && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Current Submission Status</h3>
            <p className="text-sm text-gray-700">
              Status: <span className="font-medium">{idea.status}</span>
            </p>
            {idea.judgeFeedback && (
              <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                <p className="text-sm font-medium">Judge Feedback:</p>
                <p className="text-sm text-gray-700">{idea.judgeFeedback}</p>
              </div>
            )}
          </div>
        )}

        {!submissionAllowed && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              {idea.status !== IdeaStatus.APPROVED && idea.status !== IdeaStatus.PUBLISHED
                ? 'This idea must be approved before you can submit a project.'
                : 'You can only submit projects for your own ideas.'}
            </p>
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

          {errors.submission && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{errors.submission}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Submission</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Repository URL
                  </label>
                  <input
                    type="url"
                    id="githubUrl"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://github.com/username/repo"
                    disabled={!submissionAllowed}
                  />
                  {errors.githubUrl && <p className="mt-1 text-sm text-red-600">{errors.githubUrl}</p>}
                </div>

                <div>
                  <label htmlFor="demoVideoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Demo Video URL
                  </label>
                  <input
                    type="url"
                    id="demoVideoUrl"
                    value={formData.demoVideoUrl}
                    onChange={(e) => setFormData({ ...formData, demoVideoUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://youtube.com/watch?v=..."
                    disabled={!submissionAllowed}
                  />
                  {errors.demoVideoUrl && <p className="mt-1 text-sm text-red-600">{errors.demoVideoUrl}</p>}
                </div>

                <div>
                  <label htmlFor="documentationUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Documentation URL
                  </label>
                  <input
                    type="url"
                    id="documentationUrl"
                    value={formData.documentationUrl}
                    onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://docs.example.com"
                    disabled={!submissionAllowed}
                  />
                  {errors.documentationUrl && <p className="mt-1 text-sm text-red-600">{errors.documentationUrl}</p>}
                </div>

                <div>
                  <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description
                  </label>
                  <textarea
                    id="projectDescription"
                    rows={4}
                    value={formData.projectDescription}
                    onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Describe your project implementation..."
                    disabled={!submissionAllowed}
                  />
                </div>

                <div>
                  <label htmlFor="implementationDetails" className="block text-sm font-medium text-gray-700 mb-2">
                    Implementation Details
                  </label>
                  <textarea
                    id="implementationDetails"
                    rows={4}
                    value={formData.implementationDetails}
                    onChange={(e) => setFormData({ ...formData, implementationDetails: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Technical details, architecture, technologies used..."
                    disabled={!submissionAllowed}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pitching Phase (Optional)</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="pitchVideoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Pitch Video URL
                  </label>
                  <input
                    type="url"
                    id="pitchVideoUrl"
                    value={formData.pitchVideoUrl}
                    onChange={(e) => setFormData({ ...formData, pitchVideoUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://youtube.com/watch?v=..."
                    disabled={!submissionAllowed}
                  />
                  {errors.pitchVideoUrl && <p className="mt-1 text-sm text-red-600">{errors.pitchVideoUrl}</p>}
                </div>

                <div>
                  <label htmlFor="presentationUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Presentation URL
                  </label>
                  <input
                    type="url"
                    id="presentationUrl"
                    value={formData.presentationUrl}
                    onChange={(e) => setFormData({ ...formData, presentationUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://docs.google.com/presentation/..."
                    disabled={!submissionAllowed}
                  />
                  {errors.presentationUrl && <p className="mt-1 text-sm text-red-600">{errors.presentationUrl}</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => navigate(`/ideas/${ideaId}`)}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !submissionAllowed}
                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : (idea?.githubUrl || idea?.demoVideoUrl || idea?.projectDescription) ? 'Update Project Details' : 'Submit Project Details'}
              </button>
            </div>
          </div>
        </form>
    </div>
  );
};

export default ProjectSubmission;

