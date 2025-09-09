import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Holiday } from "@shared/schema";

// Extended holiday type to include weekends
type ExtendedHoliday = Holiday | {
  id: string;
  name: string;
  date: string;
  description: string;
  isWeekend: true;
};
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  Plus, 
  Pencil, 
  Trash2,
  CalendarDays 
} from "lucide-react";
import { format, isSameMonth, isToday, isPast, isFuture, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

// Form schema for holiday
const holidayFormSchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.date({
    required_error: "Holiday date is required",
  }),
  description: z.string().optional(),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

export default function HolidaysPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  
  // Fetch all holidays
  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });
  
  // Generate weekend holidays for current month
  const generateWeekendHolidays = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const allDays = eachDayOfInterval({ start, end });
    
    return allDays
      .filter(day => isWeekend(day))
      .map(day => ({
        id: `weekend-${format(day, 'yyyy-MM-dd')}`,
        name: format(day, 'EEEE'), // Saturday or Sunday
        date: day.toISOString(),
        description: 'Weekend',
        isWeekend: true
      }));
  };
  
  // Get weekend holidays for current month
  const weekendHolidays = generateWeekendHolidays(selectedDate);
  
  // Combine regular holidays with weekend holidays
  const allHolidays = [...holidays, ...weekendHolidays];
  
  // Holiday dates for calendar highlighting (including weekends)
  const holidayDates = allHolidays.map(holiday => new Date(holiday.date));
  
  // Filter holidays for the current month
  const currentMonthHolidays = holidays.filter(holiday => 
    isSameMonth(new Date(holiday.date), selectedDate)
  );
  
  // Sort holidays by date
  const sortedHolidays = [...holidays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Group holidays by past, today, and upcoming
  const pastHolidays = sortedHolidays.filter(holiday => 
    isPast(new Date(holiday.date)) && !isToday(new Date(holiday.date))
  );
  
  const todayHoliday = sortedHolidays.find(holiday => 
    isToday(new Date(holiday.date))
  );
  
  const upcomingHolidays = sortedHolidays.filter(holiday => 
    isFuture(new Date(holiday.date))
  );
  
  // Create holiday mutation
  const createHolidayMutation = useMutation({
    mutationFn: async (values: HolidayFormValues) => {
      return await apiRequest("POST", "/api/holidays", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Holiday created",
        description: "The holiday has been added to the calendar.",
      });
      addForm.reset({
        name: "",
        date: new Date(),
        description: "",
      });
      setIsAddOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update holiday mutation
  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: HolidayFormValues }) => {
      return await apiRequest("PUT", `/api/holidays/${id}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Holiday updated",
        description: "The holiday has been updated successfully.",
      });
      setIsEditOpen(false);
      setSelectedHoliday(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete holiday mutation
  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      toast({
        title: "Holiday deleted",
        description: "The holiday has been removed from the calendar.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add holiday form
  const addForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      description: "",
    },
  });
  
  // Edit holiday form
  const editForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: selectedHoliday?.name || "",
      date: selectedHoliday ? new Date(selectedHoliday.date) : new Date(),
      description: selectedHoliday?.description || "",
    },
  });
  
  // Reset edit form when selectedHoliday changes
  useEffect(() => {
    if (selectedHoliday) {
      editForm.reset({
        name: selectedHoliday.name,
        date: new Date(selectedHoliday.date),
        description: selectedHoliday.description || "",
      });
    }
  }, [selectedHoliday, editForm]);
  
  // Handle add form submission
  const onAddSubmit = (values: HolidayFormValues) => {
    createHolidayMutation.mutate(values);
  };
  
  // Handle edit form submission
  const onEditSubmit = (values: HolidayFormValues) => {
    if (selectedHoliday) {
      updateHolidayMutation.mutate({ id: selectedHoliday.id, values });
    }
  };
  
  // Table columns for holidays (including weekends)
  const columns: ColumnDef<ExtendedHoliday>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.date), 'MMM d, yyyy'),
    },
    {
      accessorKey: "name",
      header: "Holiday Name",
      cell: ({ row }) => {
        const holiday = row.original;
        return (
          <div className="flex items-center gap-2">
            <span>{row.getValue("name")}</span>
            {holiday.isWeekend && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                Weekend
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.getValue("description") || "No description",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const holiday = row.original;
        
        // Don't show edit/delete for weekend holidays
        if (holiday.isWeekend) {
          return (
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">Weekend</span>
            </div>
          );
        }
        
        // Only admin can edit/delete holidays
        if (user?.role !== 'admin') {
          return (
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground">View only</span>
            </div>
          );
        }
        
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setSelectedHoliday(row.original);
                setIsEditOpen(true);
              }}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-red-500"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this holiday? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteHolidayMutation.mutate(row.original.id)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];
  
  // Check if a date is a holiday
  const isHolidayDate = (date: Date) => {
    return holidayDates.some(
      holidayDate => 
        date.getDate() === holidayDate.getDate() &&
        date.getMonth() === holidayDate.getMonth() &&
        date.getFullYear() === holidayDate.getFullYear()
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-slate-900">Holiday Calendar</h1>
          {user?.role === 'admin' && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Holiday</DialogTitle>
                </DialogHeader>
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 px-1">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holiday Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter holiday name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <div className="w-full flex justify-center">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              className="rounded-md border w-fit"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add description" 
                              className="resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddOpen(false)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
                        disabled={createHolidayMutation.isPending}
                      >
                        {createHolidayMutation.isPending && (
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        )}
                        Add Holiday
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Holiday Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  holiday: holidayDates
                }}
                modifiersStyles={{
                  holiday: {
                    backgroundColor: '#fee2e2',
                    color: '#7f1d1d',
                    fontWeight: '600'
                  }
                }}
                showOutsideDays={false}
              />
              
              {/* Current month holidays */}
              {currentMonthHolidays.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">
                    Holidays in {format(selectedDate, 'MMMM yyyy')}
                  </h3>
                  <div className="space-y-2">
                    {currentMonthHolidays.map((holiday) => (
                      <div 
                        key={holiday.id} 
                        className={cn(
                          "flex items-center justify-between p-2 rounded",
                          holiday.isWeekend ? "bg-blue-50 border border-blue-100" : "bg-slate-50"
                        )}
                      >
                        <div className="flex items-center">
                          <CalendarDays className={cn(
                            "w-4 h-4 mr-2",
                            holiday.isWeekend ? "text-blue-600" : "text-teal-600"
                          )} />
                          <span className="font-medium">{holiday.name}</span>
                          {holiday.isWeekend && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              Weekend
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-500">
                          {format(new Date(holiday.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Holiday lists */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayHoliday && (
                <div>
                  <h3 className="text-sm font-medium text-teal-600 mb-2">Today</h3>
                  <div className="p-3 rounded-md bg-teal-50 border border-teal-100">
                    <div className="font-medium">{todayHoliday.name}</div>
                    {todayHoliday.description && (
                      <div className="text-sm text-slate-600 mt-1">{todayHoliday.description}</div>
                    )}
                  </div>
                </div>
              )}
              
              {upcomingHolidays.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Upcoming</h3>
                  <div className="space-y-2">
                    {upcomingHolidays.slice(0, 5).map((holiday) => (
                      <div key={holiday.id} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-xs text-slate-500">
                            {format(new Date(holiday.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {pastHolidays.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Past</h3>
                  <div className="space-y-2">
                    {pastHolidays.slice(-3).reverse().map((holiday) => (
                      <div key={holiday.id} className="flex items-center justify-between text-slate-500">
                        <div>
                          <div>{holiday.name}</div>
                          <div className="text-xs">
                            {format(new Date(holiday.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Holiday table */}
        <Card>
          <CardHeader>
            <CardTitle>All Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              columns={columns} 
              data={allHolidays} 
              searchColumn="name"
              searchPlaceholder="Search holidays..."
            />
          </CardContent>
        </Card>
        
        {/* Edit holiday dialog */}
        {selectedHoliday && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Holiday</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 px-1">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Holiday Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter holiday name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <div className="w-full flex justify-center">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            className="rounded-md border w-fit"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add description" 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsEditOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto"
                      disabled={updateHolidayMutation.isPending}
                    >
                      {updateHolidayMutation.isPending && (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      )}
                      Update Holiday
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
