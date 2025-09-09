import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Department } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { useLocation } from "wouter";

interface RecentEmployeesProps {
  employees: User[];
  departments: Department[];
}

export function RecentEmployees({ employees, departments }: RecentEmployeesProps) {
  const [, setLocation] = useLocation();
  
  // Helper to get department name by ID
  const getDepartmentName = (departmentId: number | null | undefined) => {
    if (!departmentId) return "Unassigned";
    const department = departments.find(dept => dept.id === departmentId);
    return department ? department.name : "Unassigned";
  };
  
  // Helper to get status badge
  const getStatusBadge = (isActive: boolean | null) => {
    return isActive === true ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">Inactive</Badge>
    );
  };
  
  const handleViewAllEmployees = () => {
    setLocation("/employees");
  };
  
  const handleEditEmployee = (id: number) => {
    setLocation(`/employees?edit=${id}`);
  };

  return (
    <Card>
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Employees</h2>
          <Button 
            variant="link" 
            className="text-teal-600 hover:text-teal-700 p-0"
            onClick={handleViewAllEmployees}
          >
            View All Employees
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Employee
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Position
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                  No employees found.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="#" alt={`${employee.firstName} ${employee.lastName}`} />
                        <AvatarFallback>{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{`${employee.firstName} ${employee.lastName}`}</div>
                        <div className="text-sm text-slate-500">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{getDepartmentName(employee.departmentId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{employee.position || "Not specified"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(employee.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button 
                      variant="link" 
                      className="text-teal-600 hover:text-teal-900 p-0"
                      onClick={() => handleEditEmployee(employee.id)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
