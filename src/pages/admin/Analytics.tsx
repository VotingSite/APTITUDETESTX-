import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Clock, 
  Calendar,
  Target,
  Brain,
  Trophy,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Activity
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AnalyticsData {
  totalStudents: number;
  totalTests: number;
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  activeUsers: number;
  testPerformance: Array<{
    testTitle: string;
    attempts: number;
    averageScore: number;
    category: string;
  }>;
  categoryPerformance: Array<{
    category: string;
    count: number;
    averageScore: number;
    color: string;
  }>;
  monthlyActivity: Array<{
    month: string;
    attempts: number;
    students: number;
    tests: number;
  }>;
  difficultyDistribution: Array<{
    difficulty: string;
    count: number;
    color: string;
  }>;
  dailyActivity: Array<{
    date: string;
    attempts: number;
    completions: number;
  }>;
  topPerformers: Array<{
    name: string;
    score: number;
    tests: number;
  }>;
}

const COLORS = ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#6366F1'];

export default function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Fetch all data
      const [studentsSnapshot, testsSnapshot, attemptsSnapshot, questionsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'tests')),
        getDocs(collection(db, 'testAttempts')),
        getDocs(collection(db, 'questions'))
      ]);

      const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const tests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const attempts = attemptsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      const questions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter attempts by date range
      const filteredAttempts = attempts.filter(attempt => {
        const attemptDate = attempt.completedAt || attempt.createdAt;
        return attemptDate && attemptDate >= startDate && attemptDate <= endDate;
      });

      // Calculate basic stats
      const totalStudents = students.length;
      const totalTests = tests.length;
      const totalAttempts = filteredAttempts.length;
      const completedAttempts = filteredAttempts.filter(a => a.status === 'completed');
      const averageScore = completedAttempts.length > 0 
        ? completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedAttempts.length
        : 0;
      const completionRate = totalAttempts > 0 ? (completedAttempts.length / totalAttempts) * 100 : 0;
      
      // Calculate active users (users who attempted in the time range)
      const activeUserIds = new Set(filteredAttempts.map(a => a.userId));
      const activeUsers = activeUserIds.size;

      // Test performance analysis
      const testPerformanceMap = new Map();
      completedAttempts.forEach(attempt => {
        const testId = attempt.testId;
        const test = tests.find(t => t.id === testId);
        if (test) {
          const key = testId;
          if (!testPerformanceMap.has(key)) {
            testPerformanceMap.set(key, {
              testTitle: test.title,
              category: test.category,
              attempts: 0,
              totalScore: 0
            });
          }
          const data = testPerformanceMap.get(key);
          data.attempts++;
          data.totalScore += attempt.score || 0;
        }
      });

      const testPerformance = Array.from(testPerformanceMap.values())
        .map(data => ({
          ...data,
          averageScore: data.attempts > 0 ? Math.round((data.totalScore / data.attempts) * 10) / 10 : 0
        }))
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 10);

      // Category performance analysis
      const categoryMap = new Map();
      completedAttempts.forEach(attempt => {
        const testId = attempt.testId;
        const test = tests.find(t => t.id === testId);
        if (test && test.category) {
          const category = test.category;
          if (!categoryMap.has(category)) {
            categoryMap.set(category, { attempts: 0, totalScore: 0 });
          }
          const data = categoryMap.get(category);
          data.attempts++;
          data.totalScore += attempt.score || 0;
        }
      });

      const categoryPerformance = Array.from(categoryMap.entries())
        .map(([category, data], index) => ({
          category,
          count: data.attempts,
          averageScore: data.attempts > 0 ? Math.round((data.totalScore / data.attempts) * 10) / 10 : 0,
          color: COLORS[index % COLORS.length]
        }))
        .sort((a, b) => b.count - a.count);

      // Monthly activity (last 6 months)
      const monthlyMap = new Map();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        last6Months.push({ key: monthKey, name: monthName });
        monthlyMap.set(monthKey, { attempts: 0, students: new Set(), tests: new Set() });
      }

      attempts.forEach(attempt => {
        const date = attempt.completedAt || attempt.createdAt;
        if (date) {
          const monthKey = date.toISOString().substring(0, 7);
          const data = monthlyMap.get(monthKey);
          if (data) {
            data.attempts++;
            data.students.add(attempt.userId);
            data.tests.add(attempt.testId);
          }
        }
      });

      const monthlyActivity = last6Months.map(({ key, name }) => {
        const data = monthlyMap.get(key);
        return {
          month: name,
          attempts: data?.attempts || 0,
          students: data?.students.size || 0,
          tests: data?.tests.size || 0
        };
      });

      // Difficulty distribution
      const difficultyMap = new Map();
      tests.forEach(test => {
        const difficulty = test.difficulty || 'Medium';
        difficultyMap.set(difficulty, (difficultyMap.get(difficulty) || 0) + 1);
      });

      const difficultyDistribution = Array.from(difficultyMap.entries())
        .map(([difficulty, count], index) => ({
          difficulty,
          count,
          color: COLORS[index % COLORS.length]
        }));

      // Daily activity (last 7 days)
      const dailyMap = new Map();
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayKey = date.toISOString().substring(0, 10); // YYYY-MM-DD
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        last7Days.push({ key: dayKey, name: dayName });
        dailyMap.set(dayKey, { attempts: 0, completions: 0 });
      }

      filteredAttempts.forEach(attempt => {
        const date = attempt.completedAt || attempt.createdAt;
        if (date) {
          const dayKey = date.toISOString().substring(0, 10);
          const data = dailyMap.get(dayKey);
          if (data) {
            data.attempts++;
            if (attempt.status === 'completed') {
              data.completions++;
            }
          }
        }
      });

      const dailyActivity = last7Days.map(({ key, name }) => {
        const data = dailyMap.get(key);
        return {
          date: name,
          attempts: data?.attempts || 0,
          completions: data?.completions || 0
        };
      });

      // Top performers
      const userPerformanceMap = new Map();
      completedAttempts.forEach(attempt => {
        const userId = attempt.userId;
        if (!userPerformanceMap.has(userId)) {
          userPerformanceMap.set(userId, {
            name: attempt.userName || 'Unknown User',
            scores: [],
            tests: 0
          });
        }
        const userData = userPerformanceMap.get(userId);
        userData.scores.push(attempt.score || 0);
        userData.tests++;
      });

      const topPerformers = Array.from(userPerformanceMap.values())
        .map(user => ({
          name: user.name,
          score: user.scores.length > 0 
            ? Math.round((user.scores.reduce((sum, score) => sum + score, 0) / user.scores.length) * 10) / 10
            : 0,
          tests: user.tests
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setAnalyticsData({
        totalStudents,
        totalTests,
        totalAttempts,
        averageScore: Math.round(averageScore * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        activeUsers,
        testPerformance,
        categoryPerformance,
        monthlyActivity,
        difficultyDistribution,
        dailyActivity,
        topPerformers
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!analyticsData) return;

    const exportData = {
      summary: {
        totalStudents: analyticsData.totalStudents,
        totalTests: analyticsData.totalTests,
        totalAttempts: analyticsData.totalAttempts,
        averageScore: analyticsData.averageScore,
        completionRate: analyticsData.completionRate,
        activeUsers: analyticsData.activeUsers
      },
      testPerformance: analyticsData.testPerformance,
      categoryPerformance: analyticsData.categoryPerformance,
      topPerformers: analyticsData.topPerformers,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Analytics data exported successfully"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No analytics data available</h3>
        <p className="text-muted-foreground">Data will appear here as students take tests</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-lg">Comprehensive insights into test performance and student engagement</p>
      </motion.div>

      {/* Controls */}
      <AnimatedCard delay={0.1}>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium">Time Range:</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </AnimatedCard>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {[
          { title: "Total Students", value: analyticsData.totalStudents.toString(), icon: Users, gradient: "from-primary to-secondary" },
          { title: "Total Tests", value: analyticsData.totalTests.toString(), icon: FileText, gradient: "from-secondary to-accent" },
          { title: "Total Attempts", value: analyticsData.totalAttempts.toString(), icon: Activity, gradient: "from-accent to-primary" },
          { title: "Average Score", value: `${analyticsData.averageScore}%`, icon: Trophy, gradient: "from-primary to-accent" },
          { title: "Completion Rate", value: `${analyticsData.completionRate}%`, icon: Target, gradient: "from-secondary to-primary" },
          { title: "Active Users", value: analyticsData.activeUsers.toString(), icon: Brain, gradient: "from-accent to-secondary" }
        ].map((metric, index) => (
          <AnimatedCard key={metric.title} delay={0.2 + index * 0.1} glow>
            <div className="text-center">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${metric.gradient} flex items-center justify-center shadow-glow mx-auto mb-3`}
              >
                <metric.icon className="w-6 h-6 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-1">{metric.value}</h3>
              <p className="text-sm text-muted-foreground">{metric.title}</p>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Activity */}
        <AnimatedCard delay={0.8}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <LineChart className="w-5 h-5 mr-2 text-primary" />
              Daily Activity (Last 7 Days)
            </h2>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Area type="monotone" dataKey="attempts" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="completions" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </AnimatedCard>

        {/* Category Performance */}
        <AnimatedCard delay={0.9}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-secondary" />
              Category Performance
            </h2>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <RechartsPieChart dataKey="count">
                {analyticsData.categoryPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </RechartsPieChart>
            </RechartsPieChart>
          </ResponsiveContainer>
        </AnimatedCard>

        {/* Monthly Trends */}
        <AnimatedCard delay={1.0}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-accent" />
              Monthly Trends
            </h2>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.monthlyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="attempts" fill="#8B5CF6" />
              <Bar dataKey="students" fill="#06B6D4" />
            </BarChart>
          </ResponsiveContainer>
        </AnimatedCard>

        {/* Top Performers */}
        <AnimatedCard delay={1.1}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-accent" />
              Top Performers
            </h2>
          </div>
          
          <div className="space-y-4">
            {analyticsData.topPerformers.map((performer, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-background-secondary border border-glass-border"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-gradient-to-r from-accent to-primary shadow-glow' :
                    index === 1 ? 'bg-gradient-to-r from-secondary to-accent' :
                    index === 2 ? 'bg-gradient-to-r from-primary to-secondary' :
                    'bg-muted'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">{performer.name}</h4>
                    <p className="text-xs text-muted-foreground">{performer.tests} tests</p>
                  </div>
                </div>
                <Badge className="bg-success/20 text-success">
                  {performer.score}%
                </Badge>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>
      </div>

      {/* Test Performance Table */}
      <AnimatedCard delay={1.2}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Test Performance Overview
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-glass-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Test Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Attempts</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Avg Score</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Performance</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.testPerformance.map((test, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + index * 0.05 }}
                  className="border-b border-glass-border hover:bg-background-secondary transition-colors"
                >
                  <td className="py-3 px-4">
                    <p className="font-medium text-foreground">{test.testTitle}</p>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{test.category}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{test.attempts}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-success">{test.averageScore}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                        style={{ width: `${Math.min(test.averageScore, 100)}%` }}
                      />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {analyticsData.testPerformance.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No test performance data available</p>
            </div>
          )}
        </div>
      </AnimatedCard>
    </div>
  );
}
