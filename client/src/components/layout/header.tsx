import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { useTheme } from "next-themes";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckButton } from "@/components/attendance/check-button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Attendance } from "@shared/schema";
import { isToday, format, formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { 
  Menu, BellRing, Settings, User as UserIcon, 
  KeyRound, Sun, Moon, Monitor, LogOut, Mail, Phone, MapPin, 
  Building2, Calendar, IndianRupee, Camera, Upload, X, Check, Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Change password form schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export function Header() {
  const { user, logoutMutation } = useAuth();
  const { collapsed, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Change password form
  const passwordForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await apiRequest("PUT", "/api/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
      setIsPasswordOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch today's attendance for check-in button
  const { data: myAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { userId: user?.id }],
    enabled: !!user,
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const { data: unreadNotifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications/unread"],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Check if user has checked in today
  const todayRecord = myAttendance.find(record => 
    (record.date && isToday(new Date(record.date))) || 
    (record.checkInTime && isToday(new Date(record.checkInTime)))
  );

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Photo upload functionality
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setSelectedPhoto(base64);
        // Update user's photo immediately
        updatePhotoMutation.mutate({ photoUrl: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    updatePhotoMutation.mutate({ photoUrl: null });
  };

  // Update photo mutation
  const updatePhotoMutation = useMutation({
    mutationFn: async (data: { photoUrl: string | null }) => {
      const response = await apiRequest("PUT", `/api/employees/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully.",
      });
      // Update the user data in the query cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      setSelectedPhoto(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSelectedPhoto(null);
    },
  });

  // Notification mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("PUT", `/api/notifications/${notificationId}/read`, {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/notifications/read-all", {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("DELETE", `/api/notifications/${notificationId}`, {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread"] });
    },
  });

  return (
    <header className="bg-white border-b border-slate-200 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center md:w-64">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="md:hidden ml-2 font-semibold text-slate-900">HR Connect</div>
        </div>
        
        <div className="flex items-center ml-auto">
          {/* Check-in button - visible on larger screens */}
          <div className="hidden sm:block mr-6">
            <CheckButton currentAttendance={todayRecord} />
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown */}
            <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  <BellRing className="h-5 w-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadNotifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsReadMutation.mutate()}
                      className="text-xs"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No notifications yet
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b last:border-b-0 hover:bg-slate-50 ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.isRead ? 'font-medium' : ''}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {notification.message}
                            </p>
                            {notification.createdAt && (
                              <p className="text-xs text-slate-400 mt-1">
                                {formatInTimeZone(
                                  new Date(notification.createdAt), 
                                  'Asia/Kolkata', 
                                  'MMM dd, yyyy hh:mm a'
                                )} ({formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })})
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                                className="h-6 w-6"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                              className="h-6 w-6 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Profile Option */}
                <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                </Dialog>
                
                {/* Change Password Option */}
                <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      <span>Change Password</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                </Dialog>
                
                {/* Theme Toggle Submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                      <Monitor className="mr-2 h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                {/* Settings Page Option */}
                <DropdownMenuItem onClick={() => setLocation('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings Page</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Logout Option */}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-2xl font-bold text-slate-900">User Profile</DialogTitle>
          </DialogHeader>
          
          {user && (
            <div className="space-y-4 sm:space-y-6">
              {/* User Photo and Basic Info */}
              <div className="flex flex-col items-center space-y-3 sm:space-y-4 bg-gradient-to-r from-teal-50 to-slate-50 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-6 sm:py-8 border-b border-slate-200">
                <div className="relative group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-lg bg-slate-100 overflow-hidden">
                    {(selectedPhoto || user.photoUrl) ? (
                      <img 
                        src={selectedPhoto || user.photoUrl || ""} 
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                        <UserIcon className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Photo Edit Overlay */}
                  <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 sm:space-x-2">
                      {/* Upload Photo Button */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="profile-photo-upload"
                        disabled={updatePhotoMutation.isPending}
                      />
                      <label
                        htmlFor="profile-photo-upload"
                        className="w-7 h-7 sm:w-8 sm:h-8 bg-teal-500 text-white rounded-full flex items-center justify-center hover:bg-teal-600 transition-colors cursor-pointer shadow-lg"
                        title="Upload new photo"
                      >
                        <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                      </label>
                      
                      {/* Remove Photo Button */}
                      {(selectedPhoto || user.photoUrl) && (
                        <button
                          type="button"
                          onClick={removePhoto}
                          disabled={updatePhotoMutation.isPending}
                          className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Loading indicator */}
                  {updatePhotoMutation.isPending && (
                    <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    {user.firstName} {user.lastName}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600">{user.position || "No Position"}</p>
                  <Badge variant="outline" className="mt-2 capitalize text-xs sm:text-sm">
                    {user.role}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-2 hidden sm:block">
                    Hover over photo to edit
                  </p>
                  <p className="text-xs text-slate-500 mt-2 sm:hidden">
                    Tap photo to edit
                  </p>
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-3 sm:space-y-4 px-1">
                <div className="flex items-start space-x-3">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-700">Email</p>
                    <p className="text-sm sm:text-base text-slate-900 break-words">{user.email}</p>
                  </div>
                </div>
                
                {user.phoneNumber && (
                  <div className="flex items-start space-x-3">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Phone</p>
                      <p className="text-sm sm:text-base text-slate-900">{user.phoneNumber}</p>
                    </div>
                  </div>
                )}
                
                {user.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Address</p>
                      <p className="text-sm sm:text-base text-slate-900 break-words">{user.address}</p>
                    </div>
                  </div>
                )}
                
                {user.dateOfBirth && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Date of Birth</p>
                      <p className="text-sm sm:text-base text-slate-900">{format(new Date(user.dateOfBirth), "PPP")}</p>
                    </div>
                  </div>
                )}
                
                {user.joinDate && (
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Date of Joining</p>
                      <p className="text-sm sm:text-base text-slate-900">{format(new Date(user.joinDate), "PPP")}</p>
                    </div>
                  </div>
                )}
                
                {user.salary && (
                  <div className="flex items-start space-x-3">
                    <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Annual Salary</p>
                      <p className="text-sm sm:text-base text-slate-900 font-semibold">₹{user.salary.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Change Password</DialogTitle>
          </DialogHeader>
          
          <Form {...passwordForm}>
            <form 
              onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Current Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your current password"
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your new password"
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Confirm New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm your new password"
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPasswordOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
