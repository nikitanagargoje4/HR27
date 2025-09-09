import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit, Eye, Shield, ShieldCheck, Users, Search, TrendingUp, UserCheck, Lock, Settings, ChevronRight, Crown, Key, Sliders, ToggleLeft, ToggleRight } from "lucide-react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

type User = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  position: string;
  isActive: boolean;
  customPermissions?: string[];
};

export default function RolesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categorySliders, setCategorySliders] = useState<Record<string, number>>({});

  // Check if current user can edit (only admin)
  const canEdit = user?.role === "admin";

  // Fetch all users
  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  // Filter users based on search query
  const users = allUsers.filter(user => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const email = user.email.toLowerCase();
    const role = user.role.toLowerCase();
    const position = (user.position || "").toLowerCase();
    
    return fullName.includes(query) || 
           email.includes(query) || 
           role.includes(query) || 
           position.includes(query);
  });

  // Mutation to update user permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string; customPermissions: string[] }) => {
      const response = await fetch("/api/users/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update permissions");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user permissions",
        variant: "destructive",
      });
    },
  });

  const getRolePermissions = (role: string, customPermissions: string[] = []) => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    const uniquePerms = new Set([...defaultPerms, ...customPermissions]);
    return Array.from(uniquePerms);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditingRole(user.role);
    setEditingPermissions(user.customPermissions || []);
    
    // Initialize category sliders based on current permissions
    const categoryPercentages: Record<string, number> = {};
    const permissionsByCategory = PERMISSIONS.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, typeof PERMISSIONS>);
    
    Object.entries(permissionsByCategory).forEach(([category, perms]) => {
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
      const grantedPerms = [...defaultPerms, ...(user.customPermissions || [])];
      const categoryPerms = perms.map(p => p.id);
      const grantedInCategory = categoryPerms.filter(p => grantedPerms.includes(p)).length;
      categoryPercentages[category] = Math.round((grantedInCategory / categoryPerms.length) * 100);
    });
    
    setCategorySliders(categoryPercentages);
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;

    updatePermissionsMutation.mutate({
      userId: selectedUser.id,
      role: editingRole,
      customPermissions: editingPermissions,
    });
  };

  const togglePermission = (permissionId: string) => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[editingRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    
    if (defaultPerms.includes(permissionId)) {
      // This is a default permission, can't be removed
      return;
    }

    setEditingPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleCategorySlider = (category: string, value: number[]) => {
    if (!canEdit) return;
    
    const sliderValue = value[0];
    setCategorySliders(prev => ({ ...prev, [category]: sliderValue }));
    
    // Get permissions in this category
    const categoryPermissions = PERMISSIONS.filter(p => p.category === category);
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[editingRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
    
    // Calculate how many permissions to grant based on slider
    const permissionsToGrant = Math.round((sliderValue / 100) * categoryPermissions.length);
    
    // Sort permissions by priority (you can customize this logic)
    const sortedPermissions = categoryPermissions.sort((a, b) => {
      // Prioritize view permissions, then add, then edit, then delete
      const priority = { 'view': 0, 'add': 1, 'edit': 2, 'delete': 3 };
      const aPriority = Object.keys(priority).find(key => a.id.toLowerCase().includes(key)) || 'other';
      const bPriority = Object.keys(priority).find(key => b.id.toLowerCase().includes(key)) || 'other';
      return (priority[aPriority as keyof typeof priority] ?? 4) - (priority[bPriority as keyof typeof priority] ?? 4);
    });
    
    // Update permissions based on slider value
    setEditingPermissions(prev => {
      // Remove all non-default permissions from this category
      const withoutCategory = prev.filter(p => 
        !categoryPermissions.some(cp => cp.id === p) || defaultPerms.includes(p)
      );
      
      // Add permissions based on slider value (excluding defaults)
      const permissionsToAdd = sortedPermissions
        .slice(0, permissionsToGrant)
        .filter(p => !defaultPerms.includes(p.id))
        .map(p => p.id);
      
      return [...withoutCategory, ...permissionsToAdd];
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "hr": return "default";
      case "manager": return "secondary";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className="text-lg font-medium text-slate-600">Loading roles and permissions...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Executive Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 via-emerald-600/20 to-blue-600/20"></div>
          <div className="relative px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
              >
                <div className="flex items-center space-x-6">
                  <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-4 rounded-2xl shadow-xl">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-2">
                      Roles & Permissions
                    </h1>
                    <p className="text-slate-300 text-lg max-w-2xl">
                      Manage user access levels and security permissions with enterprise-grade control
                      {!canEdit && " • View Only Mode"}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="w-6 h-6 text-emerald-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-300">Total Users</div>
                        <div className="text-2xl font-bold text-white">{allUsers.length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-6 h-6 text-blue-400" />
                      <div>
                        <div className="text-sm font-medium text-slate-300">Active Roles</div>
                        <div className="text-2xl font-bold text-white">{new Set(allUsers.map(u => u.role)).size}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Search and Filters Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 mb-8"
          >
            <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-8 py-6 rounded-t-2xl border-b-2 border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-3 rounded-xl shadow-sm">
                    <Users className="w-6 h-6 text-teal-700" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">User Access Management</h2>
                    <p className="text-slate-600 font-medium">
                      {canEdit 
                        ? "Configure roles and permissions for optimal security" 
                        : "Review current access levels and permissions"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      placeholder="Search users, roles, positions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-4 py-3 w-80 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-xl text-sm font-medium transition-all duration-200"
                    />
                  </div>
                  {searchQuery && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-teal-700">
                        {users.length} of {allUsers.length} users
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Users Grid/Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-8 py-6 rounded-t-2xl border-b-2 border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 flex items-center">
                  <Settings className="w-5 h-5 mr-3 text-teal-600" />
                  Team Access Overview
                </h3>
                <Badge variant="outline" className="text-sm px-3 py-1 font-medium">
                  {users.length} Active Users
                </Badge>
              </div>
            </div>

            <div className="p-6">
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-slate-100">
                      <TableHead className="font-semibold text-slate-700 py-4">Team Member</TableHead>
                      <TableHead className="font-semibold text-slate-700 py-4">Access Level</TableHead>
                      <TableHead className="font-semibold text-slate-700 py-4">Department</TableHead>
                      <TableHead className="font-semibold text-slate-700 py-4">Permissions</TableHead>
                      <TableHead className="font-semibold text-slate-700 py-4">Status</TableHead>
                      <TableHead className="text-right font-semibold text-slate-700 py-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: User, index) => {
                      const userPermissions = getRolePermissions(user.role, user.customPermissions);
                      return (
                        <motion.tr 
                          key={user.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-all duration-200"
                        >
                          <TableCell className="py-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shadow-sm">
                                <span className="text-lg font-bold text-teal-700">
                                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 text-lg">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-slate-500 font-medium">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center space-x-2">
                              {user.role === 'admin' && <Crown className="w-4 h-4 text-red-500" />}
                              {user.role === 'manager' && <Key className="w-4 h-4 text-blue-500" />}
                              <Badge 
                                variant={getRoleBadgeVariant(user.role)}
                                className="text-sm px-3 py-1 font-semibold"
                              >
                                {user.role.toUpperCase()}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <span className="text-slate-700 font-medium">{user.position || 'Not specified'}</span>
                          </TableCell>
                          <TableCell className="py-6">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                              <Badge variant="outline" className="font-medium">
                                {userPermissions.length} permissions
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-6">
                            <Badge 
                              variant={user.isActive ? "default" : "secondary"}
                              className={`font-medium ${
                                user.isActive 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-6">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-teal-100 hover:to-emerald-100 border border-slate-300 hover:border-teal-400 text-slate-700 hover:text-teal-700 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  {canEdit ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                  {canEdit ? "Manage" : "View"}
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-slate-50 via-white to-slate-50">
                                {/* Executive Header */}
                                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 via-emerald-600/20 to-blue-600/20"></div>
                                  <div className="relative px-8 py-6">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                                        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl shadow-lg">
                                          <ShieldCheck className="h-6 w-6 text-white" />
                                        </div>
                                        {canEdit ? "Manage" : "View"} Access Permissions
                                      </DialogTitle>
                                      <DialogDescription className="text-slate-300 text-lg mt-2 ml-12">
                                        {selectedUser && (
                                          <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                                              <span className="text-sm font-bold text-teal-700">
                                                {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                                              </span>
                                            </div>
                                            <span>{selectedUser.firstName} {selectedUser.lastName}</span>
                                            <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                                              {selectedUser.email}
                                            </Badge>
                                          </div>
                                        )}
                                      </DialogDescription>
                                    </DialogHeader>
                                  </div>
                                </div>

                                {selectedUser && (
                                  <div className="flex-1 overflow-y-auto">
                                    <div className="p-8 space-y-8">
                                      {/* Role Selection Section */}
                                      <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                      >
                                        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4 rounded-t-2xl border-b-2 border-slate-100">
                                          <h3 className="text-xl font-bold text-slate-900 flex items-center">
                                            <Crown className="w-5 h-5 mr-3 text-teal-600" />
                                            Access Level Configuration
                                          </h3>
                                          <p className="text-slate-600 text-sm mt-1 font-medium">
                                            {canEdit ? "Assign role to define base permissions" : "Current user role and access level"}
                                          </p>
                                        </div>
                                        <div className="p-6">
                                          {canEdit ? (
                                            <div className="space-y-4">
                                              <label className="text-sm font-semibold text-slate-700 block">
                                                Primary Role
                                              </label>
                                              <Select value={editingRole} onValueChange={setEditingRole}>
                                                <SelectTrigger className="h-12 border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 rounded-xl text-base font-medium transition-all duration-200">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-2 border-slate-200">
                                                  <SelectItem value="employee" className="text-base py-3">
                                                    <div className="flex items-center space-x-3">
                                                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                        <Users className="w-4 h-4 text-slate-600" />
                                                      </div>
                                                      <div>
                                                        <div className="font-medium">Employee</div>
                                                        <div className="text-xs text-slate-500">Basic access permissions</div>
                                                      </div>
                                                    </div>
                                                  </SelectItem>
                                                  <SelectItem value="manager" className="text-base py-3">
                                                    <div className="flex items-center space-x-3">
                                                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                                        <Key className="w-4 h-4 text-blue-600" />
                                                      </div>
                                                      <div>
                                                        <div className="font-medium">Manager</div>
                                                        <div className="text-xs text-slate-500">Team management permissions</div>
                                                      </div>
                                                    </div>
                                                  </SelectItem>
                                                  <SelectItem value="hr" className="text-base py-3">
                                                    <div className="flex items-center space-x-3">
                                                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                        <UserCheck className="w-4 h-4 text-emerald-600" />
                                                      </div>
                                                      <div>
                                                        <div className="font-medium">HR</div>
                                                        <div className="text-xs text-slate-500">Human resources permissions</div>
                                                      </div>
                                                    </div>
                                                  </SelectItem>
                                                  <SelectItem value="admin" className="text-base py-3">
                                                    <div className="flex items-center space-x-3">
                                                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                                        <Crown className="w-4 h-4 text-red-600" />
                                                      </div>
                                                      <div>
                                                        <div className="font-medium">Admin</div>
                                                        <div className="text-xs text-slate-500">Full system access</div>
                                                      </div>
                                                    </div>
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          ) : (
                                            <div className="flex items-center space-x-4">
                                              <div className="flex items-center space-x-3">
                                                {selectedUser.role === 'admin' && <Crown className="w-6 h-6 text-red-500" />}
                                                {selectedUser.role === 'manager' && <Key className="w-6 h-6 text-blue-500" />}
                                                {selectedUser.role === 'hr' && <UserCheck className="w-6 h-6 text-emerald-500" />}
                                                {selectedUser.role === 'employee' && <Users className="w-6 h-6 text-slate-500" />}
                                                <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="text-lg px-6 py-2 font-bold">
                                                  {selectedUser.role.toUpperCase()}
                                                </Badge>
                                              </div>
                                              <div className="text-sm text-slate-600 font-medium">
                                                Current role with predefined permissions
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>

                                      {/* Permissions Grid */}
                                      <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: 0.2 }}
                                        className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300"
                                      >
                                        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4 rounded-t-2xl border-b-2 border-slate-100">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <h3 className="text-xl font-bold text-slate-900 flex items-center">
                                                <Lock className="w-5 h-5 mr-3 text-teal-600" />
                                                Detailed Permissions
                                              </h3>
                                              <p className="text-slate-600 text-sm mt-1 font-medium">
                                                {canEdit ? "Customize specific access permissions" : "Review granted permissions"}
                                              </p>
                                            </div>
                                            <Badge variant="outline" className="text-sm px-3 py-1 font-medium">
                                              {Object.keys(PERMISSIONS.reduce((acc, perm) => {
                                                if (!acc[perm.category]) acc[perm.category] = [];
                                                acc[perm.category].push(perm);
                                                return acc;
                                              }, {} as Record<string, typeof PERMISSIONS>)).length} Categories
                                            </Badge>
                                          </div>
                                        </div>
                                        <div className="p-6">
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {Object.entries(
                                              PERMISSIONS.reduce((acc, perm) => {
                                                if (!acc[perm.category]) acc[perm.category] = [];
                                                acc[perm.category].push(perm);
                                                return acc;
                                              }, {} as Record<string, typeof PERMISSIONS>)
                                            ).map(([category, perms], index) => (
                                              <motion.div 
                                                key={category}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                                className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300"
                                              >
                                                <div className="flex items-center justify-between mb-4">
                                                  <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shadow-sm">
                                                      <Settings className="w-5 h-5 text-teal-700" />
                                                    </div>
                                                    <div>
                                                      <h4 className="font-bold text-lg text-slate-900">{category}</h4>
                                                      <p className="text-xs text-slate-500 font-medium">{perms.length} permissions</p>
                                                    </div>
                                                  </div>
                                                  {canEdit && (
                                                    <div className="flex items-center space-x-2">
                                                      <Sliders className="w-4 h-4 text-teal-600" />
                                                      <span className="text-xs font-medium text-slate-600">
                                                        {categorySliders[category] || 0}%
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Category Permission Slider */}
                                                {canEdit && (
                                                  <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                      <label className="text-sm font-semibold text-slate-700">
                                                        Permission Level
                                                      </label>
                                                      <div className="flex items-center space-x-2">
                                                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm font-bold text-teal-600 min-w-[3rem] text-center">
                                                          {categorySliders[category] || 0}%
                                                        </span>
                                                        <ToggleRight className="w-4 h-4 text-teal-600" />
                                                      </div>
                                                    </div>
                                                    <Slider
                                                      value={[categorySliders[category] || 0]}
                                                      onValueChange={(value) => handleCategorySlider(category, value)}
                                                      max={100}
                                                      step={25}
                                                      className="w-full"
                                                    />
                                                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                                                      <span>None</span>
                                                      <span>View</span>
                                                      <span>Moderate</span>
                                                      <span>Full</span>
                                                    </div>
                                                  </div>
                                                )}
                                                <div className="space-y-3">
                                                  {perms.map(permission => {
                                                    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[editingRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
                                                    const isDefault = defaultPerms.includes(permission.id);
                                                    const isGranted = isDefault || editingPermissions.includes(permission.id);
                                                    
                                                    return (
                                                      <div key={permission.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200">
                                                        <Checkbox 
                                                          checked={isGranted}
                                                          disabled={!canEdit || isDefault}
                                                          onCheckedChange={() => togglePermission(permission.id)}
                                                          className="h-5 w-5"
                                                        />
                                                        <div className="flex-1">
                                                          <span className={`text-sm font-medium text-slate-700 ${isDefault ? 'font-semibold' : ''}`}>
                                                            {permission.label}
                                                          </span>
                                                          {isDefault && (
                                                            <div className="flex items-center space-x-2 mt-1">
                                                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                              <span className="text-xs text-emerald-600 font-medium">Default for {editingRole}</span>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </motion.div>
                                            ))}
                                          </div>
                                        </div>
                                      </motion.div>
                                    </div>

                                    {/* Action Buttons */}
                                    {canEdit && (
                                      <div className="bg-white border-t-2 border-slate-200 px-8 py-6 rounded-b-2xl">
                                        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                                          <Button 
                                            variant="outline" 
                                            onClick={() => setSelectedUser(null)}
                                            className="w-full sm:w-auto border-2 border-slate-300 hover:border-slate-400 font-medium transition-all duration-200"
                                          >
                                            Cancel Changes
                                          </Button>
                                          <Button 
                                            onClick={handleSavePermissions}
                                            disabled={updatePermissionsMutation.isPending}
                                            className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                                          >
                                            {updatePermissionsMutation.isPending ? (
                                              <div className="flex items-center space-x-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                <span>Saving...</span>
                                              </div>
                                            ) : (
                                              <div className="flex items-center space-x-2">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>Save Permissions</span>
                                              </div>
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {users.map((user: User, index) => {
                  const userPermissions = getRolePermissions(user.role, user.customPermissions);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shadow-sm">
                            <span className="text-lg font-bold text-teal-700">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-lg">{user.firstName} {user.lastName}</h3>
                            <p className="text-sm text-slate-500 font-medium">{user.email}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className={`font-medium ${
                            user.isActive 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role</label>
                          <div className="flex items-center space-x-2 mt-1">
                            {user.role === 'admin' && <Crown className="w-4 h-4 text-red-500" />}
                            {user.role === 'manager' && <Key className="w-4 h-4 text-blue-500" />}
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-sm font-semibold">
                              {user.role.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Department</label>
                          <p className="text-slate-700 font-medium mt-1">{user.position || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                          <Badge variant="outline" className="font-medium">
                            {userPermissions.length} permissions
                          </Badge>
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="bg-gradient-to-r from-slate-100 to-slate-200 hover:from-teal-100 hover:to-emerald-100 border border-slate-300 hover:border-teal-400 text-slate-700 hover:text-teal-700 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              {canEdit ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                              {canEdit ? "Manage" : "View"}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden p-0 bg-gradient-to-br from-slate-50 via-white to-slate-50">
                            {/* Executive Header */}
                            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 via-emerald-600/20 to-blue-600/20"></div>
                              <div className="relative px-6 py-4">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white">
                                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-xl shadow-lg">
                                      <ShieldCheck className="h-5 w-5 text-white" />
                                    </div>
                                    {canEdit ? "Manage" : "View"} Access
                                  </DialogTitle>
                                  <DialogDescription className="text-slate-300 mt-2 ml-11">
                                    {selectedUser && (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                                          <span className="text-xs font-bold text-teal-700">
                                            {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                                          </span>
                                        </div>
                                        <span className="text-sm">{selectedUser.firstName} {selectedUser.lastName}</span>
                                      </div>
                                    )}
                                  </DialogDescription>
                                </DialogHeader>
                              </div>
                            </div>

                            {selectedUser && (
                              <div className="flex-1 overflow-y-auto">
                                <div className="p-4 space-y-6">
                                  {/* Role Selection Section */}
                                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md">
                                    <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 rounded-t-xl border-b border-slate-100">
                                      <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                        <Crown className="w-4 h-4 mr-2 text-teal-600" />
                                        Access Level
                                      </h3>
                                    </div>
                                    <div className="p-4">
                                      {canEdit ? (
                                        <div className="space-y-3">
                                          <label className="text-sm font-semibold text-slate-700 block">Primary Role</label>
                                          <Select value={editingRole} onValueChange={setEditingRole}>
                                            <SelectTrigger className="h-10 border-2 border-slate-200 focus:border-teal-500 rounded-lg">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="employee">Employee</SelectItem>
                                              <SelectItem value="manager">Manager</SelectItem>
                                              <SelectItem value="hr">HR</SelectItem>
                                              <SelectItem value="admin">Admin</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2">
                                          {selectedUser.role === 'admin' && <Crown className="w-5 h-5 text-red-500" />}
                                          {selectedUser.role === 'manager' && <Key className="w-5 h-5 text-blue-500" />}
                                          {selectedUser.role === 'hr' && <UserCheck className="w-5 h-5 text-emerald-500" />}
                                          {selectedUser.role === 'employee' && <Users className="w-5 h-5 text-slate-500" />}
                                          <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="text-base px-4 py-1 font-bold">
                                            {selectedUser.role.toUpperCase()}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Permissions */}
                                  <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md">
                                    <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 rounded-t-xl border-b border-slate-100">
                                      <h3 className="text-lg font-bold text-slate-900 flex items-center">
                                        <Lock className="w-4 h-4 mr-2 text-teal-600" />
                                        Permissions
                                      </h3>
                                    </div>
                                    <div className="p-4">
                                      <div className="space-y-4">
                                        {Object.entries(
                                          PERMISSIONS.reduce((acc, perm) => {
                                            if (!acc[perm.category]) acc[perm.category] = [];
                                            acc[perm.category].push(perm);
                                            return acc;
                                          }, {} as Record<string, typeof PERMISSIONS>)
                                        ).map(([category, perms]) => (
                                          <div key={category} className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                                                  <Settings className="w-3 h-3 text-teal-700" />
                                                </div>
                                                <h4 className="font-bold text-slate-900">{category}</h4>
                                                <Badge variant="outline" className="text-xs">{perms.length}</Badge>
                                              </div>
                                              {canEdit && (
                                                <div className="flex items-center space-x-1">
                                                  <Sliders className="w-3 h-3 text-teal-600" />
                                                  <span className="text-xs font-medium text-slate-600">
                                                    {categorySliders[category] || 0}%
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Mobile Slider */}
                                            {canEdit && (
                                              <div className="mb-3 p-3 bg-white rounded border border-slate-200">
                                                <div className="flex items-center justify-between mb-2">
                                                  <span className="text-xs font-semibold text-slate-700">Level</span>
                                                  <span className="text-xs font-bold text-teal-600">
                                                    {categorySliders[category] || 0}%
                                                  </span>
                                                </div>
                                                <Slider
                                                  value={[categorySliders[category] || 0]}
                                                  onValueChange={(value) => handleCategorySlider(category, value)}
                                                  max={100}
                                                  step={25}
                                                  className="w-full"
                                                />
                                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                                  <span>None</span>
                                                  <span>View</span>
                                                  <span>Full</span>
                                                </div>
                                              </div>
                                            )}
                                            <div className="space-y-2">
                                              {perms.map(permission => {
                                                const defaultPerms = DEFAULT_ROLE_PERMISSIONS[editingRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
                                                const isDefault = defaultPerms.includes(permission.id);
                                                const isGranted = isDefault || editingPermissions.includes(permission.id);
                                                
                                                return (
                                                  <div key={permission.id} className="flex items-center space-x-3 p-2 rounded hover:bg-slate-50">
                                                    <Checkbox 
                                                      checked={isGranted}
                                                      disabled={!canEdit || isDefault}
                                                      onCheckedChange={() => togglePermission(permission.id)}
                                                      className="h-4 w-4"
                                                    />
                                                    <div className="flex-1">
                                                      <span className={`text-sm ${isDefault ? 'font-semibold' : 'font-medium'} text-slate-700`}>
                                                        {permission.label}
                                                      </span>
                                                      {isDefault && (
                                                        <div className="flex items-center space-x-1 mt-1">
                                                          <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                          <span className="text-xs text-emerald-600 font-medium">Default</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                {canEdit && (
                                  <div className="bg-white border-t-2 border-slate-200 px-4 py-4">
                                    <div className="flex flex-col gap-3">
                                      <Button 
                                        onClick={handleSavePermissions}
                                        disabled={updatePermissionsMutation.isPending}
                                        className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg font-semibold"
                                      >
                                        {updatePermissionsMutation.isPending ? (
                                          <div className="flex items-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Saving...</span>
                                          </div>
                                        ) : (
                                          <div className="flex items-center space-x-2">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span>Save Permissions</span>
                                          </div>
                                        )}
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        onClick={() => setSelectedUser(null)}
                                        className="w-full border-2 border-slate-300 hover:border-slate-400 font-medium"
                                      >
                                        Cancel Changes
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}