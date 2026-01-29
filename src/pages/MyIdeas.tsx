import { useEffect, useState } from 'react';
import { ideaService } from '../services/idea.service';
import { Idea, IdeaStatus } from '../types';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import FeedPost from '../components/FeedPost';

const MyIdeas = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      setIsLoading(true);
      const data = await ideaService.getMyIdeas();
      setIdeas(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdeaUpdate = (updatedIdea: Idea) => {
    setIdeas(prevIdeas => 
      prevIdeas.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea)
    );
  };

  const getStatusBadge = (status: IdeaStatus) => {
    const styles = {
      [IdeaStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [IdeaStatus.APPROVED]: 'bg-blue-100 text-blue-800',
      [IdeaStatus.PUBLISHED]: 'bg-green-100 text-green-800',
      [IdeaStatus.REJECTED]: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your ideas...</p>
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
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">My Ideas</h1>
              <p className="mt-2 text-gray-600">Manage and track your submitted ideas</p>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {ideas.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-md">
                <div className="max-w-md mx-auto">
                  <svg
                    className="w-20 h-20 mx-auto text-gray-300 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <p className="text-gray-500 text-lg font-medium mb-2">No ideas posted yet</p>
                  <p className="text-gray-400 text-sm">You haven't posted any ideas yet.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {ideas.map((idea) => (
                  <div key={idea.id} className="relative">
                    <FeedPost idea={idea} onUpdate={handleIdeaUpdate} />
                    {/* Status Badge - positioned to the left of the date to avoid overlap */}
                    <div className="absolute top-4 right-20 z-10">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shadow-sm ${getStatusBadge(idea.status)}`}>
                        {idea.status}
                      </span>
                    </div>
                  </div>
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

export default MyIdeas;

