import { useEffect, useState } from 'react';
import { Idea } from '../types';
import { useAuth } from '../contexts/AuthContext';
import FeedPost from '../components/FeedPost';
import { savedIdeaService } from '../services/savedIdea.service';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';

const SavedItems = () => {
  const { isAuthenticated } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadSavedIdeas();
    }
  }, [isAuthenticated]);

  const loadSavedIdeas = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await savedIdeaService.getSavedIdeas();
      setIdeas(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load saved ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdeaUpdate = (updatedIdea: Idea) => {
    setIdeas(prevIdeas => 
      prevIdeas.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea)
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Please log in to view saved items</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <LeftSidebar />

          {/* Main Content */}
          <div className="flex-1 max-w-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Saved Items</h1>
              <p className="mt-1 text-gray-600 text-sm">Ideas you've saved for later</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  onClick={loadSavedIdeas}
                  className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium underline"
                >
                  Try again
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            ) : ideas.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg
                  className="w-16 h-16 mx-auto text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved ideas yet</h3>
                <p className="text-gray-500 text-sm">Start saving ideas you find interesting!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ideas.map((idea) => (
                  <FeedPost key={idea.id} idea={idea} onUpdate={handleIdeaUpdate} />
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      </div>
    </div>
  );
};

export default SavedItems;
