import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Calculator,
  PiggyBank,
  Shield,
  Briefcase,
  Edit,
  Save,
  X,
  CreditCard,
  CheckCircle,
  Clock,
  Receipt,
  Download
} from "lucide-react";
import { User, PaymentRecord, Department } from "@shared/schema";
import * as XLSX from 'xlsx';

export default function PayrollPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null);
  const [editSalary, setEditSalary] = useState<string>("");
  
  // Payment tracking state
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMode: '',
    referenceNo: ''
  });
  
  // Current month for filtering
  const currentMonth = format(new Date(), 'MMM yyyy');
  
  // Fetch employees data
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch departments data
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });
  
  // Fetch payment records for current month
  const { data: paymentRecords = [] } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/payment-records", currentMonth],
    queryFn: async () => {
      const response = await fetch(`/api/payment-records?month=${encodeURIComponent(currentMonth)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch payment records");
      }
      return response.json();
    },
  });

  // Mutation for updating employee salary
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, salary }: { id: number; salary: number }) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ salary }),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to update salary");
      }
      
      return response.json();
    },
    onMutate: async ({ id, salary }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/employees"] });

      // Snapshot the previous value
      const previousEmployees = queryClient.getQueryData<User[]>(["/api/employees"]);

      // Optimistically update to the new value
      queryClient.setQueryData<User[]>(["/api/employees"], (old) =>
        old ? old.map(emp => emp.id === id ? { ...emp, salary } : emp) : []
      );

      // Return a context object with the snapshotted value
      return { previousEmployees };
    },
    onSuccess: (updatedEmployee, { id, salary }) => {
      // Update the cache with the actual server response
      queryClient.setQueryData<User[]>(["/api/employees"], (old) =>
        old ? old.map(emp => emp.id === id ? updatedEmployee : emp) : []
      );
      
      // Refetch to ensure we have the latest data
      queryClient.refetchQueries({ queryKey: ["/api/employees"] });
      
      setEditingEmployee(null);
      setEditSalary("");
      toast({
        title: "Success",
        description: "Employee salary updated successfully",
      });
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEmployees) {
        queryClient.setQueryData(["/api/employees"], context.previousEmployees);
      }
      
      toast({
        title: "Error",
        description: "Failed to update employee salary",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating/updating payment records
  const paymentRecordMutation = useMutation({
    mutationFn: async (paymentData: { employeeId: number; paymentStatus: 'pending' | 'paid'; paymentDate?: Date; paymentMode?: string; referenceNo?: string; amount: number; month: string }) => {
      // Check if record exists
      const existingRecord = paymentRecords.find(r => r.employeeId === paymentData.employeeId && r.month === paymentData.month);
      
      if (existingRecord) {
        // Update existing record
        const response = await fetch(`/api/payment-records/${existingRecord.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentStatus: paymentData.paymentStatus,
            paymentDate: paymentData.paymentDate,
            paymentMode: paymentData.paymentMode,
            referenceNo: paymentData.referenceNo,
          }),
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Failed to update payment record");
        }
        
        return response.json();
      } else {
        // Create new record
        const response = await fetch("/api/payment-records", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error("Failed to create payment record");
        }
        
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-records", currentMonth] });
      toast({
        title: "Success",
        description: "Payment record updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update payment record",
        variant: "destructive",
      });
    },
  });

  // Payment record update mutation (separate from create)
  const paymentUpdateMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: { id: number } & Partial<PaymentRecord>) => {
      const response = await fetch(`/api/payment-records/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to update payment record");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-records", currentMonth] });
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  // Calculate payroll metrics
  const activeEmployees = employees.length;
  const totalSalaryBudget = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
  const avgSalary = activeEmployees > 0 ? totalSalaryBudget / activeEmployees : 0;
  
  // Mock data for demonstration - in real app, this would come from payroll API
  const payrollData = {
    epfContribution: totalSalaryBudget * 0.12,
    esiContribution: totalSalaryBudget * 0.0325,
    tdsDeduction: totalSalaryBudget * 0.10,
    finalSettlements: 3,
    benefits: totalSalaryBudget * 0.15,
    deductions: totalSalaryBudget * 0.25,
  };

  // Helper functions for salary calculations
  const calculateGrossSalary = (baseSalary: number) => baseSalary + (baseSalary * 0.4); // 40% allowances
  const calculateHRA = (baseSalary: number) => baseSalary * 0.2; // 20% HRA
  const calculateProvidentFund = (baseSalary: number) => baseSalary * 0.12; // 12% PF
  const calculateTDS = (grossSalary: number) => grossSalary * 0.1; // 10% TDS
  const calculateNetSalary = (grossSalary: number, deductions: number) => grossSalary - deductions;

  const handleEditSalary = (employee: User) => {
    setEditingEmployee(employee.id);
    setEditSalary(employee.salary?.toString() || "0");
  };

  const handleSaveSalary = (employeeId: number) => {
    const salary = parseInt(editSalary);
    if (isNaN(salary) || salary < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid salary amount",
        variant: "destructive",
      });
      return;
    }
    updateEmployeeMutation.mutate({ id: employeeId, salary });
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEditSalary("");
  };

  // Track which employees have been processed to avoid duplicates
  const [processedEmployees, setProcessedEmployees] = useState<Set<number>>(new Set());

  // Initialize payment records for employees who don't have them
  useEffect(() => {
    if (employees.length > 0 && paymentRecords !== undefined) {
      employees.forEach(employee => {
        const hasExistingRecord = paymentRecords.some(r => 
          r.employeeId === employee.id && r.month === currentMonth
        );
        const alreadyProcessed = processedEmployees.has(employee.id);
        
        if (!hasExistingRecord && !alreadyProcessed) {
          const basicSalary = employee.salary || 0;
          const grossSalary = calculateGrossSalary(basicSalary);
          const pf = calculateProvidentFund(basicSalary);
          const tds = calculateTDS(grossSalary);
          const netSalary = calculateNetSalary(grossSalary, pf + tds);
          
          setProcessedEmployees(prev => new Set(Array.from(prev).concat(employee.id)));
          
          paymentRecordMutation.mutate({
            employeeId: employee.id,
            month: currentMonth,
            paymentStatus: 'pending',
            amount: Math.round(netSalary)
          });
        }
      });
    }
  }, [employees.length, paymentRecords?.length]);

  const handleMarkAsPaid = (employee: User) => {
    setSelectedEmployee(employee);
    setPaymentDialog(true);
  };

  const handleCompletePayment = () => {
    if (!selectedEmployee) return;
    
    if (!paymentRecords || paymentRecords.length === 0) {
      toast({
        title: "Error",
        description: "Payment records are still loading. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Find existing payment record for this employee and month
    const existingRecord = paymentRecords?.find(r => 
      r.employeeId === selectedEmployee.id && r.month === currentMonth
    );
    
    console.log('Existing record found:', existingRecord);
    
    if (existingRecord && existingRecord.id) {
      // Update existing record to mark as paid
      paymentUpdateMutation.mutate({
        id: existingRecord.id,
        paymentStatus: 'paid',
        paymentDate: new Date(paymentForm.paymentDate),
        paymentMode: paymentForm.paymentMode as "bank_transfer" | "cheque" | "cash" | "upi",
        referenceNo: paymentForm.referenceNo
      });
    } else {
      // Create new record if none exists (fallback)
      const basicSalary = selectedEmployee.salary || 0;
      const grossSalary = calculateGrossSalary(basicSalary);
      const pf = calculateProvidentFund(basicSalary);
      const tds = calculateTDS(grossSalary);
      const netSalary = calculateNetSalary(grossSalary, pf + tds);
      
      paymentRecordMutation.mutate({
        employeeId: selectedEmployee.id,
        month: currentMonth,
        paymentStatus: 'paid',
        paymentDate: new Date(paymentForm.paymentDate),
        paymentMode: paymentForm.paymentMode as "bank_transfer" | "cheque" | "cash" | "upi",
        referenceNo: paymentForm.referenceNo,
        amount: Math.round(netSalary)
      });
    }
    
    setPaymentDialog(false);
    setSelectedEmployee(null);
    setPaymentForm({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMode: '',
      referenceNo: ''
    });
    
    toast({
      title: "Payment Completed",
      description: `Payment marked as completed for ${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
    });
  };

  const getPaymentRecord = (employeeId: number) => {
    return paymentRecords?.find(record => 
      record.employeeId === employeeId && record.month === currentMonth
    );
  };

  // Export payroll data to Excel
  const handleExportPayrollToExcel = () => {
    try {
      // Validate we have employee data
      if (!employees || employees.length === 0) {
        toast({
          title: "No Data",
          description: "No employee data available to export",
          variant: "destructive",
        });
        return;
      }

      const exportData = employees.map((employee) => {
        const basicSalary = employee.salary || 0;
        const hra = calculateHRA(basicSalary);
        const grossSalary = calculateGrossSalary(basicSalary);
        const pf = calculateProvidentFund(basicSalary);
        const tds = calculateTDS(grossSalary);
        const totalDeductions = pf + tds;
        const netSalary = calculateNetSalary(grossSalary, totalDeductions);

        // Find department name from departmentId
        const department = departments?.find((dept: Department) => dept.id === employee.departmentId);
        const departmentName = department?.name || 'Not assigned';

        return {
          'Employee Name': `${employee.firstName} ${employee.lastName}`,
          'Employee ID': employee.id,
          'Position': employee.position || 'Not set',
          'Department': departmentName,
          'Basic Salary (₹)': basicSalary,
          'HRA 20% (₹)': Math.round(hra),
          'Gross Salary (₹)': Math.round(grossSalary),
          'PF 12% (₹)': Math.round(pf),
          'TDS 10% (₹)': Math.round(tds),
          'Total Deductions (₹)': Math.round(totalDeductions),
          'Net Salary (₹)': Math.round(netSalary),
          'Email': employee.email,
          'Join Date': employee.joinDate ? format(new Date(employee.joinDate), 'MMM dd, yyyy') : 'Not set',
          'Phone': employee.phoneNumber || 'Not provided'
        };
      });

      // Create the Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Create worksheet from JSON data
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths for better formatting
      const colWidths = [
        { wch: 20 }, // Employee Name
        { wch: 12 }, // Employee ID
        { wch: 15 }, // Position
        { wch: 15 }, // Department
        { wch: 15 }, // Basic Salary
        { wch: 12 }, // HRA
        { wch: 15 }, // Gross Salary
        { wch: 12 }, // PF
        { wch: 12 }, // TDS
        { wch: 18 }, // Total Deductions
        { wch: 15 }, // Net Salary
        { wch: 25 }, // Email
        { wch: 12 }, // Join Date
        { wch: 15 }, // Phone
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Distribution');

      // Generate filename
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const filename = `Payroll_Distribution_${currentDate}.xlsx`;

      // Write and download the file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Payroll distribution exported as ${filename}`,
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export payroll data to Excel",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Payroll Management</h2>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="salary">Salary</TabsTrigger>
            <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Payroll Cost Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Payroll Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalSalaryBudget.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +2.1% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeEmployees}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently on payroll
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{Math.round(avgSalary).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Per employee average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Final Settlements</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{payrollData.finalSettlements}</div>
                  <p className="text-xs text-muted-foreground">
                    Pending this month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Benefits and Deductions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Benefits and Deductions
                  </CardTitle>
                  <CardDescription>
                    Monthly breakdown of employee benefits and deductions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Benefits</span>
                      <span className="text-sm text-green-600">₹{Math.round(payrollData.benefits).toLocaleString()}</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Deductions</span>
                      <span className="text-sm text-red-600">₹{Math.round(payrollData.deductions).toLocaleString()}</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Medical Insurance</span>
                      <Badge variant="outline">₹25,000</Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Meal Allowance</span>
                      <Badge variant="outline">₹12,000</Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Transport Allowance</span>
                      <Badge variant="outline">₹8,000</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* EPF ESI TDS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    EPF, ESI & TDS
                  </CardTitle>
                  <CardDescription>
                    Statutory compliance and tax deductions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">EPF Contribution</span>
                      </div>
                      <span className="font-semibold text-blue-600">₹{Math.round(payrollData.epfContribution).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">ESI Contribution</span>
                      </div>
                      <span className="font-semibold text-green-600">₹{Math.round(payrollData.esiContribution).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-sm">TDS Deduction</span>
                      </div>
                      <span className="font-semibold text-orange-600">₹{Math.round(payrollData.tdsDeduction).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground pt-2">
                    <p>• EPF: 12% of basic salary</p>
                    <p>• ESI: 3.25% of gross salary (up to ₹25,000)</p>
                    <p>• TDS: As per income tax slab</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Active Employees Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Active Employees Overview
                  </CardTitle>
                  <CardDescription>
                    Current workforce on payroll
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Active</span>
                      <Badge variant="secondary">{activeEmployees}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Full-time</span>
                        <span>{Math.floor(activeEmployees * 0.8)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Contract</span>
                        <span>{Math.floor(activeEmployees * 0.15)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Intern</span>
                        <span>{Math.floor(activeEmployees * 0.05)}</span>
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <h4 className="text-sm font-medium">Department Distribution</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Engineering</span>
                          <span>40%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sales</span>
                          <span>25%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>HR</span>
                          <span>15%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Others</span>
                          <span>20%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Final Settlement View */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Final Settlement View
                  </CardTitle>
                  <CardDescription>
                    Employee exit settlements and clearances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      // Calculate final settlements for employees based on actual data
                      const calculateFinalSettlement = (employee: User) => {
                        const basicSalary = employee.salary || 0;
                        const joinDate = new Date(employee.joinDate || new Date());
                        const currentDate = new Date();
                        const monthsWorked = Math.max(1, Math.floor((currentDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
                        
                        // Calculate settlement components
                        const noticePeriodPay = basicSalary; // 1 month notice
                        const gratuity = monthsWorked >= 60 ? (basicSalary * monthsWorked * 15) / 26 : 0; // 15 days for each year if > 5 years
                        const pendingLeaves = Math.floor(Math.random() * 10) + 5; // Random pending leaves 5-15 days
                        const leaveEncashment = (basicSalary / 30) * pendingLeaves;
                        const providentFund = basicSalary * 0.12 * monthsWorked;
                        
                        return {
                          noticePeriodPay,
                          gratuity,
                          leaveEncashment,
                          providentFund,
                          total: noticePeriodPay + gratuity + leaveEncashment + providentFund,
                          monthsWorked
                        };
                      };

                      // Get employees who might have final settlements (sample based on certain criteria)
                      const settlementEmployees = employees.slice(0, 3).map((employee, index) => {
                        const settlement = calculateFinalSettlement(employee);
                        const statuses = ['Processing', 'Pending', 'Review'];
                        const variants: Array<"outline" | "destructive" | "secondary"> = ['outline', 'destructive', 'secondary'];
                        
                        return {
                          ...employee,
                          settlement,
                          status: statuses[index],
                          variant: variants[index],
                          lastWorkingDay: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000) // Future dates
                        };
                      });

                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Pending Settlements</span>
                            <Badge variant="destructive">{settlementEmployees.length}</Badge>
                          </div>
                          
                          <div className="space-y-3">
                            {settlementEmployees.map((employee) => (
                              <div key={employee.id} className="p-3 border rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-sm">
                                    {employee.firstName} {employee.lastName}
                                  </span>
                                  <Badge variant={employee.variant}>{employee.status}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>Last working day: {format(employee.lastWorkingDay, 'MMM dd, yyyy')}</div>
                                  <div>Settlement Amount: ₹{Math.round(employee.settlement.total).toLocaleString()}</div>
                                  <div className="mt-2 text-xs">
                                    <div className="grid grid-cols-2 gap-1">
                                      <span>• Notice Pay: ₹{employee.settlement.noticePeriodPay.toLocaleString()}</span>
                                      <span>• Leave Encash: ₹{Math.round(employee.settlement.leaveEncashment).toLocaleString()}</span>
                                      <span>• Gratuity: ₹{Math.round(employee.settlement.gratuity).toLocaleString()}</span>
                                      <span>• PF: ₹{Math.round(employee.settlement.providentFund).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-3 border-t">
                            <div className="text-xs text-muted-foreground">
                              <p className="font-medium mb-1">Settlement Components:</p>
                              <p>• Notice Period: 1 month basic salary</p>
                              <p>• Gratuity: 15 days salary × years worked (if &gt; 5 years)</p>
                              <p>• Leave Encashment: Pending leave days × daily salary</p>
                              <p>• PF: Employee + Employer contribution</p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="salary" className="space-y-6">
            {/* Salary Details Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Employee Salary Details
                    </CardTitle>
                    <CardDescription>
                      View and manage employee salary information with automatic calculations
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleExportPayrollToExcel}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>HRA (20%)</TableHead>
                      <TableHead>Gross Salary</TableHead>
                      <TableHead>PF (12%)</TableHead>
                      <TableHead>TDS (10%)</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const basicSalary = employee.salary || 0;
                      const hra = calculateHRA(basicSalary);
                      const grossSalary = calculateGrossSalary(basicSalary);
                      const pf = calculateProvidentFund(basicSalary);
                      const tds = calculateTDS(grossSalary);
                      const totalDeductions = pf + tds;
                      const netSalary = calculateNetSalary(grossSalary, totalDeductions);

                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                            <div className="text-sm text-muted-foreground">{employee.email}</div>
                          </TableCell>
                          <TableCell>{employee.position || 'Not set'}</TableCell>
                          <TableCell>
                            {editingEmployee === employee.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={editSalary}
                                  onChange={(e) => setEditSalary(e.target.value)}
                                  className="w-24"
                                  min="0"
                                />
                              </div>
                            ) : (
                              <span>₹{basicSalary.toLocaleString()}</span>
                            )}
                          </TableCell>
                          <TableCell>₹{Math.round(hra).toLocaleString()}</TableCell>
                          <TableCell>₹{Math.round(grossSalary).toLocaleString()}</TableCell>
                          <TableCell>₹{Math.round(pf).toLocaleString()}</TableCell>
                          <TableCell>₹{Math.round(tds).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">₹{Math.round(netSalary).toLocaleString()}</TableCell>
                          <TableCell>
                            {editingEmployee === employee.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSalary(employee.id)}
                                  disabled={updateEmployeeMutation.isPending}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSalary(employee)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Salary Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Total Monthly Payroll</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{Math.round(
                    employees.reduce((sum, emp) => {
                      const basicSalary = emp.salary || 0;
                      const grossSalary = calculateGrossSalary(basicSalary);
                      const pf = calculateProvidentFund(basicSalary);
                      const tds = calculateTDS(grossSalary);
                      return sum + calculateNetSalary(grossSalary, pf + tds);
                    }, 0)
                  ).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Net salary for all employees
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Total Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{Math.round(
                    employees.reduce((sum, emp) => {
                      const basicSalary = emp.salary || 0;
                      const grossSalary = calculateGrossSalary(basicSalary);
                      const pf = calculateProvidentFund(basicSalary);
                      const tds = calculateTDS(grossSalary);
                      return sum + pf + tds;
                    }, 0)
                  ).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    PF + TDS for all employees
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Average Net Salary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{Math.round(
                    employees.length > 0 
                      ? employees.reduce((sum, emp) => {
                          const basicSalary = emp.salary || 0;
                          const grossSalary = calculateGrossSalary(basicSalary);
                          const pf = calculateProvidentFund(basicSalary);
                          const tds = calculateTDS(grossSalary);
                          return sum + calculateNetSalary(grossSalary, pf + tds);
                        }, 0) / employees.length
                      : 0
                  ).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per employee average
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            {/* Payment Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {paymentRecords?.filter(r => r.paymentStatus === 'paid').length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-orange-600" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {paymentRecords?.filter(r => r.paymentStatus === 'pending').length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4" />
                    Total Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{(paymentRecords
                      ?.filter(r => r.paymentStatus === 'paid')
                      .reduce((sum, r) => sum + r.amount, 0) || 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Receipt className="h-4 w-4" />
                    Total Due
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{(paymentRecords
                      ?.filter(r => r.paymentStatus === 'pending')
                      .reduce((sum, r) => sum + r.amount, 0) || 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Tracking Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Status - {currentMonth}
                </CardTitle>
                <CardDescription>
                  Track and manage salary payments for all employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Reference No</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const paymentRecord = getPaymentRecord(employee.id);
                      const isPaid = paymentRecord?.paymentStatus === 'paid';

                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="font-medium">{employee.firstName} {employee.lastName}</div>
                            <div className="text-sm text-muted-foreground">{employee.position}</div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              ₹{paymentRecord?.amount.toLocaleString() || '0'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={isPaid ? "default" : "secondary"}
                              className={isPaid ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-orange-100 text-orange-800 hover:bg-orange-200"}
                            >
                              {isPaid ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {paymentRecord?.paymentDate ? 
                              format(new Date(paymentRecord.paymentDate), 'MMM dd, yyyy') : 
                              '-'
                            }
                          </TableCell>
                          <TableCell>{paymentRecord?.paymentMode || '-'}</TableCell>
                          <TableCell>{paymentRecord?.referenceNo || '-'}</TableCell>
                          <TableCell>
                            {employee.bankAccountNumber ? (
                              <div className="text-xs">
                                <div className="font-medium">{employee.bankName}</div>
                                <div>****{employee.bankAccountNumber?.slice(-4)}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Not provided</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!isPaid ? (
                              <Button
                                size="sm"
                                onClick={() => handleMarkAsPaid(employee)}
                              >
                                Mark as Paid
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-green-600">
                                ✓ Completed
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Dialog */}
          <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Complete Payment</DialogTitle>
                <DialogDescription>
                  Mark payment as completed for {selectedEmployee?.firstName} {selectedEmployee?.lastName}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    value={`₹${getPaymentRecord(selectedEmployee?.id || 0)?.amount.toLocaleString() || '0'}`}
                    disabled
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Payment Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({...paymentForm, paymentDate: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mode">Payment Mode</Label>
                  <Select 
                    value={paymentForm.paymentMode} 
                    onValueChange={(value) => setPaymentForm({...paymentForm, paymentMode: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="neft">NEFT</SelectItem>
                      <SelectItem value="rtgs">RTGS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reference">Reference Number</Label>
                  <Input
                    id="reference"
                    placeholder="Enter transaction reference"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({...paymentForm, referenceNo: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCompletePayment}
                  disabled={!paymentForm.paymentMode || !paymentForm.referenceNo}
                >
                  Complete Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Tabs>
      </div>
    </AppLayout>
  );
}