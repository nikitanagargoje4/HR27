import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { 
  LayoutDashboard, Users, Building2, ShieldCheck, Clock, 
  CalendarCheck, CalendarClock, FileBarChart, FileSpreadsheet, 
  LogOut, ChevronRight, ChevronLeft, User as UserIcon, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyPermission } from "@/lib/permissions";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  permissions?: string[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();
  const { user, logoutMutation } = useAuth();
  
  const navGroups: NavGroup[] = [
    {
      title: "Dashboard",
      items: [
        {
          title: "Overview",
          href: "/",
          icon: <LayoutDashboard className="h-5 w-5" />
        }
      ]
    },
    {
      title: "Employee Management",
      items: [
        {
          title: "Employees",
          href: "/employees",
          icon: <Users className="h-5 w-5" />,
          permissions: ["employees.view"]
        },
        {
          title: "Departments",
          href: "/departments",
          icon: <Building2 className="h-5 w-5" />,
          permissions: ["departments.view"]
        },
        {
          title: "Roles & Permissions",
          href: "/roles",
          icon: <ShieldCheck className="h-5 w-5" />,
          permissions: ["roles.view"]
        }
      ]
    },
    {
      title: "Time Management",
      items: [
        {
          title: "Attendance",
          href: "/attendance",
          icon: <Clock className="h-5 w-5" />,
          permissions: ["attendance.view"]
        },
        {
          title: "Leave Management",
          href: "/leave",
          icon: <CalendarCheck className="h-5 w-5" />,
          permissions: ["leave.view"]
        },
        {
          title: "Holidays",
          href: "/holidays",
          icon: <CalendarClock className="h-5 w-5" />
        }
      ]
    },
    {
      title: "Payroll Management",
      items: [
        {
          title: "Payroll",
          href: "/payroll",
          icon: <DollarSign className="h-5 w-5" />
        }
      ]
    },
    {
      title: "Reports",
      items: [
        {
          title: "Attendance Reports",
          href: "/reports/attendance",
          icon: <FileBarChart className="h-5 w-5" />,
          permissions: ["reports.view"]
        },
        {
          title: "Leave Reports",
          href: "/reports/leave",
          icon: <FileSpreadsheet className="h-5 w-5" />,
          permissions: ["reports.view"]
        },
        {
          title: "Payroll Reports",
          href: "/reports/payroll",
          icon: <DollarSign className="h-5 w-5" />,
          permissions: ["reports.view"]
        }
      ]
    }
  ];
  
  // Filter out nav items based on user permissions
  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!item.permissions || item.permissions.length === 0) return true;
      return hasAnyPermission(user, item.permissions);
    })
  })).filter(group => group.items.length > 0);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Helper function to generate user initials
  const getInitials = (user: User) => {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden",
          !collapsed ? "block" : "hidden"
        )}
        onClick={() => toggleSidebar()}
      />
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out lg:relative lg:z-0",
          // Mobile: show/hide sidebar
          "lg:translate-x-0",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "translate-x-0 w-64",
          className
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-teal-600 text-white flex items-center justify-center">
              <UserIcon className="h-5 w-5" />
            </div>
            {!collapsed && <h1 className="text-xl font-semibold text-slate-900">HR Connect</h1>}
          </div>
          <Button 
            onClick={() => toggleSidebar()} 
            variant="ghost" 
            size="icon" 
            className="hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {filteredNavGroups.map((group, i) => (
            <div key={i} className="mb-6">
              {!collapsed && (
                <div className="px-3 pb-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {group.title}
                  </p>
                </div>
              )}
              
              {group.items.map((item, j) => {
                const isActive = location === item.href;
                return (
                  <Link 
                    key={j} 
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 mx-2 my-1 text-sm font-medium rounded-md",
                      isActive 
                        ? "bg-teal-50 text-teal-700" 
                        : "text-slate-700 hover:bg-slate-100",
                      collapsed && "justify-center"
                    )}
                  >
                    <div className={cn(collapsed ? "mx-0" : "mr-3")}>{item.icon}</div>
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        
        {/* User profile */}
        {user && (
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center">
              <Avatar>
                <AvatarImage src={user.photoUrl || ""} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback>{getInitials(user)}</AvatarFallback>
              </Avatar>
              
              {!collapsed && (
                <div className="ml-3 mr-auto">
                  <p className="text-sm font-medium text-slate-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
              )}
              
              <Button 
                onClick={handleLogout} 
                variant="ghost" 
                size="icon" 
                className="ml-auto text-slate-500 hover:text-slate-700"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
