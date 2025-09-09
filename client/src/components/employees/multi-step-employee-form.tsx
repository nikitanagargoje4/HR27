import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Department } from "@shared/schema";
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon, User as UserIcon, Building2, CreditCard, Upload, X } from "lucide-react";
import { format, differenceInYears, subYears } from "date-fns";
import { cn } from "@/lib/utils";

interface MultiStepEmployeeFormProps {
  employee?: User;
  departments: Department[];
  onSuccess: () => void;
}

export function MultiStepEmployeeForm({ employee, departments, onSuccess }: MultiStepEmployeeFormProps) {
  const { toast } = useToast();
  const isEditing = !!employee;
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(employee?.photoUrl || null);
  
  // Create dynamic form schema based on editing state
  const formSchema = z.object({
    // Personal Information (Step 1)
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    dateOfBirth: z.date().optional().refine((date) => {
      if (!date) return true; // Optional field
      const age = differenceInYears(new Date(), date);
      return age >= 20;
    }, {
      message: "Age must be more than 20"
    }),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    photoUrl: z.string().optional(),
    
    // Company Details (Step 2)
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: isEditing 
      ? z.string().optional()
      : z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(['admin', 'hr', 'manager', 'employee']),
    departmentId: z.number().nullable(),
    position: z.string().optional(),
    joinDate: z.date().optional(),
    salary: z.number().min(1, "Salary must be greater than 0").optional(),
    
    // Bank Information (Step 3)
    bankAccountNumber: z.string().optional(),
    bankAccountHolderName: z.string().optional(),
    bankName: z.string().optional(),
    bankIFSCCode: z.string().optional(),
    bankAccountType: z.enum(['savings', 'current', 'salary']).optional(),
  });

  type FormValues = z.infer<typeof formSchema>;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      email: employee?.email || "",
      phoneNumber: employee?.phoneNumber || "",
      address: employee?.address || "",
      dateOfBirth: employee?.dateOfBirth ? new Date(employee.dateOfBirth) : undefined,
      gender: employee?.gender || undefined,
      photoUrl: employee?.photoUrl || "",
      username: employee?.username || "",
      password: isEditing ? "" : "",
      role: employee?.role || "employee",
      departmentId: employee?.departmentId || null,
      position: employee?.position || "",
      joinDate: employee?.joinDate ? new Date(employee.joinDate) : undefined,
      salary: employee?.salary || undefined,
      bankAccountNumber: employee?.bankAccountNumber || "",
      bankAccountHolderName: employee?.bankAccountHolderName || "",
      bankName: employee?.bankName || "",
      bankIFSCCode: employee?.bankIFSCCode || "",
      bankAccountType: employee?.bankAccountType || undefined,
    },
  });

  // Calculate age from date of birth
  const calculateAge = (birthDate: Date | undefined): number | null => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), birthDate);
  };

  // Watch the date of birth to calculate age
  const dateOfBirth = form.watch("dateOfBirth");
  const age = calculateAge(dateOfBirth);

  // Handle photo file selection and conversion to base64
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
        form.setValue('photoUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    form.setValue('photoUrl', '');
  };

  // Create or update employee mutation
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      console.log('Mutation function called with values:', values);
      
      if (isEditing) {
        // For editing, remove password if it's empty
        if (!values.password) {
          const { password, ...dataWithoutPassword } = values;
          console.log('Updating without password:', dataWithoutPassword);
          return await apiRequest(
            "PUT", 
            `/api/employees/${employee.id}`, 
            dataWithoutPassword
          );
        } else {
          console.log('Updating with password:', values);
          return await apiRequest(
            "PUT", 
            `/api/employees/${employee.id}`, 
            values
          );
        }
      } else {
        console.log('Creating new employee:', values);
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

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    
    console.log(`Step ${currentStep} validation:`, { isValid, fieldsToValidate });
    
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Smooth scroll to top when moving to next step
      setTimeout(() => {
        const container = document.querySelector('[role="dialog"]') || 
                          document.querySelector('.form-container')?.closest('[data-radix-dialog-content]') ||
                          document.querySelector('[data-radix-dialog-content]');
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Fallback to window scroll
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 150);
    } else if (!isValid) {
      console.log('Validation failed for step', currentStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      // Smooth scroll to top when moving to previous step
      setTimeout(() => {
        const container = document.querySelector('[role="dialog"]') || 
                          document.querySelector('.form-container')?.closest('[data-radix-dialog-content]') ||
                          document.querySelector('[data-radix-dialog-content]');
        if (container) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Fallback to window scroll
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  const onSubmit = (values: FormValues) => {
    console.log('onSubmit called', { values, currentStep, totalSteps, isEditing });
    
    // Only allow submission on the final step
    if (currentStep === totalSteps) {
      console.log('Submitting form...', values);
      mutation.mutate(values);
    } else {
      // If not on final step, go to next step instead
      console.log('Moving to next step...');
      nextStep();
    }
  };

  const getFieldsForStep = (step: number): (keyof FormValues)[] => {
    switch (step) {
      case 1:
        return ['firstName', 'lastName', 'email'];
      case 2:
        // For editing, password is optional, so don't validate it
        return isEditing ? ['username', 'role'] : ['username', 'password', 'role'];
      case 3:
        // Final step - validate all required fields for form submission
        return isEditing ? [] : [];
      default:
        return [];
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 60, scale: 0.95 },
    in: { opacity: 1, x: 0, scale: 1 },
    out: { opacity: 0, x: -60, scale: 0.95 }
  };

  const stepTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 0.8
  };

  const steps = [
    { number: 1, title: "Personal Information", icon: UserIcon },
    { number: 2, title: "Company Details", icon: Building2 },
    { number: 3, title: "Bank Information", icon: CreditCard },
  ];

  return (
    <div className="form-container h-full max-h-[80vh] flex flex-col">
      {/* Executive Header */}
      <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-white px-6 pt-6 pb-6 mb-6 border-b-2 border-slate-200 shadow-sm bg-opacity-95 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              {isEditing ? "Update Employee Profile" : "Create New Employee"}
            </h2>
            <p className="text-slate-600 text-sm">
              {isEditing 
                ? "Modify employee information and account settings" 
                : "Complete all steps to onboard a new team member"}
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">Step {currentStep} of {totalSteps}</div>
              <div className="text-xs text-slate-500 mt-1">{steps[currentStep - 1]?.title}</div>
            </div>
          </div>
        </div>
        
        {/* Enhanced Progress Steps */}
        <div className="relative">
          <div className="flex items-center justify-between relative z-10">
            {steps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center">
                <div className="relative">
                  <div className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-full border-3 shadow-lg transition-all duration-700 transform",
                    currentStep >= step.number
                      ? "bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 border-teal-600 text-white scale-110 shadow-xl shadow-teal-300/50"
                      : currentStep === step.number - 1
                      ? "bg-gradient-to-br from-white to-teal-50 border-teal-400 text-teal-600 shadow-lg scale-105"
                      : "bg-white border-slate-300 text-slate-400 hover:scale-105"
                  )}>
                    {currentStep > step.number ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  {currentStep === step.number && (
                    <div className="absolute -inset-2 rounded-full border-3 border-teal-400 animate-ping opacity-75"></div>
                  )}
                  {currentStep === step.number && (
                    <div className="absolute -inset-1 rounded-full border-2 border-teal-500 animate-pulse"></div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    currentStep >= step.number ? "text-teal-700" : "text-slate-500"
                  )}>
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 max-w-24 leading-tight">
                    {step.number === 1 && "Basic Details"}
                    {step.number === 2 && "Work Profile"}
                    {step.number === 3 && "Financial Info"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Progress Line */}
          <div className="absolute top-7 left-0 right-0 h-2 bg-slate-200 -z-10 mx-7 rounded-full shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-500 transition-all duration-700 ease-out rounded-full shadow-sm"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
        <Form {...form}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
            onKeyDown={(e) => {
              // Prevent form submission on Enter key unless on final step
              if (e.key === 'Enter' && currentStep < totalSteps) {
                e.preventDefault();
                nextStep();
              }
            }}
            className="space-y-4"
          >
          <AnimatePresence mode="wait">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial="initial"
                animate="in"
                exit="out"
                variants={stepVariants}
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-8 py-6 rounded-t-2xl border-b-2 border-slate-100">
                    <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                      <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-3 rounded-xl mr-4 shadow-sm">
                        <UserIcon className="w-6 h-6 text-teal-700" />
                      </div>
                      Personal Information
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 ml-12 font-medium">Essential personal details and contact information</p>
                  </div>
                  <div className="p-6 space-y-6">

                    {/* Photo Upload Section */}
                    <div className="flex flex-col items-center space-y-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                      <div className="text-lg font-bold text-slate-900">Professional Photo</div>
                      
                      {selectedPhoto ? (
                        <div className="relative group">
                              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <img 
                              src={selectedPhoto} 
                              alt="Employee photo" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={removePhoto}
                              className="opacity-0 group-hover:opacity-100 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-200 shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-teal-400 hover:bg-teal-50 transition-colors cursor-pointer group">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="px-4 py-2 text-sm font-medium bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-teal-400 rounded-lg cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          {selectedPhoto ? 'Change Photo' : 'Upload Photo'}
                        </label>
                        {selectedPhoto && (
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 text-center max-w-xs">
                        <span className="font-medium">Professional headshot recommended</span><br/>
                        JPG, PNG, GIF • Maximum 2MB
                      </p>
                    </div>
                
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">First Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter first name" 
                                className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
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
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Last Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter last name" 
                                className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
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
                          <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter professional email address" 
                              className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Date of Birth</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full h-11 pl-3 text-left font-medium border-2 border-slate-200 hover:border-teal-400 rounded-lg transition-all duration-200",
                                      !field.value && "text-slate-500"
                                    )}
                                  >
                                    {field.value ? format(field.value, "PPP") : "Select date"}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => {
                                    const today = new Date();
                                    const twentyYearsAgo = subYears(today, 20);
                                    return date > twentyYearsAgo || date < new Date("1900-01-01");
                                  }}
                                  yearRange={{ from: 1950, to: 2002 }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                            {age !== null && (
                              <p className="text-sm text-emerald-600 mt-1 font-medium">
                                ✓ Age: {age} years
                              </p>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Gender</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-500 rounded-lg font-medium transition-all duration-200">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter phone number" 
                              className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
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
                          <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Address</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter full residential address" 
                              className="min-h-[100px] resize-none border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Company Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial="initial"
                animate="in"
                exit="out"
                variants={stepVariants}
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-8 py-6 rounded-t-2xl border-b-2 border-slate-100">
                    <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                      <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-3 rounded-xl mr-4 shadow-sm">
                        <Building2 className="w-5 h-5 text-teal-600" />
                      </div>
                      Company Details
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 ml-10">Role, department and employment information</p>
                  </div>
                  <div className="p-6 space-y-6">

                    {/* Account Credentials Section */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        Login Credentials
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Username *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter unique username" 
                                  className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
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
                              <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">
                                {isEditing ? "New Password (optional)" : "Password *"}
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder={isEditing ? "Leave blank to keep current" : "Enter secure password"} 
                                  className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Role & Department Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Access Level *</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-500 rounded-lg font-medium transition-all duration-200">
                                  <SelectValue placeholder="Select access level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="admin">Admin - Full System Access</SelectItem>
                                <SelectItem value="hr">HR - Human Resources Management</SelectItem>
                                <SelectItem value="manager">Manager - Team Management</SelectItem>
                                <SelectItem value="employee">Employee - Standard Access</SelectItem>
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
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Department</FormLabel>
                            <Select 
                              value={field.value?.toString() || "none"} 
                              onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-500 rounded-lg font-medium transition-all duration-200">
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Department Assigned</SelectItem>
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

                    {/* Position & Joining Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Job Title/Position</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. Senior Software Engineer" 
                                className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="joinDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Date of Joining</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full h-11 pl-3 text-left font-medium border-2 border-slate-200 hover:border-teal-400 rounded-lg transition-all duration-200",
                                      !field.value && "text-slate-500"
                                    )}
                                  >
                                    {field.value ? format(field.value, "PPP") : "Select joining date"}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                  yearRange={{ from: 2022, to: new Date().getFullYear() + 2 }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Salary Section */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-bold text-green-900 mb-2 block flex items-center">
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                              </svg>
                              Annual Salary (₹)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g. 850000" 
                                className="h-11 border-2 border-green-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-green-700 mt-1">Enter annual salary in Indian Rupees</p>
                          </FormItem>
                        )}
                      />
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Bank Information */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial="initial"
                animate="in"
                exit="out"
                variants={stepVariants}
                transition={stepTransition}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-8 py-6 rounded-t-2xl border-b-2 border-slate-100">
                    <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                      <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-3 rounded-xl mr-4 shadow-sm">
                        <CreditCard className="w-5 h-5 text-teal-600" />
                      </div>
                      Bank Information
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 ml-10">Banking details for salary processing and payroll management</p>
                  </div>
                  <div className="p-6 space-y-6">

                    {/* Account Details Section */}
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                      <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                        </svg>
                        Bank Account Details
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bankAccountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Bank Account Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter account number" 
                                  className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bankAccountHolderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Account Holder Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter account holder name" 
                                  className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Bank Details Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Bank Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. State Bank of India" 
                                className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bankIFSCCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">IFSC Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. SBIN0001234" 
                                className="h-11 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-lg text-sm font-medium transition-all duration-200"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Account Type Section */}
                    <FormField
                      control={form.control}
                      name="bankAccountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-slate-700 mb-2 block">Account Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-11 border-2 border-slate-200 focus:border-teal-500 rounded-lg font-medium transition-all duration-200">
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="savings">Savings Account</SelectItem>
                              <SelectItem value="current">Current Account</SelectItem>
                              <SelectItem value="salary">Salary Account</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Info Note */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex">
                        <svg className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                        <div className="ml-3">
                          <h4 className="text-sm font-semibold text-blue-900">Important Information</h4>
                          <p className="text-sm text-blue-800 mt-1">
                            Bank details are used for salary payments and are kept confidential. Ensure all information is accurate to avoid payment delays.
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>
      </div>
      
      {/* Form Navigation - Fixed at bottom */}
      <div className="bg-white border-t-2 border-slate-200 shadow-lg px-6 py-6 bg-opacity-95 backdrop-blur-sm flex-shrink-0">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
          <div className="flex space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSuccess}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`Next button clicked on step ${currentStep}`);
                  nextStep();
                }}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="submit"
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
                disabled={mutation.isPending}
                onClick={(e) => {
                  console.log('Submit button clicked', { currentStep, totalSteps, isEditing });
                  const formData = new FormData();
                  const values = form.getValues();
                  Object.entries(values).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                      formData.append(key, String(value));
                    }
                  });
                  form.handleSubmit(onSubmit)(e);
                }}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Employee" : "Create Employee"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}