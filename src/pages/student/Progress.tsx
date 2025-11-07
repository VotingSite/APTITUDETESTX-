import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Clock, 
  Trophy, 
  BookOpen,
  Brain,
  Zap,
  Award,
  Star,
  ChevronUp,
  ChevronDown,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Download,
  RefreshCw,
  Flame,
  Medal,
  Users,
  CheckCircle
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SkillProgress {
  skill: string;
  category: string;
  currentLevel: number;
  maxLevel: number;
  progress: number;
  totalPoints: number;
  recentActivity: number;
  icon: any;
  color: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

interface StudyStreak {
  current: number;
  longest: number;
  thisWeek: number;
  lastActivity: Date | null;
}

interface PerformanceData {
  date: string;
  score: number;
  category: string;
  testsCompleted: number;
}

interface UserProgressData {
  skills: SkillProgress[];
  achievements: Achievement[];
  studyStreak: StudyStreak;
  performanceHistory: PerformanceData[];
  overallProgress: number;
  totalPoints: number;
}

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-600'
};

// Define potential achievements that can be unlocked
const possibleAchievements: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  {
    id: 'first-test',
    title: 'First Steps',
    description: 'Complete your first test',
    icon: Star,
    category: 'Getting Started',
    rarity: 'common'
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Complete a test in under 10 minutes',
    icon: Zap,
    category: 'Performance',
    rarity: 'rare'
  },
  {
    id: 'perfect-score',
    title: 'Perfect Score',
    description: 'Achieve 100% on any test',
    icon: Trophy,
    category: 'Excellence',
    rarity: 'epic'
  },
  {
    id: 'streak-master',
    title: 'Consistency King',
    description: 'Maintain a 7-day study streak',
    icon: Flame,
    category: 'Dedication',
    rarity: 'rare'
  },
  {
    id: 'logic-master',
    title: 'Logic Master',
    description: 'Complete 10 logic tests with 80%+ average',
    icon: Brain,
    category: 'Mastery',
    rarity: 'legendary',
    maxProgress: 10
  },
  {
    id: 'math-wizard',
    title: 'Math Wizard',
    description: 'Score 90%+ on 5 math tests',
    icon: Target,
    category: 'Subject Mastery',
    rarity: 'epic',
    maxProgress: 5
  },
  {
    id: 'game-master',
    title: 'Game Master',
    description: 'Play 25 mini-games',
    icon: Award,
    category: 'Gaming',
    rarity: 'rare',
    maxProgress: 25
  }
];

export default function Progress() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const mounted = useRef(true);
  
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<UserProgressData>({
    skills: [],
    achievements: [],
    studyStreak: { current: 0, longest: 0, thisWeek: 0, lastActivity: null },
    performanceHistory: [],
    overallProgress: 0,
    totalPoints: 0
  });

  useEffect(() => {
    if (userData) {
      fetchProgressData();
    }
    return () => {
      mounted.current = false;
    };
  }, [userData]);

  const fetchProgressData = async () => {
    if (!userData || !mounted.current) return;

    try {
      setLoading(true);

      // Fetch test attempts
      const attemptsQuery = query(
        collection(db, 'testAttempts'),
        where('userId', '==', userData.uid),
        orderBy('completedAt', 'desc')
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);
      
      if (!mounted.current) return;

      const attempts = attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate()
      }));

      // Fetch game sessions
      const gamesQuery = query(
        collection(db, 'gameSessions'),
        where('userId', '==', userData.uid),
        orderBy('completedAt', 'desc')
      );
      const gamesSnapshot = await getDocs(gamesQuery);
      
      if (!mounted.current) return;

      const gameSessions = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate()
      }));

      // Calculate skills based on test performance by category
      const skillsMap = new Map<string, { scores: number[], totalTests: number, category: string }>();
      
      attempts.filter(a => a.status === 'completed').forEach(attempt => {
        const category = attempt.category || 'General';
        if (!skillsMap.has(category)) {
          skillsMap.set(category, { scores: [], totalTests: 0, category });
        }
        const skill = skillsMap.get(category)!;
        skill.scores.push(attempt.score || 0);
        skill.totalTests++;
      });

      const skills: SkillProgress[] = Array.from(skillsMap.entries()).map(([skillName, data], index) => {
        const averageScore = data.scores.length > 0 
          ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length 
          : 0;
        
        // Calculate level based on number of tests and average score
        const level = Math.min(10, Math.floor((data.totalTests * averageScore) / 100) + 1);
        const progress = Math.min(100, (averageScore * data.totalTests) / 10);
        const totalPoints = Math.round(data.scores.reduce((sum, score) => sum + score, 0));
        const recentActivity = data.scores.slice(0, 3).reduce((sum, score) => sum + score, 0);

        const iconMap: { [key: string]: any } = {
          'Logic': Brain,
          'Math': Target,
          'Verbal': BookOpen,
          'Abstract': Zap,
          'Programming': Trophy,
          'General': Star
        };

        const colorMap: { [key: string]: string } = {
          'Logic': 'from-purple-500 to-blue-500',
          'Math': 'from-green-500 to-teal-500',
          'Verbal': 'from-orange-500 to-red-500',
          'Abstract': 'from-pink-500 to-purple-500',
          'Programming': 'from-blue-500 to-cyan-500',
          'General': 'from-gray-500 to-slate-500'
        };

        return {
          skill: skillName,
          category: data.category,
          currentLevel: level,
          maxLevel: 10,
          progress,
          totalPoints,
          recentActivity,
          icon: iconMap[skillName] || Star,
          color: colorMap[skillName] || 'from-gray-500 to-slate-500'
        };
      });

      // Calculate achievements
      const achievements = calculateAchievements(attempts, gameSessions);

      // Calculate study streak
      const studyStreak = calculateStudyStreak(attempts, gameSessions);

      // Calculate performance history
      const performanceHistory = attempts
        .filter(a => a.status === 'completed' && a.completedAt)
        .slice(0, 30) // Last 30 attempts
        .map(attempt => ({
          date: attempt.completedAt!.toISOString().split('T')[0],
          score: attempt.score || 0,
          category: attempt.category || 'General',
          testsCompleted: 1
        }));

      // Calculate overall progress
      const overallProgress = skills.length > 0 
        ? Math.round(skills.reduce((sum, skill) => sum + skill.progress, 0) / skills.length)
        : 0;

      // Calculate total points
      const totalPoints = skills.reduce((sum, skill) => sum + skill.totalPoints, 0) +
                         gameSessions.reduce((sum, session) => sum + (session.score || 0), 0);

      if (mounted.current) {
        setProgressData({
          skills,
          achievements,
          studyStreak,
          performanceHistory,
          overallProgress,
          totalPoints
        });
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
      if (mounted.current) {
        toast({
          title: "Error",
          description: "Failed to load progress data",
          variant: "destructive"
        });
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const calculateAchievements = (attempts: any[], gameSessions: any[]): Achievement[] => {
    const achievements: Achievement[] = [];

    // First Steps - Complete first test
    if (attempts.filter(a => a.status === 'completed').length > 0) {
      achievements.push({
        ...possibleAchievements.find(a => a.id === 'first-test')!,
        unlockedAt: attempts.filter(a => a.status === 'completed')[0]?.completedAt || new Date()
      });
    }

    // Perfect Score - Achieve 100% on any test
    const perfectScores = attempts.filter(a => a.status === 'completed' && (a.score || 0) >= 100);
    if (perfectScores.length > 0) {
      achievements.push({
        ...possibleAchievements.find(a => a.id === 'perfect-score')!,
        unlockedAt: perfectScores[0].completedAt || new Date()
      });
    }

    // Speed Demon - Complete test in under 10 minutes
    const fastTests = attempts.filter(a => a.status === 'completed' && (a.duration || 0) < 600); // 10 minutes = 600 seconds
    if (fastTests.length > 0) {
      achievements.push({
        ...possibleAchievements.find(a => a.id === 'speed-demon')!,
        unlockedAt: fastTests[0].completedAt || new Date()
      });
    }

    // Logic Master - Complete 10 logic tests with 80%+ average
    const logicTests = attempts.filter(a => a.status === 'completed' && a.category === 'Logic' && (a.score || 0) >= 80);
    const logicAchievement = possibleAchievements.find(a => a.id === 'logic-master')!;
    if (logicTests.length >= 10) {
      achievements.push({
        ...logicAchievement,
        unlockedAt: logicTests[9].completedAt || new Date()
      });
    } else if (logicTests.length > 0) {
      achievements.push({
        ...logicAchievement,
        progress: logicTests.length
      });
    }

    // Math Wizard - Score 90%+ on 5 math tests
    const mathTests = attempts.filter(a => a.status === 'completed' && a.category === 'Math' && (a.score || 0) >= 90);
    const mathAchievement = possibleAchievements.find(a => a.id === 'math-wizard')!;
    if (mathTests.length >= 5) {
      achievements.push({
        ...mathAchievement,
        unlockedAt: mathTests[4].completedAt || new Date()
      });
    } else if (mathTests.length > 0) {
      achievements.push({
        ...mathAchievement,
        progress: mathTests.length
      });
    }

    // Game Master - Play 25 mini-games
    const gameAchievement = possibleAchievements.find(a => a.id === 'game-master')!;
    if (gameSessions.length >= 25) {
      achievements.push({
        ...gameAchievement,
        unlockedAt: gameSessions[24].completedAt || new Date()
      });
    } else if (gameSessions.length > 0) {
      achievements.push({
        ...gameAchievement,
        progress: gameSessions.length
      });
    }

    return achievements;
  };

  const calculateStudyStreak = (attempts: any[], gameSessions: any[]): StudyStreak => {
    // Combine all activities and sort by date
    const allActivities = [
      ...attempts.filter(a => a.completedAt).map(a => ({ date: a.completedAt, type: 'test' })),
      ...gameSessions.filter(g => g.completedAt).map(g => ({ date: g.completedAt, type: 'game' }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (allActivities.length === 0) {
      return { current: 0, longest: 0, thisWeek: 0, lastActivity: null };
    }

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let thisWeekActivity = 0;

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const uniqueDates = new Set<string>();

    allActivities.forEach(activity => {
      const dateStr = activity.date.toDateString();
      uniqueDates.add(dateStr);
      
      // Count this week's activity
      if (activity.date >= oneWeekAgo) {
        thisWeekActivity++;
      }
    });

    // Calculate streaks based on unique activity dates
    const sortedDates = Array.from(uniqueDates).sort().reverse();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      const expectedDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        if (i === 0 || currentStreak > 0) currentStreak++;
        tempStreak++;
      } else {
        tempStreak = 1;
        if (i === 0) currentStreak = 0; // Break current streak if today is missed
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return {
      current: currentStreak,
      longest: longestStreak,
      thisWeek: Math.min(7, Array.from(uniqueDates).filter(date => 
        new Date(date) >= oneWeekAgo
      ).length),
      lastActivity: allActivities.length > 0 ? allActivities[0].date : null
    };
  };

  const refreshData = async () => {
    setLoading(true);
    await fetchProgressData();
    toast({
      title: "Progress Updated",
      description: "Your latest progress data has been refreshed.",
    });
  };

  const getUnlockedAchievements = () => {
    return progressData.achievements.filter(achievement => achievement.unlockedAt);
  };

  const getProgressAchievements = () => {
    return progressData.achievements.filter(achievement => achievement.progress !== undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
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
        <h1 className="text-4xl font-bold gradient-text mb-4">Your Learning Journey</h1>
        <p className="text-muted-foreground text-lg">Track your progress and celebrate achievements</p>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Overall Progress", value: `${progressData.overallProgress}%`, change: "Across all skills", icon: TrendingUp, gradient: "from-primary to-secondary" },
          { title: "Total Points", value: progressData.totalPoints.toLocaleString(), change: "Tests & games combined", icon: Star, gradient: "from-secondary to-accent" },
          { title: "Study Streak", value: `${progressData.studyStreak.current} day${progressData.studyStreak.current !== 1 ? 's' : ''}`, change: `Best: ${progressData.studyStreak.longest} days`, icon: Flame, gradient: "from-accent to-primary" },
          { title: "Achievements", value: getUnlockedAchievements().length.toString(), change: `${possibleAchievements.length - getUnlockedAchievements().length} remaining`, icon: Trophy, gradient: "from-primary to-accent" }
        ].map((stat, index) => (
          <AnimatedCard key={stat.title} delay={index * 0.1} glow>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">{stat.title}</p>
                <h3 className="text-3xl font-bold text-foreground mb-1">{stat.value}</h3>
                <p className="text-xs text-success font-medium">{stat.change}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center shadow-glow`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Controls */}
      <AnimatedCard delay={0.5}>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Logic">Logic</SelectItem>
                <SelectItem value="Math">Math</SelectItem>
                <SelectItem value="Verbal">Verbal</SelectItem>
                <SelectItem value="Abstract">Abstract</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={refreshData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </AnimatedCard>

      {/* Main Content Tabs */}
      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="grid w-full grid-cols-4 glass-card">
          <TabsTrigger value="skills" className="flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>Skills</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Performance</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center space-x-2">
            <Trophy className="w-4 h-4" />
            <span>Achievements</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <AnimatedCard delay={0.6}>
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-primary" />
              Skill Development
            </h2>
            
            {progressData.skills.length > 0 ? (
              <div className="space-y-6">
                {progressData.skills.map((skill, index) => (
                  <motion.div
                    key={skill.skill}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="p-6 rounded-lg bg-background-secondary border border-glass-border"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${skill.color} flex items-center justify-center`}>
                          <skill.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{skill.skill}</h3>
                          <p className="text-sm text-muted-foreground">{skill.category}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          Level {skill.currentLevel}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {skill.totalPoints.toLocaleString()} points
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span>Progress to Level {Math.min(skill.currentLevel + 1, skill.maxLevel)}</span>
                        <span>{Math.round(skill.progress)}%</span>
                      </div>
                      <Progress value={skill.progress} className="h-2" />
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Recent activity: +{Math.round(skill.recentActivity)} points</span>
                        <span>{skill.maxLevel - skill.currentLevel} levels remaining</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No skill data yet</h3>
                <p className="text-muted-foreground">Complete some tests to start tracking your skill development</p>
              </div>
            )}
          </AnimatedCard>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <AnimatedCard delay={0.6}>
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
                <LineChart className="w-5 h-5 mr-2 text-primary" />
                Recent Performance
              </h2>
              
              {progressData.performanceHistory.length > 0 ? (
                <div className="space-y-4">
                  {progressData.performanceHistory.slice(0, 5).map((data, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded bg-background-secondary">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <div>
                          <div className="text-sm font-medium">{new Date(data.date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{data.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-success">{data.score}%</div>
                        <div className="text-xs text-muted-foreground">{data.testsCompleted} test{data.testsCompleted > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <LineChart className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No performance data yet</p>
                </div>
              )}
            </AnimatedCard>

            {/* Category Performance */}
            <AnimatedCard delay={0.7}>
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-secondary" />
                Category Breakdown
              </h2>
              
              <div className="space-y-4">
                {progressData.skills.map((skill, index) => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{skill.skill}</span>
                      <span className="text-sm text-muted-foreground">
                        Level {skill.currentLevel}
                      </span>
                    </div>
                    <Progress value={skill.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </div>

          {/* Weekly Activity */}
          <AnimatedCard delay={0.8}>
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-accent" />
              This Week's Activity
            </h2>
            
            <div className="grid grid-cols-7 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                const hasActivity = index < progressData.studyStreak.thisWeek;
                return (
                  <div key={day} className="text-center">
                    <div className="text-xs text-muted-foreground mb-2">{day}</div>
                    <div className={`w-full h-16 rounded-lg flex items-center justify-center ${
                      hasActivity 
                        ? 'bg-gradient-to-r from-success to-success/80 text-white' 
                        : 'bg-muted'
                    }`}>
                      {hasActivity && <CheckCircle className="w-6 h-6" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          {/* Unlocked Achievements */}
          <AnimatedCard delay={0.6}>
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <Medal className="w-5 h-5 mr-2 text-primary" />
              Unlocked Achievements ({getUnlockedAchievements().length})
            </h2>
            
            {getUnlockedAchievements().length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getUnlockedAchievements().map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="p-4 rounded-lg bg-background-secondary border border-glass-border text-center"
                  >
                    <div className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r ${rarityColors[achievement.rarity]} flex items-center justify-center`}>
                      <achievement.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{achievement.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                    <Badge className={`bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white`}>
                      {achievement.rarity}
                    </Badge>
                    {achievement.unlockedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Unlocked {achievement.unlockedAt.toLocaleDateString()}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Medal className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No achievements yet</h3>
                <p className="text-muted-foreground">Complete tests and games to start earning achievements</p>
              </div>
            )}
          </AnimatedCard>

          {/* Progress Achievements */}
          {getProgressAchievements().length > 0 && (
            <AnimatedCard delay={0.8}>
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
                <Target className="w-5 h-5 mr-2 text-secondary" />
                In Progress ({getProgressAchievements().length})
              </h2>
              
              <div className="space-y-4">
                {getProgressAchievements().map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="p-4 rounded-lg bg-background-secondary border border-glass-border"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${rarityColors[achievement.rarity]} flex items-center justify-center opacity-60`}>
                          <achievement.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{achievement.title}</h3>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {achievement.rarity}
                      </Badge>
                    </div>
                    
                    {achievement.progress !== undefined && achievement.maxProgress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{achievement.progress}/{achievement.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.maxProgress) * 100} 
                          className="h-2" 
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Study Patterns */}
            <AnimatedCard delay={0.6}>
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-primary" />
                Study Insights
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded bg-background-secondary">
                  <span>Current Streak</span>
                  <span className="font-medium">{progressData.studyStreak.current} days</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded bg-background-secondary">
                  <span>Longest Streak</span>
                  <span className="font-medium">{progressData.studyStreak.longest} days</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded bg-background-secondary">
                  <span>This Week</span>
                  <span className="font-medium">{progressData.studyStreak.thisWeek} days</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded bg-background-secondary">
                  <span>Last Activity</span>
                  <span className="font-medium">
                    {progressData.studyStreak.lastActivity 
                      ? progressData.studyStreak.lastActivity.toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </AnimatedCard>

            {/* Recommendations */}
            <AnimatedCard delay={0.7}>
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-secondary" />
                Recommendations
              </h2>
              
              <div className="space-y-4">
                <div className="p-3 rounded bg-primary/10 border border-primary/20">
                  <div className="flex items-center space-x-2 mb-1">
                    <Star className="w-4 h-4 text-primary" />
                    <span className="font-medium text-primary">Next Steps</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {progressData.skills.length === 0 
                      ? "Start taking tests to begin tracking your progress and unlock achievements."
                      : "Keep practicing your weakest skills to improve your overall performance."
                    }
                  </p>
                </div>
                
                {progressData.studyStreak.current === 0 && (
                  <div className="p-3 rounded bg-warning/10 border border-warning/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <Flame className="w-4 h-4 text-warning" />
                      <span className="font-medium text-warning">Build Consistency</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Start a study streak by taking a test or playing a mini-game today!
                    </p>
                  </div>
                )}
                
                {getUnlockedAchievements().length < possibleAchievements.length && (
                  <div className="p-3 rounded bg-accent/10 border border-accent/20">
                    <div className="flex items-center space-x-2 mb-1">
                      <Trophy className="w-4 h-4 text-accent" />
                      <span className="font-medium text-accent">Achievement Hunter</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You have {possibleAchievements.length - getUnlockedAchievements().length} achievements left to unlock!
                    </p>
                  </div>
                )}
              </div>
            </AnimatedCard>
          </div>
        </TabsContent>
      </Tabs>

      {!userData && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please log in to view your progress and achievements!</p>
        </div>
      )}
    </div>
  );
}
