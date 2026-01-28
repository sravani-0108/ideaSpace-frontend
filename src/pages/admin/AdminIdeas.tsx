import { useEffect, useState } from 'react';
import { ideaService } from '../../services/idea.service';
import { Idea } from '../../types';
import { getUserDisplayName } from '../../utils/user.util';
import AdminSidebar from '../../components/AdminSidebar';
import { Link } from 'react-router-dom';

const AdminIdeas = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await ideaService.getApprovedIdeas();
      setIdeas(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">All Ideas</h1>
            <p className="mt-2 text-gray-600">Browse all published ideas</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading ideas...</p>
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No ideas found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.map((idea) => (
                <Link
                  key={idea.id}
                  to={`/ideas/${idea.id}`}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{idea.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{idea.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{getUserDisplayName(idea.user || idea.author)}</span>
                    <span>{formatDate(idea.createdAt)}</span>
                  </div>
                  <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                    <span>❤️ {idea.likesCount}</span>
                    <span>💬 {idea.commentsCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminIdeas;

