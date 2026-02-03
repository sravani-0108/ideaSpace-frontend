import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { ideaService } from '../../services/idea.service';
import { hackathonService } from '../../services/hackathon.service';
import { registrationService } from '../../services/registration.service';
import { Idea, Hackathon, HackathonStatus, HackathonType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import CreateIdeaForm from '../../components/CreateIdeaForm';
import FeedPost from '../../components/FeedPost';
import EmptyFeed from '../../components/EmptyFeed';

type MainTab = 'ideas' | 'hackathons';
type HackathonTab = 'active' | 'upcoming' | 'completed';
type HackathonTypeFilter = 'learning' | 'handsOn';

const IdeasFeed = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as MainTab | null;
  const typeFilterParam = searchParams.get('type') as HackathonTypeFilter | null;
  
  // Initialize activeTab from URL param
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    if (tabParam === 'hackathons') return 'hackathons';
    return 'ideas';
  });
  
  // Initialize hackathon type filter from URL param
  const [hackathonTypeFilter, setHackathonTypeFilter] = useState<HackathonTypeFilter | null>(() => {
    if (typeFilterParam && ['learning', 'handsOn'].includes(typeFilterParam)) {
      return typeFilterParam as HackathonTypeFilter;
    }
    return null; // null means show all
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
    let newTab: MainTab = 'ideas';
    if (tabFromUrl === 'hackathons') newTab = 'hackathons';
    
    if (activeTab !== newTab) {
      setActiveTab(newTab);
    }
    
    // Sync hackathon type filter from URL
    const typeFromUrl = searchParams.get('type') as HackathonTypeFilter | null;
    if (typeFromUrl && ['learning', 'handsOn'].includes(typeFromUrl)) {
      if (hackathonTypeFilter !== typeFromUrl) {
        setHackathonTypeFilter(typeFromUrl);
      }
    } else if (!typeFromUrl && hackathonTypeFilter !== null) {
      setHackathonTypeFilter(null);
    }
    
    // Sync hackathon subtab from URL
    const subtabFromUrl = searchParams.get('subtab') as HackathonTab | null;
    if (subtabFromUrl && ['active', 'upcoming', 'completed'].includes(subtabFromUrl)) {
      if (hackathonTab !== subtabFromUrl) {
        setHackathonTab(subtabFromUrl);
      }
    }
  }, [location.search, searchParams]); // Use location.search to detect URL changes

  // Update URL when tab or filter changes (for user clicks)
  useEffect(() => {
    const currentTabParam = searchParams.get('tab');
    
    if (activeTab === 'hackathons') {
      const params: Record<string, string> = { tab: 'hackathons' };
      if (hackathonTypeFilter !== null) {
        params.type = hackathonTypeFilter;
      }
      if (hackathonTab !== 'active') {
        params.subtab = hackathonTab;
      }
      setSearchParams(params, { replace: true });
    } else if (activeTab === 'ideas' && currentTabParam !== null) {
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, hackathonTypeFilter, hackathonTab, setSearchParams, searchParams]);

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

    // Check if user is assigned as a judge before attempting registration
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon && isAssignedJudge(hackathon)) {
      setHackathonsError('You are assigned as a judge for this hackathon and cannot register as a participant.');
      setTimeout(() => setHackathonsError(''), 5000);
      return;
    }

    setRegisteringIds(prev => new Set(prev).add(hackathonId));
    setHackathonsError(''); // Clear any previous errors
    try {
      await registrationService.registerForHackathon(hackathonId);
      // Update registration status immediately to disable button
      setRegistrationStatuses(prev => ({ ...prev, [hackathonId]: true }));
      setHackathonsError(''); // Clear error on success
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to register for hackathon';
      setHackathonsError(errorMessage);
      // Clear error after 5 seconds
      setTimeout(() => setHackathonsError(''), 5000);
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

  // Filter hackathons by type and status
  const filteredHackathons = hackathons.filter(hackathon => {
    // Filter by hackathon type based on filter
    if (hackathonTypeFilter === 'learning' && hackathon.hackathonType !== HackathonType.LEARNING) {
      return false;
    }
    if (hackathonTypeFilter === 'handsOn' && hackathon.hackathonType !== HackathonType.HANDS_ON) {
      return false;
    }
    // If filter is null, don't filter by type (show all)
    
    // For Hands-On hackathons, show OPEN and CLOSED status (hide DRAFT)
    if (hackathon.hackathonType === HackathonType.HANDS_ON) {
      return hackathon.status === HackathonStatus.OPEN || hackathon.status === HackathonStatus.CLOSED;
    }
    
    // Filter by status tab (only for Learning hackathons)
    if (hackathonTab === 'active') return hackathon.status === HackathonStatus.ACTIVE;
    if (hackathonTab === 'upcoming') return hackathon.status === HackathonStatus.PENDING;
    if (hackathonTab === 'completed') return hackathon.status === HackathonStatus.COMPLETED;
    return true;
  });

  // Calculate counts for each status based on hackathon type filter
  const getFilteredHackathonsForCounts = () => {
    if (hackathonTypeFilter === 'learning') {
      return hackathons.filter(h => h.hackathonType === HackathonType.LEARNING);
    }
    if (hackathonTypeFilter === 'handsOn') {
      return hackathons.filter(h => h.hackathonType === HackathonType.HANDS_ON);
    }
    return hackathons; // null means all
  };
  
  const currentHackathons = getFilteredHackathonsForCounts();
  const activeCount = currentHackathons.filter(h => h.status === HackathonStatus.ACTIVE).length;
  const upcomingCount = currentHackathons.filter(h => h.status === HackathonStatus.PENDING).length;
  const completedCount = currentHackathons.filter(h => h.status === HackathonStatus.COMPLETED).length;

  const canRegister = (hackathon: Hackathon) => {
    const now = new Date();
    
    // For Hands-On hackathons, check status and registration deadline
    if (hackathon.hackathonType === HackathonType.HANDS_ON) {
      // Must be OPEN status
      if (hackathon.status !== HackathonStatus.OPEN) {
        return false;
      }
      // Check registration deadline
      if (hackathon.registrationDeadline && now > new Date(hackathon.registrationDeadline)) {
        return false; // Registration deadline has passed
      }
      return true;
    }
    
    // For Learning hackathons, check registration deadline
    if (hackathon.registrationDeadline) {
      return now < new Date(hackathon.registrationDeadline);
    }
    
                return true;
  };

  // Check if user is assigned as a judge for a hackathon
  const isAssignedJudge = (hackathon: Hackathon): boolean => {
    if (!user || !hackathon.judgeIds) return false;
    
    // Handle judgeIds - it might be a string (from simple-array) or an array
    let judgeIdsArray: string[] = [];
    const judgeIdsValue = hackathon.judgeIds;
    if (Array.isArray(judgeIdsValue)) {
      judgeIdsArray = judgeIdsValue;
    } else {
      // Handle case where it might be a string (from simple-array serialization)
      const judgeIdsStr = String(judgeIdsValue);
      if (judgeIdsStr.length > 0) {
        judgeIdsArray = judgeIdsStr.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);
      }
    }
    
    return judgeIdsArray.length > 0 && judgeIdsArray.includes(user.id);
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
                ? 'border-green-500 text-green-600'
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
          {/* Hackathon Type Filter Dropdown */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">Filter by type:</span>
            <div className="relative">
              <select
                value={hackathonTypeFilter || ''}
                onChange={(e) => setHackathonTypeFilter(e.target.value ? e.target.value as HackathonTypeFilter : null)}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none pr-8"
              >
                <option value="">All Hackathons</option>
                <option value="learning">Learning</option>
                <option value="handsOn">Hands-On</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Hackathon Sub-tabs - Only show for Learning hackathons */}
          {hackathonTypeFilter !== 'handsOn' && (
            <div className="mb-6">
              <nav className="flex space-x-4">
                <button
                  onClick={() => {
                    setHackathonTab('active');
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
                  }}
                  className={`px-4 py-2 font-medium text-sm transition-all rounded-full flex items-center space-x-2 ${
                    hackathonTab === 'upcoming'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:text-gray-700 bg-gray-100'
                  }`}
                >
                  <span>Upcoming</span>
                  <span className={`w-5 h-5 flex items-center justify-center text-[10px] rounded-full ${
                    hackathonTab === 'upcoming'
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {upcomingCount}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setHackathonTab('completed');
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
          )}

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
              <p className="text-gray-500 text-lg">
                {hackathonTypeFilter === 'handsOn' 
                  ? 'No Hands-On hackathons found' 
                  : `No ${hackathonTab} ${hackathonTypeFilter ? (hackathonTypeFilter === 'learning' ? 'Learning' : '') : ''} hackathons found`}
              </p>
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

                // Determine icon color based on hackathon type
                const iconColor = hackathon.hackathonType === HackathonType.HANDS_ON ? 'text-orange-600' : 'text-blue-600';
                const linkColor = hackathon.hackathonType === HackathonType.HANDS_ON ? 'text-orange-600 hover:text-orange-700' : 'text-blue-600 hover:text-blue-700';
                const buttonColor = hackathon.hackathonType === HackathonType.HANDS_ON ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700';

                return (
                  <div key={hackathon.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Rocket Icon */}
                        <div className="flex-shrink-0 mt-1">
                          <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            
                            {/* Registration Deadline (for Learning Hackathons) */}
                            {hackathon.hackathonType === HackathonType.LEARNING && hackathon.registrationDeadline && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Registration ends: {formatDateShort(hackathon.registrationDeadline)}</span>
                              </div>
                            )}
                            
                            {/* Registration Deadline (for Hands-On Hackathons) */}
                            {hackathon.hackathonType === HackathonType.HANDS_ON && hackathon.registrationDeadline && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <span>Submission deadline: {formatDateShort(hackathon.registrationDeadline)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <Link
                        to={`/hackathons/${hackathon.id}?subtab=${hackathonTab}${hackathonTypeFilter ? `&type=${hackathonTypeFilter}` : ''}`}
                        className={`${linkColor} font-medium text-sm`}
                      >
                        View Details →
                      </Link>
                      {user && hackathon.status !== HackathonStatus.COMPLETED && (
                        <div className="flex items-center gap-2">
                          {/* Check if user is assigned as a judge */}
                          {isAssignedJudge(hackathon) ? (
                            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium">
                              Assigned as Judge
                            </div>
                          ) : (
                            <>
                              {hackathon.hackathonType === HackathonType.HANDS_ON && isRegistered && (
                                <Link
                                  to={`/hackathons/${hackathon.id}/submit-idea`}
                                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                  Submit
                                </Link>
                              )}
                              {!isRegistered && (
                                <button
                                  onClick={() => handleRegister(hackathon.id)}
                                  disabled={isRegistering || !canRegister(hackathon) || isRegistered}
                                  className={`px-4 py-2 ${buttonColor} text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium`}
                                >
                                  {isRegistering ? 'Registering...' : 'Register'}
                                </button>
                              )}
                              {isRegistered && hackathon.hackathonType !== HackathonType.HANDS_ON && (
                                <button
                                  disabled={true}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-not-allowed"
                                >
                                  Registered
                                </button>
                              )}
                            </>
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

