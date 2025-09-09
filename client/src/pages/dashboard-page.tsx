import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/app-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { AttendanceOverview } from "@/components/dashboard/attendance-overview";
import { RecentEmployees } from "@/components/dashboard/recent-employees";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { DepartmentDistribution } from "@/components/dashboard/department-distribution";
import { Button } from "@/components/ui/button";
import { Calendar, DownloadIcon, RefreshCw } from "lucide-react";
import { User, Department, LeaveRequest, Holiday, Attendance } from "@shared/schema";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user } = useAuth();
  const today = new Date();
  const [dateRange, setDateRange] = useState("month");
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Fetch employees data
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/employees", refreshKey],
  });

  // Fetch departments data
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments", refreshKey],
  });

  // Fetch leave requests (all for admin/hr/manager, user's own for employee)
  const { data: pendingLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: user?.role === "employee" 
      ? ["/api/leave-requests", { userId: user.id }, refreshKey]
      : ["/api/leave-requests", { status: "pending" }, refreshKey],
  });

  // Fetch today's attendance
  const { data: todayAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { date: format(today, 'yyyy-MM-dd') }, refreshKey],
  });

  // Fetch user's personal attendance (for employee role)
  const { data: userAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { userId: user?.id }, refreshKey],
    enabled: user?.role === "employee",
  });

  // Fetch upcoming holidays
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays", refreshKey],
  });

  // Calculate attendance statistics
  const totalEmployees = employees.length;
  const presentToday = todayAttendance.filter(record => record.status === 'present').length;
  const onLeaveToday = pendingLeaveRequests.filter(request => {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    return (
      request.status === 'approved' &&
      startDate <= today && today <= endDate
    );
  }).length;
  const absentToday = totalEmployees - (presentToday + onLeaveToday);

  // Filter upcoming holidays
  const upcomingHolidays = holidays
    .filter(holiday => new Date(holiday.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Handler for refreshing data
  const handleRefresh = () => {
    setRefreshKey(Date.now());
  };

  // Toggle date range
  const toggleDateRange = () => {
    setDateRange(dateRange === "month" ? "week" : "month");
  };

  // Determine if user has admin/management privileges
  const isAdminRole = user?.role === "admin" || user?.role === "hr" || user?.role === "manager";
  
  // Get user's personal stats (for employee dashboard)
  const getUserPersonalStats = () => {
    if (!user || !userAttendance.length) return { present: 0, absent: 0, late: 0 };
    
    const thisMonth = userAttendance.filter(record => {
      const checkInTime = record.checkInTime;
      if (!checkInTime) return false;
      const recordDate = new Date(checkInTime);
      return recordDate.getMonth() === today.getMonth() && 
             recordDate.getFullYear() === today.getFullYear();
    });
    
    const present = thisMonth.filter(record => record.status === 'present').length;
    const absent = thisMonth.filter(record => record.status === 'absent').length;
    const late = thisMonth.filter(record => record.status === 'late').length;
    
    return { present, absent, late };
  };

  const personalStats = getUserPersonalStats();

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Welcome section with user greeting */}
        <WelcomeSection />
        
        {/* Page header */}
        <motion.h1 
          className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          Dashboard Overview
        </motion.h1>
        
        {/* Statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {isAdminRole ? (
            // Admin/HR/Manager view - Company-wide stats
            <>
              <StatCard
                title="Present Today"
                value={presentToday}
                total={totalEmployees}
                percentage={totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0}
                status="present"
              />
              <StatCard
                title="On Leave Today"
                value={onLeaveToday}
                total={totalEmployees}
                percentage={totalEmployees > 0 ? (onLeaveToday / totalEmployees) * 100 : 0}
                status="leave"
              />
              <StatCard
                title="Absent Today"
                value={absentToday}
                total={totalEmployees}
                percentage={totalEmployees > 0 ? (absentToday / totalEmployees) * 100 : 0}
                status="absent"
              />
            </>
          ) : (
            // Employee view - Personal stats
            <>
              <StatCard
                title="Days Present This Month"
                value={personalStats.present}
                total={personalStats.present + personalStats.absent + personalStats.late}
                percentage={personalStats.present + personalStats.absent + personalStats.late > 0 
                  ? (personalStats.present / (personalStats.present + personalStats.absent + personalStats.late)) * 100 
                  : 0}
                status="present"
              />
              <StatCard
                title="Leave Requests"
                value={pendingLeaveRequests.length}
                total={pendingLeaveRequests.length}
                percentage={100}
                status="leave"
              />
              <StatCard
                title="Late Days This Month"
                value={personalStats.late}
                total={personalStats.present + personalStats.absent + personalStats.late}
                percentage={personalStats.present + personalStats.absent + personalStats.late > 0 
                  ? (personalStats.late / (personalStats.present + personalStats.absent + personalStats.late)) * 100 
                  : 0}
                status="absent"
              />
            </>
          )}
        </div>
        
        {/* Quick Actions Section */}
        <QuickActions />
        
        {isAdminRole ? (
          // Admin/HR/Manager view - Company-wide information
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttendanceOverview />
              <DepartmentDistribution employees={employees} departments={departments} />
            </div>
            
            {/* Approvals and Upcoming Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PendingApprovals pendingRequests={pendingLeaveRequests} />
              </div>
              <div>
                <UpcomingEvents holidays={upcomingHolidays} />
              </div>
            </div>
            
            {/* Recent Employees */}
            <RecentEmployees employees={employees.slice(0, 5)} departments={departments} />
          </>
        ) : (
          // Employee view - Personal information only
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <UpcomingEvents holidays={upcomingHolidays} />
            </div>
            <div>
              {pendingLeaveRequests.length > 0 && (
                <PendingApprovals 
                  pendingRequests={pendingLeaveRequests} 
                  isPersonalView={true}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
