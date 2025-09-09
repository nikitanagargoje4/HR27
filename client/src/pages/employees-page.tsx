import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MultiStepEmployeeForm } from "@/components/employees/multi-step-employee-form";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building2, 
  User as UserIcon, 
  Search,
  Users,
  TrendingUp,
  BarChart3,
  Shield,
  Target,
  Settings,
  ChevronRight,
  Grid3X3,
  List,
  Filter,
  Briefcase,
  Crown,
  Star,
  Award
} from "lucide-react";
import { User, Department } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function EmployeesPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Fetch employees data
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });
  
  // Fetch departments for the form
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  
  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Employee deleted",
        description: "The employee has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete employee: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler for the edit button
  const handleEdit = (employee: User) => {
    setSelectedEmployee(employee);
    setIsEditOpen(true);
  };

  // Handler for the view button
  const handleView = (employee: User) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
  };
  
  // Handler for the delete button
  const handleDelete = (id: number) => {
    deleteEmployeeMutation.mutate(id);
  };

  // Filter employees based on search query
  const filteredEmployees = employees.filter((employee) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      employee.firstName.toLowerCase().includes(searchLower) ||
      employee.lastName.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      (employee.position?.toLowerCase().includes(searchLower)) ||
      employee.role.toLowerCase().includes(searchLower)
    );
  });

  // Calculate statistics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => emp.isActive).length;
  const roleStats = {
    admin: employees.filter(emp => emp.role === 'admin').length,
    hr: employees.filter(emp => emp.role === 'hr').length,
    manager: employees.filter(emp => emp.role === 'manager').length,
    employee: employees.filter(emp => emp.role === 'employee').length
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />;
      case 'hr': return <Users className="w-4 h-4" />;
      case 'manager': return <Star className="w-4 h-4" />;
      default: return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return "default";
      case 'hr': return "secondary";
      case 'manager': return "outline";
      default: return "outline";
    }
  };

  const EmployeeCard = ({ employee, index }: { employee: User; index: number }) => {
    const department = departments.find(d => d.id === employee.departmentId);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <Card className="group border-2 border-slate-200 shadow-lg hover:shadow-2xl hover:border-teal-300 transition-all duration-300 bg-gradient-to-br from-white via-slate-50 to-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardContent className="p-6 relative z-10">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-14 w-14 border-3 border-white shadow-lg">
                    <AvatarImage 
                      src={employee.photoUrl || ""} 
                      alt={`${employee.firstName} ${employee.lastName}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 text-lg font-bold">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-900 transition-colors duration-300">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-slate-600 font-medium">
                      {employee.position || "No Position"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleView(employee)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-teal-100"
                  >
                    <Eye className="h-4 w-4 text-teal-600" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEdit(employee)}
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-slate-100"
                  >
                    <Settings className="h-4 w-4 text-slate-600" />
                  </Button>
                </div>
              </div>
              
              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-teal-500" />
                  <span className="truncate">{employee.email}</span>
                </div>
                {department && (
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Building2 className="w-4 h-4 text-teal-500" />
                    <span>{department.name}</span>
                  </div>
                )}
              </div>
              
              {/* Badges and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <Badge variant={getRoleBadgeVariant(employee.role)} className="text-xs font-medium">
                    {getRoleIcon(employee.role)}
                    <span className="ml-1 capitalize">{employee.role}</span>
                  </Badge>
                  <Badge variant={employee.isActive ? "default" : "destructive"} className="text-xs">
                    {employee.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(employee)}
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-medium text-xs px-3 py-1 group-hover:shadow-sm transition-all duration-300"
                >
                  View Profile
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Executive Header Section */}
        <div className="bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 -mx-6 -mt-6 px-6 py-8 border-b-2 border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-4 rounded-2xl shadow-lg">
                <Users className="w-8 h-8 text-teal-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                  Employee Management
                </h1>
                <p className="text-slate-600 text-lg">
                  Manage your workforce and team members
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-xl px-4 py-3 shadow-md border border-slate-200">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-600">Total Team Members</div>
                    <div className="text-2xl font-bold text-slate-900">{totalEmployees}</div>
                  </div>
                </div>
              </div>
              
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 hover:from-teal-700 hover:via-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 h-auto text-white font-semibold">
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
                  <MultiStepEmployeeForm 
                    departments={departments}
                    onSuccess={() => {
                      setIsAddOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-blue-700 mb-1">Total Employees</div>
                    <div className="text-3xl font-bold text-blue-900">{totalEmployees}</div>
                    <div className="text-xs text-blue-600 mt-1">All team members</div>
                  </div>
                  <div className="bg-blue-500 p-3 rounded-xl">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-emerald-700 mb-1">Active Members</div>
                    <div className="text-3xl font-bold text-emerald-900">{activeEmployees}</div>
                    <div className="text-xs text-emerald-600 mt-1">Currently working</div>
                  </div>
                  <div className="bg-emerald-500 p-3 rounded-xl">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-purple-700 mb-1">Departments</div>
                    <div className="text-3xl font-bold text-purple-900">{departments.length}</div>
                    <div className="text-xs text-purple-600 mt-1">Active divisions</div>
                  </div>
                  <div className="bg-purple-500 p-3 rounded-xl">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-orange-700 mb-1">Leadership</div>
                    <div className="text-3xl font-bold text-orange-900">{roleStats.admin + roleStats.manager}</div>
                    <div className="text-xs text-orange-600 mt-1">Admins & Managers</div>
                  </div>
                  <div className="bg-orange-500 p-3 rounded-xl">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search and View Controls */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search employees by name, email, or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-2 border-slate-200 focus:border-teal-500 rounded-lg text-sm font-medium"
                />
              </div>
              <div className="flex items-center text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                <span className="font-medium">{filteredEmployees.length}</span>
                <span className="ml-1">employee{filteredEmployees.length !== 1 ? 's' : ''} found</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-10"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-10"
              >
                <List className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>
          </div>
        </div>
        
        {/* Employee Display */}
        {isLoadingEmployees ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse border-2 border-slate-200">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-14 w-14 bg-slate-200 rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-6 bg-slate-200 rounded w-20"></div>
                      <div className="h-8 bg-slate-200 rounded w-24"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-slate-200 shadow-lg">
            <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserIcon className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {searchQuery ? "No employees found" : "No employees yet"}
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? "Try adjusting your search terms or check the spelling"
                : "Get started by adding your first team member to the organization"
              }
            </p>
            {!searchQuery && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Employee
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee, index) => (
              <EmployeeCard key={employee.id} employee={employee} index={index} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-16 font-semibold">Photo</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Position</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-32 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const department = departments.find(d => d.id === employee.departmentId);
                  return (
                    <TableRow key={employee.id} className="hover:bg-slate-50 transition-colors duration-200">
                      {/* Profile Picture */}
                      <TableCell>
                        <Avatar className="h-10 w-10 border-2 border-slate-200">
                          <AvatarImage 
                            src={employee.photoUrl || ""} 
                            alt={`${employee.firstName} ${employee.lastName}`}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-700 text-sm font-bold">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-medium text-slate-900">
                        {employee.firstName} {employee.lastName}
                      </TableCell>

                      {/* Email */}
                      <TableCell className="text-slate-600">
                        {employee.email}
                      </TableCell>

                      {/* Position */}
                      <TableCell className="text-slate-600">
                        {employee.position || "No Position"}
                      </TableCell>

                      {/* Department */}
                      <TableCell className="text-slate-600">
                        {department?.name || "Unassigned"}
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(employee.role)} className="capitalize text-xs font-medium">
                          {getRoleIcon(employee.role)}
                          <span className="ml-1">{employee.role}</span>
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "destructive"} className="text-xs">
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(employee)}
                            className="h-8 w-8 p-0 hover:bg-teal-50 hover:text-teal-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            className="h-8 w-8 p-0 hover:bg-slate-50 hover:text-slate-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{employee.firstName} {employee.lastName}</strong>? This action cannot be undone and will permanently remove all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(employee.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* View Employee Modal */}
        {selectedEmployee && (
          <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center">
                  <UserIcon className="w-6 h-6 mr-3 text-teal-600" />
                  Employee Profile
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-8">
                {/* Header Section with Photo */}
                <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-teal-50 -mx-6 -mt-6 px-6 py-8 border-b-2 border-slate-200">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {selectedEmployee.photoUrl ? (
                        <img 
                          src={selectedEmployee.photoUrl} 
                          alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
                          <UserIcon className="w-16 h-16 text-teal-600" />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center md:text-left flex-1">
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </h2>
                      <p className="text-lg text-slate-600 mb-3 flex items-center justify-center md:justify-start">
                        <Briefcase className="w-5 h-5 mr-2 text-teal-600" />
                        {selectedEmployee.position || "No Position Assigned"}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <Badge variant={getRoleBadgeVariant(selectedEmployee.role)} className="font-medium">
                          {getRoleIcon(selectedEmployee.role)}
                          <span className="ml-1 capitalize">{selectedEmployee.role}</span>
                        </Badge>
                        <Badge variant={selectedEmployee.isActive ? "default" : "destructive"}>
                          {selectedEmployee.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="secondary">
                          ID: {selectedEmployee.id}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-teal-600" />
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                        <Mail className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Email</p>
                          <p className="text-slate-900 font-semibold">{selectedEmployee.email}</p>
                        </div>
                      </div>
                      
                      {selectedEmployee.phoneNumber && (
                        <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                          <Phone className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Phone</p>
                            <p className="text-slate-900 font-semibold">{selectedEmployee.phoneNumber}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.address && (
                        <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Address</p>
                            <p className="text-slate-900 font-semibold">{selectedEmployee.address}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.dateOfBirth && (
                        <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Date of Birth</p>
                            <p className="text-slate-900 font-semibold">{format(new Date(selectedEmployee.dateOfBirth), "PPP")}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.gender && (
                        <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                          <UserIcon className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Gender</p>
                            <p className="text-slate-900 font-semibold capitalize">{selectedEmployee.gender.replace('_', ' ')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Company Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 flex items-center">
                      <Building2 className="w-5 h-5 mr-2 text-teal-600" />
                      Company Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                        <Building2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Department</p>
                          <p className="text-slate-900 font-semibold">
                            {departments.find(d => d.id === selectedEmployee.departmentId)?.name || "Unassigned"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                        <UserIcon className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">Username</p>
                          <p className="text-slate-900 font-semibold">{selectedEmployee.username}</p>
                        </div>
                      </div>
                      
                      {selectedEmployee.joinDate && (
                        <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">Date of Joining</p>
                            <p className="text-slate-900 font-semibold">{format(new Date(selectedEmployee.joinDate), "PPP")}</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedEmployee.salary && (
                        <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                          <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-emerald-700">Annual Salary</p>
                            <p className="text-emerald-900 font-bold text-lg">₹{selectedEmployee.salary.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Information (if available) */}
                {(selectedEmployee.bankAccountNumber || selectedEmployee.bankName) && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-200 pb-2 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      Bank Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedEmployee.bankAccountNumber && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700">Account Number</p>
                          <p className="text-slate-900 font-mono font-semibold">{selectedEmployee.bankAccountNumber}</p>
                        </div>
                      )}
                      {selectedEmployee.bankName && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700">Bank Name</p>
                          <p className="text-slate-900 font-semibold">{selectedEmployee.bankName}</p>
                        </div>
                      )}
                      {selectedEmployee.bankIFSCCode && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700">IFSC Code</p>
                          <p className="text-slate-900 font-mono font-semibold">{selectedEmployee.bankIFSCCode}</p>
                        </div>
                      )}
                      {selectedEmployee.bankAccountHolderName && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700">Account Holder</p>
                          <p className="text-slate-900 font-semibold">{selectedEmployee.bankAccountHolderName}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t-2 border-slate-200">
                  <Button
                    onClick={() => {
                      setIsViewOpen(false);
                      handleEdit(selectedEmployee);
                    }}
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 flex-1 font-semibold"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Employee
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsViewOpen(false)}
                    className="flex-1 border-2"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Employee Modal */}
        {selectedEmployee && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
              <MultiStepEmployeeForm 
                employee={selectedEmployee}
                departments={departments}
                onSuccess={() => {
                  setIsEditOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}