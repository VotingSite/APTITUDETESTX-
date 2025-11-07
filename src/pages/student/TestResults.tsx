import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  Download,
  Eye,
  RotateCcw,
  Calendar,
  Target,
  CheckCircle,
  XCircle,
  Award,
  BarChart3,
  Filter,
  Search
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TestResult {
  id: string;
  testId: string;
  testTitle: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: Date;
  answers: Array<{
    questionId: string;
    selectedAnswer: any;
    correctAnswer: any;
    isCorrect: boolean;
  }>;
}

const difficultyColors = {
  Easy: "bg-success/20 text-success",
  Medium: "bg-warning/20 text-warning",
  Hard: "bg-danger/20 text-danger"
};

export default function TestResults() {
  const { userData } = useAuth();
  const { toast } = useToast();
  
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);

  useEffect(() => {
    fetchTestResults();
  }, [userData]);

  const fetchTestResults = async () => {
    if (!userData) return;

    try {
      setLoading(true);

      // Fetch completed test attempts
      const attemptsQuery = query(
        collection(db, 'testAttempts'),
        where('userId', '==', userData.uid),
        where('status', '==', 'completed'),
        orderBy('completedAt', 'desc')
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);
      
      const testResults = attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || new Date()
      })) as TestResult[];

      setResults(testResults);
    } catch (error) {
      console.error('Error fetching test results:', error);
      // Create mock data for demo
      setResults([
        {
          id: '1',
          testId: 'test1',
          testTitle: 'Logical Reasoning Test',
          category: 'Logic',
          difficulty: 'Medium',
          score: 85,
          totalQuestions: 20,
          correctAnswers: 17,
          timeSpent: 25,
          completedAt: new Date('2024-01-15'),
          answers: []
        },
        {
          id: '2',
          testId: 'test2',
          testTitle: 'Mathematical Aptitude',
          category: 'Math',
          difficulty: 'Hard',
          score: 72,
          totalQuestions: 15,
          correctAnswers: 11,
          timeSpent: 30,
          completedAt: new Date('2024-01-10'),
          answers: []
        },
        {
          id: '3',
          testId: 'test3',
          testTitle: 'Verbal Reasoning',
          category: 'Verbal',
          difficulty: 'Easy',
          score: 90,
          totalQuestions: 25,
          correctAnswers: 23,
          timeSpent: 20,
          completedAt: new Date('2024-01-05'),
          answers: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = result.testTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || result.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const totalTests = results.length;
  const averageScore = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;
  const bestScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;
  const totalTimeSpent = results.reduce((sum, r) => sum + r.timeSpent, 0);

  const categories = ['all', ...Array.from(new Set(results.map(r => r.category)))];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Test Results</h1>
        <p className="text-muted-foreground text-lg">Track your performance and progress</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Tests Completed", value: totalTests.toString(), change: "Total attempts", icon: BookOpen, gradient: "from-primary to-secondary" },
          { title: "Average Score", value: `${averageScore}%`, change: "Overall performance", icon: Trophy, gradient: "from-secondary to-accent" },
          { title: "Best Score", value: `${bestScore}%`, change: "Personal best", icon: Award, gradient: "from-accent to-primary" },
          { title: "Time Spent", value: `${Math.round(totalTimeSpent / 60)}h`, change: "Study time", icon: Clock, gradient: "from-primary to-accent" }
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

      {/* Filters */}
      <AnimatedCard delay={0.5}>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search results..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </AnimatedCard>

      {/* Results Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 glass-card">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center space-x-2">
            <Eye className="w-4 h-4" />
            <span>Detailed Results</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Performance Chart */}
          <AnimatedCard delay={0.6}>
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Performance Trend
            </h2>
            
            <div className="space-y-4">
              {filteredResults.slice(0, 5).map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-background-secondary border border-glass-border"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center`}>
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{result.testTitle}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge className={difficultyColors[result.difficulty]}>
                          {result.difficulty}
                        </Badge>
                        <span>{result.category}</span>
                        <span>•</span>
                        <span>{result.completedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-success">{result.score}%</div>
                    <div className="text-sm text-muted-foreground">
                      {result.correctAnswers}/{result.totalQuestions} correct
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>

          {/* Performance by Category */}
          <AnimatedCard delay={0.8}>
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center">
              <Target className="w-5 h-5 mr-2 text-secondary" />
              Performance by Category
            </h2>
            
            <div className="space-y-4">
              {categories.filter(cat => cat !== 'all').map(category => {
                const categoryResults = results.filter(r => r.category === category);
                const avgScore = categoryResults.length > 0 
                  ? Math.round(categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length)
                  : 0;
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {avgScore}% ({categoryResults.length} tests)
                      </span>
                    </div>
                    <Progress value={avgScore} className="h-2" />
                  </div>
                );
              })}
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* Detailed Results Tab */}
        <TabsContent value="detailed" className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading results...</p>
            </div>
          ) : filteredResults.length > 0 ? (
            filteredResults.map((result, index) => (
              <AnimatedCard key={result.id} delay={0.1 * index}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">{result.testTitle}</h3>
                      <Badge className={difficultyColors[result.difficulty]}>
                        {result.difficulty}
                      </Badge>
                      <Badge variant="outline">{result.category}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-success" />
                        <span>Score: {result.score}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span>{result.correctAnswers}/{result.totalQuestions} correct</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{result.timeSpent} minutes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{result.completedAt.toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Progress value={result.score} className="mb-2" />
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedResult(result)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake Test
                    </Button>
                  </div>
                </div>
              </AnimatedCard>
            ))
          ) : (
            <div className="text-center py-20">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">
                {results.length === 0 
                  ? "Complete your first test to see results here"
                  : "Try adjusting your search filters"
                }
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
