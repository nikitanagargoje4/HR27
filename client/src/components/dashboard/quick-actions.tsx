import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  UserPlus,
  Clock,
  CalendarCheck,
  Inbox,
  FileBarChart,
  Settings,
  Building2,
  Calendar,
} from "lucide-react";

interface ActionItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
  color: string;
  gradient: string;
  roles?: string[];
}

export function QuickActions() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const actions: ActionItem[] = [
    {
      icon: <UserPlus className="h-5 w-5" />,
      title: "Add Employee",
      description: "Register a new employee",
      path: "/employees",
      color: "text-teal-600",
      gradient: "from-teal-400 to-emerald-600",
      roles: ["admin", "hr"]
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Mark Attendance",
      description: "Check-in or check-out",
      path: "/attendance",
      color: "text-blue-600",
      gradient: "from-blue-400 to-indigo-600"
    },
    {
      icon: <CalendarCheck className="h-5 w-5" />,
      title: "Apply Leave",
      description: "Request time off",
      path: "/leave",
      color: "text-green-600",
      gradient: "from-green-400 to-teal-600"
    },
    {
      icon: <Inbox className="h-5 w-5" />,
      title: "Approvals",
      description: "Review pending requests",
      path: "/leave?filter=pending",
      color: "text-purple-600",
      gradient: "from-purple-400 to-violet-600",
      roles: ["admin", "hr", "manager"]
    },
    {
      icon: <FileBarChart className="h-5 w-5" />,
      title: "Reports",
      description: "View analytics data",
      path: "/reports/attendance",
      color: "text-amber-600",
      gradient: "from-amber-400 to-orange-600",
      roles: ["admin", "hr", "manager"]
    },
    {
      icon: <Building2 className="h-5 w-5" />,
      title: "Departments",
      description: "Manage departments",
      path: "/departments",
      color: "text-cyan-600",
      gradient: "from-cyan-400 to-blue-600",
      roles: ["admin", "hr"]
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Holidays",
      description: "View upcoming holidays",
      path: "/holidays",
      color: "text-rose-600",
      gradient: "from-rose-400 to-pink-600"
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "Settings",
      description: "Configure system",
      path: "/settings",
      color: "text-slate-600",
      gradient: "from-slate-400 to-slate-600",
      roles: ["admin"]
    }
  ];

  // Filter actions based on user role
  const filteredActions = actions.filter(action => {
    if (!action.roles) return true;
    return user && action.roles.includes(user.role);
  });

  const handleAction = (path: string) => {
    setLocation(path);
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">Quick Actions</span>
            <div className="h-px flex-grow bg-gradient-to-r from-indigo-100 to-purple-100 ml-4"></div>
          </h2>
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filteredActions.map((action, index) => (
              <motion.button
                key={index}
                className="flex flex-col items-center p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
                onClick={() => handleAction(action.path)}
                variants={item}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 } 
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-12 h-12 flex items-center justify-center rounded-full text-white bg-gradient-to-br ${action.gradient} mb-3 shadow-md`}>
                  {action.icon}
                </div>
                <span className={`text-sm font-semibold ${action.color} mb-1`}>{action.title}</span>
                <span className="text-xs text-slate-500 text-center">{action.description}</span>
              </motion.button>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
