import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Settings as SettingsIcon,
  User as UserIcon,
  KeyRound,
  Monitor,
  Sun,
  Moon,
  Save,
  Loader2,
  Database,
  Bell,
  Shield
} from "lucide-react";

// Profile form schema
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  department: z.string().optional(),
});

// Change password form schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// System settings schema
const systemSettingsSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  organizationEmail: z.string().email("Invalid email address"),
  timeZone: z.string().min(1, "Time zone is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    attendance: z.boolean(),
    leave: z.boolean(),
  }),
});

type ProfileData = z.infer<typeof profileSchema>;
type ChangePasswordData = z.infer<typeof changePasswordSchema>;
type SystemSettingsData = z.infer<typeof systemSettingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form
  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phoneNumber || "",
      address: user?.address || "",
      department: user?.departmentId?.toString() || "",
    },
  });

  // Change password form
  const passwordForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // System settings query
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings/system"],
    enabled: user?.role === "admin",
  });

  // System settings form
  const systemForm = useForm<SystemSettingsData>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: systemSettings || {
      organizationName: "HR Connect",
      organizationEmail: "admin@hrconnect.com",
      timeZone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      workingHours: {
        start: "09:00",
        end: "18:00",
      },
      notifications: {
        email: true,
        push: true,
        attendance: true,
        leave: true,
      },
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileData) => apiRequest("PUT", "/api/user/profile", data),
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordData) => apiRequest("POST", "/api/user/change-password", data),
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    },
  });

  // Update system settings mutation
  const updateSystemSettingsMutation = useMutation({
    mutationFn: (data: SystemSettingsData) => apiRequest("PUT", "/api/settings/system", data),
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "System settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/system"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast({
      title: "Theme updated",
      description: `Theme changed to ${newTheme}.`,
    });
  };

  const onProfileSubmit = (data: ProfileData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: ChangePasswordData) => {
    changePasswordMutation.mutate(data);
  };

  const onSystemSubmit = (data: SystemSettingsData) => {
    updateSystemSettingsMutation.mutate(data);
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-2 mb-6">
            <SettingsIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
              Settings
            </h1>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b">
                  <TabsList className="grid w-full grid-cols-3 h-14 bg-slate-50">
                    <TabsTrigger value="profile" className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4" />
                      <span>Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="password" className="flex items-center space-x-2">
                      <KeyRound className="h-4 w-4" />
                      <span>Password</span>
                    </TabsTrigger>
                    <TabsTrigger value="theme" className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4" />
                      <span>Theme</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Profile Tab */}
                <TabsContent value="profile" className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Profile Information</h3>
                      <p className="text-sm text-slate-600">Update your personal information.</p>
                    </div>
                    
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={profileForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          disabled={updateProfileMutation.isPending}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                          {updateProfileMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Update Profile
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>

                {/* Password Tab */}
                <TabsContent value="password" className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Change Password</h3>
                      <p className="text-sm text-slate-600">Update your account password.</p>
                    </div>
                    
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" />
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
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" />
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
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input {...field} type="password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          disabled={changePasswordMutation.isPending}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                          {changePasswordMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Changing...
                            </>
                          ) : (
                            <>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Change Password
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>

                {/* Theme Tab */}
                <TabsContent value="theme" className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Theme Preferences</h3>
                      <p className="text-sm text-slate-600">Choose your preferred theme appearance.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${theme === 'light' ? 'ring-2 ring-indigo-500' : ''}`}
                        onClick={() => handleThemeChange('light')}
                      >
                        <CardContent className="p-4 flex flex-col items-center space-y-2">
                          <Sun className="h-8 w-8 text-yellow-500" />
                          <h4 className="font-semibold">Light</h4>
                          <p className="text-sm text-slate-600 text-center">Clean and bright interface</p>
                          {theme === 'light' && <Badge variant="default">Active</Badge>}
                        </CardContent>
                      </Card>
                      
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${theme === 'dark' ? 'ring-2 ring-indigo-500' : ''}`}
                        onClick={() => handleThemeChange('dark')}
                      >
                        <CardContent className="p-4 flex flex-col items-center space-y-2">
                          <Moon className="h-8 w-8 text-slate-600" />
                          <h4 className="font-semibold">Dark</h4>
                          <p className="text-sm text-slate-600 text-center">Easy on the eyes</p>
                          {theme === 'dark' && <Badge variant="default">Active</Badge>}
                        </CardContent>
                      </Card>
                      
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${theme === 'system' ? 'ring-2 ring-indigo-500' : ''}`}
                        onClick={() => handleThemeChange('system')}
                      >
                        <CardContent className="p-4 flex flex-col items-center space-y-2">
                          <Monitor className="h-8 w-8 text-slate-600" />
                          <h4 className="font-semibold">System</h4>
                          <p className="text-sm text-slate-600 text-center">Match system preference</p>
                          {theme === 'system' && <Badge variant="default">Active</Badge>}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}