import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  CheckCircle, 
  Circle,
  AlertTriangle,
  BookOpen,
  ArrowLeft,
  PlayCircle
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Question {
  id: string;
  question: string;
  type: 'mcq-single' | 'mcq-multiple' | 'true-false' | 'numeric';
  options?: string[];
  correctAnswer: number | number[] | boolean | string;
  explanation: string;
  category: string;
  difficulty: string;
}

interface Test {
  id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  questionBankId: string; // Changed from questions array to questionBankId
  questionBankTitle: string;
  category: string;
  difficulty: string;
  shuffleQuestions?: boolean;
  passingScore?: number;
}

interface UserAnswer {
  questionId: string;
  answer: number | number[] | string | boolean | null;
  timeSpent: number;
  flagged: boolean;
}

export default function TestRunner() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);

  // Get test ID from navigation state or URL params
  const testId = location.state?.testId || new URLSearchParams(location.search).get('testId');

  useEffect(() => {
    if (testId && userData) {
      fetchTestData();
    } else {
      navigate('/student/tests');
    }
  }, [testId, userData]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !testSubmitted && testStarted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && testStarted) {
      handleSubmitTest();
    }
  }, [timeRemaining, testSubmitted, testStarted]);

  const fetchTestData = async () => {
    try {
      setLoading(true);

      // Fetch test details
      const testDoc = await getDoc(doc(db, 'tests', testId));
      if (!testDoc.exists()) {
        toast({
          title: "Error",
          description: "Test not found",
          variant: "destructive"
        });
        navigate('/student/tests');
        return;
      }

      const testData = { id: testDoc.id, ...testDoc.data() } as Test;
      setTest(testData);

      // Check if user already completed this test
      const attemptsQuery = query(
        collection(db, 'testAttempts'),
        where('userId', '==', userData.uid),
        where('testId', '==', testId),
        where('status', '==', 'completed')
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);
      
      if (attemptsSnapshot.docs.length > 0) {
        toast({
          title: "Test Already Completed",
          description: "You have already completed this test",
          variant: "destructive"
        });
        navigate('/student/tests');
        return;
      }

      // Fetch questions from Question Bank
      const questionsData: Question[] = [];

      // First, get the question bank
      const questionBankDoc = await getDoc(doc(db, 'questionBanks', testData.questionBankId));
      if (!questionBankDoc.exists()) {
        toast({
          title: "Error",
          description: "Question bank not found for this test",
          variant: "destructive"
        });
        navigate('/student/tests');
        return;
      }

      const questionBank = questionBankDoc.data();

      // Fetch all questions from the question bank
      for (const questionId of questionBank.questions) {
        const questionDoc = await getDoc(doc(db, 'questions', questionId));
        if (questionDoc.exists()) {
          questionsData.push({ id: questionDoc.id, ...questionDoc.data() } as Question);
        }
      }

      // Shuffle questions if enabled
      if (testData.shuffleQuestions) {
        questionsData.sort(() => Math.random() - 0.5);
      }

      setQuestions(questionsData);
      setTimeRemaining(testData.duration * 60); // Convert to seconds

      // Initialize user answers
      setUserAnswers(questionsData.map(q => ({
        questionId: q.id,
        answer: null,
        timeSpent: 0,
        flagged: false
      })));

    } catch (error) {
      console.error('Error fetching test data:', error);
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive"
      });
      navigate('/student/tests');
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    try {
      // Create initial test attempt record
      await addDoc(collection(db, 'testAttempts'), {
        userId: userData.uid,
        userName: userData.name || userData.email,
        testId: testId,
        testTitle: test?.title,
        status: 'in_progress',
        startedAt: new Date(),
        answers: [],
        score: null,
        timeSpent: 0
      });

      setTestStarted(true);
      
      toast({
        title: "Test Started",
        description: `Good luck! You have ${test?.duration} minutes to complete the test.`
      });
    } catch (error) {
      console.error('Error starting test:', error);
      toast({
        title: "Error",
        description: "Failed to start test",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateAnswer = (questionId: string, answer: any) => {
    setUserAnswers(prev => prev.map(ua => 
      ua.questionId === questionId ? { ...ua, answer } : ua
    ));
  };

  const toggleFlag = (questionId: string) => {
    setUserAnswers(prev => prev.map(ua => 
      ua.questionId === questionId ? { ...ua, flagged: !ua.flagged } : ua
    ));
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    
    questions.forEach(question => {
      const userAnswer = userAnswers.find(ua => ua.questionId === question.id);
      if (!userAnswer || userAnswer.answer === null) return;

      let isCorrect = false;
      
      switch (question.type) {
        case 'mcq-single':
          isCorrect = userAnswer.answer === question.correctAnswer;
          break;
        case 'mcq-multiple':
          const correctAnswers = question.correctAnswer as number[];
          const userAnswerArray = userAnswer.answer as number[];
          isCorrect = correctAnswers.length === userAnswerArray.length &&
                     correctAnswers.every(a => userAnswerArray.includes(a));
          break;
        case 'true-false':
          isCorrect = userAnswer.answer === question.correctAnswer;
          break;
        case 'numeric':
          const numericAnswer = parseFloat(userAnswer.answer as string);
          const correctNumeric = parseFloat(question.correctAnswer as string);
          isCorrect = Math.abs(numericAnswer - correctNumeric) < 0.001; // Allow small floating point differences
          break;
      }
      
      if (isCorrect) correctAnswers++;
    });

    return Math.round((correctAnswers / questions.length) * 100);
  };

  const handleSubmitTest = async () => {
    try {
      const score = calculateScore();
      const timeSpent = (test?.duration * 60 - timeRemaining) / 60; // Convert to minutes
      
      // Save final test attempt
      await addDoc(collection(db, 'testAttempts'), {
        userId: userData.uid,
        userName: userData.name || userData.email,
        testId: testId,
        testTitle: test?.title,
        status: 'completed',
        startedAt: new Date(Date.now() - timeSpent * 60 * 1000),
        completedAt: new Date(),
        answers: userAnswers,
        score: score,
        timeSpent: Math.round(timeSpent),
        totalQuestions: questions.length,
        answeredQuestions: userAnswers.filter(ua => ua.answer !== null).length
      });

      // Log activity
      await addDoc(collection(db, 'activityLogs'), {
        userId: userData.uid,
        userName: userData.name || userData.email,
        userEmail: userData.email,
        action: `Completed test: ${test?.title}`,
        actionType: 'test_complete',
        details: `User completed the test with a score of ${score}%`,
        timestamp: new Date(),
        severity: 'success',
        metadata: {
          testId: testId,
          testTitle: test?.title,
          score: score,
          timeSpent: Math.round(timeSpent)
        }
      });

      setTestSubmitted(true);
      
      toast({
        title: "Test Submitted!",
        description: `Your test has been submitted successfully. Score: ${score}%`
      });
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Error",
        description: "Failed to submit test",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedCard className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Test Not Available</h2>
          <p className="text-muted-foreground mb-6">
            This test is not available or has no questions.
          </p>
          <Button onClick={() => navigate('/student/tests')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tests
          </Button>
        </AnimatedCard>
      </div>
    );
  }

  if (!testStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <AnimatedCard className="text-center max-w-2xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-primary flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-4">{test.title}</h1>
          <p className="text-muted-foreground mb-6">{test.description}</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="text-center p-4 bg-background-secondary rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="font-bold text-lg">{test.duration} min</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div className="text-center p-4 bg-background-secondary rounded-lg">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-secondary" />
              <div className="font-bold text-lg">{questions.length}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
          </div>

          <div className="space-y-4 mb-8 text-left">
            <h3 className="font-semibold text-foreground">Instructions:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• You have {test.duration} minutes to complete the test</li>
              <li>• You can navigate between questions using the navigation buttons</li>
              <li>• Flag questions you want to review later</li>
              <li>• Your progress will be saved automatically</li>
              <li>• Submit your test when you're ready</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => navigate('/student/tests')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tests
            </Button>
            <Button onClick={startTest} className="bg-gradient-primary">
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Test
            </Button>
          </div>
        </AnimatedCard>
      </div>
    );
  }

  if (testSubmitted) {
    const score = calculateScore();
    const passed = score >= (test.passingScore || 70);
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <AnimatedCard className="text-center max-w-md">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            passed ? 'bg-gradient-to-r from-success to-accent' : 'bg-gradient-to-r from-warning to-danger'
          }`}>
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold gradient-text mb-2">Test Completed!</h2>
          <p className="text-muted-foreground mb-6">
            Your test has been submitted successfully.
          </p>
          
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className={`text-3xl font-bold ${passed ? 'text-success' : 'text-warning'}`}>
                {score}%
              </div>
              <div className="text-sm text-muted-foreground">Your Score</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold">Answered</div>
                <div className="text-muted-foreground">
                  {userAnswers.filter(ua => ua.answer !== null).length}/{questions.length}
                </div>
              </div>
              <div>
                <div className="font-semibold">Time Taken</div>
                <div className="text-muted-foreground">
                  {formatTime((test.duration * 60) - timeRemaining)}
                </div>
              </div>
            </div>
            
            <Badge className={passed ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
              {passed ? 'Passed' : 'Not Passed'} (Required: {test.passingScore || 70}%)
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate('/student/tests')}>
              Back to Tests
            </Button>
            <Button onClick={() => navigate('/student')}>
              Dashboard
            </Button>
          </div>
        </AnimatedCard>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion];
  const currentAnswer = userAnswers.find(ua => ua.questionId === currentQuestionData.id);
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const answeredCount = userAnswers.filter(ua => ua.answer !== null).length;
  const flaggedCount = userAnswers.filter(ua => ua.flagged).length;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <AnimatedCard className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold gradient-text">{test.title}</h1>
              <p className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-danger' : 'text-foreground'}`}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-xs text-muted-foreground">Time Remaining</div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge variant="outline">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {answeredCount}/{questions.length}
                </Badge>
                {flaggedCount > 0 && (
                  <Badge variant="secondary">
                    <Flag className="w-3 h-3 mr-1" />
                    {flaggedCount} Flagged
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </AnimatedCard>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <AnimatedCard delay={0.1} className="lg:h-fit">
            <h3 className="font-bold text-foreground mb-4">Questions</h3>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
              {questions.map((q, index) => {
                const answer = userAnswers.find(ua => ua.questionId === q.id);
                const isAnswered = answer?.answer !== null;
                const isFlagged = answer?.flagged;
                const isCurrent = index === currentQuestion;
                
                return (
                  <motion.button
                    key={q.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentQuestion(index)}
                    className={`
                      relative w-10 h-10 rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all
                      ${isCurrent 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : isAnswered 
                          ? 'border-success bg-success/10 text-success' 
                          : 'border-muted bg-background text-muted-foreground hover:border-primary'
                      }
                    `}
                  >
                    {index + 1}
                    {isFlagged && (
                      <Flag className="absolute -top-1 -right-1 w-3 h-3 text-warning fill-warning" />
                    )}
                  </motion.button>
                );
              })}
            </div>
            
            <div className="mt-6 space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-success bg-success/10"></div>
                <span className="text-muted-foreground">Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-muted"></div>
                <span className="text-muted-foreground">Not Answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-primary bg-primary"></div>
                <span className="text-muted-foreground">Current</span>
              </div>
            </div>
          </AnimatedCard>

          {/* Main Question Area */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatedCard delay={0.2}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-4">
                    <Badge variant="outline">Question {currentQuestion + 1}</Badge>
                    <Badge className="capitalize">{currentQuestionData.type.replace('-', ' ')}</Badge>
                    <Badge variant="secondary">{currentQuestionData.difficulty}</Badge>
                  </div>
                  <h2 className="text-xl font-medium text-foreground leading-relaxed">
                    {currentQuestionData.question}
                  </h2>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFlag(currentQuestionData.id)}
                  className={currentAnswer?.flagged ? 'text-warning' : 'text-muted-foreground'}
                >
                  <Flag className={`w-4 h-4 ${currentAnswer?.flagged ? 'fill-warning' : ''}`} />
                </Button>
              </div>

              {/* Question Type Specific Inputs */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestionData.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Single Choice MCQ */}
                  {currentQuestionData.type === 'mcq-single' && currentQuestionData.options && (
                    <RadioGroup
                      value={currentAnswer?.answer?.toString() || ''}
                      onValueChange={(value) => updateAnswer(currentQuestionData.id, parseInt(value))}
                    >
                      {currentQuestionData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background-secondary transition-colors">
                          <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* Multiple Choice MCQ */}
                  {currentQuestionData.type === 'mcq-multiple' && currentQuestionData.options && (
                    <div className="space-y-3">
                      {currentQuestionData.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background-secondary transition-colors">
                          <Checkbox
                            id={`checkbox-${index}`}
                            checked={(currentAnswer?.answer as number[] || []).includes(index)}
                            onCheckedChange={(checked) => {
                              const currentAnswers = (currentAnswer?.answer as number[]) || [];
                              if (checked) {
                                updateAnswer(currentQuestionData.id, [...currentAnswers, index]);
                              } else {
                                updateAnswer(currentQuestionData.id, currentAnswers.filter(a => a !== index));
                              }
                            }}
                          />
                          <Label htmlFor={`checkbox-${index}`} className="flex-1 cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Numeric Input */}
                  {currentQuestionData.type === 'numeric' && (
                    <div className="space-y-2">
                      <Label htmlFor="numeric-answer">Enter your answer:</Label>
                      <Input
                        id="numeric-answer"
                        type="number"
                        step="any"
                        placeholder="Type your answer here..."
                        value={currentAnswer?.answer?.toString() || ''}
                        onChange={(e) => updateAnswer(currentQuestionData.id, e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                  )}

                  {/* True/False */}
                  {currentQuestionData.type === 'true-false' && (
                    <RadioGroup
                      value={currentAnswer?.answer?.toString() || ''}
                      onValueChange={(value) => updateAnswer(currentQuestionData.id, value === 'true')}
                    >
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background-secondary transition-colors">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-background-secondary transition-colors">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                      </div>
                    </RadioGroup>
                  )}
                </motion.div>
              </AnimatePresence>
            </AnimatedCard>

            {/* Navigation and Submit */}
            <AnimatedCard delay={0.3}>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center space-x-4">
                  {currentQuestion === questions.length - 1 ? (
                    <Button
                      onClick={() => setShowSubmitWarning(true)}
                      className="bg-gradient-primary hover:shadow-glow"
                    >
                      Submit Test
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                      className="bg-gradient-primary hover:shadow-glow"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </AnimatedCard>

            {/* Submit Warning */}
            {showSubmitWarning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p>Are you sure you want to submit your test?</p>
                    <div className="text-sm text-muted-foreground">
                      <p>• Answered questions: {answeredCount}/{questions.length}</p>
                      <p>• Unanswered questions: {questions.length - answeredCount}</p>
                      <p>• Time remaining: {formatTime(timeRemaining)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleSubmitTest}>
                        Yes, Submit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowSubmitWarning(false)}>
                        Continue Test
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
