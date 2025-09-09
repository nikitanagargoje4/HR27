import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, parseISO } from "date-fns";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { CheckButton } from "@/components/attendance/check-button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Clock, Calendar as CalendarIcon, CheckCircle2, XCircle 
} from "lucide-react";
import { FaEdit } from "react-icons/fa";
import { Attendance, User, LeaveRequest, insertAttendanceSchema } from "@shared/schema";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Edit form schema
const editAttendanceSchema = z.object({
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
});

type EditAttendanceForm = z.infer<typeof editAttendanceSchema>;

export default function AttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Initialize with today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  
  // Form for editing attendance
  const form = useForm<EditAttendanceForm>({
    resolver: zodResolver(editAttendanceSchema),
    defaultValues: {
      checkInTime: '',
      checkOutTime: '',
    },
  });
  
  // Fetch today's attendance for current user
  const { data: myAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { userId: user?.id }],
    enabled: !!user,
  });
  
  // Fetch all attendance records for the selected date (for admins/HR)
  const { data: dateAttendance = [], isLoading: isLoadingDateAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { date: format(selectedDate, 'yyyy-MM-dd') }],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager'),
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
  });
  
  // Fetch all employees
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager'),
  });

  // Fetch all leave requests
  const { data: allLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager'),
  });
  
  // Mutation for updating attendance
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: { id: number; attendanceData: Partial<Attendance> }) => {
      return apiRequest('PUT', `/api/attendance/${data.id}`, data.attendanceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update attendance record",
        variant: "destructive",
      });
    },
  });
  
  // Check if user has checked in today
  const todayRecord = myAttendance.find(record => 
    (record.date && isToday(new Date(record.date))) || 
    (record.checkInTime && isToday(new Date(record.checkInTime)))
  );

  // Function to check if an employee is on approved leave for a specific date
  const isEmployeeOnLeave = (employeeId: number, date: Date): boolean => {
    return allLeaveRequests.some(request => {
      if (request.userId !== employeeId || request.status !== 'approved') {
        return false;
      }
      
      const requestStartDate = new Date(request.startDate);
      const requestEndDate = new Date(request.endDate);
      const checkDate = new Date(date);
      
      // Set times to start of day for accurate comparison
      requestStartDate.setHours(0, 0, 0, 0);
      requestEndDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      return checkDate >= requestStartDate && checkDate <= requestEndDate;
    });
  };

  // Create combined attendance data for all employees
  const allEmployeeAttendanceData = employees.map(employee => {
    // Find attendance record for this employee on the selected date
    const attendanceRecord = dateAttendance.find(record => record.userId === employee.id);
    
    // Check if employee is on approved leave
    const onLeave = isEmployeeOnLeave(employee.id, selectedDate);
    
    // Determine status
    let status: string;
    if (attendanceRecord && attendanceRecord.checkInTime) {
      status = 'present';
    } else if (onLeave) {
      status = 'on leave';
    } else {
      status = 'absent';
    }
    
    return {
      id: attendanceRecord?.id || 0,
      userId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      checkInTime: attendanceRecord?.checkInTime || null,
      checkOutTime: attendanceRecord?.checkOutTime || null,
      date: attendanceRecord?.date || selectedDate.toISOString(),
      status,
      notes: attendanceRecord?.notes || null,
    };
  });
  
  // Get employee names for admin view
  const getEmployeeName = (userId: number) => {
    const employee = employees.find(emp => emp.id === userId);
    return employee ? `${employee.firstName} ${employee.lastName}` : `Employee #${userId}`;
  };
  
  // Handle edit attendance
  const handleEditAttendance = (attendance: Attendance) => {
    setEditingRecord(attendance);
    // Format times for the form inputs
    const checkInTime = attendance.checkInTime ? format(new Date(attendance.checkInTime), 'HH:mm') : '';
    const checkOutTime = attendance.checkOutTime ? format(new Date(attendance.checkOutTime), 'HH:mm') : '';
    
    form.reset({
      checkInTime,
      checkOutTime,
    });
    setIsEditDialogOpen(true);
  };
  
  // Handle form submit
  const onSubmit = (data: EditAttendanceForm) => {
    if (!editingRecord) return;
    
    const attendanceData: any = {};
    
    // Update check-in time if provided
    if (data.checkInTime) {
      const [hours, minutes] = data.checkInTime.split(':');
      const baseDate = editingRecord.date ? new Date(editingRecord.date) : 
                       editingRecord.checkInTime ? new Date(editingRecord.checkInTime) : new Date();
      const checkInDate = new Date(baseDate);
      checkInDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      attendanceData.checkInTime = checkInDate.toISOString();
    }
    
    // Update check-out time if provided
    if (data.checkOutTime) {
      const [hours, minutes] = data.checkOutTime.split(':');
      const baseDate = editingRecord.date ? new Date(editingRecord.date) : 
                       editingRecord.checkInTime ? new Date(editingRecord.checkInTime) : new Date();
      const checkOutDate = new Date(baseDate);
      checkOutDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      attendanceData.checkOutTime = checkOutDate.toISOString();
    }
    
    updateAttendanceMutation.mutate({
      id: editingRecord.id,
      attendanceData,
    });
  };
  
  // Define table columns for personal attendance
  const personalColumns: ColumnDef<Attendance>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => row.original.date ? format(new Date(row.original.date), 'MMM dd, yyyy') : 'N/A',
    },
    {
      accessorKey: "checkInTime",
      header: "Check In",
      cell: ({ row }) => row.original.checkInTime ? format(new Date(row.original.checkInTime), 'hh:mm a') : 'N/A',
    },
    {
      accessorKey: "checkOutTime",
      header: "Check Out",
      cell: ({ row }) => row.original.checkOutTime ? format(new Date(row.original.checkOutTime), 'hh:mm a') : 'N/A',
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'present' ? 'default' : 'destructive'} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
  ];
  
  // Define table columns for admin attendance view
  const adminColumns = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }: { row: any }) => row.original.employeeName,
    },
    {
      accessorKey: "checkInTime",
      header: "Check In",
      cell: ({ row }: { row: any }) => row.original.checkInTime ? format(new Date(row.original.checkInTime), 'hh:mm a') : 'N/A',
    },
    {
      accessorKey: "checkOutTime",
      header: "Check Out",
      cell: ({ row }: { row: any }) => row.original.checkOutTime ? format(new Date(row.original.checkOutTime), 'hh:mm a') : 'N/A',
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: any }) => {
        const status = row.original.status;
        let variant: 'default' | 'destructive' | 'secondary' = 'destructive';
        if (status === 'present') variant = 'default';
        else if (status === 'on leave') variant = 'secondary';
        
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
    },
    // Add Actions column for admin only
    ...(user?.role === 'admin' ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditAttendance(row.original)}
          className="h-8 w-8 p-0 hover:bg-slate-100"
        >
          <FaEdit className="h-4 w-4 text-slate-600" />
        </Button>
      ),
    }] : []),
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
          {/* Only show check in/out buttons if user is an employee */}
          {user && <CheckButton currentAttendance={todayRecord} />}
        </div>
        
        <Tabs defaultValue="my-attendance">
          <TabsList>
            <TabsTrigger value="my-attendance">My Attendance</TabsTrigger>
            {user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager') && (
              <TabsTrigger value="all-attendance">All Attendance</TabsTrigger>
            )}
          </TabsList>
          
          {/* My Attendance Tab */}
          <TabsContent value="my-attendance">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Today's status card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Today's Status</CardTitle>
                  <CardDescription>{format(new Date(), 'EEEE, MMMM dd, yyyy')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-slate-600">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Check In:</span>
                      </div>
                      <div className="font-medium">
                        {todayRecord?.checkInTime 
                          ? format(new Date(todayRecord.checkInTime), 'hh:mm a') 
                          : 'Not checked in'}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-slate-600">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Check Out:</span>
                      </div>
                      <div className="font-medium">
                        {todayRecord?.checkOutTime 
                          ? format(new Date(todayRecord.checkOutTime), 'hh:mm a') 
                          : 'Not checked out'}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-slate-600">
                        {todayRecord?.status === 'present' 
                          ? <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> 
                          : <XCircle className="mr-2 h-4 w-4 text-red-500" />}
                        <span>Status:</span>
                      </div>
                      <Badge variant={todayRecord?.status === 'present' ? 'default' : 'destructive'} className="capitalize">
                        {todayRecord?.status || 'Not Recorded'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Calendar card */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Attendance Calendar</CardTitle>
                  <CardDescription>View your attendance history</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="w-full"
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const compareDate = new Date(date);
                      compareDate.setHours(0, 0, 0, 0);
                      return compareDate.getTime() !== today.getTime();
                    }}
                  />
                </CardContent>
              </Card>
              
              {/* Attendance history table */}
              <Card className="md:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Attendance History</CardTitle>
                  <CardDescription>Your past attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={personalColumns}
                    data={myAttendance.sort((a, b) => {
                      const dateA = a.date ? new Date(a.date).getTime() : 0;
                      const dateB = b.date ? new Date(b.date).getTime() : 0;
                      return dateB - dateA;
                    })}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* All Attendance Tab (Admin/HR view) */}
          {user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager') && (
            <TabsContent value="all-attendance">
              <div className="space-y-6">
                {/* Date selection and summary row */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  {/* Date selection card */}
                  <Card className="xl:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Select Date</CardTitle>
                      <CardDescription>View attendance for a specific date</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        className="w-fit mx-auto"
                        disabled={(date) => {
                          // Allow selection of any date in the past or today, but not future dates
                          const today = new Date();
                          today.setHours(23, 59, 59, 999); // End of today
                          return date > today;
                        }}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Attendance summary cards */}
                  <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-full bg-green-100 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <CardTitle className="text-lg font-medium">Present</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {allEmployeeAttendanceData.filter(a => a.status === 'present').length}
                        </div>
                        <p className="text-sm text-slate-500">of {employees.length} employees</p>
                      </CardContent>
                    </Card>
                  
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-full bg-red-100 text-red-600">
                            <XCircle className="h-5 w-5" />
                          </div>
                          <CardTitle className="text-lg font-medium">Absent</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {allEmployeeAttendanceData.filter(a => a.status === 'absent').length}
                        </div>
                        <p className="text-sm text-slate-500">of {employees.length} employees</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                            <CalendarIcon className="h-5 w-5" />
                          </div>
                          <CardTitle className="text-lg font-medium">On Leave</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {allEmployeeAttendanceData.filter(a => a.status === 'on leave').length}
                        </div>
                        <p className="text-sm text-slate-500">of {employees.length} employees</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                
                {/* Attendance records table */}
                <Card className="w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">
                      Attendance Records for {format(selectedDate, 'MMMM dd, yyyy')}
                    </CardTitle>
                    <CardDescription>
                      All employee attendance records for the selected date
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDateAttendance ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="text-slate-600">Loading attendance records...</div>
                      </div>
                    ) : employees.length > 0 ? (
                      <DataTable
                        columns={adminColumns}
                        data={allEmployeeAttendanceData}
                        globalFilter={true}
                        searchPlaceholder="Search employees..."
                        employees={employees}
                      />
                    ) : (
                      <div className="flex justify-center items-center py-8">
                        <div className="text-slate-600">
                          No employees found
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
        
        {/* Edit Attendance Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Attendance Record</DialogTitle>
              <DialogDescription>
                Edit the check-in and check-out times for {editingRecord ? getEmployeeName(editingRecord.userId) : ''} 
                on {editingRecord && (editingRecord.date || editingRecord.checkInTime) ? 
                  format(new Date(editingRecord.date || editingRecord.checkInTime!), 'MMMM dd, yyyy') : ''}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="checkInTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check In Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="checkOutTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check Out Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingRecord(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateAttendanceMutation.isPending}
                  >
                    {updateAttendanceMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
