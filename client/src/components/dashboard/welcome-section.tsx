import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Clock, TrendingUp, CheckCircle2 } from "lucide-react";

export function WelcomeSection() {
  const { user } = useAuth();
  const today = new Date();
  const currentHour = today.getHours();

  // Determine greeting based on time of day
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good evening";
  }

  // Determine role-based tasks
  const getRoleTasks = () => {
    if (!user) return [];
    
    const tasks = [
      {
        icon: <Clock className="h-4 w-4 text-blue-500" />,
        title: "Mark attendance",
        link: "/attendance"
      }
    ];
    
    if (user.role === "admin" || user.role === "hr" || user.role === "manager") {
      tasks.push({
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        title: "Review leave requests",
        link: "/leave?filter=pending"
      });
    }
    
    return tasks;
  };
  
  const tasks = getRoleTasks();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl overflow-hidden shadow-xl mb-6"
    >
      <div className="px-6 py-8 md:px-8 relative">
        <div className="absolute top-0 right-0 opacity-10">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="100" fill="white" />
            <path d="M120 80C120 91.0457 111.046 100 100 100C88.9543 100 80 91.0457 80 80C80 68.9543 88.9543 60 100 60C111.046 60 120 68.9543 120 80Z" fill="white" />
            <path d="M160 155C160 182.614 132.614 160 100 160C67.3858 160 40 182.614 40 155C40 127.386 67.3858 100 100 100C132.614 100 160 127.386 160 155Z" fill="white" />
          </svg>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold mb-1">{greeting}, {user?.firstName || "User"}!</h1>
            <p className="text-blue-100">{format(today, 'EEEE, MMMM do, yyyy')}</p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <div className="inline-block bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2">
              <p className="text-sm font-medium">
                {format(today, 'h:mm a')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl">
          {tasks.map((task, index) => (
            <a 
              key={index}
              href={task.link}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center 
                         transition-all duration-200 transform hover:translate-y-[-2px]"
            >
              <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center mr-3">
                {task.icon}
              </div>
              <span className="font-medium text-sm">{task.title}</span>
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}