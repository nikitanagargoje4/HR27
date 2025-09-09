import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/app-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DepartmentForm } from "@/components/departments/department-form";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Building2, 
  TrendingUp,
  BarChart3,
  Target,
  Settings,
  Eye,
  ArrowUpRight,
  ChevronRight,
  Briefcase
} from "lucide-react";
import { Department, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ColumnDef } from "@tanstack/react-table";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEmployeesOpen, setIsEmployeesOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  // Fetch departments data
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  
  // Fetch all employees data
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });
  
  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Department deleted",
        description: "The department has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete department: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handler for the edit button
  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setIsEditOpen(true);
  };
  
  // Handler for the delete button
  const handleDelete = (id: number) => {
    deleteDepartmentMutation.mutate(id);
  };
  
  // Handler for viewing department employees
  const handleViewEmployees = (department: Department) => {
    setSelectedDepartment(department);
    setIsEmployeesOpen(true);
  };
  
  // Get employees for selected department
  const departmentEmployees = selectedDepartment
    ? employees.filter(emp => emp.departmentId === selectedDepartment.id)
    : [];

  // Get department statistics
  const totalEmployees = employees.length;
  const departmentStats = departments.map(dept => ({
    ...dept,
    employeeCount: employees.filter(emp => emp.departmentId === dept.id).length
  }));
  
  // Define table columns
  const columns: ColumnDef<Department>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <div className="text-sm text-slate-600">{row.getValue("description") || "No description"}</div>,
    },
    {
      id: "employees",
      header: "Employees",
      cell: ({ row }) => {
        const empCount = employees.filter(emp => emp.departmentId === row.original.id).length;
        return (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleViewEmployees(row.original)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Users className="h-4 w-4 mr-2" />
            <span>View ({empCount})</span>
          </Button>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleEdit(row.original)}
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
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the department and could affect employees assigned to it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDelete(row.original.id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Executive Header Section */}
        <div className="bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 -mx-6 -mt-6 px-6 py-8 border-b-2 border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-4 rounded-2xl shadow-lg">
                <Building2 className="w-8 h-8 text-teal-700" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                  Department Management
                </h1>
                <p className="text-slate-600 text-lg">
                  Organize and manage your organizational structure
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-xl px-4 py-3 shadow-md border border-slate-200">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-600">Total Departments</div>
                    <div className="text-2xl font-bold text-slate-900">{departments.length}</div>
                  </div>
                </div>
              </div>
              
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 hover:from-teal-700 hover:via-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 h-auto text-white font-semibold">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden">
                  <DepartmentForm 
                    onSuccess={() => {
                      setIsAddOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <div className="text-xs text-blue-600 mt-1">Across all departments</div>
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
                    <div className="text-sm font-medium text-emerald-700 mb-1">Active Departments</div>
                    <div className="text-3xl font-bold text-emerald-900">{departments.length}</div>
                    <div className="text-xs text-emerald-600 mt-1">Operational divisions</div>
                  </div>
                  <div className="bg-emerald-500 p-3 rounded-xl">
                    <Building2 className="w-6 h-6 text-white" />
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
                    <div className="text-sm font-medium text-purple-700 mb-1">Avg per Department</div>
                    <div className="text-3xl font-bold text-purple-900">
                      {departments.length > 0 ? Math.round(totalEmployees / departments.length) : 0}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">Employee distribution</div>
                  </div>
                  <div className="bg-purple-500 p-3 rounded-xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        {/* Executive Department Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center">
              <Target className="w-6 h-6 mr-3 text-teal-600" />
              Department Overview
            </h2>
            <Badge variant="outline" className="text-slate-600 px-3 py-1">
              {departments.length} Active
            </Badge>
          </div>

          {isLoadingDepartments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="animate-pulse border-2 border-slate-200">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="h-6 bg-slate-200 rounded w-32"></div>
                        <div className="h-8 w-8 bg-slate-200 rounded"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departmentStats.map((department, index) => (
                <motion.div
                  key={department.id}
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
                            <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-3 rounded-xl group-hover:from-teal-200 group-hover:to-teal-300 transition-colors duration-300">
                              <Building2 className="w-5 h-5 text-teal-700" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-slate-900 group-hover:text-teal-900 transition-colors duration-300">
                                {department.name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEdit(department)}
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-teal-100"
                            >
                              <Settings className="h-4 w-4 text-teal-600" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                            {department.description || "No description available for this department."}
                          </p>
                        </div>
                        
                        {/* Stats and Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-medium text-slate-700">
                                {department.employeeCount} employee{department.employeeCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEmployees(department)}
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-medium text-xs px-3 py-1 group-hover:shadow-sm transition-all duration-300"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Team
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        {/* Data Table Section */}
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-3 text-teal-600" />
              Detailed Department List
            </h2>
          </div>
          <DataTable 
            columns={columns} 
            data={departments} 
            searchColumn="name"
            searchPlaceholder="Search departments..."
          />
        </div>
        
        {/* Edit department dialog */}
        {selectedDepartment && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden">
              <DepartmentForm 
                department={selectedDepartment}
                onSuccess={() => {
                  setIsEditOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}
        
        {/* Department employees dialog */}
        <Dialog open={isEmployeesOpen} onOpenChange={setIsEmployeesOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <Building2 className="w-5 h-5 mr-2 text-teal-600" />
                Team Members - {selectedDepartment?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {departmentEmployees.length > 0 ? (
                <div className="space-y-3">
                  {departmentEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl bg-gradient-to-r from-slate-50 to-white hover:shadow-md transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                          {employee.firstName?.[0]}{employee.lastName?.[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-lg">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-sm text-slate-600 flex items-center">
                            <span>{employee.email}</span>
                          </div>
                          {employee.position && (
                            <div className="text-xs text-slate-500 mt-1 flex items-center">
                              <Briefcase className="w-3 h-3 mr-1" />
                              {employee.position}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs font-medium">
                          {employee.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600 mb-2">No Team Members</h3>
                  <p className="text-sm">This department doesn't have any employees assigned yet.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}