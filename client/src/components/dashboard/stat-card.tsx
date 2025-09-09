import { cn } from "@/lib/utils";
import { UserCheck, UserMinus, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: number;
  total: number;
  percentage: number;
  status: "present" | "leave" | "absent";
}

export function StatCard({ title, value, total, percentage, status }: StatCardProps) {
  // Configure icon and colors based on status
  const config = {
    present: {
      icon: <UserCheck className="h-5 w-5" />,
      iconBg: "bg-gradient-to-br from-green-400 to-emerald-600",
      textColor: "text-emerald-600",
      progressColor: "bg-gradient-to-r from-green-400 to-emerald-500",
      shadowColor: "shadow-emerald-100"
    },
    leave: {
      icon: <CalendarCheck className="h-5 w-5" />,
      iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
      textColor: "text-amber-600",
      progressColor: "bg-gradient-to-r from-amber-400 to-orange-400",
      shadowColor: "shadow-amber-100"
    },
    absent: {
      icon: <UserMinus className="h-5 w-5" />,
      iconBg: "bg-gradient-to-br from-red-400 to-rose-600",
      textColor: "text-rose-600",
      progressColor: "bg-gradient-to-r from-red-400 to-rose-500",
      shadowColor: "shadow-rose-100"
    }
  };

  const { icon, iconBg, textColor, progressColor, shadowColor } = config[status];
  const formattedPercentage = Math.round(percentage);

  // Status labels for better readability
  const statusLabels = {
    present: "attendance rate",
    leave: "on planned leave",
    absent: "unplanned absence"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 hover:shadow-xl transition-shadow"
    >
      <div className="flex items-center">
        <div className={cn("p-3 rounded-full text-white", iconBg, shadowColor, "shadow-lg")}>
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          <div className="flex items-baseline">
            <p className={cn("text-2xl font-bold", textColor)}>{value}</p>
            <p className="ml-2 text-sm text-slate-500">/ {total}</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="relative pt-1">
          <div className="flex items-center justify-between">
            <div>
              <span className={cn("text-xs font-semibold inline-block uppercase", textColor)}>
                {statusLabels[status]}
              </span>
            </div>
            <div className="text-right">
              <span className={cn("text-xs font-semibold inline-block", textColor)}>
                {formattedPercentage}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mt-2 text-xs flex rounded-full bg-slate-100">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${formattedPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn("h-full rounded-full", progressColor)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
