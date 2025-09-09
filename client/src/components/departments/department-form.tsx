import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Department, insertDepartmentSchema } from "@shared/schema";
import { 
  Loader2, 
  Building2, 
  Users, 
  FileText, 
  CheckCircle2,
  Target,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DepartmentFormProps {
  department?: Department;
  onSuccess: () => void;
}

export function DepartmentForm({ department, onSuccess }: DepartmentFormProps) {
  const { toast } = useToast();
  const isEditing = !!department;
  
  // Create form schema
  const formSchema = insertDepartmentSchema;
  
  type FormValues = z.infer<typeof formSchema>;
  
  // Set up form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: department?.name || "",
      description: department?.description || "",
    },
  });
  
  // Create or update department mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEditing) {
        return await apiRequest(
          "PUT", 
          `/api/departments/${department.id}`, 
          values
        );
      } else {
        return await apiRequest("POST", "/api/departments", values);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Department updated" : "Department created",
        description: isEditing 
          ? "Department information has been updated successfully." 
          : "New department has been created successfully.",
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
    <div className="form-container">
      {/* Executive Header */}
      <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-white -mx-6 -mt-6 px-6 pt-6 pb-6 mb-6 border-b-2 border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              {isEditing ? "Update Department" : "Create New Department"}
            </h2>
            <p className="text-slate-600 text-sm">
              {isEditing 
                ? "Modify department information and organizational structure" 
                : "Set up a new department to organize your workforce"}
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-4 rounded-xl shadow-sm">
              <Building2 className="w-8 h-8 text-teal-700" />
            </div>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5 rounded-t-2xl border-b-2 border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-3 rounded-xl mr-4 shadow-sm">
                  <Briefcase className="w-5 h-5 text-teal-700" />
                </div>
                Department Information
              </h3>
              <p className="text-sm text-slate-600 mt-2 ml-12 font-medium">Basic details and organizational structure</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Department Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold text-slate-700 mb-2 block flex items-center">
                      <Building2 className="w-4 h-4 mr-2 text-teal-600" />
                      Department Name *
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="e.g., Human Resources, Engineering, Marketing" 
                          className="h-12 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200 pl-4"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold text-slate-700 mb-2 block flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-teal-600" />
                      Department Description
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the department's role, responsibilities, and objectives within the organization..." 
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name} 
                        className="resize-none border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200 min-h-[120px]"
                        rows={5}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-slate-500 mt-2 flex items-center">
                      <Target className="w-3 h-3 mr-1" />
                      Include department goals, key functions, and team structure
                    </div>
                  </FormItem>
                )}
              />

              {/* Department Features Info */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Department Benefits</h4>
                    <div className="space-y-2 text-sm text-blue-800">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Organize employees into logical groups</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Streamline reporting and management structure</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>Enable better resource allocation and planning</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Form Navigation */}
          <div className="bg-white border-2 border-slate-200 shadow-lg px-6 py-4 rounded-lg">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-4 space-y-3 space-y-reverse sm:space-y-0">
              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onSuccess}
                  className="w-full sm:w-auto h-11 px-6 border-2 border-slate-300 hover:border-slate-400 font-medium transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>

              <div className="flex space-x-3">
                <Button 
                  type="submit"
                  className={cn(
                    "w-full sm:w-auto h-11 px-8 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl",
                    "bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 hover:from-teal-700 hover:via-teal-700 hover:to-emerald-700"
                  )}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!mutation.isPending && (
                    <Building2 className="mr-2 h-4 w-4" />
                  )}
                  {isEditing ? "Update Department" : "Create Department"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}