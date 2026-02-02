import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hackathonService } from '../services/hackathon.service';
import { meetingService } from '../services/meeting.service';
import { registrationService } from '../services/registration.service';
import { Hackathon, Meeting, HackathonStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface RightSidebarProps {
  /** Optional specific hackathon to display in calendar (e.g., when viewing hackathon details) */
  specificHackathon?: Hackathon;
  /** Optional meetings for the specific hackathon */
  specificMeetings?: Meeting[];
}

const RightSidebar = ({ specificHackathon, specificMeetings }: RightSidebarProps = {}) => {
  const { user, isAdminOrJudge } = useAuth();
  const navigate = useNavigate();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [registeredHackathons, setRegisteredHackathons] = useState<Hackathon[]>([]);
  const [allHackathons, setAllHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventReminders, setEventReminders] = useState<Array<{
    type: 'registration' | 'start' | 'end';
    hackathon: Hackathon;
    date: Date;
    title: string;
  }>>([]);

  const loadSidebarData = async () => {
    try {
      setIsLoading(true);
      
      // If specific hackathon is provided, use it for calendar
      if (specificHackathon) {
        if (specificMeetings) {
          setUpcomingMeetings(specificMeetings);
        }
      }

      // Load all hackathons for calendar (for users, not admins/judges)
      if (user && !isAdminOrJudge) {
        try {
          // Load all hackathons for calendar display
          const allHackathonsData = await hackathonService.getAllHackathons();
          setAllHackathons(allHackathonsData);

          // Load registered hackathons for "My Hackathons" section
          const registrations = await registrationService.getUserRegistrations();
          const hackathonIds = registrations.map(r => r.hackathonId);
          
          if (hackathonIds.length > 0) {
            const userHackathons = allHackathonsData.filter(h => hackathonIds.includes(h.id));
            setRegisteredHackathons(userHackathons);
            
            // Generate event reminders for registered hackathons
            generateEventReminders(userHackathons);
          } else {
            setRegisteredHackathons([]);
            setEventReminders([]);
          }
        } catch (error) {
          // Silently fail - registrations are optional
          setRegisteredHackathons([]);
          setAllHackathons([]);
        }
      }

      // Load upcoming meetings (unless specific meetings are provided)
      if (user && !specificMeetings) {
        try {
          const meetings = await meetingService.getUserMeetings();
          // Filter to show only upcoming meetings (next 7 days)
          const now = new Date();
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const upcoming = meetings.filter(meeting => {
            const meetingDate = new Date(meeting.scheduledDate);
            return meetingDate >= now && meetingDate <= nextWeek;
          }).slice(0, 3); // Show max 3 upcoming meetings
          setUpcomingMeetings(upcoming);
        } catch (error) {
          // Silently fail - meetings are optional
        }
      }
    } catch (error) {
      // Silently fail - sidebar data is optional
    } finally {
      setIsLoading(false);
    }
  };

  // Load sidebar data when user or specific hackathon changes
  useEffect(() => {
    if (user) {
      loadSidebarData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, specificHackathon, specificMeetings]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatReminderDate = (date: Date) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const reminderDate = new Date(date);
    reminderDate.setHours(0, 0, 0, 0);
    
    if (reminderDate.getTime() === now.setHours(0, 0, 0, 0)) {
      return 'Today at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (reminderDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + 
             date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  };

  const generateEventReminders = (hackathons: Hackathon[]) => {
    const now = new Date();
    const reminders: Array<{
      type: 'registration' | 'start' | 'end';
      hackathon: Hackathon;
      date: Date;
      title: string;
    }> = [];

    hackathons.forEach((hackathon) => {
      // Registration deadline reminder (if within 48 hours)
      if (hackathon.registrationDeadline) {
        const regDeadline = new Date(hackathon.registrationDeadline);
        const hoursUntilDeadline = (regDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntilDeadline >= 0 && hoursUntilDeadline <= 48) {
          reminders.push({
            type: 'registration',
            hackathon,
            date: regDeadline,
            title: 'Registration Deadline',
          });
        }
      }

      // Hackathon start reminder (if within 48 hours)
      const startDate = new Date(hackathon.startDate);
      const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilStart >= 0 && hoursUntilStart <= 48) {
        reminders.push({
          type: 'start',
          hackathon,
          date: startDate,
          title: 'Hackathon Starts',
        });
      }

      // Hackathon end reminder (optional, if within 48 hours)
      const endDate = new Date(hackathon.endDate);
      const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilEnd >= 0 && hoursUntilEnd <= 48) {
        reminders.push({
          type: 'end',
          hackathon,
          date: endDate,
          title: 'Hackathon Ends',
        });
      }
    });

    // Sort reminders by date (earliest first)
    reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
    setEventReminders(reminders);
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


  // Calendar Widget Component
  const CalendarWidget = ({ hackathons, meetings }: { hackathons: Hackathon[]; meetings: Meeting[] }) => {
    const [displayDate, setDisplayDate] = useState(new Date());
    const [hoveredDate, setHoveredDate] = useState<{ day: number; month: number; year: number } | null>(null);
    const today = new Date();
    const currentMonth = displayDate.getMonth();
    const currentYear = displayDate.getFullYear();
    const todayDate = today.getDate();
    const isCurrentMonth = displayDate.getMonth() === today.getMonth() && displayDate.getFullYear() === today.getFullYear();

    const goToPreviousMonth = () => {
      setDisplayDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const goToNextMonth = () => {
      setDisplayDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Format date for display
    const formatDateFull = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Build events for current month - show ALL hackathons (excluding completed)
    const monthEvents = useMemo(() => {
      const events: Array<{ 
        date: number; 
        type: 'registration' | 'hackathon-start' | 'hackathon-end' | 'meeting'; 
        title: string;
        hackathon?: Hackathon;
        meeting?: Meeting;
      }> = [];

      // Filter out completed hackathons - only show active and upcoming
      const activeHackathons = hackathons.filter(
        (hackathon) => hackathon.status !== HackathonStatus.COMPLETED
      );

      // Add events for active/upcoming hackathons (no text titles, just visual indicators)
      activeHackathons.forEach((hackathon) => {
        // Hackathon start - highlight this (no text title)
        const startDate = new Date(hackathon.startDate);
        if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
          events.push({
            date: startDate.getDate(),
            type: 'hackathon-start',
            title: '', // No text message
            hackathon,
          });
        }

        // Hackathon end (no text title)
        const endDate = new Date(hackathon.endDate);
        if (endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear) {
          events.push({
            date: endDate.getDate(),
            type: 'hackathon-end',
            title: '', // No text message
            hackathon,
          });
        }
      });

      // Add meetings
      meetings.forEach((meeting) => {
        const meetingDate = new Date(meeting.scheduledDate);
        if (meetingDate.getMonth() === currentMonth && meetingDate.getFullYear() === currentYear) {
          events.push({
            date: meetingDate.getDate(),
            type: 'meeting',
            title: meeting.title,
            meeting,
          });
        }
      });

      return events;
    }, [hackathons, meetings, currentMonth, currentYear]);

    // Get hackathons for a specific date
    const getHackathonsForDate = (day: number): Hackathon[] => {
      return monthEvents
        .filter(e => e.date === day && e.type === 'hackathon-start' && e.hackathon)
        .map(e => e.hackathon!)
        .filter((h): h is Hackathon => h !== undefined);
    };

    // Get first day of month and days in month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Build calendar grid
    const calendarDays: Array<{ day: number; isCurrentMonth: boolean; hasEvent: boolean; eventType?: string; hackathons?: Hackathon[] }> = [];

    // Previous month days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      calendarDays.push({ day: prevMonthDays - i, isCurrentMonth: false, hasEvent: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = monthEvents.filter(e => e.date === day);
      const hasHackathonStart = dayEvents.some(e => e.type === 'hackathon-start');
      const hackathonsForDay = hasHackathonStart ? getHackathonsForDate(day) : [];
      
      calendarDays.push({
        day,
        isCurrentMonth: true,
        hasEvent: dayEvents.length > 0,
        eventType: dayEvents.find(e => e.type === 'hackathon-start')?.type || dayEvents[0]?.type,
        hackathons: hackathonsForDay,
      });
    }

    // Next month days to fill grid (42 total cells)
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({ day, isCurrentMonth: false, hasEvent: false });
    }

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const monthName = displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Calendar</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Next month"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Month Display */}
        <div className="text-center mb-4">
          <div className="text-lg font-bold text-gray-900">{monthName}</div>
        </div>

        {/* Mini Calendar Grid */}
        <div className="mb-3">
          {/* Day names */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {dayNames.map((day, idx) => (
              <div key={idx} className="text-center text-[10px] font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((calDay, idx) => {
              const isToday = calDay.isCurrentMonth && isCurrentMonth && calDay.day === todayDate;
              const hasHackathonStart = calDay.eventType === 'hackathon-start';
              const hasHackathonEnd = calDay.eventType === 'hackathon-end';
              const hasRegistration = calDay.eventType === 'registration';
              const hackathonsForDay = calDay.hackathons || [];
              const isHovered = hoveredDate?.day === calDay.day && hoveredDate?.month === currentMonth && hoveredDate?.year === currentYear;
              
              const getEventColor = () => {
                if (calDay.eventType === 'meeting') return 'bg-green-500';
                return '';
              };

              // Build tooltip content for hackathon start dates
              const tooltipContent = hasHackathonStart && hackathonsForDay.length > 0
                ? hackathonsForDay.map(h => 
                    `${h.title}\nStart: ${formatDateFull(h.startDate)}\nEnd: ${formatDateFull(h.endDate)}`
                  ).join('\n\n')
                : '';

              return (
                <div
                  key={idx}
                  className={`aspect-square text-[10px] flex items-center justify-center rounded relative ${
                    !calDay.isCurrentMonth
                      ? 'text-gray-300'
                      : isToday
                      ? 'bg-blue-100 text-blue-700 font-semibold'
                      : hasHackathonStart
                      ? 'bg-blue-600 text-white font-medium cursor-pointer hover:bg-blue-700'
                      : hasHackathonEnd || hasRegistration
                      ? 'text-gray-700 hover:bg-gray-50'
                      : calDay.hasEvent && !hasHackathonEnd && !hasRegistration
                      ? `${getEventColor()} text-white font-medium`
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={calDay.hasEvent && !hasHackathonStart ? monthEvents.find(e => e.date === calDay.day)?.title : ''}
                  onMouseEnter={() => {
                    if (hasHackathonStart && calDay.isCurrentMonth) {
                      setHoveredDate({ day: calDay.day, month: currentMonth, year: currentYear });
                    }
                  }}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  {calDay.day}
                  
                  {/* Tooltip for hackathon start dates */}
                  {isHovered && tooltipContent && (
                    <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-pre-line">
                      {tooltipContent}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event list removed - no text messages as requested */}
      </div>
    );
  };

  return (
    <div className="w-80 flex-shrink-0">
      <div className="space-y-4 sticky top-20">
        {/* Event Reminders Section */}
        {user && !isAdminOrJudge && eventReminders.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-bold text-gray-900 mb-4">Upcoming Reminders</h3>
            <div className="space-y-3">
              {eventReminders.map((reminder, index) => {
                const getReminderStyles = () => {
                  if (reminder.type === 'registration') {
                    return {
                      iconBg: 'bg-orange-100',
                      iconColor: 'text-orange-600',
                      textColor: 'text-orange-600',
                    };
                  } else if (reminder.type === 'start') {
                    return {
                      iconBg: 'bg-green-100',
                      iconColor: 'text-green-600',
                      textColor: 'text-green-600',
                    };
                  } else {
                    // end
                    return {
                      iconBg: 'bg-blue-100',
                      iconColor: 'text-blue-600',
                      textColor: 'text-blue-600',
                    };
                  }
                };

                const getReminderIcon = () => {
                  if (reminder.type === 'registration') {
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  } else if (reminder.type === 'start') {
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    );
                  } else {
                    return (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  }
                };

                const styles = getReminderStyles();

                return (
                  <Link
                    key={`${reminder.hackathon.id}-${reminder.type}-${index}`}
                    to={`/hackathons/${reminder.hackathon.id}`}
                    className="block bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* Icon and Reminder Type on Same Line */}
                    <div className="flex items-center gap-3 mb-2">
                      {/* Circular Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${styles.iconBg} flex items-center justify-center ${styles.iconColor}`}>
                        {getReminderIcon()}
                      </div>
                      {/* Reminder Type */}
                      <p className={`text-sm font-bold ${styles.textColor}`}>
                        {reminder.title}
                      </p>
                    </div>
                    
                    {/* Event Title */}
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {reminder.hackathon.title}
                    </p>
                    
                    {/* Date/Time */}
                    <p className="text-xs text-gray-500">
                      {formatReminderDate(reminder.date)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Registered Hackathons Section */}
        {user && !isAdminOrJudge && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">My Hackathons</h3>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : registeredHackathons.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-2">You have not participated in any hackathons yet.</p>
                <p className="text-xs text-gray-500 mb-3">Please register for upcoming hackathons to get started.</p>
                <button
                  onClick={() => {
                    navigate('/dashboard?tab=hackathons&subtab=upcoming');
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium inline-flex items-center"
                >
                  Register for Hackathons
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {registeredHackathons.slice(0, 3).map((hackathon) => (
                  <Link
                    key={hackathon.id}
                    to={`/hackathons/${hackathon.id}`}
                    className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">{hackathon.title}</h4>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(hackathon.status)}`}>
                        {getStatusDisplayName(hackathon.status)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Event Date:</span>{' '}
                      {formatDate(hackathon.startDate)}
                    </div>
                  </Link>
                ))}
                {registeredHackathons.length > 3 && (
                  <Link
                    to="/dashboard"
                    className="block text-center text-blue-600 hover:text-blue-700 text-sm font-medium pt-2"
                  >
                    View All ({registeredHackathons.length}) →
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Meetings */}
        {upcomingMeetings.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Upcoming Meetings</h3>
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="border-l-2 border-blue-500 pl-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{meeting.title}</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium text-gray-700">Date:</span>
                      <span className="ml-1">{formatDate(meeting.scheduledDate)}</span>
                    </div>
                    {meeting.meetingLink && (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-xs inline-flex items-center"
                      >
                        Join Teams →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar Preview with Events */}
        {!isLoading && (
          <CalendarWidget 
            hackathons={specificHackathon ? [specificHackathon] : allHackathons} 
            meetings={specificMeetings || upcomingMeetings} 
          />
        )}
      </div>
    </div>
  );
};

export default RightSidebar;

