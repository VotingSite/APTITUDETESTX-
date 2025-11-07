import { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Clock, BookOpen, TrendingUp, Timer, Trophy, Target, Zap, Brain } from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function StudentDashboard() {
  const { userData } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    upcomingTests: 0,
    completedTests: 0,
    averageScore: 0,
    totalTimeSpent: 0,
    recentActivities: [],
    upcomingTestsList: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [userData]);

  const fetchDashboardData = async () => {
    if (!userData) return;

    try {
      setLoading(true);

      // Fetch test attempts for this user
      const attemptsQuery = query(
        collection(db, 'testAttempts'),
        where('userId', '==', userData.uid)
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);
      const attempts = attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate()
      }));

      // Fetch available tests
      const testsQuery = query(
        collection(db, 'tests'),
        where('status', '==', 'published')
      );
      const testsSnapshot = await getDocs(testsQuery);
      const availableTests = testsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate stats
      const completedTests = attempts.filter(a => a.status === 'completed').length;
      const averageScore = attempts.length > 0
        ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
        : 0;

      const upcomingTests = availableTests.filter(test =>
        !attempts.some(attempt => attempt.testId === test.id && attempt.status === 'completed')
      );

      setDashboardData({
        upcomingTests: upcomingTests.length,
        completedTests,
        averageScore: Math.round(averageScore * 10) / 10,
        totalTimeSpent: attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0),
        recentActivities: attempts.filter(a => a.status === 'completed').slice(0, 3),
        upcomingTestsList: upcomingTests.slice(0, 3)
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: "Upcoming Tests",
      value: dashboardData.upcomingTests.toString(),
      change: "Available to take",
      icon: Clock,
      gradient: "from-primary to-secondary",
      description: "Tests available"
    },
    {
      title: "Completed Tests",
      value: dashboardData.completedTests.toString(),
      change: "Total completed",
      icon: BookOpen,
      gradient: "from-secondary to-accent",
      description: "Tests finished"
    },
    {
      title: "Average Score",
      value: dashboardData.averageScore > 0 ? `${dashboardData.averageScore}%` : "No data",
      change: "Overall performance",
      icon: Trophy,
      gradient: "from-accent to-primary",
      description: "Your performance"
    },
    {
      title: "Total Time Spent",
      value: `${Math.round(dashboardData.totalTimeSpent / 60)}m`,
      change: "Learning time",
      icon: Timer,
      gradient: "from-primary to-accent",
      description: "Study duration"
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
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
        <h1 className="text-2xl md:text-4xl font-bold gradient-text mb-4">Welcome Back, Student!</h1>
        <p className="text-muted-foreground text-base md:text-lg">Ready to challenge your mind today?</p>
      </motion.div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Activity */}
        <AnimatedCard delay={0.5} className="h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <Brain className="w-5 h-5 mr-2 text-primary" />
              Recent Activity
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-sm text-primary hover:text-primary-glow font-medium"
            >
              View All
            </motion.button>
          </div>
          
          <div className="space-y-4">
            {dashboardData.recentActivities.length > 0 ? (
              dashboardData.recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-background-secondary border border-glass-border hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{activity.testTitle || 'Test'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {activity.completedAt ? activity.completedAt.toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success text-lg">{activity.score || 0}%</p>
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground">Take your first test to see results here</p>
              </div>
            )}
          </div>
        </AnimatedCard>

        {/* Upcoming Tests */}
        <AnimatedCard delay={0.6} className="h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <Target className="w-5 h-5 mr-2 text-secondary" />
              Upcoming Tests
            </h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-sm text-secondary hover:text-secondary-glow font-medium"
            >
              Schedule More
            </motion.button>
          </div>
          
          <div className="space-y-4">
            {dashboardData.upcomingTestsList.length > 0 ? (
              dashboardData.upcomingTestsList.map((test, index) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="group relative p-4 rounded-lg bg-background-secondary border border-glass-border hover:border-secondary/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{test.title}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          test.difficulty === 'Hard' ? 'bg-danger/20 text-danger' :
                          test.difficulty === 'Medium' ? 'bg-warning/20 text-warning' :
                          'bg-success/20 text-success'
                        }`}>
                          {test.difficulty}
                        </span>
                        <span>{test.duration} min</span>
                        <span>{test.totalQuestions} questions</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{test.category}</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-secondary to-accent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-glow"
                    >
                      <Zap className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming tests</p>
                <p className="text-xs text-muted-foreground">Check the My Tests page for available tests</p>
              </div>
            )}
          </div>
        </AnimatedCard>
      </div>

      {/* Quick Actions */}
      <AnimatedCard delay={0.8}>
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-accent" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Start Practice Test", desc: "Begin a quick practice session", gradient: "from-primary to-secondary" },
            { title: "Review Mistakes", desc: "Analyze your recent errors", gradient: "from-secondary to-accent" },
            { title: "Play Brain Games", desc: "Fun exercises to stay sharp", gradient: "from-accent to-primary" }
          ].map((action, index) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`p-6 rounded-xl bg-gradient-to-r ${action.gradient} hover:shadow-glow transition-all duration-300 text-left group`}
            >
              <h3 className="font-semibold text-white mb-2">{action.title}</h3>
              <p className="text-white/80 text-sm group-hover:text-white transition-colors">
                {action.desc}
              </p>
            </motion.button>
          ))}
        </div>
      </AnimatedCard>
    </div>
  );
}
