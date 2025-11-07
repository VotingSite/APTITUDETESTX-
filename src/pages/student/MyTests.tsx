import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, Trophy, PlayCircle, Calendar, Filter, Search } from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';

const difficultyColors = {
  Easy: "bg-success/20 text-success",
  Medium: "bg-warning/20 text-warning",
  Hard: "bg-danger/20 text-danger"
};

export default function MyTests() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [tests, setTests] = useState({
    upcoming: [],
    available: [],
    completed: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'Logic', 'Math', 'Verbal', 'Abstract', 'Programming'];

  useEffect(() => {
    fetchTests();
  }, [userData]);

  const fetchTests = async () => {
    if (!userData) {
      console.log('MyTests: No user data available');
      return;
    }

    try {
      console.log('MyTests: Starting to fetch tests for user:', userData.uid);
      setLoading(true);

      // First, let's check if there are ANY tests at all (for debugging)
      console.log('MyTests: Fetching all tests to debug...');
      const allTestsSnapshot = await getDocs(collection(db, 'tests'));
      const allTestsDebug = allTestsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        status: doc.data().status
      }));
      console.log('MyTests: All tests in database:', allTestsDebug);

      // Fetch all published tests
      console.log('MyTests: Fetching published tests...');
      const testsQuery = query(
        collection(db, 'tests'),
        where('status', '==', 'published')
      );
      const testsSnapshot = await getDocs(testsQuery);
      console.log('MyTests: Found', testsSnapshot.size, 'published tests');

      const allTests = testsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('MyTests: Published tests:', allTests);

      // Fetch user's test attempts
      console.log('MyTests: Fetching user test attempts...');
      const attemptsQuery = query(
        collection(db, 'testAttempts'),
        where('userId', '==', userData.uid)
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);
      console.log('MyTests: Found', attemptsSnapshot.size, 'test attempts for user');

      const userAttempts = attemptsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate()
      }));

      // Categorize tests
      const completed = userAttempts.filter(attempt => attempt.status === 'completed')
        .map(attempt => {
          const test = allTests.find(t => t.id === attempt.testId);
          return {
            ...test,
            score: attempt.score,
            completedAt: attempt.completedAt?.toLocaleDateString() || 'Unknown date',
            attempts: userAttempts.filter(a => a.testId === attempt.testId).length
          };
        }).filter(test => test.id); // Filter out tests that might have been deleted

      const available = allTests.filter(test =>
        !userAttempts.some(attempt =>
          attempt.testId === test.id && attempt.status === 'completed'
        )
      ).map(test => {
        const attempts = userAttempts.filter(a => a.testId === test.id).length;
        return {
          ...test,
          attempts,
          maxAttempts: test.maxAttempts || 3
        };
      });

      // For now, we'll leave upcoming empty since we don't have scheduled tests
      const upcoming = [];

      console.log('MyTests: Final categorized tests:', {
        upcoming: upcoming.length,
        available: available.length,
        completed: completed.length
      });

      setTests({
        upcoming,
        available,
        completed
      });
    } catch (error) {
      console.error('MyTests: Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tests. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (testId: string) => {
    navigate('/student/test-runner', { state: { testId } });
  };

  const filterTests = (tests: any[]) => {
    return tests.filter(test => {
      const matchesSearch = test.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">My Tests</h1>
        <p className="text-muted-foreground text-lg">Manage and track your test progress</p>
      </motion.div>

      {/* Filters */}
      <AnimatedCard delay={0.2}>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Test Tabs */}
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-card">
          <TabsTrigger value="upcoming" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Upcoming ({filterTests(tests.upcoming).length})</span>
          </TabsTrigger>
          <TabsTrigger value="available" className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>Available ({filterTests(tests.available).length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center space-x-2">
            <Trophy className="w-4 h-4" />
            <span>Completed ({filterTests(tests.completed).length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Tests */}
        <TabsContent value="upcoming" className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tests...</p>
            </div>
          ) : filterTests(tests.upcoming).length > 0 ? (
            filterTests(tests.upcoming).map((test, index) => (
              <AnimatedCard key={test.id} delay={0.1 * index}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">{test.title}</h3>
                      <Badge className={difficultyColors[test.difficulty as keyof typeof difficultyColors]}>
                        {test.difficulty}
                      </Badge>
                      <Badge variant="outline">{test.category}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{test.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{test.duration} min</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{test.totalQuestions} questions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{test.scheduled}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      Scheduled
                    </Badge>
                    <Button disabled className="opacity-50">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Starts Soon
                    </Button>
                  </div>
                </div>
              </AnimatedCard>
            ))
          ) : (
            <div className="text-center py-20">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No upcoming tests</h3>
              <p className="text-muted-foreground">Check back later for scheduled tests</p>
            </div>
          )}
        </TabsContent>

        {/* Available Tests */}
        <TabsContent value="available" className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tests...</p>
            </div>
          ) : filterTests(tests.available).length > 0 ? (
            filterTests(tests.available).map((test, index) => (
              <AnimatedCard key={test.id} delay={0.1 * index}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">{test.title}</h3>
                      <Badge className={difficultyColors[test.difficulty as keyof typeof difficultyColors]}>
                        {test.difficulty}
                      </Badge>
                      <Badge variant="outline">{test.category}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{test.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{test.duration} min</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{test.totalQuestions} questions</span>
                      </div>
                      <div className="text-xs">
                        Attempts: {test.attempts}/{test.maxAttempts}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <Badge variant="default" className="bg-success/20 text-success">
                      Available
                    </Badge>
                    <Button 
                      disabled={test.attempts >= test.maxAttempts}
                      onClick={() => handleStartTest(test.id)}
                      className="bg-gradient-primary hover:shadow-glow"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {test.attempts > 0 ? 'Retake Test' : 'Start Test'}
                    </Button>
                  </div>
                </div>
              </AnimatedCard>
            ))
          ) : (
            <div className="text-center py-20">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No available tests</h3>
              <p className="text-muted-foreground mb-2">
                {tests.available.length === 0
                  ? "No tests are currently available."
                  : "Try adjusting your search filters to find what you're looking for."
                }
              </p>
              {tests.available.length === 0 && (
                <div className="bg-background-secondary border border-glass-border rounded-lg p-4 mt-4 max-w-md mx-auto">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Tests must be published by administrators to appear here.
                    If you expect to see tests, ask your admin to publish them from the admin portal.
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Completed Tests */}
        <TabsContent value="completed" className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading tests...</p>
            </div>
          ) : filterTests(tests.completed).length > 0 ? (
            filterTests(tests.completed).map((test, index) => (
              <AnimatedCard key={test.id} delay={0.1 * index}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-foreground">{test.title}</h3>
                      <Badge className={difficultyColors[test.difficulty as keyof typeof difficultyColors]}>
                        {test.difficulty}
                      </Badge>
                      <Badge variant="outline">{test.category}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-4">{test.description}</p>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{test.duration} min</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{test.totalQuestions} questions</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Completed on {test.completedAt}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success">{test.score || 0}%</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Results
                    </Button>
                  </div>
                </div>
              </AnimatedCard>
            ))
          ) : (
            <div className="text-center py-20">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No completed tests</h3>
              <p className="text-muted-foreground">Take your first test to see results here</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
