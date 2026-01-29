import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { ideaService } from '../../services/idea.service';
import { hackathonService } from '../../services/hackathon.service';
import { registrationService } from '../../services/registration.service';
import { Idea, Hackathon, HackathonStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import CreateIdeaForm from '../../components/CreateIdeaForm';
import FeedPost from '../../components/FeedPost';
import EmptyFeed from '../../components/EmptyFeed';

type MainTab = 'ideas' | 'hackathons';
type HackathonTab = 'active' | 'upcoming' | 'completed';

const IdeasFeed = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as MainTab | null;
  
  // Initialize activeTab from URL param
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    return tabParam === 'hackathons' ? 'hackathons' : 'ideas';
  });
  
  // Initialize hackathonTab from URL param
  const subtabParam = searchParams.get('subtab') as HackathonTab | null;
  const [hackathonTab, setHackathonTab] = useState<HackathonTab>(() => {
    if (subtabParam && ['active', 'upcoming', 'completed'].includes(subtabParam)) {
      return subtabParam;
    }
    return 'active';
  });
  
  // Ideas state
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true);
  const [ideasError, setIdeasError] = useState('');

  // Hackathons state
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoadingHackathons, setIsLoadingHackathons] = useState(true);
  const [hackathonsError, setHackathonsError] = useState('');
  const [registeringIds, setRegisteringIds] = useState<Set<string>>(new Set());
  const [registrationStatuses, setRegistrationStatuses] = useState<Record<string, boolean>>({});

  // Sync state with URL params (for external navigation and initial load)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const newTab = tabFromUrl === 'hackathons' ? 'hackathons' : 'ideas';
    // Always update if different to handle both initial load and navigation
    if (activeTab !== newTab) {
      setActiveTab(newTab);
    }
    
    // Sync hackathon subtab from URL
    const subtabFromUrl = searchParams.get('subtab') as HackathonTab | null;
    if (subtabFromUrl && ['active', 'upcoming', 'completed'].includes(subtabFromUrl)) {
      if (hackathonTab !== subtabFromUrl) {
        setHackathonTab(subtabFromUrl);
      }
    }
  }, [location.search, searchParams]); // Use location.search to detect URL changes

  // Update URL when tab changes (for user clicks) - but only if URL doesn't match
  useEffect(() => {
    const currentTabParam = searchParams.get('tab');
    const urlTab = currentTabParam === 'hackathons' ? 'hackathons' : 'ideas';
    
    // Only update URL if it doesn't match the current tab state
    if (activeTab === 'hackathons' && urlTab !== 'hackathons') {
      setSearchParams({ tab: 'hackathons' }, { replace: true });
    } else if (activeTab === 'ideas' && urlTab !== 'ideas') {
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    if (activeTab === 'ideas') {
      loadIdeas();
    } else if (activeTab === 'hackathons') {
      loadHackathons();
    }
  }, [activeTab]);

  useEffect(() => {
    // Check registration status for all hackathons
    if (user && hackathons.length > 0 && activeTab === 'hackathons') {
      checkRegistrationStatuses();
    }
  }, [hackathons, user, activeTab]);

  const loadIdeas = async () => {
    try {
      setIsLoadingIdeas(true);
      setIdeasError('');
      const data = await ideaService.getApprovedIdeas();
      setIdeas(data);
    } catch (err: any) {
      setIdeasError(err.response?.data?.message || err.message || 'Failed to load ideas');
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const loadHackathons = async () => {
    try {
      setIsLoadingHackathons(true);
      setHackathonsError('');
      const data = await hackathonService.getAllHackathons();
      setHackathons(data);
    } catch (err: any) {
      setHackathonsError(err.response?.data?.message || err.message || 'Failed to load hackathons');
    } finally {
      setIsLoadingHackathons(false);
    }
  };

  const checkRegistrationStatuses = async () => {
    const statuses: Record<string, boolean> = {};
    for (const hackathon of hackathons) {
      try {
        const isRegistered = await registrationService.checkRegistrationStatus(hackathon.id);
        statuses[hackathon.id] = isRegistered;
      } catch {
        statuses[hackathon.id] = false;
      }
    }
    setRegistrationStatuses(statuses);
  };

  const handleIdeaCreated = () => {
    loadIdeas();
  };

  const handleIdeaUpdate = (updatedIdea: Idea) => {
    setIdeas(prevIdeas => 
      prevIdeas.map(idea => idea.id === updatedIdea.id ? updatedIdea : idea)
    );
  };

  const handleRegister = async (hackathonId: string) => {
    if (!user) return;

    setRegisteringIds(prev => new Set(prev).add(hackathonId));
    try {
      await registrationService.registerForHackathon(hackathonId);
      // Update registration status immediately to disable button
      setRegistrationStatuses(prev => ({ ...prev, [hackathonId]: true }));
      console.log('✅ Successfully registered for hackathon:', hackathonId);
    } catch (err: any) {
      setHackathonsError(err.response?.data?.message || 'Failed to register for hackathon');
      console.error('❌ Failed to register:', err);
    } finally {
      setRegisteringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(hackathonId);
        return newSet;
      });
    }
  };


  const getStatusColor = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case HackathonStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case HackathonStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.PENDING:
        return 'Upcoming';
      case HackathonStatus.ACTIVE:
        return 'Active';
      case HackathonStatus.COMPLETED:
        return 'Completed';
      default:
        return status;
    }
  };

  const filteredHackathons = hackathons.filter(hackathon => {
    if (hackathonTab === 'active') return hackathon.status === HackathonStatus.ACTIVE;
    if (hackathonTab === 'upcoming') return hackathon.status === HackathonStatus.PENDING;
    if (hackathonTab === 'completed') return hackathon.status === HackathonStatus.COMPLETED;
    return true;
  });

  // Calculate counts for each status
  const activeCount = hackathons.filter(h => h.status === HackathonStatus.ACTIVE).length;
  const upcomingCount = hackathons.filter(h => h.status === HackathonStatus.PENDING).length;
  const completedCount = hackathons.filter(h => h.status === HackathonStatus.COMPLETED).length;

  const canRegister = (hackathon: Hackathon) => {
    if (!hackathon.registrationDeadline) return true;
    return new Date() < new Date(hackathon.registrationDeadline);
  };

  return (
    <div className="max-w-2xl">
      {/* Main Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'ideas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Ideas
          </button>
          <button
            onClick={() => setActiveTab('hackathons')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'hackathons'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Hackathons
          </button>
        </nav>
      </div>

      {/* Ideas Tab Content */}
      {activeTab === 'ideas' && (
        <>
          {/* Create Idea Form */}
          {isAuthenticated && (
            <div className="mb-6">
              <CreateIdeaForm onSuccess={handleIdeaCreated} />
            </div>
          )}

          {/* Error State */}
          {ideasError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{ideasError}</p>
              <button
                onClick={loadIdeas}
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoadingIdeas ? (
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
            <EmptyFeed />
          ) : (
            <div className="space-y-4">
              {ideas.map((idea) => (
                <FeedPost key={idea.id} idea={idea} onUpdate={handleIdeaUpdate} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Hackathons Tab Content */}
      {activeTab === 'hackathons' && (
        <>
          {/* Hackathon Sub-tabs */}
          <div className="mb-6">
            <nav className="flex space-x-4">
              <button
                onClick={() => {
                  setHackathonTab('active');
                  setSearchParams({ tab: 'hackathons', subtab: 'active' }, { replace: true });
                }}
                className={`px-4 py-2 font-medium text-sm transition-all rounded-full flex items-center space-x-2 ${
                  hackathonTab === 'active'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 hover:text-gray-700 bg-gray-100'
                }`}
              >
                <span>Active</span>
                <span className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full ${
                  hackathonTab === 'active'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {activeCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setHackathonTab('upcoming');
                  setSearchParams({ tab: 'hackathons', subtab: 'upcoming' }, { replace: true });
                }}
                className={`px-4 py-2 font-medium text-sm transition-all rounded-full flex items-center space-x-2 ${
                  hackathonTab === 'upcoming'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 hover:text-gray-700 bg-gray-100'
                }`}
              >
                <span>Upcoming</span>
                {/* <span className={`text-xs px-1.5 py-0.5 rounded-full ${ */}

                <span className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full ${                  hackathonTab === 'upcoming'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {upcomingCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setHackathonTab('completed');
                  setSearchParams({ tab: 'hackathons', subtab: 'completed' }, { replace: true });
                }}
                className={`px-4 py-2 font-medium text-sm transition-all rounded-full flex items-center space-x-2 ${
                  hackathonTab === 'completed'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 hover:text-gray-700 bg-gray-100'
                }`}
              >
                <span>Completed</span>
                <span className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full ${
                  hackathonTab === 'completed'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {completedCount}
                </span>
              </button>
            </nav>
          </div>

          {hackathonsError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{hackathonsError}</p>
            </div>
          )}

          {isLoadingHackathons ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading hackathons...</p>
            </div>
          ) : filteredHackathons.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No {hackathonTab} hackathons found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredHackathons.map((hackathon) => {
                const isRegistered = registrationStatuses[hackathon.id] || false;
                const isRegistering = registeringIds.has(hackathon.id);

                const formatDateRange = (startDate: string, endDate: string) => {
                  const start = new Date(startDate);
                  const end = new Date(endDate);
                  const startFormatted = start.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                  });
                  const endFormatted = end.toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return `${startFormatted} - ${endFormatted}`;
                };

                const formatDateShort = (dateString: string) => {
                  return new Date(dateString).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                };

                return (
                  <div key={hackathon.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Rocket Icon */}
                        <div className="flex-shrink-0 mt-1">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{hackathon.title}</h3>
                            <span className={`ml-4 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(hackathon.status)}`}>
                              {getStatusDisplayName(hackathon.status)}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-4 line-clamp-2">{hackathon.purpose}</p>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            {/* Date Range */}
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{formatDateRange(hackathon.startDate, hackathon.endDate)}</span>
                            </div>
                            
                            {/* Location */}
                            {hackathon.location && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{hackathon.location}</span>
                              </div>
                            )}
                            
                            {/* Registration Deadline */}
                            {hackathon.registrationDeadline && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Registration ends: {formatDateShort(hackathon.registrationDeadline)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <Link
                        to={`/hackathons/${hackathon.id}?subtab=${hackathonTab}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View Details →
                      </Link>
                      {user && hackathon.status !== HackathonStatus.COMPLETED && (
                        <div>
                          {isRegistered ? (
                            <button
                              disabled={true}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-not-allowed"
                            >
                              Registered
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRegister(hackathon.id)}
                              disabled={isRegistering || !canRegister(hackathon) || isRegistered}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                            >
                              {isRegistering ? 'Registering...' : 'Register'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IdeasFeed;

