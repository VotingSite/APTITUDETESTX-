import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Users, FileText, TrendingUp, Clock, Activity, Zap, Brain, Target } from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';

interface TestAttempt {
  id: string;
  status: string;
  score: number;
  completedAt: Date;
  createdAt: Timestamp;
  userName: string;
  testTitle: string;
  userId: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    testsCreated: 0,
    averageScore: 0,
    attemptsToday: 0,
    recentActivities: [],
    topPerformers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch total students
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
      const totalStudents = usersSnapshot.size;

      // Fetch tests
      const testsSnapshot = await getDocs(collection(db, 'tests'));
      const testsCreated = testsSnapshot.size;

      // Fetch test attempts
      const attemptsSnapshot = await getDocs(collection(db, 'testAttempts'));
      const allAttempts: TestAttempt[] = attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate()
      } as TestAttempt));

      // Calculate average score
      const completedAttempts = allAttempts.filter(a => a.status === 'completed' && a.score !== undefined);
      const averageScore = completedAttempts.length > 0 
        ? completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length 
        : 0;

      // Calculate attempts today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const attemptsToday = allAttempts.filter(a => {
        const attemptDate = a.completedAt || a.createdAt?.toDate();
        return attemptDate && attemptDate >= today;
      }).length;

      // Get recent activities (last 4)
      const recentActivities = allAttempts
        .filter(a => a.completedAt)
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 4)
        .map(attempt => ({
          user: attempt.userName || 'Student',
          action: `Completed ${attempt.testTitle || 'Test'}`,
          score: attempt.score ? `${attempt.score}%` : 'No score',
          time: getTimeAgo(attempt.completedAt),
          type: 'completion'
        }));

      // Calculate top performers
      const userScores = {};
      completedAttempts.forEach(attempt => {
        const userId = attempt.userId;
        if (!userScores[userId]) {
          userScores[userId] = { scores: [], tests: 0, name: attempt.userName || 'Student' };
        }
        userScores[userId].scores.push(attempt.score);
        userScores[userId].tests++;
      });

      const topPerformers = Object.entries(userScores)
        .map(([userId, data]: [string, any]) => ({
          name: data.name,
          score: (data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length).toFixed(1) + '%',
          tests: data.tests,
          avgScore: data.scores.reduce((sum: number, score: number) => sum + score, 0) / data.scores.length
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 4)
        .map((performer, index) => ({ ...performer, rank: index + 1 }));

      setDashboardData({
        totalStudents,
        testsCreated,
        averageScore: Math.round(averageScore * 10) / 10,
        attemptsToday,
        recentActivities,
        topPerformers
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const kpiCards = [
    {
      title: "Total Students",
      value: dashboardData.totalStudents.toString(),
      change: "Registered users",
      icon: Users,
      gradient: "from-primary to-secondary",
      description: "Active learners"
    },
    {
      title: "Tests Created",
      value: dashboardData.testsCreated.toString(),
      change: "Available assessments",
      icon: FileText,
      gradient: "from-secondary to-accent",
      description: "Total tests"
    },
    {
      title: "Average Score",
      value: dashboardData.averageScore > 0 ? `${dashboardData.averageScore}%` : "No data",
      change: "Platform performance",
      icon: TrendingUp,
      gradient: "from-accent to-primary",
      description: "Overall performance"
    },
    {
      title: "Attempts Today",
      value: dashboardData.attemptsToday.toString(),
      change: "Today's activity",
      icon: Clock,
      gradient: "from-primary to-accent",
      description: "Test submissions"
    }
  ];

  const systemStats = [
    { label: "Active Users", value: dashboardData.totalStudents.toString(), status: "normal" },
    { label: "Total Tests", value: dashboardData.testsCreated.toString(), status: "normal" },
    { label: "Avg Score", value: dashboardData.averageScore > 0 ? `${dashboardData.averageScore}%` : "N/A", status: "good" },
    { label: "Today Activity", value: dashboardData.attemptsToday.toString(), status: "normal" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Admin Control Center</h1>
        <p className="text-muted-foreground text-lg">Monitor, manage, and optimize your aptitude testing platform</p>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => (
          <AnimatedCard key={card.title} delay={index * 0.1} glow>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">{card.title}</p>
                <h3 className="text-3xl font-bold text-foreground mb-1">{card.value}</h3>
                <p className="text-xs text-success font-medium">{card.change}</p>
                <p className="text-xs text-muted-foreground mt-2">{card.description}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.gradient} flex items-center justify-center shadow-glow`}
              >
                <card.icon className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <AnimatedCard delay={0.5} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary" />
              Real-time Activity Feed
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-sm text-primary hover:text-primary-glow font-medium"
            >
              View All
            </motion.button>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {dashboardData.recentActivities.length > 0 ? (
              dashboardData.recentActivities.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-background-secondary border border-glass-border hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.type === 'completion' ? 'bg-success animate-pulse' :
                      activity.type === 'achievement' ? 'bg-accent animate-pulse' :
                      'bg-secondary animate-pulse'
                    }`}></div>
                    <div>
                      <h4 className="font-medium text-foreground">{activity.user}</h4>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      activity.score === 'In Progress' ? 'text-secondary' : 'text-success'
                    }`}>
                      {activity.score}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground">Activity will appear here as students take tests</p>
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Top Performers */}
        <AnimatedCard delay={0.6}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <Target className="w-5 h-5 mr-2 text-accent" />
              Top Performers
            </h2>
          </div>
          
          <div className="space-y-4">
            {dashboardData.topPerformers.length > 0 ? (
              dashboardData.topPerformers.map((performer, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-background-secondary border border-glass-border"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      performer.rank === 1 ? 'bg-gradient-to-r from-accent to-primary shadow-glow' :
                      performer.rank === 2 ? 'bg-gradient-to-r from-secondary to-accent' :
                      performer.rank === 3 ? 'bg-gradient-to-r from-primary to-secondary' :
                      'bg-muted'
                    }`}>
                      #{performer.rank}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{performer.name}</h4>
                      <p className="text-xs text-muted-foreground">{performer.tests} tests</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">{performer.score}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No performance data</p>
                <p className="text-xs text-muted-foreground">Top performers will appear here</p>
              </div>
            )}
          </div>
        </AnimatedCard>
      </div>

      {/* System Stats & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* System Health */}
        <AnimatedCard delay={0.8}>
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-secondary" />
            System Overview
          </h2>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {systemStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="p-4 rounded-lg bg-background-secondary border border-glass-border text-center"
              >
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{stat.label}</h4>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${
                  stat.status === 'excellent' ? 'bg-success animate-pulse' :
                  stat.status === 'good' ? 'bg-secondary animate-pulse' :
                  'bg-primary animate-pulse'
                }`}></div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard delay={0.9}>
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-accent" />
            Quick Actions
          </h2>
          
          <div className="space-y-4">
            {[
              { 
                title: "Create New Test", 
                desc: "Design a new assessment", 
                gradient: "from-primary to-secondary",
                action: () => navigate('/admin/tests')
              },
              { 
                title: "Generate Questions", 
                desc: "Use AI to create questions", 
                gradient: "from-secondary to-accent",
                action: () => navigate('/admin/questions')
              },
              { 
                title: "View Reports", 
                desc: "Export analytics data", 
                gradient: "from-accent to-primary",
                action: () => navigate('/admin/analytics')
              },
              { 
                title: "Manage Users", 
                desc: "Add or modify user accounts", 
                gradient: "from-primary to-accent",
                action: () => navigate('/admin/students')
              }
            ].map((action, index) => (
              <motion.button
                key={action.title}
                onClick={action.action}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-4 rounded-xl bg-gradient-to-r ${action.gradient} hover:shadow-glow transition-all duration-300 text-left group cursor-pointer`}
              >
                <h3 className="font-semibold text-white mb-1">{action.title}</h3>
                <p className="text-white/80 text-sm group-hover:text-white transition-colors">
                  {action.desc}
                </p>
              </motion.button>
            ))}
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
