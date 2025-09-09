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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Department, insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";

interface EmployeeFormProps {
  employee?: User;
  departments: Department[];
  onSuccess: () => void;
}

export function EmployeeForm({ employee, departments, onSuccess }: EmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = !!employee;
  
  // Create form schema extending the insertUserSchema
  // Password is required for new employees but optional when editing
  const formSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: isEditing 
      ? z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal(''))
      : z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email("Invalid email address"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.enum(['admin', 'hr', 'manager', 'employee']),
    departmentId: z.number().nullable(),
    position: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    isActive: z.boolean().default(true),
  });
  
  type FormValues = z.infer<typeof formSchema>;
  
  // Set up form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: employee?.username || "",
      password: "",
      email: employee?.email || "",
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      role: employee?.role || "employee",
      departmentId: employee?.departmentId || null,
      position: employee?.position || "",
      phoneNumber: employee?.phoneNumber || "",
      address: employee?.address || "",
      isActive: employee?.isActive ?? true,
    },
  });
  
  // Create or update employee mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Remove empty password when editing
      if (isEditing && !values.password) {
        const { password, ...dataWithoutPassword } = values;
        return await apiRequest(
          "PUT", 
          `/api/employees/${employee.id}`, 
          dataWithoutPassword
        );
      }
      
      if (isEditing) {
        return await apiRequest(
          "PUT", 
          `/api/employees/${employee.id}`, 
          values
        );
      } else {
        return await apiRequest("POST", "/api/register", values);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Employee updated" : "Employee created",
        description: isEditing 
          ? "Employee information has been updated successfully." 
          : "New employee has been created successfully.",
      });
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
    mutation.mutate(values);
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto px-1">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-lg font-medium text-slate-900">Personal Information</h3>
              <p className="text-sm text-slate-500">Basic details about the employee</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">First Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter first name" 
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Last Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter last name" 
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Email Address *</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter email address" 
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter phone number" 
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter full address" 
                      className="min-h-[80px] resize-none border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Account Information Section */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-lg font-medium text-slate-900">Account Information</h3>
              <p className="text-sm text-slate-500">Login credentials and access details</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Username *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter username" 
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      {isEditing ? "New Password (optional)" : "Password *"}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={isEditing ? "Leave blank to keep current" : "Enter password"} 
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Organization Information Section */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-lg font-medium text-slate-900">Organization Details</h3>
              <p className="text-sm text-slate-500">Role, department, and position information</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Role *</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">Department</FormLabel>
                    <Select 
                      value={field.value?.toString() || "none"} 
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id.toString()}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700">Position/Job Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter position or job title" 
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 bg-slate-50">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-medium text-slate-700">Account Status</FormLabel>
                        <p className="text-xs text-slate-500">
                          {field.value ? "Employee account is active" : "Employee account is disabled"}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            )}
          </div>
          
          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0 pt-6 border-t border-slate-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSuccess}
              className="w-full sm:w-auto h-10 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="w-full sm:w-auto h-10 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Employee" : "Create Employee"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
