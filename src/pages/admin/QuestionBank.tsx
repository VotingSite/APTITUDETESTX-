import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Wand2,
  BookOpen,
  Clock,
  Tag,
  Save,
  X,
  Hash,
  List,
  Folder,
  CheckCircle
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateQuestionsWithAI, isGeminiConfigured } from '@/lib/gemini';
import { GeminiDebug } from '@/components/GeminiDebug';

interface Question {
  id: string;
  question: string;
  type: 'mcq-single' | 'mcq-multiple' | 'true-false' | 'numeric';
  options?: string[];
  correctAnswer: number | number[] | boolean | string;
  explanation: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  createdAt: Date;
  createdBy: string;
  questionBankId?: string; // Optional: link to question bank
}

interface QuestionBank {
  id: string;
  bankId: string; // Unique identifier like QB001, QB002, etc.
  title: string;
  description: string;
  category: string;
  questions: string[]; // Array of question IDs
  totalQuestions: number;
  createdDate: Date;
  createdBy: string;
  isActive: boolean;
}

const difficultyColors = {
  Easy: "bg-success/20 text-success",
  Medium: "bg-warning/20 text-warning",
  Hard: "bg-danger/20 text-danger"
};

const categories = ['Logic', 'Math', 'Verbal', 'Abstract', 'Programming', 'General'];
const difficulties = ['Easy', 'Medium', 'Hard'];

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
  const [showCreateQuestionDialog, setShowCreateQuestionDialog] = useState(false);
  const [showCreateBankDialog, setShowCreateBankDialog] = useState(false);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]); // For question bank creation
  const [bulkSelectedQuestions, setBulkSelectedQuestions] = useState<string[]>([]); // For bulk operations
  const { toast } = useToast();

  // Form state for creating/editing questions
  const [questionFormData, setQuestionFormData] = useState({
    question: '',
    type: 'mcq-single' as Question['type'],
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    category: '',
    difficulty: 'Medium' as Question['difficulty'],
    tags: ''
  });

  // Form state for creating question banks
  const [bankFormData, setBankFormData] = useState({
    title: '',
    description: '',
    category: ''
  });

  // AI Generation form
  const [aiFormData, setAiFormData] = useState({
    topic: '',
    category: 'Logic',
    difficulty: 'Medium' as Question['difficulty'],
    count: 5,
    type: 'mcq-single' as Question['type']
  });

  useEffect(() => {
    fetchQuestions();
    fetchQuestionBanks();
  }, []);

  const generateBankId = async () => {
    const snapshot = await getDocs(collection(db, 'questionBanks'));
    const bankCount = snapshot.size;
    return `QB${String(bankCount + 1).padStart(3, '0')}`;
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'questions'));
      const questionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Question[];
      setQuestions(questionsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionBanks = async () => {
    try {
      const banksSnapshot = await getDocs(collection(db, 'questionBanks'));
      const banksData = banksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdDate: doc.data().createdAt?.toDate() || new Date()
      })) as QuestionBank[];
      setQuestionBanks(banksData);
    } catch (error) {
      console.error('Error fetching question banks:', error);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      if (!questionFormData.question || !questionFormData.category) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Validate options for MCQ questions
      if (questionFormData.type.includes('mcq')) {
        const validOptions = questionFormData.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          toast({
            title: "Error",
            description: "MCQ questions need at least 2 options",
            variant: "destructive"
          });
          return;
        }
      }

      let correctAnswer = questionFormData.correctAnswer;
      
      // Handle different question types
      if (questionFormData.type === 'true-false') {
        correctAnswer = questionFormData.correctAnswer === 1;
      } else if (questionFormData.type === 'numeric') {
        correctAnswer = parseFloat(questionFormData.correctAnswer.toString()) || 0;
      }

      const questionData = {
        question: questionFormData.question,
        type: questionFormData.type,
        options: questionFormData.type.includes('mcq') ? questionFormData.options.filter(opt => opt.trim()) : undefined,
        correctAnswer,
        explanation: questionFormData.explanation,
        category: questionFormData.category,
        difficulty: questionFormData.difficulty,
        tags: questionFormData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        createdAt: new Date(),
        createdBy: 'Admin User'
      };

      await addDoc(collection(db, 'questions'), questionData);
      
      toast({
        title: "Success",
        description: "Question created successfully"
      });

      setShowCreateQuestionDialog(false);
      resetQuestionForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive"
      });
    }
  };

  const handleCreateQuestionBank = async () => {
    try {
      if (!bankFormData.title || !bankFormData.category || selectedQuestions.length === 0) {
        toast({
          title: "Error",
          description: "Please fill in all required fields and select questions",
          variant: "destructive"
        });
        return;
      }

      const bankId = await generateBankId();

      const bankData = {
        bankId,
        title: bankFormData.title,
        description: bankFormData.description,
        category: bankFormData.category,
        questions: selectedQuestions,
        totalQuestions: selectedQuestions.length,
        createdAt: new Date(),
        createdBy: 'Admin User',
        isActive: true
      };

      await addDoc(collection(db, 'questionBanks'), bankData);
      
      toast({
        title: "Success",
        description: `Question Bank ${bankId} created successfully`
      });

      setShowCreateBankDialog(false);
      resetBankForm();
      fetchQuestionBanks();
    } catch (error) {
      console.error('Error creating question bank:', error);
      toast({
        title: "Error",
        description: "Failed to create question bank",
        variant: "destructive"
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteDoc(doc(db, 'questions', questionId));
      toast({
        title: "Success",
        description: "Question deleted successfully"
      });
      fetchQuestions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive"
      });
    }
  };

  const handleBulkDeleteQuestions = async () => {
    if (bulkSelectedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "No questions selected for deletion",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      // Delete all selected questions
      await Promise.all(
        bulkSelectedQuestions.map(questionId =>
          deleteDoc(doc(db, 'questions', questionId))
        )
      );

      toast({
        title: "Success",
        description: `${bulkSelectedQuestions.length} questions deleted successfully`
      });

      setBulkSelectedQuestions([]);
      fetchQuestions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllQuestions = () => {
    if (bulkSelectedQuestions.length === filteredQuestions.length) {
      setBulkSelectedQuestions([]);
    } else {
      setBulkSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    setBulkSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleDeleteQuestionBank = async (bankId: string) => {
    try {
      await deleteDoc(doc(db, 'questionBanks', bankId));
      toast({
        title: "Success",
        description: "Question bank deleted successfully"
      });
      fetchQuestionBanks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete question bank",
        variant: "destructive"
      });
    }
  };

  const handleAIGeneration = async () => {
    try {
      setAiLoading(true);

      if (!isGeminiConfigured()) {
        toast({
          title: "Error",
          description: "Gemini API is not configured. Please check your API key.",
          variant: "destructive"
        });
        return;
      }

      if (!aiFormData.topic.trim()) {
        toast({
          title: "Error",
          description: "Please enter a topic for question generation",
          variant: "destructive"
        });
        return;
      }

      // Generate questions using Gemini AI
      const aiQuestions = await generateQuestionsWithAI({
        topic: aiFormData.topic,
        category: aiFormData.category,
        difficulty: aiFormData.difficulty,
        count: aiFormData.count,
        type: aiFormData.type
      });

      // Add all generated questions to Firestore
      const addedQuestions = [];
      for (const aiQuestion of aiQuestions) {
        const questionData = {
          ...aiQuestion,
          createdAt: new Date(),
          createdBy: 'AI Assistant (Gemini)'
        };
        const docRef = await addDoc(collection(db, 'questions'), questionData);
        addedQuestions.push({ id: docRef.id, ...questionData });
      }

      toast({
        title: "Success",
        description: `${aiQuestions.length} AI-generated questions created successfully!`,
      });

      setShowAIDialog(false);
      setAiFormData({
        topic: '',
        category: 'Logic',
        difficulty: 'Medium',
        count: 5,
        type: 'mcq-single'
      });
      fetchQuestions();
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate questions with AI",
        variant: "destructive"
      });
    } finally {
      setAiLoading(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionFormData({
      question: '',
      type: 'mcq-single',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      category: '',
      difficulty: 'Medium',
      tags: ''
    });
  };

  const resetBankForm = () => {
    setBankFormData({
      title: '',
      description: '',
      category: ''
    });
    setSelectedQuestions([]);
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || question.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || question.difficulty === difficultyFilter;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const filteredBanks = questionBanks.filter(bank => {
    const matchesSearch = bank.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bank.bankId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || bank.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const availableQuestions = questions.filter(q => 
    bankFormData.category === '' || q.category === bankFormData.category
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Question Bank</h1>
        <p className="text-muted-foreground text-lg">Create and manage test questions with Question Banks and AI assistance</p>

        {/* Temporary Gemini Debug */}
        <div className="flex justify-center mt-4">
          <GeminiDebug />
        </div>
      </motion.div>

      {/* Tabs for Questions and Question Banks */}
      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 glass-card">
          <TabsTrigger value="questions" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Questions ({questions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="question-banks" className="flex items-center space-x-2">
            <Folder className="w-4 h-4" />
            <span>Question Banks ({questionBanks.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          {/* Stats Cards for Questions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: "Total Questions", value: questions.length.toString(), change: `${questions.filter(q => q.createdAt > new Date(Date.now() - 7*24*60*60*1000)).length} this week`, icon: Database, gradient: "from-primary to-secondary" },
              { title: "Categories", value: new Set(questions.map(q => q.category)).size.toString(), change: "Active categories", icon: Tag, gradient: "from-secondary to-accent" },
              { title: "AI Generated", value: questions.filter(q => q.createdBy === 'AI Assistant' || q.createdBy === 'AI Assistant (Gemini)').length.toString(), change: "Auto-created", icon: Wand2, gradient: "from-accent to-primary" },
              { title: "Easy Questions", value: questions.filter(q => q.difficulty === 'Easy').length.toString(), change: "Beginner level", icon: BookOpen, gradient: "from-primary to-accent" }
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

          {/* Filters and Actions for Questions */}
          <AnimatedCard delay={0.5}>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAIDialog(true)}
                  disabled={!isGeminiConfigured()}
                  title={!isGeminiConfigured() ? "Gemini API not configured" : "Generate questions with AI"}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  AI Generate {!isGeminiConfigured() && '(⚠️)'}
                </Button>
                <Button className="bg-gradient-primary" onClick={() => setShowCreateQuestionDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Question
                </Button>
              </div>
            </div>
          </AnimatedCard>

          {/* Bulk Actions Bar */}
          {bulkSelectedQuestions.length > 0 && (
            <AnimatedCard delay={0.55} className="bg-primary/10 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                    {bulkSelectedQuestions.length} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkSelectedQuestions([])}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDeleteQuestions}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete {bulkSelectedQuestions.length} Questions
                  </Button>
                </div>
              </div>
            </AnimatedCard>
          )}

          {/* Questions Table */}
          <AnimatedCard delay={0.6}>
            {loading ? (
              <div className="text-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading questions...</p>
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-glass-border">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={bulkSelectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                          onCheckedChange={handleSelectAllQuestions}
                          aria-label="Select all questions"
                        />
                      </TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((question, index) => (
                      <motion.tr
                        key={question.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                        className="border-glass-border hover:bg-background-secondary transition-colors"
                      >
                        <TableCell>
                          <Checkbox
                            checked={bulkSelectedQuestions.includes(question.id)}
                            onCheckedChange={() => handleSelectQuestion(question.id)}
                            aria-label={`Select question ${question.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="font-medium text-foreground truncate">{question.question}</p>
                            <p className="text-sm text-muted-foreground">by {question.createdBy}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {question.type.replace('-', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{question.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={difficultyColors[question.difficulty]}>
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {question.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {question.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{question.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {question.createdAt.toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setSelectedQuestion(question)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Question
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-danger"
                                onClick={() => handleDeleteQuestion(question.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Question
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>

                {filteredQuestions.length === 0 && (
                  <div className="text-center py-20">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No questions found</h3>
                    <p className="text-muted-foreground mb-4">
                      {questions.length === 0 
                        ? "Start by creating your first question or use AI to generate questions automatically."
                        : "Try adjusting your search filters to find what you're looking for."
                      }
                    </p>
                    <Button onClick={() => setShowCreateQuestionDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Question
                    </Button>
                  </div>
                )}
              </div>
            )}
          </AnimatedCard>
        </TabsContent>

        {/* Question Banks Tab */}
        <TabsContent value="question-banks" className="space-y-6">
          {/* Stats Cards for Question Banks */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: "Total Banks", value: questionBanks.length.toString(), change: "Question collections", icon: Folder, gradient: "from-primary to-secondary" },
              { title: "Active Banks", value: questionBanks.filter(b => b.isActive).length.toString(), change: "Ready for use", icon: CheckCircle, gradient: "from-secondary to-accent" },
              { title: "Total Questions", value: questionBanks.reduce((sum, b) => sum + b.totalQuestions, 0).toString(), change: "Across all banks", icon: List, gradient: "from-accent to-primary" },
              { title: "Avg per Bank", value: questionBanks.length > 0 ? Math.round(questionBanks.reduce((sum, b) => sum + b.totalQuestions, 0) / questionBanks.length).toString() : '0', change: "Questions per bank", icon: Hash, gradient: "from-primary to-accent" }
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

          {/* Filters and Actions for Question Banks */}
          <AnimatedCard delay={0.5}>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search question banks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button className="bg-gradient-primary" onClick={() => setShowCreateBankDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Question Bank
              </Button>
            </div>
          </AnimatedCard>

          {/* Question Banks Table */}
          <AnimatedCard delay={0.6}>
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-glass-border">
                    <TableHead>Bank ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBanks.map((bank, index) => (
                    <motion.tr
                      key={bank.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="border-glass-border hover:bg-background-secondary transition-colors"
                    >
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {bank.bankId}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{bank.title}</p>
                          <p className="text-sm text-muted-foreground">{bank.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{bank.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{bank.totalQuestions}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={bank.isActive ? "bg-success/20 text-success" : "bg-muted/20 text-muted-foreground"}>
                          {bank.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {bank.createdDate.toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSelectedBank(bank)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Bank
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-danger"
                              onClick={() => handleDeleteQuestionBank(bank.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Bank
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>

              {filteredBanks.length === 0 && (
                <div className="text-center py-20">
                  <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No question banks found</h3>
                  <p className="text-muted-foreground mb-4">
                    {questionBanks.length === 0 
                      ? "Start by creating your first question bank to organize questions for tests."
                      : "Try adjusting your search filters to find what you're looking for."
                    }
                  </p>
                  <Button onClick={() => setShowCreateBankDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Question Bank
                  </Button>
                </div>
              )}
            </div>
          </AnimatedCard>
        </TabsContent>
      </Tabs>

      {/* Create Question Dialog */}
      <Dialog open={showCreateQuestionDialog} onOpenChange={setShowCreateQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Question</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="question">Question *</Label>
              <Textarea
                id="question"
                value={questionFormData.question}
                onChange={(e) => setQuestionFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Enter your question here..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={questionFormData.type} onValueChange={(value) => setQuestionFormData(prev => ({ ...prev, type: value as Question['type'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq-single">Single Choice MCQ</SelectItem>
                    <SelectItem value="mcq-multiple">Multiple Choice MCQ</SelectItem>
                    <SelectItem value="true-false">True/False</SelectItem>
                    <SelectItem value="numeric">Numeric Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={questionFormData.category} onValueChange={(value) => setQuestionFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {questionFormData.type.includes('mcq') && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {questionFormData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-sm font-medium w-6">{String.fromCharCode(65 + index)}</span>
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionFormData.options];
                            newOptions[index] = e.target.value;
                            setQuestionFormData(prev => ({ ...prev, options: newOptions }));
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                      </div>
                      {questionFormData.type === 'mcq-single' && (
                        <RadioGroup value={questionFormData.correctAnswer.toString()} onValueChange={(value) => setQuestionFormData(prev => ({ ...prev, correctAnswer: parseInt(value) }))} className="flex items-center">
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="text-xs">Correct</Label>
                          </div>
                        </RadioGroup>
                      )}
                      {questionFormData.type === 'mcq-multiple' && (
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            checked={Array.isArray(questionFormData.correctAnswer) ? questionFormData.correctAnswer.includes(index) : false}
                            onCheckedChange={(checked) => {
                              const currentAnswers = Array.isArray(questionFormData.correctAnswer) ? questionFormData.correctAnswer : [];
                              if (checked) {
                                setQuestionFormData(prev => ({ ...prev, correctAnswer: [...currentAnswers, index] }));
                              } else {
                                setQuestionFormData(prev => ({ ...prev, correctAnswer: currentAnswers.filter(a => a !== index) }));
                              }
                            }}
                            id={`multi-${index}`}
                          />
                          <Label htmlFor={`multi-${index}`} className="text-xs">Correct</Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {questionFormData.type === 'true-false' && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <RadioGroup value={questionFormData.correctAnswer.toString()} onValueChange={(value) => setQuestionFormData(prev => ({ ...prev, correctAnswer: parseInt(value) }))}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="true" />
                    <Label htmlFor="true">True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="0" id="false" />
                    <Label htmlFor="false">False</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {questionFormData.type === 'numeric' && (
              <div className="space-y-2">
                <Label>Correct Answer (Numeric)</Label>
                <Input
                  type="number"
                  step="any"
                  value={questionFormData.correctAnswer.toString()}
                  onChange={(e) => setQuestionFormData(prev => ({ ...prev, correctAnswer: parseFloat(e.target.value) || 0 }))}
                  placeholder="Enter the correct numeric answer"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={questionFormData.difficulty} onValueChange={(value) => setQuestionFormData(prev => ({ ...prev, difficulty: value as Question['difficulty'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  value={questionFormData.tags}
                  onChange={(e) => setQuestionFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="logic, reasoning, basic"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Explanation</Label>
              <Textarea
                value={questionFormData.explanation}
                onChange={(e) => setQuestionFormData(prev => ({ ...prev, explanation: e.target.value }))}
                placeholder="Explain why the answer is correct..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCreateQuestionDialog(false);
                resetQuestionForm();
              }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCreateQuestion} className="bg-gradient-primary">
                <Save className="w-4 h-4 mr-2" />
                Create Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Question Bank Dialog */}
      <Dialog open={showCreateBankDialog} onOpenChange={setShowCreateBankDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Question Bank</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Bank Title *</Label>
              <Input
                id="title"
                value={bankFormData.title}
                onChange={(e) => setBankFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter question bank title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={bankFormData.description}
                onChange={(e) => setBankFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this question bank..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={bankFormData.category} onValueChange={(value) => setBankFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Selected Questions ({selectedQuestions.length})</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowQuestionSelector(true)}
                  disabled={!bankFormData.category}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Select Questions
                </Button>
              </div>
              {selectedQuestions.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedQuestions.length} questions selected from {bankFormData.category} category
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCreateBankDialog(false);
                resetBankForm();
              }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCreateQuestionBank} className="bg-gradient-primary">
                <Save className="w-4 h-4 mr-2" />
                Create Question Bank
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Selector Dialog */}
      <Dialog open={showQuestionSelector} onOpenChange={setShowQuestionSelector}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Questions for {bankFormData.category} Question Bank</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <div className="text-sm text-muted-foreground">
              Available Questions: {availableQuestions.length} | Selected: {selectedQuestions.length}
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {availableQuestions.map((question) => (
                <div key={question.id} className="flex items-start space-x-3 p-3 border border-glass-border rounded-lg">
                  <Checkbox
                    checked={selectedQuestions.includes(question.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedQuestions(prev => [...prev, question.id]);
                      } else {
                        setSelectedQuestions(prev => prev.filter(id => id !== question.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{question.question}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">{question.category}</Badge>
                      <Badge 
                        className={`text-xs ${
                          question.difficulty === 'Easy' ? 'bg-success/20 text-success' :
                          question.difficulty === 'Medium' ? 'bg-warning/20 text-warning' :
                          'bg-danger/20 text-danger'
                        }`}
                      >
                        {question.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {question.type?.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {availableQuestions.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No questions available for this category</p>
                <p className="text-xs text-muted-foreground">Create questions first or select a different category</p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowQuestionSelector(false)}>
                Done
              </Button>
              <Button onClick={() => setSelectedQuestions(availableQuestions.map(q => q.id))}>
                Select All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Wand2 className="w-5 h-5 mr-2 text-primary" />
              AI Question Generator
              {isGeminiConfigured() && (
                <Badge variant="outline" className="ml-2 text-xs bg-success/20 text-success">
                  Gemini AI Ready
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Topic/Subject *</Label>
              <Input
                value={aiFormData.topic}
                onChange={(e) => setAiFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., logical reasoning, basic math, pattern recognition"
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the topic for better question quality
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={aiFormData.category} onValueChange={(value) => setAiFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={aiFormData.difficulty} onValueChange={(value) => setAiFormData(prev => ({ ...prev, difficulty: value as Question['difficulty'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={aiFormData.type} onValueChange={(value) => setAiFormData(prev => ({ ...prev, type: value as Question['type'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq-single">Single Choice MCQ</SelectItem>
                    <SelectItem value="mcq-multiple">Multiple Choice MCQ</SelectItem>
                    <SelectItem value="true-false">True/False</SelectItem>
                    <SelectItem value="numeric">Numeric Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Count</Label>
                <Select value={aiFormData.count.toString()} onValueChange={(value) => setAiFormData(prev => ({ ...prev, count: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 question</SelectItem>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAIGeneration}
                disabled={aiLoading || !aiFormData.topic.trim() || !isGeminiConfigured()}
                className="bg-gradient-primary"
              >
                {aiLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                {aiLoading ? 'Generating...' : 'Generate Questions'}
              </Button>
              {!isGeminiConfigured() && (
                <p className="text-xs text-warning mt-2">
                  ⚠️ Gemini API not configured. Contact admin to set up API key.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Details Modal */}
      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="max-w-2xl">
          {selectedQuestion && (
            <>
              <DialogHeader>
                <DialogTitle>Question Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div>
                  <h4 className="font-medium mb-2">Question</h4>
                  <p className="text-sm text-foreground p-3 bg-background-secondary rounded-lg">
                    {selectedQuestion.question}
                  </p>
                </div>

                {selectedQuestion.options && (
                  <div>
                    <h4 className="font-medium mb-2">Options</h4>
                    <div className="space-y-2">
                      {selectedQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                            {String.fromCharCode(65 + index)}
                          </Badge>
                          <span className="text-sm">{option}</span>
                          {(Array.isArray(selectedQuestion.correctAnswer) 
                            ? selectedQuestion.correctAnswer.includes(index)
                            : selectedQuestion.correctAnswer === index
                          ) && (
                            <Badge className="bg-success/20 text-success">Correct</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-medium mb-2">Explanation</h4>
                  <p className="text-sm text-muted-foreground p-3 bg-background-secondary rounded-lg">
                    {selectedQuestion.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Category</h4>
                    <Badge variant="outline">{selectedQuestion.category}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Difficulty</h4>
                    <Badge className={difficultyColors[selectedQuestion.difficulty]}>
                      {selectedQuestion.difficulty}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Type</h4>
                    <Badge variant="outline" className="capitalize">
                      {selectedQuestion.type.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>

                {selectedQuestion.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedQuestion.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
                  Close
                </Button>
                <Button className="bg-gradient-primary">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Question
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Question Bank Details Modal */}
      <Dialog open={!!selectedBank} onOpenChange={() => setSelectedBank(null)}>
        <DialogContent className="max-w-2xl">
          {selectedBank && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono">{selectedBank.bankId}</Badge>
                  <span>{selectedBank.title}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedBank.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bank ID</label>
                      <p className="text-sm mt-1 font-mono">{selectedBank.bankId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <Badge variant="outline" className="mt-1">{selectedBank.category}</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Questions</label>
                      <p className="text-sm mt-1 font-medium">{selectedBank.totalQuestions}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge className={`mt-1 ${selectedBank.isActive ? "bg-success/20 text-success" : "bg-muted/20 text-muted-foreground"}`}>
                        {selectedBank.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm mt-1">{selectedBank.createdDate.toLocaleDateString()} by {selectedBank.createdBy}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedBank(null)}>
                  Close
                </Button>
                <Button className="bg-gradient-primary">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Bank
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
