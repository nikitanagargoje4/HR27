import { User } from "@shared/schema";

// Available permissions in the system - must match roles-page.tsx
export const PERMISSIONS = [
  { id: "employees.view", label: "View Employees", category: "Employee Management" },
  { id: "employees.create", label: "Add Employees", category: "Employee Management" },
  { id: "employees.edit", label: "Edit Employees", category: "Employee Management" },
  { id: "employees.delete", label: "Delete Employees", category: "Employee Management" },
  { id: "departments.view", label: "View Departments", category: "Department Management" },
  { id: "departments.create", label: "Add Departments", category: "Department Management" },
  { id: "departments.edit", label: "Edit Departments", category: "Department Management" },
  { id: "departments.delete", label: "Delete Departments", category: "Department Management" },
  { id: "attendance.view", label: "View Attendance", category: "Attendance Management" },
  { id: "attendance.mark", label: "Mark Attendance", category: "Attendance Management" },
  { id: "attendance.edit", label: "Edit Attendance", category: "Attendance Management" },
  { id: "leave.view", label: "View Leave Requests", category: "Leave Management" },
  { id: "leave.create", label: "Apply for Leave", category: "Leave Management" },
  { id: "leave.approve", label: "Approve/Reject Leave", category: "Leave Management" },
  { id: "reports.view", label: "View Reports", category: "Reports" },
  { id: "payroll.view", label: "View Payroll", category: "Payroll Management" },
  { id: "payroll.process", label: "Process Payroll", category: "Payroll Management" },
  { id: "payroll.approve", label: "Approve Payroll", category: "Payroll Management" },
  { id: "payroll.edit", label: "Edit Payroll", category: "Payroll Management" },
  { id: "roles.view", label: "View Roles & Permissions", category: "System Administration" },
  { id: "roles.edit", label: "Edit Roles & Permissions", category: "System Administration" }
];

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: PERMISSIONS.map(p => p.id),
  hr: [
    "employees.view", "employees.create", "employees.edit",
    "departments.view", "departments.create", "departments.edit",
    "attendance.view", "attendance.edit",
    "leave.view", "leave.approve",
    "reports.view", "roles.view",
    "payroll.view", "payroll.process", "payroll.edit"
  ],
  manager: [
    "employees.view", "departments.view",
    "attendance.view", "attendance.edit",
    "leave.view", "leave.approve",
    "reports.view"
  ],
  employee: [
    "attendance.view", "attendance.mark",
    "leave.view", "leave.create"
  ]
};

/**
 * Get all permissions for a user (role-based + custom permissions)
 */
export function getUserPermissions(user: User | null): string[] {
  if (!user) return [];
  
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
  const customPerms = user.customPermissions || [];
  
  // Combine and deduplicate permissions
  const uniquePerms = new Set([...defaultPerms, ...customPerms]);
  return Array.from(uniquePerms);
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, permission: string): boolean {
  const userPermissions = getUserPermissions(user);
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}