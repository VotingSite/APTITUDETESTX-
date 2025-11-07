import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Search, 
  Filter, 
  Clock,
  User,
  FileText,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  Calendar,
  Download,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, getDocs, query, orderBy, where, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  actionType: 'login' | 'logout' | 'test_start' | 'test_complete' | 'test_submit' | 'question_create' | 'test_create' | 'user_create' | 'system';
  details: string;
  metadata?: {
    testId?: string;
    testTitle?: string;
    score?: number;
    questionId?: string;
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  timestamp: Date;
  severity: 'info' | 'success' | 'warning' | 'error';
}

const actionTypeColors = {
  login: "bg-primary/20 text-primary",
  logout: "bg-muted/20 text-muted-foreground",
  test_start: "bg-secondary/20 text-secondary",
  test_complete: "bg-success/20 text-success",
  test_submit: "bg-success/20 text-success",
  question_create: "bg-accent/20 text-accent",
  test_create: "bg-accent/20 text-accent",
  user_create: "bg-primary/20 text-primary",
  system: "bg-warning/20 text-warning"
};

const severityColors = {
  info: "bg-primary/20 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  error: "bg-danger/20 text-danger"
};

const actionIcons = {
  login: LogIn,
  logout: LogOut,
  test_start: FileText,
  test_complete: CheckCircle,
  test_submit: CheckCircle,
  question_create: FileText,
  test_create: FileText,
  user_create: User,
  system: Activity
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7');
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, severityFilter, dateRange]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Fetch activity logs
      const logsSnapshot = await getDocs(
        query(
          collection(db, 'activityLogs'),
          orderBy('timestamp', 'desc'),
          limit(500)
        )
      );

      let logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as ActivityLog[];

      // Filter by date range
      logsData = logsData.filter(log => 
        log.timestamp >= startDate && log.timestamp <= endDate
      );

      // If no logs exist, create some sample logs for demonstration
      if (logsData.length === 0) {
        await createSampleLogs();
        // Fetch again after creating sample logs
        const newLogsSnapshot = await getDocs(
          query(
            collection(db, 'activityLogs'),
            orderBy('timestamp', 'desc'),
            limit(100)
          )
        );
        logsData = newLogsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as ActivityLog[];
      }

      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createSampleLogs = async () => {
    const sampleLogs = [
      {
        userId: 'user1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        action: 'User logged in',
        actionType: 'login',
        details: 'User successfully authenticated',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        severity: 'info',
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      {
        userId: 'user1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        action: 'Started test: Logic Reasoning Test',
        actionType: 'test_start',
        details: 'User began taking a logic reasoning assessment',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        severity: 'info',
        metadata: {
          testId: 'test1',
          testTitle: 'Logic Reasoning Test'
        }
      },
      {
        userId: 'user1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        action: 'Completed test: Logic Reasoning Test',
        actionType: 'test_complete',
        details: 'User successfully completed the assessment with a score of 85%',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        severity: 'success',
        metadata: {
          testId: 'test1',
          testTitle: 'Logic Reasoning Test',
          score: 85
        }
      },
      {
        userId: 'admin1',
        userName: 'Admin User',
        userEmail: 'admin@example.com',
        action: 'Created new question',
        actionType: 'question_create',
        details: 'Added a new logic question to the question bank',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        severity: 'success',
        metadata: {
          questionId: 'q1',
          category: 'Logic'
        }
      },
      {
        userId: 'user2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        action: 'Failed to submit test',
        actionType: 'test_submit',
        details: 'Test submission failed due to network timeout',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        severity: 'error',
        metadata: {
          testId: 'test2',
          testTitle: 'Math Assessment',
          error: 'Network timeout'
        }
      }
    ];

    for (const log of sampleLogs) {
      await addDoc(collection(db, 'activityLogs'), log);
    }
  };

  // Function to log activity (can be called from other parts of the app)
  const logActivity = async (logData: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        ...logData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'activityLogs', logId));
      toast({
        title: "Success",
        description: "Log entry deleted successfully"
      });
      fetchLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      toast({
        title: "Error",
        description: "Failed to delete log entry",
        variant: "destructive"
      });
    }
  };

  const handleClearLogs = async () => {
    try {
      const logsToDelete = logs.slice(0, 10); // Delete oldest 10 logs
      for (const log of logsToDelete) {
        await deleteDoc(doc(db, 'activityLogs', log.id));
      }
      toast({
        title: "Success",
        description: `Cleared ${logsToDelete.length} log entries`
      });
      fetchLogs();
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error",
        description: "Failed to clear logs",
        variant: "destructive"
      });
    }
  };

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Timestamp,User,Action,Type,Severity,Details\n"
      + filteredLogs.map(log => 
          `"${log.timestamp.toISOString()}","${log.userName}","${log.action}","${log.actionType}","${log.severity}","${log.details}"`
        ).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Activity logs exported successfully"
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchesSearch && matchesAction && matchesSeverity;
  });

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

  // Calculate stats
  const totalLogs = logs.length;
  const todayLogs = logs.filter(log => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return log.timestamp >= today;
  }).length;
  const errorLogs = logs.filter(log => log.severity === 'error').length;
  const uniqueUsers = new Set(logs.map(log => log.userId)).size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Activity Logs</h1>
        <p className="text-muted-foreground text-lg">Monitor and track all system activities and user interactions</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Total Activities", value: totalLogs.toString(), change: "All time", icon: Activity, gradient: "from-primary to-secondary" },
          { title: "Today's Activities", value: todayLogs.toString(), change: "Last 24 hours", icon: Clock, gradient: "from-secondary to-accent" },
          { title: "Error Events", value: errorLogs.toString(), change: "Needs attention", icon: XCircle, gradient: "from-accent to-primary" },
          { title: "Active Users", value: uniqueUsers.toString(), change: "Recent activity", icon: User, gradient: "from-primary to-accent" }
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
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="test_start">Test Start</SelectItem>
                <SelectItem value="test_complete">Test Complete</SelectItem>
                <SelectItem value="question_create">Question Create</SelectItem>
                <SelectItem value="user_create">User Create</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last Day</SelectItem>
                <SelectItem value="7">Last Week</SelectItem>
                <SelectItem value="30">Last Month</SelectItem>
                <SelectItem value="90">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handleClearLogs}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Old
            </Button>
          </div>
        </div>
      </AnimatedCard>

      {/* Activity Logs Table */}
      <AnimatedCard delay={0.6}>
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading activity logs...</p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-glass-border">
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, index) => {
                  const ActionIcon = actionIcons[log.actionType] || Activity;
                  
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.02 }}
                      className="border-glass-border hover:bg-background-secondary transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                              {log.userName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm">{log.userName}</p>
                            <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <ActionIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={actionTypeColors[log.actionType]} variant="outline">
                          {log.actionType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[log.severity]}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{getTimeAgo(log.timestamp)}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleDateString()} {log.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.details}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteLog(log.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>

            {filteredLogs.length === 0 && !loading && (
              <div className="text-center py-20">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No activity logs found</h3>
                <p className="text-muted-foreground mb-4">
                  {logs.length === 0 
                    ? "Activity logs will appear here as users interact with the system."
                    : "Try adjusting your search filters to find what you're looking for."
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </AnimatedCard>

      {/* Log Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span>Activity Log Details</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">User</label>
                      <p className="text-sm mt-1 font-medium">{selectedLog.userName}</p>
                      <p className="text-xs text-muted-foreground">{selectedLog.userEmail}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Action Type</label>
                      <Badge className={`mt-1 ${actionTypeColors[selectedLog.actionType]}`} variant="outline">
                        {selectedLog.actionType.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Severity</label>
                      <Badge className={`mt-1 ${severityColors[selectedLog.severity]}`}>
                        {selectedLog.severity}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                      <p className="text-sm mt-1">{selectedLog.timestamp.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">User ID</label>
                      <p className="text-sm mt-1 font-mono">{selectedLog.userId}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <p className="text-sm mt-1 font-medium">{selectedLog.action}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Details</label>
                  <p className="text-sm mt-1 p-3 bg-background-secondary rounded-lg">{selectedLog.details}</p>
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                    <div className="mt-1 p-3 bg-background-secondary rounded-lg">
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDeleteLog(selectedLog.id)}
                  className="text-danger hover:text-danger"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Log
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
