import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Holiday } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";

interface UpcomingEventsProps {
  holidays?: Holiday[];
}

export function UpcomingEvents({ holidays = [] }: UpcomingEventsProps) {
  // Generate upcoming company events (meetings, reviews, etc.)
  const today = new Date();
  const companyEvents = [
    {
      title: "Company Town Hall",
      date: addDays(today, 3),
      time: "10:00 AM - 11:30 AM",
      type: "meeting" // meeting, event, review
    },
    {
      title: "Team Building Event",
      date: addDays(today, 10),
      time: "All Day Event",
      type: "event"
    },
    {
      title: "Monthly Review",
      date: addDays(today, 15),
      time: "2:00 PM - 4:00 PM",
      type: "review"
    }
  ];

  // Determine background color based on event type
  const getEventColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-slate-50 border-slate-200";
      case "event":
        return "bg-red-50 border-red-100";
      case "review":
        return "bg-amber-50 border-amber-100";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <Card>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
          <Button 
            variant="link" 
            className="text-teal-600 hover:text-teal-700 p-0"
            onClick={() => {
              window.location.href = "/holidays";
            }}
          >
            View Calendar
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {companyEvents.map((event, index) => (
            <div key={index} className="flex items-start">
              <div className="flex flex-col items-center mr-4">
                <span className="text-sm font-semibold text-slate-900">
                  {format(event.date, 'd')}
                </span>
                <span className="text-xs text-slate-500">
                  {format(event.date, 'MMM')}
                </span>
              </div>
              <div className={`flex-1 p-3 rounded-lg ${getEventColor(event.type)}`}>
                <h3 className="text-sm font-medium text-slate-900">{event.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{event.time}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-900 mb-3">Upcoming Holidays</h3>
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <div className="text-sm text-slate-500">No upcoming holidays found.</div>
            ) : (
              holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm text-slate-700">{holiday.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {format(new Date(holiday.date), 'MMM d, yyyy')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
