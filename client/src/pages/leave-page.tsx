import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeaveForm } from "@/components/leave/leave-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, FileText, Check, X } from "lucide-react";
import { LeaveRequest, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function LeavePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [activeTab, setActiveTab] = useState("my-requests");
  
  // Fetch leave requests for current user
  const { data: myLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { userId: user?.id }],
    enabled: !!user,
  });
  
  // Fetch pending leave requests (for admins/HR/managers)
  const { data: pendingRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { status: "pending" }],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager'),
  });
  
  // Fetch all employees to display names
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
    enabled: !!user && (user.role === 'admin' || user.role === 'hr' || user.role === 'manager'),
  });
  
  // Approve leave request
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PUT", `/api/leave-requests/${requestId}`, {
        status: "approved",
        approvedById: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Request approved",
        description: "The leave request has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to approve request: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Reject leave request
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PUT", `/api/leave-requests/${requestId}`, {
        status: "rejected",
        approvedById: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Request rejected",
        description: "The leave request has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to reject request: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Cancel leave request
  const cancelMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("DELETE", `/api/leave-requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({
        title: "Request canceled",
        description: "Your leave request has been canceled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to cancel request: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Get user info by ID
  const getUserById = (userId: number) => {
    return employees.find(emp => emp.id === userId);
  };
  
  // Format date range
  const formatDateRange = (start: string | Date, end: string | Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  };
  
  // Calculate duration in business days (excluding weekends)
  const calculateDuration = (start: string | Date, end: string | Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (!startDate || !endDate || endDate < startDate) return '0 days';
    
    // Get all days in the range
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Filter out weekends (Saturday = 6, Sunday = 0)
    const businessDays = allDays.filter(day => !isWeekend(day));
    
    const diffDays = businessDays.length;
    return `${diffDays} working day${diffDays !== 1 ? 's' : ''}`;
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "pending":
      default:
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
    }
  };
  
  // Define columns for personal leave requests
  const myLeaveColumns: ColumnDef<LeaveRequest>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize">{row.getValue("type")}</span>
      ),
    },
    {
      accessorKey: "dateRange",
      header: "Date Range",
      cell: ({ row }) => formatDateRange(row.original.startDate, row.original.endDate),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => calculateDuration(row.original.startDate, row.original.endDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 truncate max-w-xs block">
          {row.getValue("reason") || "No reason provided"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        // Only show edit/cancel buttons for pending requests
        const isPending = row.original.status === "pending";
        return (
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedLeave(row.original);
                    setIsEditOpen(true);
                  }}
                >
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500"
                    >
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this leave request? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, keep it</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => cancelMutation.mutate(row.original.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Yes, cancel request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        );
      },
    },
  ];
  
  // Define columns for pending leave requests
  const pendingLeaveColumns: ColumnDef<LeaveRequest>[] = [
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => {
        const employee = getUserById(row.original.userId);
        return employee ? `${employee.firstName} ${employee.lastName}` : `Employee #${row.original.userId}`;
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <span className="capitalize">{row.getValue("type")}</span>
      ),
    },
    {
      accessorKey: "dateRange",
      header: "Date Range",
      cell: ({ row }) => formatDateRange(row.original.startDate, row.original.endDate),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => calculateDuration(row.original.startDate, row.original.endDate),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 truncate max-w-xs block">
          {row.getValue("reason") || "No reason provided"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => rejectMutation.mutate(row.original.id)}
            disabled={rejectMutation.isPending}
            className="border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => approveMutation.mutate(row.original.id)}
            disabled={approveMutation.isPending}
            className="border-green-200 hover:bg-green-50 hover:text-green-600"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </div>
      ),
    },
  ];
  
  // Calculate leave balances
  const calculateLeaveBalance = (type: string) => {
    const annual = 20; // Annual leave allowance
    const sick = 10; // Sick leave allowance
    const personal = 5; // Personal leave allowance
    const halfday = 12; // Half day leave allowance (in half-day units)
    
    const used = myLeaveRequests
      .filter(request => request.status === "approved" && request.type === type)
      .reduce((total, request) => {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        
        if (type === "halfday") {
          // For half-day leave, count in half-day units
          return total + 1; // Each request counts as 1 half-day
        } else {
          // Calculate business days only for full-day leaves
          const allDays = eachDayOfInterval({ start, end });
          const businessDays = allDays.filter(day => !isWeekend(day));
          return total + businessDays.length;
        }
      }, 0);
    
    switch (type) {
      case "annual":
        return { total: annual, used, remaining: annual - used };
      case "sick":
        return { total: sick, used, remaining: sick - used };
      case "personal":
        return { total: personal, used, remaining: personal - used };
      case "halfday":
        return { total: halfday, used, remaining: halfday - used };
      default:
        return { total: 0, used: 0, remaining: 0 };
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">Leave Management</h1>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <LeaveForm 
                onSuccess={() => {
                  setIsAddOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
              <TabsTrigger value="pending-approvals">
                Pending Approvals
                {pendingRequests.length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">{pendingRequests.length}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="my-requests" className="space-y-6">
            {/* Leave balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Annual Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-teal-600">
                      {calculateLeaveBalance("annual").remaining}
                    </div>
                    <div className="text-sm text-slate-500">
                      of {calculateLeaveBalance("annual").total} days remaining
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-teal-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(calculateLeaveBalance("annual").used / calculateLeaveBalance("annual").total) * 100}%` 
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Sick Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-blue-600">
                      {calculateLeaveBalance("sick").remaining}
                    </div>
                    <div className="text-sm text-slate-500">
                      of {calculateLeaveBalance("sick").total} days remaining
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(calculateLeaveBalance("sick").used / calculateLeaveBalance("sick").total) * 100}%` 
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Personal Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-purple-600">
                      {calculateLeaveBalance("personal").remaining}
                    </div>
                    <div className="text-sm text-slate-500">
                      of {calculateLeaveBalance("personal").total} days remaining
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(calculateLeaveBalance("personal").used / calculateLeaveBalance("personal").total) * 100}%` 
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Half Day Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold text-orange-600">
                      {calculateLeaveBalance("halfday").remaining}
                    </div>
                    <div className="text-sm text-slate-500">
                      of {calculateLeaveBalance("halfday").total} half-days remaining
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(calculateLeaveBalance("halfday").used / calculateLeaveBalance("halfday").total) * 100}%` 
                      }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>My Leave Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable 
                  columns={myLeaveColumns} 
                  data={myLeaveRequests} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
            <TabsContent value="pending-approvals">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <CardTitle>Pending Leave Approvals</CardTitle>
                    <Badge className="ml-3 bg-amber-100 text-amber-800">{pendingRequests.length} Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable 
                    columns={pendingLeaveColumns} 
                    data={pendingRequests} 
                    globalFilter={true}
                    searchPlaceholder="Search employees..."
                    employees={employees}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
        
        {/* Edit leave request dialog */}
        {selectedLeave && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Leave Request</DialogTitle>
              </DialogHeader>
              <LeaveForm 
                leaveRequest={selectedLeave}
                onSuccess={() => {
                  setIsEditOpen(false);
                  setSelectedLeave(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
