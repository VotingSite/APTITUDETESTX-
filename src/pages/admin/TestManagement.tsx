import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Clock,
  Users,
  BookOpen,
  Calendar,
  PlayCircle,
  Settings,
  Copy,
  Save,
  X,
  CheckCircle,
  Archive,
  Shuffle,
  Database,
  Hash
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
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Test {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  duration: number;
  totalQuestions: number;
  questionBankId: string; // Changed from questions array to single question bank ID
  questionBankTitle: string; // Store the question bank title for display
  status: 'draft' | 'published' | 'archived' | 'scheduled';
  createdDate: Date;
  attempts: number;
  averageScore: number;
  createdBy: string;
  passingScore?: number;
  shuffleQuestions?: boolean;
  showResults?: boolean;
}

interface QuestionBank {
  id: string;
  bankId: string; // QB001, QB002, etc.
  title: string;
  description: string;
  category: string;
  questions: string[];
  totalQuestions: number;
  isActive: boolean;
}

const statusColors = {
  published: "bg-success/20 text-success",
  draft: "bg-warning/20 text-warning",
  archived: "bg-muted/20 text-muted-foreground",
  scheduled: "bg-primary/20 text-primary"
};

const difficultyColors = {
  Easy: "bg-success/20 text-success",
  Medium: "bg-warning/20 text-warning",
  Hard: "bg-danger/20 text-danger"
};

const categories = ['Logic', 'Math', 'Verbal', 'Abstract', 'Programming', 'General'];
const difficulties = ['Easy', 'Medium', 'Hard'];

export default function TestManagement() {
  const [tests, setTests] = useState<Test[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state for creating/editing tests
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'Medium' as Test['difficulty'],
    duration: 60,
    passingScore: 70,
    shuffleQuestions: true,
    showResults: true,
    selectedQuestionBank: ''
  });

  useEffect(() => {
    fetchTests();
    fetchQuestionBanks();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const testsSnapshot = await getDocs(collection(db, 'tests'));
      const testsData = testsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdDate: doc.data().createdAt?.toDate() || new Date()
      })) as Test[];

      // Fetch attempts to calculate stats
      const attemptsSnapshot = await getDocs(collection(db, 'testAttempts'));
      const attemptsData = attemptsSnapshot.docs.map(doc => doc.data());

      // Calculate stats for each test
      const testsWithStats = testsData.map(test => {
        const testAttempts = attemptsData.filter(attempt => attempt.testId === test.id);
        const completedAttempts = testAttempts.filter(attempt => attempt.status === 'completed');
        
        const attempts = completedAttempts.length;
        const averageScore = attempts > 0 
          ? completedAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / attempts
          : 0;

        return {
          ...test,
          attempts,
          averageScore: Math.round(averageScore * 10) / 10
        };
      });

      setTests(testsWithStats);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tests",
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
        ...doc.data()
      })) as QuestionBank[];
      
      // Only show active question banks
      setQuestionBanks(banksData.filter(bank => bank.isActive));
    } catch (error) {
      console.error('Error fetching question banks:', error);
    }
  };

  const handleCreateTest = async () => {
    try {
      if (!formData.title || !formData.category || !formData.selectedQuestionBank) {
        toast({
          title: "Error",
          description: "Please fill in all required fields and select a question bank",
          variant: "destructive"
        });
        return;
      }

      // Find the selected question bank
      const selectedBank = questionBanks.find(bank => bank.id === formData.selectedQuestionBank);
      if (!selectedBank) {
        toast({
          title: "Error",
          description: "Selected question bank not found",
          variant: "destructive"
        });
        return;
      }

      const testData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        duration: formData.duration,
        totalQuestions: selectedBank.totalQuestions,
        questionBankId: selectedBank.id,
        questionBankTitle: selectedBank.title,
        status: 'draft' as Test['status'],
        createdAt: new Date(),
        createdBy: 'Admin User',
        passingScore: formData.passingScore,
        shuffleQuestions: formData.shuffleQuestions,
        showResults: formData.showResults
      };

      await addDoc(collection(db, 'tests'), testData);
      
      toast({
        title: "Success",
        description: "Test created successfully"
      });

      setShowCreateDialog(false);
      resetForm();
      fetchTests();
    } catch (error) {
      console.error('Error creating test:', error);
      toast({
        title: "Error",
        description: "Failed to create test",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTest = async (testId: string, updates: Partial<Test>) => {
    try {
      await updateDoc(doc(db, 'tests', testId), {
        ...updates,
        updatedAt: new Date()
      });
      
      toast({
        title: "Success",
        description: "Test updated successfully"
      });

      fetchTests();
    } catch (error) {
      console.error('Error updating test:', error);
      toast({
        title: "Error",
        description: "Failed to update test",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await deleteDoc(doc(db, 'tests', testId));
      
      toast({
        title: "Success",
        description: "Test deleted successfully"
      });

      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast({
        title: "Error",
        description: "Failed to delete test",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateTest = async (test: Test) => {
    try {
      const duplicateData = {
        ...test,
        title: `${test.title} (Copy)`,
        status: 'draft' as Test['status'],
        createdAt: new Date(),
        createdBy: 'Admin User'
      };
      
      delete (duplicateData as any).id;
      delete (duplicateData as any).attempts;
      delete (duplicateData as any).averageScore;

      await addDoc(collection(db, 'tests'), duplicateData);
      
      toast({
        title: "Success",
        description: "Test duplicated successfully"
      });

      fetchTests();
    } catch (error) {
      console.error('Error duplicating test:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate test",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      difficulty: 'Medium',
      duration: 60,
      passingScore: 70,
      shuffleQuestions: true,
      showResults: true,
      selectedQuestionBank: ''
    });
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const availableQuestionBanks = questionBanks.filter(bank => 
    formData.category === '' || bank.category === formData.category
  );

  // Calculate stats
  const totalTests = tests.length;
  const publishedTests = tests.filter(t => t.status === 'published').length;
  const totalAttempts = tests.reduce((sum, t) => sum + t.attempts, 0);
  const avgScore = tests.length > 0 
    ? (tests.reduce((sum, t) => sum + t.averageScore, 0) / tests.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Test Management</h1>
        <p className="text-muted-foreground text-lg">Create, manage, and monitor aptitude tests using Question Banks</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Total Tests", value: totalTests.toString(), change: "Created tests", icon: FileText, gradient: "from-primary to-secondary" },
          { title: "Published Tests", value: publishedTests.toString(), change: `${Math.round((publishedTests/totalTests) * 100) || 0}% of total`, icon: PlayCircle, gradient: "from-secondary to-accent" },
          { title: "Total Attempts", value: totalAttempts.toString(), change: "All time attempts", icon: Users, gradient: "from-accent to-primary" },
          { title: "Avg. Score", value: `${avgScore}%`, change: "Overall performance", icon: BookOpen, gradient: "from-primary to-accent" }
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

      {/* Filters and Actions */}
      <AnimatedCard delay={0.5}>
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
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36">
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
          
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Bulk Actions
            </Button>
            <Button className="bg-gradient-primary" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          </div>
        </div>
      </AnimatedCard>

      {/* Tests Table */}
      <AnimatedCard delay={0.6}>
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tests...</p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-glass-border">
                  <TableHead>Test Details</TableHead>
                  <TableHead>Question Bank</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg. Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test, index) => (
                  <motion.tr
                    key={test.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="border-glass-border hover:bg-background-secondary transition-colors"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{test.title}</p>
                        <p className="text-sm text-muted-foreground">{test.description}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Created {test.createdDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Database className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{test.questionBankTitle || 'Unknown Bank'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{test.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={difficultyColors[test.difficulty]}>
                        {test.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{test.duration}m</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{test.totalQuestions}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[test.status]}>
                        {test.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{test.attempts}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {test.attempts > 0 ? (
                        <span className="text-sm font-medium text-success">{test.averageScore}%</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No data</span>
                      )}
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
                          <DropdownMenuItem onClick={() => setSelectedTest(test)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Test
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTest(test)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {test.status === 'published' ? (
                            <DropdownMenuItem onClick={() => handleUpdateTest(test.id, { status: 'archived' })}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive Test
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleUpdateTest(test.id, { status: 'published' })}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Publish Test
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-danger"
                            onClick={() => handleDeleteTest(test.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Test
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>

            {filteredTests.length === 0 && !loading && (
              <div className="text-center py-20">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No tests found</h3>
                <p className="text-muted-foreground mb-4">
                  {tests.length === 0 
                    ? "Start by creating your first test using a Question Bank."
                    : "Try adjusting your search filters to find what you're looking for."
                  }
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Test
                </Button>
              </div>
            )}
          </div>
        )}
      </AnimatedCard>

      {/* Create Test Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="title">Test Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter test title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this test evaluates..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value, selectedQuestionBank: '' }))}>
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
                <Label>Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value as Test['difficulty'] }))}>
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

            <div className="space-y-2">
              <Label>Question Bank *</Label>
              <Select 
                value={formData.selectedQuestionBank} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, selectedQuestionBank: value }))}
                disabled={!formData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.category ? "Select question bank" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableQuestionBanks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="font-mono text-xs">{bank.bankId}</Badge>
                        <span>{bank.title}</span>
                        <span className="text-muted-foreground">({bank.totalQuestions} questions)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.category && availableQuestionBanks.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No question banks available for {formData.category} category.
                  <Button variant="link" className="p-0 h-auto ml-1" onClick={() => window.open('/admin/questions', '_blank')}>
                    Create one first.
                  </Button>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  min="1"
                  max="300"
                />
              </div>

              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => setFormData(prev => ({ ...prev, passingScore: parseInt(e.target.value) || 70 }))}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="shuffle"
                  checked={formData.shuffleQuestions}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, shuffleQuestions: checked as boolean }))}
                />
                <Label htmlFor="shuffle">Shuffle Questions</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showResults"
                  checked={formData.showResults}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showResults: checked as boolean }))}
                />
                <Label htmlFor="showResults">Show Results to Students</Label>
              </div>
            </div>

            {formData.selectedQuestionBank && (
              <div className="p-4 bg-background-secondary rounded-lg">
                <h4 className="font-medium mb-2">Selected Question Bank</h4>
                {(() => {
                  const selectedBank = questionBanks.find(bank => bank.id === formData.selectedQuestionBank);
                  return selectedBank ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="font-mono">{selectedBank.bankId}</Badge>
                        <span className="font-medium">{selectedBank.title}</span>
                      </div>
                      <p className="text-muted-foreground">{selectedBank.description}</p>
                      <div className="flex items-center space-x-4 text-muted-foreground">
                        <span>Category: {selectedBank.category}</span>
                        <span>Questions: {selectedBank.totalQuestions}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCreateTest} className="bg-gradient-primary">
                <Save className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Details Modal */}
      <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTest && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedTest.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedTest.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <Badge variant="outline" className="mt-1">{selectedTest.category}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                      <Badge className={`mt-1 ${difficultyColors[selectedTest.difficulty]}`}>
                        {selectedTest.difficulty}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge className={`mt-1 ${statusColors[selectedTest.status]}`}>
                        {selectedTest.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Duration</label>
                      <p className="text-sm mt-1">{selectedTest.duration} minutes</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Questions</label>
                      <p className="text-sm mt-1">{selectedTest.totalQuestions}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Question Bank</label>
                      <p className="text-sm mt-1 font-medium">{selectedTest.questionBankTitle}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Total Attempts</label>
                    <p className="text-sm mt-1 font-medium">{selectedTest.attempts}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Average Score</label>
                    <p className="text-sm mt-1 font-medium text-success">
                      {selectedTest.attempts > 0 ? `${selectedTest.averageScore}%` : 'No data'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Passing Score</label>
                    <p className="text-sm mt-1">{selectedTest.passingScore || 70}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Shuffle Questions</label>
                    <p className="text-sm mt-1">{selectedTest.shuffleQuestions ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedTest(null)}>
                  Close
                </Button>
                <Button className="bg-gradient-primary">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Test
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
