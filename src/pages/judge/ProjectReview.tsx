import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../../services/project.service';
import { Project, ProjectStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const ProjectReview = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.UNDER_REVIEW);
  const [judgeFeedback, setJudgeFeedback] = useState('');

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      const foundProject = await projectService.getProjectById(projectId);
      if (foundProject) {
        setProject(foundProject);
        setStatus(foundProject.status);
        setJudgeFeedback(foundProject.judgeFeedback || '');
      } else {
        setError('Project not found');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectId) return;
    
    setIsSubmitting(true);
    setMessage('');
    try {
      await projectService.reviewProject(projectId, {
        status,
        judgeFeedback: judgeFeedback.trim() || undefined,
      });
      setMessage('Project reviewed successfully!');
      setTimeout(() => {
        // Navigate back to dashboard - admin/judge can go to their respective dashboards
        if (user?.role === 'ADMIN') {
          navigate('/admin/dashboard?tab=projects');
        } else {
          navigate('/judge/dashboard');
        }
      }, 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to review project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project || error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">{error || 'Project not found'}</p>
          <button
            onClick={() => navigate('/judge/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const author = project.user;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/judge/dashboard')}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Review Project</h1>
        </div>

        {message && (
          <div className={`mb-4 rounded-md p-3 text-sm ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {project.idea && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.idea.title}</h2>
              <p className="text-gray-600 mb-4">{project.idea.description}</p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">Submitted by</p>
            <p className="font-medium text-gray-900">
              {author?.firstName && author?.lastName 
                ? `${author.firstName} ${author.lastName}`
                : author?.email || 'Unknown'}
            </p>
          </div>

          <div className="mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              project.status === ProjectStatus.SUBMITTED ? 'bg-blue-100 text-blue-800' :
              project.status === ProjectStatus.LATE ? 'bg-orange-100 text-orange-800' :
              project.status === ProjectStatus.COMPLETED ? 'bg-green-100 text-green-800' :
              project.status === ProjectStatus.NEEDS_CHANGES ? 'bg-yellow-100 text-yellow-800' :
              project.status === ProjectStatus.DISQUALIFIED ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              Current Status: {project.status}
            </span>
            {project.submittedAt && (
              <p className="text-sm text-gray-500 mt-2">
                Submitted: {new Date(project.submittedAt).toLocaleString()}
              </p>
            )}
            {project.idea?.projectDeadline && (
              <p className="text-sm text-gray-500 mt-1">
                Deadline: {new Date(project.idea.projectDeadline).toLocaleString()}
              </p>
            )}
          </div>

          {/* Project Submission Details */}
          <div className="mb-6 space-y-4">
            {project.githubUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">GitHub Repository</h3>
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {project.githubUrl}
                </a>
              </div>
            )}

            {project.demoVideoUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Demo Video</h3>
                <a
                  href={project.demoVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {project.demoVideoUrl}
                </a>
              </div>
            )}

            {project.documentationUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Documentation</h3>
                <a
                  href={project.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {project.documentationUrl}
                </a>
              </div>
            )}

            {project.zipFilePath && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">ZIP File</h3>
                <a
                  href={project.zipFilePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {project.zipFilePath}
                </a>
              </div>
            )}

            {project.projectDescription && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Project Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{project.projectDescription}</p>
              </div>
            )}

            {project.implementationDetails && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Implementation Details</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{project.implementationDetails}</p>
              </div>
            )}

            {project.pitchVideoUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Pitch Video</h3>
                <a
                  href={project.pitchVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {project.pitchVideoUrl}
                </a>
              </div>
            )}

            {project.presentationUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Presentation</h3>
                <a
                  href={project.presentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 break-all"
                >
                  {project.presentationUrl}
                </a>
              </div>
            )}
          </div>

          {/* Review Form */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Feedback</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ProjectStatus.UNDER_REVIEW}>Under Review</option>
                  <option value={ProjectStatus.COMPLETED}>Completed (Win)</option>
                  <option value={ProjectStatus.NEEDS_CHANGES}>Needs Changes</option>
                  <option value={ProjectStatus.DISQUALIFIED}>Disqualified (Reject)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback (Optional)
                </label>
                <textarea
                  rows={6}
                  value={judgeFeedback}
                  onChange={(e) => setJudgeFeedback(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Provide feedback to the participant..."
                />
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <button
                  onClick={() => navigate('/judge/dashboard')}
                  className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default ProjectReview;

