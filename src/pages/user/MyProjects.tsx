import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../../services/project.service';
import { Project, ProjectStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import LeftSidebar from '../../components/LeftSidebar';

const MyProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const allProjects = await projectService.getAllProjects();
      // Filter projects for current user
      const userProjects = allProjects.filter(p => p.userId === user?.id);
      setProjects(userProjects);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            <LeftSidebar />
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">My Solutions</h1>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading solutions...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <p className="text-gray-500 text-lg">No solutions submitted yet</p>
                  <p className="text-gray-400 mt-2">Submit solutions for your approved ideas</p>
                </div>
              ) : (
                <div className="space-y-4">
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

