import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LeaveRequest } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { addDays, format, differenceInCalendarDays, eachDayOfInterval, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

interface LeaveFormProps {
  leaveRequest?: LeaveRequest;
  onSuccess: () => void;
}

export function LeaveForm({ leaveRequest, onSuccess }: LeaveFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!leaveRequest;
  
  // Create form schema with proper Zod enum
  const formSchema = z.object({
    type: z.enum(['annual', 'sick', 'personal', 'halfday', 'unpaid', 'other'], {
      required_error: "Leave type is required",
    }),
    startDate: z.date({
      required_error: "Start date is required",
    }),
    endDate: z.date({
      required_error: "End date is required",
    }),
    reason: z.string().min(1, "Reason is required"),
  }).refine((data) => {
    if (data.type === 'halfday') {
      return data.endDate.getTime() === data.startDate.getTime();
    }
    return data.endDate >= data.startDate;
  }, {
    message: (data) => {
      if (data.type === 'halfday') {
        return "For half day leave, start date and end date must be the same";
      }
      return "End date cannot be before start date";
    },
    path: ["endDate"],
  });
  
  type FormValues = z.infer<typeof formSchema>;
  
  // Set up form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: leaveRequest?.type || "annual",
      startDate: leaveRequest ? new Date(leaveRequest.startDate) : new Date(),
      endDate: leaveRequest ? new Date(leaveRequest.endDate) : addDays(new Date(), 1),
      reason: leaveRequest?.reason || "",
    },
  });
  
  // Watch for form values
  const leaveType = form.watch("type");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  
  // Auto-set end date to match start date for half-day leave
  React.useEffect(() => {
    if (leaveType === 'halfday' && startDate) {
      form.setValue('endDate', startDate);
    }
  }, [leaveType, startDate, form]);
  
  const calculateBusinessDays = (start: Date, end: Date): number => {
    if (!start || !end || end < start) return 0;
    
    // For half-day leave, always return 0.5
    if (leaveType === 'halfday') return 0.5;
    
    // Get all days in the range
    const allDays = eachDayOfInterval({ start, end });
    
    // Filter out weekends (Saturday = 6, Sunday = 0)
    const businessDays = allDays.filter(day => !isWeekend(day));
    
    return businessDays.length;
  };
  
  const numDays = calculateBusinessDays(startDate, endDate);
  
  // Create or update leave request mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues | any) => {
      if (isEditing) {
        return await apiRequest(
          "PUT", 
          `/api/leave-requests/${leaveRequest.id}`, 
          values
        );
      } else {
        return await apiRequest(
          "POST", 
          "/api/leave-requests", 
          {
            ...values,
            userId: user?.id,
            status: "pending",
          }
        );
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Leave request updated" : "Leave request submitted",
        description: isEditing 
          ? "Your leave request has been updated successfully." 
          : "Your leave request has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    // Convert dates to ISO strings for the API
    const formattedValues = {
      ...values,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
    };
    mutation.mutate(formattedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <Select 
                value={field.value} 
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal Leave</SelectItem>
                  <SelectItem value="halfday">Half Day Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="bottom">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" side="bottom">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        if (leaveType === 'halfday') {
                          // For half-day, only allow the same date as start date
                          return date.getTime() !== startDate?.getTime();
                        }
                        return date < startDate || date < new Date();
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
          <p className="text-sm text-slate-700">
            Duration: <span className="font-medium">
              {leaveType === 'halfday' ? 'Half day' : `${numDays} working day${numDays !== 1 ? 's' : ''}`}
            </span>
            <span className="text-xs text-slate-500 block mt-1">
              {leaveType === 'halfday' ? '(Single half-day leave)' : '(Weekends excluded)'}
            </span>
          </p>
        </div>
        
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Leave</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Provide a reason for your leave request" 
                  {...field} 
                  className="resize-none"
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Request" : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
