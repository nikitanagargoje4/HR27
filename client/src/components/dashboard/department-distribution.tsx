import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { User, Department } from "@shared/schema";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";

interface DepartmentDistributionProps {
  employees: User[];
  departments: Department[];
}

export function DepartmentDistribution({ employees, departments }: DepartmentDistributionProps) {
  // Calculate department distribution
  const departmentCounts = departments.map(dept => {
    const count = employees.filter(emp => emp.departmentId === dept.id).length;
    return {
      name: dept.name,
      value: count,
      id: dept.id
    };
  }).filter(dept => dept.value > 0); // Only show departments with employees

  // Colors for departments
  const COLORS = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#6366F1', // indigo-500
    '#EF4444', // red-500
  ];

  // Format for the tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded shadow-md border border-slate-200">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-slate-600">
            <span className="font-medium">{payload[0].value}</span> employees
          </p>
          <p className="text-xs text-slate-500">
            {((payload[0].value / employees.length) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  // Animation settings for pie slices
  const renderLabel = (entry: any) => {
    return `${entry.name}: ${entry.value}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Department Distribution</h2>
          {departmentCounts.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentCounts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1500}
                    animationBegin={300}
                  >
                    {departmentCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-slate-500">No department data available</p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {departmentCounts.map((dept, index) => (
              <div key={dept.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-slate-700 truncate">{dept.name}</span>
                </div>
                <div className="mt-2">
                  <span className="text-lg font-semibold text-slate-900">{dept.value}</span>
                  <span className="text-xs text-slate-500 ml-1">
                    ({((dept.value / employees.length) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}