import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays, parseISO } from "date-fns";
import { useLocation } from "wouter";
import { Calendar as CalendarIcon, Download, Loader2, Filter, Search, Eye, FileDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { User, Department, LeaveRequest } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [location] = useLocation();
  const reportType = location.includes("attendance") ? "attendance" : 
                    location.includes("payroll") ? "payroll" : "leave";
  const [view, setView] = useState<"table" | "chart">("chart");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Fetch employees
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch all leave requests for attendance report
  const { data: allLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
    enabled: reportType === "attendance",
  });

  // Fetch report data (for payroll, use employees directly)
  const { data: reportData = [], isLoading } = useQuery<any[]>({
    queryKey: reportType === "payroll" ? ["/api/employees"] : [
      `/api/reports/${reportType}`, 
      { 
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
        departmentId: selectedDepartment !== "all" ? selectedDepartment : undefined
      }
    ],
  });

  // Helper to get department name
  const getDepartmentName = (departmentId: number | null | undefined) => {
    if (!departmentId) return "Unassigned";
    const department = departments.find(dept => dept.id === departmentId);
    return department ? department.name : "Unassigned";
  };

  // Function to check if an employee is on approved leave during the selected period
  const isEmployeeOnLeaveInPeriod = (employeeId: number): boolean => {
    if (reportType !== "attendance") return false;
    
    return allLeaveRequests.some(request => {
      if (request.userId !== employeeId || request.status !== 'approved') {
        return false;
      }
      
      const requestStartDate = new Date(request.startDate);
      const requestEndDate = new Date(request.endDate);
      const periodStart = new Date(dateRange.from);
      const periodEnd = new Date(dateRange.to);
      
      // Check if leave period overlaps with selected date range
      return requestStartDate <= periodEnd && requestEndDate >= periodStart;
    });
  };

  // Create combined data for all employees (for attendance, leave, and payroll reports)
  const allEmployeeReportData = employees.map(employee => {
    if (reportType === "payroll") {
      // For payroll, use employee data directly with salary calculations
      return {
        user: employee,
        salary: employee.salary || 0,
        grossSalary: (employee.salary || 0) + ((employee.salary || 0) * 0.4), // 40% allowances
        hra: (employee.salary || 0) * 0.2, // 20% HRA
        pf: (employee.salary || 0) * 0.12, // 12% PF
        tds: ((employee.salary || 0) + ((employee.salary || 0) * 0.4)) * 0.1, // 10% TDS on gross
        netSalary: ((employee.salary || 0) + ((employee.salary || 0) * 0.4)) - ((employee.salary || 0) * 0.12) - (((employee.salary || 0) + ((employee.salary || 0) * 0.4)) * 0.1)
      };
    } else {
      // Find existing report data for this employee
      const existingData = reportData.find(data => data.user?.id === employee.id);
      
      // If employee has data, use it; otherwise create default structure
      if (existingData) {
        return existingData;
      } else {
        // Create default structure for employees with no records
        return {
          user: employee,
          records: reportType === "attendance" ? [] : undefined,
          leaveRequests: reportType === "leave" ? [] : undefined
        };
      }
    }
  });

  // Prepare chart data for attendance report
  const prepareAttendanceChartData = () => {
    if (reportType !== "attendance" || !reportData.length) return [];

    // Create date range for the last 7 days
    const today = new Date();
    const dateRange = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    
    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Collect all attendance records for this date across all employees
      const dayRecords: any[] = [];
      reportData.forEach((entry: any) => {
        if (entry.records && Array.isArray(entry.records)) {
          entry.records.forEach((record: any) => {
            if (record.date) {
              try {
                const recordDateStr = format(new Date(record.date), 'yyyy-MM-dd');
                if (recordDateStr === dateStr) {
                  dayRecords.push(record);
                }
              } catch (error) {
                // Skip invalid dates
              }
            }
          });
        }
      });
      
      // Count attendance statuses for this day
      const present = dayRecords.filter(record => record.status === 'present').length;
      const absent = dayRecords.filter(record => record.status === 'absent').length;
      const late = dayRecords.filter(record => {
        if (record.status !== 'present' || !record.checkInTime) return false;
        try {
          const checkIn = new Date(record.checkInTime);
          return checkIn.getHours() >= 9 && checkIn.getMinutes() > 0;
        } catch {
          return false;
        }
      }).length;
      
      return {
        date: format(date, 'MM/dd'),
        present,
        absent,
        late,
      };
    });
  };

  // Prepare chart data for leave report
  const prepareLeaveChartData = () => {
    if (reportType !== "leave" || !reportData.length) return [];

    // Create summary by leave type
    const leaveTypeCounts = {
      annual: 0,
      sick: 0,
      personal: 0,
      unpaid: 0,
      other: 0,
    };

    reportData.forEach((entry: any) => {
      entry.leaveRequests?.forEach((request: any) => {
        if (request.status === 'approved') {
          leaveTypeCounts[request.type as keyof typeof leaveTypeCounts] += 1;
        }
      });
    });

    return Object.entries(leaveTypeCounts).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
    }));
  };

  // Prepare chart data for payroll report
  const preparePayrollChartData = () => {
    if (reportType !== "payroll" || !allEmployeeReportData.length) return [];

    // Group employees by department for payroll summary
    const departmentSalaries: { [key: string]: number } = {};
    
    allEmployeeReportData.forEach((employee: any) => {
      const deptName = getDepartmentName(employee.user.departmentId);
      const netSalary = employee.netSalary || 0;
      departmentSalaries[deptName] = (departmentSalaries[deptName] || 0) + netSalary;
    });

    return Object.entries(departmentSalaries).map(([department, totalSalary]) => ({
      name: department,
      value: Math.round(totalSalary),
    }));
  };

  // Define columns for attendance report
  const attendanceColumns: ColumnDef<any>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const user = row.original.user;
        return `${user.firstName} ${user.lastName}`;
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => getDepartmentName(row.original.user.departmentId),
    },
    {
      accessorKey: "present",
      header: "Present Days",
      cell: ({ row }) => {
        const presentDays = row.original.records?.filter((r: any) => r.status === 'present').length || 0;
        return presentDays;
      },
    },
    {
      accessorKey: "absent",
      header: "Absent Days",
      cell: ({ row }) => {
        const absentDays = row.original.records?.filter((r: any) => r.status === 'absent').length || 0;
        return absentDays;
      },
    },
    {
      accessorKey: "late",
      header: "Late Days",
      cell: ({ row }) => {
        const lateDays = row.original.records?.filter((r: any) => 
          r.status === 'present' && 
          r.checkInTime &&
          new Date(r.checkInTime).getHours() >= 9 && 
          new Date(r.checkInTime).getMinutes() > 0
        ).length || 0;
        return lateDays;
      },
    },
    {
      accessorKey: "avgCheckIn",
      header: "Avg. Check In",
      cell: ({ row }) => {
        const checkIns = row.original.records
          ?.filter((r: any) => r.checkInTime)
          ?.map((r: any) => new Date(r.checkInTime)) || [];
        
        if (checkIns.length === 0) return "N/A";
        
        const avgTime = new Date(
          checkIns.reduce((sum: number, time: Date) => sum + time.getTime(), 0) / checkIns.length
        );
        
        return format(avgTime, 'hh:mm a');
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewEmployeeDetails(row.original)}
            className="h-8 w-8 p-0"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportEmployeeToExcel(row.original)}
            className="h-8 w-8 p-0"
            title="Download Excel"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Define columns for leave report
  const leaveColumns: ColumnDef<any>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const user = row.original.user;
        return `${user.firstName} ${user.lastName}`;
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => getDepartmentName(row.original.user.departmentId),
    },
    {
      accessorKey: "annualLeave",
      header: "Annual Leave",
      cell: ({ row }) => {
        const annualLeaves = row.original.leaveRequests?.filter((r: any) => 
          r.type === 'annual' && r.status === 'approved'
        ) || [];
        return annualLeaves.length;
      },
    },
    {
      accessorKey: "sickLeave",
      header: "Sick Leave",
      cell: ({ row }) => {
        const sickLeaves = row.original.leaveRequests?.filter((r: any) => 
          r.type === 'sick' && r.status === 'approved'
        ) || [];
        return sickLeaves.length;
      },
    },
    {
      accessorKey: "unpaidLeave",
      header: "Unpaid Leave",
      cell: ({ row }) => {
        const unpaidLeaves = row.original.leaveRequests?.filter((r: any) => 
          r.type === 'unpaid' && r.status === 'approved'
        ) || [];
        return unpaidLeaves.length;
      },
    },
    {
      accessorKey: "totalDays",
      header: "Total Days",
      cell: ({ row }) => {
        const approvedLeaves = row.original.leaveRequests?.filter((r: any) => r.status === 'approved') || [];
        const totalDays = approvedLeaves.reduce((sum: number, leave: any) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
        return totalDays;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewEmployeeLeaveDetails(row.original)}
            className="h-8 w-8 p-0"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportEmployeeLeaveToExcel(row.original)}
            className="h-8 w-8 p-0"
            title="Download Excel"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Define columns for payroll report
  const payrollColumns: ColumnDef<any>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => {
        const user = row.original.user;
        return `${user.firstName} ${user.lastName}`;
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => getDepartmentName(row.original.user.departmentId),
    },
    {
      accessorKey: "basicSalary",
      header: "Basic Salary",
      cell: ({ row }) => `₹${(row.original.salary || 0).toLocaleString()}`,
    },
    {
      accessorKey: "hra",
      header: "HRA",
      cell: ({ row }) => `₹${Math.round(row.original.hra || 0).toLocaleString()}`,
    },
    {
      accessorKey: "grossSalary",
      header: "Gross Salary",
      cell: ({ row }) => `₹${Math.round(row.original.grossSalary || 0).toLocaleString()}`,
    },
    {
      accessorKey: "pf",
      header: "PF Deduction",
      cell: ({ row }) => `₹${Math.round(row.original.pf || 0).toLocaleString()}`,
    },
    {
      accessorKey: "tds",
      header: "TDS",
      cell: ({ row }) => `₹${Math.round(row.original.tds || 0).toLocaleString()}`,
    },
    {
      accessorKey: "netSalary",
      header: "Net Salary",
      cell: ({ row }) => (
        <span className="font-semibold text-green-600">
          ₹{Math.round(row.original.netSalary || 0).toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewEmployeeDetails(row.original)}
            className="h-8 w-8 p-0"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportEmployeeToExcel(row.original)}
            className="h-8 w-8 p-0"
            title="Download Excel"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Handle export button click
  const handleExport = (format: 'excel' | 'pdf' = 'excel') => {
    setIsExporting(true);
    
    try {
      if (format === 'excel') {
        exportToExcel();
      } else {
        exportToPDF();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const dataToExport = allEmployeeReportData.map(row => {
      if (reportType === 'attendance') {
        return {
          'Employee Name': `${row.user.firstName} ${row.user.lastName}`,
          'Department': getDepartmentName(row.user.departmentId),
          'Present Days': row.records.filter(r => r.status === 'present').length,
          'Total Days': row.records.length,
          'Attendance Rate': row.records.length > 0 
            ? `${((row.records.filter(r => r.status === 'present').length / row.records.length) * 100).toFixed(1)}%`
            : '0%'
        };
      } else if (reportType === 'payroll') {
        return {
          'Employee Name': `${row.user.firstName} ${row.user.lastName}`,
          'Department': getDepartmentName(row.user.departmentId),
          'Basic Salary': row.salary || 0,
          'HRA': Math.round(row.hra || 0),
          'Gross Salary': Math.round(row.grossSalary || 0),
          'PF Deduction': Math.round(row.pf || 0),
          'TDS': Math.round(row.tds || 0),
          'Net Salary': Math.round(row.netSalary || 0)
        };
      } else {
        const approvedLeaves = row.leaveRequests.filter(r => r.status === 'approved');
        const totalDays = approvedLeaves.reduce((sum, leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
        
        return {
          'Employee Name': `${row.user.firstName} ${row.user.lastName}`,
          'Department': getDepartmentName(row.user.departmentId),
          'Annual Leave': row.leaveRequests.filter(r => r.type === 'annual' && r.status === 'approved').length,
          'Sick Leave': row.leaveRequests.filter(r => r.type === 'sick' && r.status === 'approved').length,
          'Unpaid Leave': row.leaveRequests.filter(r => r.type === 'unpaid' && r.status === 'approved').length,
          'Total Days': totalDays
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    const sheetName = reportType === 'attendance' ? 'Attendance Report' : 
                     reportType === 'payroll' ? 'Payroll Report' : 'Leave Report';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const fileName = `${reportType}_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = reportType === 'attendance' ? 'Attendance Report' : 'Leave Report';
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 20, 20);
    
    // Add date range
    doc.setFontSize(12);
    doc.text(`Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`, 20, 35);
    
    // Prepare table data
    const tableData = allEmployeeReportData.map(row => {
      if (reportType === 'attendance') {
        const presentDays = row.records.filter(r => r.status === 'present').length;
        const attendanceRate = row.records.length > 0 
          ? `${((presentDays / row.records.length) * 100).toFixed(1)}%`
          : '0%';
        
        return [
          `${row.user.firstName} ${row.user.lastName}`,
          getDepartmentName(row.user.departmentId),
          presentDays,
          row.records.length,
          attendanceRate
        ];
      } else {
        const approvedLeaves = row.leaveRequests.filter(r => r.status === 'approved');
        const totalDays = approvedLeaves.reduce((sum, leave) => {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return sum + days;
        }, 0);
        
        return [
          `${row.user.firstName} ${row.user.lastName}`,
          getDepartmentName(row.user.departmentId),
          row.leaveRequests.filter(r => r.type === 'annual' && r.status === 'approved').length,
          row.leaveRequests.filter(r => r.type === 'sick' && r.status === 'approved').length,
          row.leaveRequests.filter(r => r.type === 'unpaid' && r.status === 'approved').length,
          totalDays
        ];
      }
    });

    const tableHeaders = reportType === 'attendance'
      ? ['Employee Name', 'Department', 'Present Days', 'Total Days', 'Attendance Rate']
      : ['Employee Name', 'Department', 'Annual Leave', 'Sick Leave', 'Unpaid Leave', 'Total Days'];

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [71, 85, 105] },
    });
    
    const fileName = `${reportType}_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  // Export individual employee attendance to Excel
  const exportEmployeeToExcel = (employeeData: any) => {
    const user = employeeData.user;
    const records = employeeData.records || [];
    
    // Prepare data for Excel
    const worksheetData = [
      [`${user.firstName} ${user.lastName} - Attendance Report`],
      [`Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`],
      [`Department: ${getDepartmentName(user.departmentId)}`],
      [''],
      ['Date', 'Status', 'Check In Time', 'Check Out Time', 'Hours Worked'],
      ...records.map((record: any) => [
        format(new Date(record.date), 'yyyy-MM-dd'),
        record.status === 'present' ? 'Present' : 'Absent',
        record.checkInTime ? format(new Date(record.checkInTime), 'hh:mm a') : 'N/A',
        record.checkOutTime ? format(new Date(record.checkOutTime), 'hh:mm a') : 'N/A',
        record.hoursWorked || 'N/A'
      ])
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    
    const fileName = `${user.firstName}_${user.lastName}_attendance_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // View employee details
  const viewEmployeeDetails = (employeeData: any) => {
    setSelectedEmployee(employeeData);
    setIsDetailsModalOpen(true);
  };

  // Export individual employee leave to Excel
  const exportEmployeeLeaveToExcel = (employeeData: any) => {
    const user = employeeData.user;
    const leaveRequests = employeeData.leaveRequests || [];
    
    // Prepare data for Excel
    const worksheetData = [
      [`${user.firstName} ${user.lastName} - Leave Report`],
      [`Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`],
      [`Department: ${getDepartmentName(user.departmentId)}`],
      [''],
      ['Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'],
      ...leaveRequests.map((request: any) => {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        return [
          request.type.charAt(0).toUpperCase() + request.type.slice(1),
          format(start, 'yyyy-MM-dd'),
          format(end, 'yyyy-MM-dd'),
          days,
          request.status.charAt(0).toUpperCase() + request.status.slice(1),
          request.reason || 'N/A'
        ];
      })
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
    
    const fileName = `${user.firstName}_${user.lastName}_leave_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // View employee leave details
  const viewEmployeeLeaveDetails = (employeeData: any) => {
    setSelectedEmployee(employeeData);
    setIsDetailsModalOpen(true);
  };

  // Filter data based on search term
  const filteredReportData = allEmployeeReportData.filter((item: any) => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase().trim();
    
    // Handle attendance report data (has nested user object)
    if (item?.user) {
      const user = item.user;
      const searchableContent = [
        user.firstName || '',
        user.lastName || '',
        user.email || '',
        user.position || '',
        user.username || '',
        `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchableContent.includes(search);
    }
    
    return false;
  });

  // Prepare chart data based on report type
  const chartData = reportType === "attendance" 
    ? prepareAttendanceChartData() 
    : reportType === "payroll"
    ? preparePayrollChartData()
    : prepareLeaveChartData();

  // Define chart colors - vibrant color palette for leave distribution
  const COLORS = [
    '#10B981', // Emerald green for Annual leave
    '#3B82F6', // Blue for Sick leave  
    '#F59E0B', // Amber for Personal leave
    '#EF4444', // Red for Unpaid leave
    '#8B5CF6', // Purple for Other leave
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            {reportType === "attendance" ? "Attendance Report" : 
             reportType === "payroll" ? "Payroll Report" : "Leave Report"}
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Date range picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal w-full sm:w-auto"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            {/* Department filter */}
            <Select 
              value={selectedDepartment} 
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Departments" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Export button with dropdown */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                disabled={isExporting || allEmployeeReportData.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={isExporting || allEmployeeReportData.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* View toggle */}
        <div className="flex justify-end">
          <Tabs 
            value={view} 
            onValueChange={(val) => setView(val as "table" | "chart")}
            className="w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Report content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {reportType === "attendance" 
                ? "Attendance Overview" 
                : reportType === "payroll"
                ? "Payroll Distribution"
                : "Leave Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Custom search input for table view */}
            {view === "table" && (
              <div className="flex items-center py-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder={reportType === "attendance" ? "Search employees in attendance report..." : "Search employees in leave report..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm pl-8"
                  />
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <p>No employees found</p>
                <p className="text-sm mt-2">Add employees to view their attendance data</p>
              </div>
            ) : (
              <>
                {view === "chart" ? (
                  <div className="h-80 w-full">
                    {reportType === "attendance" ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                          barGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            width={40}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="present" 
                            name="Present" 
                            fill="#10B981" 
                            radius={[4, 4, 0, 0]} 
                          />
                          <Bar 
                            dataKey="late" 
                            name="Late" 
                            fill="#F59E0B" 
                            radius={[4, 4, 0, 0]} 
                          />
                          <Bar 
                            dataKey="absent" 
                            name="Absent" 
                            fill="#EF4444" 
                            radius={[4, 4, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent, value }) => 
                              reportType === "payroll" 
                                ? `${name} (₹${(value/1000).toFixed(0)}K)` 
                                : `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => 
                              reportType === "payroll" 
                                ? [`₹${Number(value).toLocaleString()}`, 'Total Salary']
                                : [value, 'Count']
                            }
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ) : (
                  <DataTable
                    columns={reportType === "attendance" ? attendanceColumns : 
                            reportType === "payroll" ? payrollColumns : leaveColumns}
                    data={filteredReportData}
                    globalFilter={false}
                    employees={employees}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportType === "attendance" ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "0%"
                    ) : (
                      "92.5%"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">For the selected period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Working Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "0h"
                    ) : (
                      "8h 24m"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Per working day</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Punctuality Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "0%"
                    ) : (
                      "89.7%"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">On-time check-ins</p>
                </CardContent>
              </Card>
            </>
          ) : reportType === "payroll" ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Payroll Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "₹0"
                    ) : (
                      `₹${Math.round(allEmployeeReportData.reduce((sum, emp) => sum + (emp.netSalary || 0), 0) / 1000)}K`
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Total monthly payroll</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Salary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "₹0"
                    ) : (
                      `₹${Math.round(allEmployeeReportData.reduce((sum, emp) => sum + (emp.salary || 0), 0) / allEmployeeReportData.length / 1000)}K`
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Per employee</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Highest Paid Dept</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "N/A"
                    ) : (() => {
                      // Calculate average salary by department
                      const deptSalaries: { [key: string]: { total: number, count: number } } = {};
                      allEmployeeReportData.forEach(emp => {
                        const deptName = getDepartmentName(emp.user.departmentId);
                        const salary = emp.salary || 0;
                        if (!deptSalaries[deptName]) {
                          deptSalaries[deptName] = { total: 0, count: 0 };
                        }
                        deptSalaries[deptName].total += salary;
                        deptSalaries[deptName].count += 1;
                      });
                      
                      let highestDept = "N/A";
                      let highestAvg = 0;
                      Object.entries(deptSalaries).forEach(([dept, data]) => {
                        const avg = data.total / data.count;
                        if (avg > highestAvg) {
                          highestAvg = avg;
                          highestDept = dept.split(' ')[0]; // Show first word only
                        }
                      });
                      return highestDept;
                    })()}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">By average salary</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total Leave Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "0"
                    ) : (
                      "48"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Approved leaves in period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Most Common Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "N/A"
                    ) : (
                      "Annual"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Leave type</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Average Leave Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {isLoading ? (
                      <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"/>
                    ) : allEmployeeReportData.length === 0 ? (
                      "0"
                    ) : (
                      "2.4"
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Days per request</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Employee Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee && `${selectedEmployee.user.firstName} ${selectedEmployee.user.lastName} - ${reportType === 'attendance' ? 'Attendance' : reportType === 'payroll' ? 'Payroll' : 'Leave'} Details`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-slate-700">Employee Name</Label>
                  <p className="text-slate-900">{`${selectedEmployee.user.firstName} ${selectedEmployee.user.lastName}`}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Department</Label>
                  <p className="text-slate-900">{getDepartmentName(selectedEmployee.user.departmentId)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Email</Label>
                  <p className="text-slate-900">{selectedEmployee.user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Position</Label>
                  <p className="text-slate-900">{selectedEmployee.user.position || 'N/A'}</p>
                </div>
              </div>

              {/* Summary Cards */}
              {reportType === 'attendance' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedEmployee.records?.filter((r: any) => r.status === 'present').length || 0}
                      </div>
                      <p className="text-sm text-slate-500">Present Days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedEmployee.records?.filter((r: any) => r.status === 'absent').length || 0}
                      </div>
                      <p className="text-sm text-slate-500">Absent Days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-yellow-600">
                        {selectedEmployee.records?.filter((r: any) => 
                          r.status === 'present' && 
                          r.checkInTime &&
                          new Date(r.checkInTime).getHours() >= 9 && 
                          new Date(r.checkInTime).getMinutes() > 0
                        ).length || 0}
                      </div>
                      <p className="text-sm text-slate-500">Late Days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedEmployee.records?.length || 0}
                      </div>
                      <p className="text-sm text-slate-500">Total Records</p>
                    </CardContent>
                  </Card>
                </div>
              ) : reportType === 'payroll' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        ₹{(selectedEmployee.salary || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-500">Basic Salary</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        ₹{Math.round(selectedEmployee.hra || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-500">HRA (20%)</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-orange-600">
                        ₹{Math.round(selectedEmployee.grossSalary || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-500">Gross Salary</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-purple-600">
                        ₹{Math.round(selectedEmployee.netSalary || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-500">Net Salary</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedEmployee.leaveRequests?.filter((r: any) => r.type === 'annual' && r.status === 'approved').length || 0}
                      </div>
                      <p className="text-sm text-slate-500">Annual Leave</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedEmployee.leaveRequests?.filter((r: any) => r.type === 'sick' && r.status === 'approved').length || 0}
                      </div>
                      <p className="text-sm text-slate-500">Sick Leave</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-yellow-600">
                        {selectedEmployee.leaveRequests?.filter((r: any) => r.type === 'unpaid' && r.status === 'approved').length || 0}
                      </div>
                      <p className="text-sm text-slate-500">Unpaid Leave</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedEmployee.leaveRequests?.filter((r: any) => r.status === 'approved').reduce((sum: number, leave: any) => {
                          const start = new Date(leave.startDate);
                          const end = new Date(leave.endDate);
                          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          return sum + days;
                        }, 0) || 0}
                      </div>
                      <p className="text-sm text-slate-500">Total Days</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Detailed Records */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {reportType === 'attendance' ? 'Attendance Records' : reportType === 'payroll' ? 'Salary Breakdown' : 'Leave Requests'}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        {reportType === 'attendance' ? (
                          <>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Check In</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Check Out</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Hours</th>
                          </>
                        ) : reportType === 'payroll' ? (
                          <>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Component</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Percentage</th>
                          </>
                        ) : (
                          <>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Type</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Start Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">End Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Days</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Reason</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportType === 'attendance' ? (
                        selectedEmployee.records?.map((record: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                                {record.status === 'present' ? 'Present' : 'Absent'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {record.checkInTime ? format(new Date(record.checkInTime), 'hh:mm a') : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {record.checkOutTime ? format(new Date(record.checkOutTime), 'hh:mm a') : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm">{record.hoursWorked || 'N/A'}</td>
                          </tr>
                        )) || (
                          <tr>
                            <td colSpan={5} className="px-4 py-3 text-sm text-center text-slate-500">
                              No attendance records found
                            </td>
                          </tr>
                        )
                      ) : reportType === 'payroll' ? (
                        [
                          { component: 'Basic Salary', type: 'Earning', amount: selectedEmployee.salary || 0, percentage: '100%' },
                          { component: 'HRA', type: 'Earning', amount: selectedEmployee.hra || 0, percentage: '20%' },
                          { component: 'Other Allowances', type: 'Earning', amount: (selectedEmployee.salary || 0) * 0.2, percentage: '20%' },
                          { component: 'Provident Fund', type: 'Deduction', amount: selectedEmployee.pf || 0, percentage: '12%' },
                          { component: 'TDS', type: 'Deduction', amount: selectedEmployee.tds || 0, percentage: '10%' },
                        ].map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm font-medium">{item.component}</td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant={item.type === 'Earning' ? 'default' : 'destructive'}>
                                {item.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">₹{Math.round(item.amount).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">{item.percentage}</td>
                          </tr>
                        ))
                      ) : (
                        selectedEmployee.leaveRequests?.map((request: any, index: number) => {
                          const start = new Date(request.startDate);
                          const end = new Date(request.endDate);
                          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                          
                          return (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm">
                                <Badge variant="outline">
                                  {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">{format(start, 'MMM dd, yyyy')}</td>
                              <td className="px-4 py-3 text-sm">{format(end, 'MMM dd, yyyy')}</td>
                              <td className="px-4 py-3 text-sm">{days}</td>
                              <td className="px-4 py-3 text-sm">
                                <Badge variant={
                                  request.status === 'approved' ? 'default' : 
                                  request.status === 'rejected' ? 'destructive' : 'secondary'
                                }>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">{request.reason || 'N/A'}</td>
                            </tr>
                          );
                        }) || (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-sm text-center text-slate-500">
                              No leave requests found
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
