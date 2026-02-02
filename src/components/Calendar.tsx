import { useState, useMemo, useEffect } from 'react';
import { Meeting, Hackathon, HackathonStatus } from '../types';
import { registrationService } from '../services/registration.service';
import { hackathonService } from '../services/hackathon.service';
import { useAuth } from '../contexts/AuthContext';

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'registration' | 'hackathon-start' | 'hackathon-end' | 'meeting';
  title: string;
  hackathon?: Hackathon;
  meeting?: Meeting;
}

interface CalendarProps {
  hackathons: Hackathon[];
  meetings: Meeting[];
  /** If true, shows all hackathons and allows registration. If false, only shows registered hackathons. */
  showAllHackathons?: boolean;
  /** Callback when hackathon is registered */
  onHackathonRegistered?: () => void;
}

const Calendar = ({ hackathons, meetings, showAllHackathons = false, onHackathonRegistered }: CalendarProps) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [registeringIds, setRegisteringIds] = useState<Set<string>>(new Set());
  const [registrationStatuses, setRegistrationStatuses] = useState<Record<string, boolean>>({});

  // Load all hackathons if showAllHackathons is true
  const [allHackathons, setAllHackathons] = useState<Hackathon[]>(hackathons);

  // Load all hackathons if showAllHackathons is true
  useEffect(() => {
    if (showAllHackathons) {
      const loadAllHackathons = async () => {
        try {
          const all = await hackathonService.getAllHackathons();
          setAllHackathons(all);
        } catch (error) {
          // Failed to load all hackathons
        }
      };
      loadAllHackathons();
    }
  }, [showAllHackathons]);

  // Check registration statuses
  useEffect(() => {
    if (showAllHackathons && user && allHackathons.length > 0) {
      const checkStatuses = async () => {
        const statuses: Record<string, boolean> = {};
        for (const hackathon of allHackathons) {
          try {
            const isRegistered = await registrationService.checkRegistrationStatus(hackathon.id);
            statuses[hackathon.id] = isRegistered;
          } catch {
            statuses[hackathon.id] = false;
          }
        }
        setRegistrationStatuses(statuses);
      };
      checkStatuses();
    }
  }, [showAllHackathons, user, allHackathons]);

  // Build calendar events - include all hackathons if showAllHackathons is true
  const events = useMemo<CalendarEvent[]>(() => {
    const eventList: CalendarEvent[] = [];
    const hackathonsToShow = showAllHackathons ? allHackathons : hackathons;

    // Filter out completed hackathons - only show active and upcoming
    const activeHackathons = hackathonsToShow.filter(
      (hackathon) => hackathon.status !== HackathonStatus.COMPLETED
    );

    activeHackathons.forEach((hackathon) => {
      // Hackathon start - highlight this (no text title, just visual indicator)
      eventList.push({
        id: `start-${hackathon.id}`,
        date: new Date(hackathon.startDate),
        type: 'hackathon-start',
        title: '', // No text message
        hackathon,
      });

      // Hackathon end
      eventList.push({
        id: `end-${hackathon.id}`,
        date: new Date(hackathon.endDate),
        type: 'hackathon-end',
        title: 'Hackathon Ends',
        hackathon,
      });
    });

    // Add meetings
    meetings.forEach((meeting) => {
      eventList.push({
        id: `meeting-${meeting.id}`,
        date: new Date(meeting.scheduledDate),
        type: 'meeting',
        title: meeting.title,
        meeting,
      });
    });

    return eventList;
  }, [hackathons, allHackathons, meetings, showAllHackathons]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toDateString();
    return events.filter((event) => {
      const eventDateStr = new Date(event.date).toDateString();
      return dateStr === eventDateStr;
    });
  };

  // Get hackathon start events for a date
  const getHackathonStartForDate = (date: Date): CalendarEvent | null => {
    const dateStr = date.toDateString();
    return events.find((event) => {
      const eventDateStr = new Date(event.date).toDateString();
      return dateStr === eventDateStr && event.type === 'hackathon-start';
    }) || null;
  };

  // Handle date click - register for hackathon if it's a start date
  const handleDateClick = async (date: Date) => {
    if (!showAllHackathons || !user) return;

    const startEvent = getHackathonStartForDate(date);
    if (!startEvent || !startEvent.hackathon) return;

    const hackathon = startEvent.hackathon;
    const isRegistered = registrationStatuses[hackathon.id] || false;

    if (isRegistered) return; // Already registered

    // Check if registration deadline has passed
    if (hackathon.registrationDeadline && new Date(hackathon.registrationDeadline) < new Date()) {
      return; // Registration deadline passed
    }

    // Check if hackathon is completed
    if (hackathon.status === HackathonStatus.COMPLETED) {
      return; // Hackathon already completed
    }

    setRegisteringIds(prev => new Set(prev).add(hackathon.id));
    try {
      await registrationService.registerForHackathon(hackathon.id);
      setRegistrationStatuses(prev => ({ ...prev, [hackathon.id]: true }));
      if (onHackathonRegistered) {
        onHackathonRegistered();
      }
    } catch (error) {
      // Failed to register for hackathon
    } finally {
      setRegisteringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(hackathon.id);
        return newSet;
      });
    }
  };


  // Navigate months - show only one month at a time
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Show only current month
  const monthToShow = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }, [currentDate]);

  // Render a single month
  const renderMonth = (monthDate: Date) => {
    const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    // Build calendar days
    const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
        isCurrentMonth: true,
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        date: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, day),
        isCurrentMonth: false,
      });
    }

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();

    return (
      <div key={monthDate.getTime()} className="flex-1">
        {/* Day names */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {dayNames.map((day, index) => (
            <div key={index} className="text-center text-[10px] font-medium text-gray-500 py-0.5">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day.date);
            const isToday = day.date.toDateString() === today.toDateString();
            const hackathonStartEvent = getHackathonStartForDate(day.date);
            const isRegistered = hackathonStartEvent?.hackathon 
              ? (registrationStatuses[hackathonStartEvent.hackathon.id] || false)
              : false;
            const isRegistering = hackathonStartEvent?.hackathon
              ? registeringIds.has(hackathonStartEvent.hackathon.id)
              : false;
            const canRegister = hackathonStartEvent?.hackathon && showAllHackathons && user && !isRegistered
              && (!hackathonStartEvent.hackathon.registrationDeadline || new Date(hackathonStartEvent.hackathon.registrationDeadline) >= new Date())
              && hackathonStartEvent.hackathon.status !== HackathonStatus.COMPLETED;

            return (
              <div
                key={index}
                className={`min-h-[40px] p-0.5 border border-gray-200 rounded relative ${
                  !day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isToday ? 'ring-1 ring-blue-500' : ''} ${
                  hackathonStartEvent ? 'cursor-pointer hover:bg-blue-50' : ''
                } ${canRegister ? 'hover:ring-1 hover:ring-blue-400' : ''}`}
                onClick={() => canRegister && handleDateClick(day.date)}
              >
                <div
                  className={`text-[10px] font-medium mb-0.5 text-center rounded ${
                    hackathonStartEvent
                      ? 'bg-blue-600 text-white py-0.5 px-1 font-semibold'
                      : !day.isCurrentMonth
                      ? 'text-gray-400'
                      : 'text-gray-900'
                  }`}
                >
                  {day.date.getDate()}
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {dayEvents.filter(e => e.type !== 'hackathon-start' && e.type !== 'registration').slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`w-1 h-1 rounded-full ${
                        event.type === 'hackathon-end' ? 'bg-blue-400' :
                        'bg-green-500'
                      }`}
                      title={event.title}
                    />
                  ))}
                  {dayEvents.filter(e => e.type !== 'hackathon-start' && e.type !== 'registration').length > 2 && (
                    <div className="text-[7px] text-gray-500">+{dayEvents.filter(e => e.type !== 'hackathon-start' && e.type !== 'registration').length - 2}</div>
                  )}
                </div>

                {/* Loading indicator */}
                {isRegistering && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Calendar</h3>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPreviousMonth}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-gray-900">
            {monthToShow.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button
          onClick={goToNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Single Month View */}
      <div>
        {renderMonth(monthToShow)}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-center gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-gray-600">Hackathon Start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            <span className="text-gray-600">Hackathon End</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Meeting</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
