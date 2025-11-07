import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  userType: 'student' | 'admin';
}

export function DashboardLayout({ children, userType }: DashboardLayoutProps) {
  const { logout, userData } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background min-w-[320px]">
        <AppSidebar userType={userType} />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-16 glass-card border-b border-glass-border flex items-center px-6 sticky top-0 z-40"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="md:hidden w-8 h-8 rounded-lg glass-card flex items-center justify-center hover:primary-glow transition-all duration-300" />
                
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="text-xl font-bold gradient-text"
                >
                  {userType === 'student' ? 'Student Dashboard' : 'Admin Dashboard'}
                </motion.h1>
              </div>

              {/* User info and controls */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex items-center space-x-4"
              >
                <div className="hidden md:flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground primary-glow">
                    {userData?.displayName?.charAt(0)?.toUpperCase() || (userType === 'student' ? 'S' : 'A')}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {userData?.displayName || `${userType === 'student' ? 'Student' : 'Admin'} User`}
                    </p>
                    <p className="text-muted-foreground text-xs">Online</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2 hover:bg-background-secondary transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </motion.div>
            </div>
          </motion.header>

          {/* Main Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex-1 p-4 md:p-6 overflow-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </SidebarProvider>
  );
}
