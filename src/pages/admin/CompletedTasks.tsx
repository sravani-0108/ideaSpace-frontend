import { useEffect, useState } from 'react';
import { ideaService } from '../../services/idea.service';
import { Idea, IdeaStatus } from '../../types';
import { getUserDisplayName } from '../../utils/user.util';
import AdminSidebar from '../../components/AdminSidebar';

const CompletedTasks = () => {
  const [completedIdeas, setCompletedIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCompletedIdeas();
  }, []);

  const loadCompletedIdeas = async () => {
    try {
      setIsLoading(true);
      setError('');
      // Fetch all ideas and filter for approved/rejected
      const allIdeas = await ideaService.getApprovedIdeas();
      // Note: We might need a separate endpoint for all ideas including rejected
      // For now, showing approved ideas as completed tasks
      setCompletedIdeas(allIdeas.filter(idea => 
        idea.status === IdeaStatus.APPROVED || idea.status === IdeaStatus.PUBLISHED
      ));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load completed tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Completed Tasks</h1>
            <p className="mt-2 text-gray-600">Ideas that have been reviewed and processed</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading completed tasks...</p>
            </div>
          ) : completedIdeas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No completed tasks yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {completedIdeas.map((idea) => (
                <div key={idea.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">{idea.title}</h2>
                      <p className="text-gray-600 mb-4 whitespace-pre-wrap line-clamp-3">{idea.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>By {getUserDisplayName(idea.user || idea.author)}</span>
                        <span>{formatDate(idea.createdAt)}</span>
                      </div>
                    </div>
                    <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                      idea.status === IdeaStatus.APPROVED || idea.status === IdeaStatus.PUBLISHED
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {idea.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompletedTasks;

