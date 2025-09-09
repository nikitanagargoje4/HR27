import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import EmployeesPage from "@/pages/employees-page";
import DepartmentsPage from "@/pages/departments-page";
import AttendancePage from "@/pages/attendance-page";
import LeavePage from "@/pages/leave-page";
import HolidaysPage from "@/pages/holidays-page";
import PayrollPage from "@/pages/payroll-page";
import ReportsPage from "@/pages/reports-page";
import RolesPage from "@/pages/roles-page";
import SettingsPage from "@/pages/settings-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/employees" component={EmployeesPage} />
      <ProtectedRoute path="/departments" component={DepartmentsPage} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/leave" component={LeavePage} />
      <ProtectedRoute path="/holidays" component={HolidaysPage} />
      <ProtectedRoute path="/payroll" component={PayrollPage} />
      <ProtectedRoute path="/reports/attendance" component={ReportsPage} />
      <ProtectedRoute path="/reports/leave" component={ReportsPage} />
      <ProtectedRoute path="/reports/payroll" component={ReportsPage} />
      <ProtectedRoute path="/roles" component={RolesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SidebarProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </SidebarProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
