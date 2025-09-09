import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LeaveRequest } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import { User } from "@shared/schema";

interface PendingApprovalsProps {
  pendingRequests?: LeaveRequest[];
  isPersonalView?: boolean;
}

export function PendingApprovals({ pendingRequests = [], isPersonalView = false }: PendingApprovalsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch all employees to display names
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
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
  
  // Get user info by ID
  const getUserById = (userId: number) => {
    return employees.find(emp => emp.id === userId);
  };
  
  // Format date range
  const formatDateRange = (start: string | Date, end: string | Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return format(startDate, 'MMM d, yyyy');
    }
    
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };
  
  // Get leave type display
  const getLeaveTypeDisplay = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Card>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isPersonalView ? "My Leave Requests" : "Pending Approvals"}
          </h2>
          <Button 
            variant="link" 
            className="text-teal-600 hover:text-teal-700 p-0"
            onClick={() => {
              window.location.href = isPersonalView ? "/leave" : "/leave?filter=pending";
            }}
          >
            View All
          </Button>
        </div>
      </div>
      
      <div className="divide-y divide-slate-200">
        {pendingRequests.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            {isPersonalView ? "No leave requests found." : "No pending approvals found."}
          </div>
        ) : (
          pendingRequests.slice(0, 3).map((request) => {
            const requestUser = getUserById(request.userId);
            return (
              <div key={request.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-center">
                  <Avatar>
                    <AvatarImage src="#" alt={requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : `User ${request.userId}`} />
                    <AvatarFallback>
                      {requestUser ? getInitials(requestUser.firstName, requestUser.lastName) : `U${request.userId}`}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        {requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : `User ${request.userId}`}
                      </p>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800">
                        {getLeaveTypeDisplay(request.type)} Leave
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Requested {request.type} leave ({formatDateRange(request.startDate, request.endDate)})
                    </p>
                    {request.reason && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        Reason: {request.reason}
                      </p>
                    )}
                  </div>
                </div>
                {!isPersonalView && (
                  <div className="mt-3 flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => rejectMutation.mutate(request.id)}
                      disabled={rejectMutation.isPending}
                    >
                      Decline
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700"
                      onClick={() => approveMutation.mutate(request.id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                  </div>
                )}
                {isPersonalView && (
                  <div className="mt-2 flex justify-end">
                    <Badge variant={
                      request.status === 'pending' ? 'outline' :
                      request.status === 'approved' ? 'default' : 'destructive'
                    }>
                      {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : 'Unknown'}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {pendingRequests.length > 3 && (
        <div className="p-4 text-center text-sm text-slate-500 border-t border-slate-200">
          Showing 3 of {pendingRequests.length} pending approvals
        </div>
      )}
    </Card>
  );
}
