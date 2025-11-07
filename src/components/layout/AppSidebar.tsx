import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Brain,
  BookOpen,
  PlayCircle,
  TrendingUp,
  Gamepad2,
  User,
  Users,
  FileText,
  Database,
  BarChart3,
  Activity,
  Menu,
  X,
  Zap,
  Trophy,
  Folder
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const studentItems = [
  { title: "Dashboard", url: "/student", icon: Brain, gradient: "from-primary to-secondary" },
  { title: "My Tests", url: "/student/tests", icon: BookOpen, gradient: "from-secondary to-accent" },
  { title: "Test Runner", url: "/student/test-runner", icon: PlayCircle, gradient: "from-accent to-primary" },
  { title: "Results", url: "/student/results", icon: Trophy, gradient: "from-primary to-accent" },
  { title: "Progress", url: "/student/progress", icon: TrendingUp, gradient: "from-secondary to-primary" },
  { title: "Mini Games", url: "/student/games", icon: Gamepad2, gradient: "from-accent to-secondary" },
  { title: "Profile", url: "/student/profile", icon: User, gradient: "from-primary to-secondary" },
];

const adminItems = [
  { title: "Overview", url: "/admin", icon: BarChart3, gradient: "from-primary to-secondary" },
  { title: "User Management", url: "/admin/students", icon: Users, gradient: "from-secondary to-accent" },
  { title: "Test Management", url: "/admin/tests", icon: FileText, gradient: "from-accent to-primary" },
  { title: "Question Bank", url: "/admin/questions", icon: Database, gradient: "from-primary to-accent" },
  { title: "Analytics", url: "/admin/analytics", icon: TrendingUp, gradient: "from-secondary to-primary" },
  { title: "Activity Logs", url: "/admin/logs", icon: Activity, gradient: "from-accent to-secondary" },
];

interface AppSidebarProps {
  userType: 'student' | 'admin';
}

export function AppSidebar({ userType }: AppSidebarProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const items = userType === 'student' ? studentItems : adminItems;
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === `/student` && currentPath === '/') return true;
    if (path === `/admin` && currentPath === '/admin') return true;
    return currentPath === path;
  };

  const sidebarVariants: Variants = {
    expanded: {
      width: 280,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    collapsed: {
      width: 80,
      transition: { duration: 0.3, ease: "easeInOut" }
    },
  };

  const menuItemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: "easeOut"
      }
    })
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <AnimatePresence>
        {isMobile ? (
          mobileOpen && (
            <motion.div
              key="mobile-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-y-0 left-0 z-50 w-72"
            >
              <Sidebar className="glass-card border-r border-glass-border h-full">
                {renderSidebarContent()}
              </Sidebar>
            </motion.div>
          )
        ) : (
          <motion.div
            key="desktop-sidebar"
            variants={sidebarVariants}
            initial={false}
            animate={collapsed ? "collapsed" : "expanded"}
            className="relative z-10"
          >
            <Sidebar className="glass-card border-r border-glass-border h-full">
              {renderSidebarContent()}
            </Sidebar>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  function renderSidebarContent() {
    return (
      <>
        <div className="p-6 border-b border-glass-border">
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center primary-glow">
                    <Zap className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold gradient-text">Aptitude Test X</h2>
                    <p className="text-xs text-muted-foreground capitalize">{userType} Portal</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed)}
              className="w-8 h-8 rounded-lg glass-card flex items-center justify-center hover:primary-glow transition-all duration-300"
            >
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </motion.div>
            </motion.button>
          </div>
        </div>

        <SidebarContent className="px-3 py-6">
          <SidebarGroup>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-4 ml-3">
                    {userType === 'student' ? 'STUDENT PORTAL' : 'ADMIN PORTAL'}
                  </SidebarGroupLabel>
                </motion.div>
              )}
            </AnimatePresence>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {items.map((item, index) => {
                  const active = isActive(item.url);
                  
                  return (
                    <motion.div
                      key={item.title}
                      custom={index}
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                      onHoverStart={() => setHoveredItem(item.title)}
                      onHoverEnd={() => setHoveredItem(null)}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className="h-12 rounded-xl">
                          <NavLink
                            to={item.url}
                            className={`
                              relative group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300
                              ${active 
                                ? 'glass-card-glow text-foreground' 
                                : 'hover:glass-card text-muted-foreground hover:text-foreground'
                              }
                            `}
                          >
                            {/* Icon with gradient background */}
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className={`
                                w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                                ${active 
                                  ? `bg-gradient-to-r ${item.gradient} shadow-glow` 
                                  : 'bg-muted group-hover:bg-gradient-to-r group-hover:' + item.gradient
                                }
                              `}
                            >
                              <item.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-foreground'}`} />
                            </motion.div>

                            {/* Text label */}
                            <AnimatePresence>
                              {!collapsed && (
                                <motion.span
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className={`font-medium ${active ? 'text-foreground' : ''}`}
                                >
                                  {item.title}
                                </motion.span>
                              )}
                            </AnimatePresence>

                            {/* Active indicator */}
                            {active && (
                              <motion.div
                                layoutId="activeIndicator"
                                className="absolute right-2 w-2 h-2 rounded-full bg-primary shadow-glow"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2 }}
                              />
                            )}

                            {/* Hover glow effect */}
                            {hoveredItem === item.title && !active && (
                              <motion.div
                                layoutId="hoverGlow"
                                className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 blur-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer */}
        <div className="p-4 border-t border-glass-border">
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-center"
              >
                <p className="text-xs text-muted-foreground">
                  Powered by <span className="gradient-text font-semibold">Aptitude Test X(saad parkar </span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    );
  }
}
