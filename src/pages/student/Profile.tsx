import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  User, 
  Mail, 
  Lock, 
  Bell, 
  Settings, 
  Shield, 
  Palette,
  Globe,
  Clock,
  Target,
  Camera,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  LogOut,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  displayName: string;
  email: string;
  bio: string;
  avatar: string;
  joinedDate: Date | string | Timestamp; // allow all
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  studyGoal: number; // minutes per week
  preferredDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  testReminders: boolean;
  achievementAlerts: boolean;
  weeklyReports: boolean;
  studyStreakReminders: boolean;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showProgress: boolean;
  showAchievements: boolean;
  allowFriendRequests: boolean;
  dataCollection: boolean;
}

interface AccountStats {
  testsCompleted: number;
  totalStudyTime: number; // in minutes
  averageScore: number;
  rank: number;
  achievements: number;
  streakDays: number;
}



// --- date helper: converts Firestore Timestamp | string | Date -> Date string
function formatDate(value: any): string {
  if (!value) return "N/A";

  // Firestore Timestamp (has .toDate)
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    try { return value.toDate().toLocaleDateString(); } catch {}
  }

  // Unix seconds (common if you saved seconds)
  if (value && typeof value === "object" && typeof value.seconds === "number") {
    try { return new Date(value.seconds * 1000).toLocaleDateString(); } catch {}
  }

  // String / number / Date
  try { return new Date(value).toLocaleDateString(); } catch {}

  return "N/A";
}
export default function Profile() {
  const { userData, logout } = useAuth();
  const { toast } = useToast();
  
  // Debug logging
  console.log('Profile component rendering');
  console.log('userData:', userData);
  
  // Check if component is rendering
  console.log('Profile component reached render section');
  
  // Add error boundary check
  if (typeof userData === 'undefined') {
    console.log('userData is undefined');
  }
  
  // Component logic
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountStats, setAccountStats] = useState<AccountStats>({
    testsCompleted: 0,
    totalStudyTime: 0,
    averageScore: 0,
    rank: 0,
    achievements: 0,
    streakDays: 0
  });

  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    bio: '',
    avatar: '',
    joinedDate: new Date(),
    timezone: 'UTC-5 (Eastern)',
    language: 'English',
    theme: 'auto',
    studyGoal: 180, // 3 hours per week
    preferredDifficulty: 'Adaptive'
  });
  console.log('Initial profile state with empty values');

  // Update profile state when userData changes
  useEffect(() => {
    console.log('userData changed:', userData);
    if (userData) {
      console.log('Setting profile with userData:', userData);
      setProfile({
        displayName: userData.displayName || 'Student User',
        email: userData.email || 'student@test.com',
        bio: 'Passionate learner focused on improving analytical and reasoning skills through consistent practice.',
        avatar: userData.photoURL || '',
        joinedDate: userData.createdAt || new Date(),
        timezone: 'UTC-5 (Eastern)',
        language: 'English',
        theme: 'auto',
        studyGoal: 180, // 3 hours per week
        preferredDifficulty: 'Adaptive'
      });
    } else {
      console.log('userData is null or undefined');
    }
  }, [userData]);
  
  // Fetch account statistics from Firestore
  useEffect(() => {
    const fetchAccountStats = async () => {
      console.log('Fetching account stats for userData:', userData);
      if (!userData) return;
      
      try {
        // Fetch test attempts for this user
        const attemptsQuery = query(
          collection(db, 'testAttempts'),
          where('userId', '==', userData.uid)
        );
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const attempts: any[] = attemptsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          completedAt: doc.data().completedAt?.toDate()
        }));
        
        // Calculate stats
        const completedTests = attempts.filter(a => a.status === 'completed').length;
        const averageScore = attempts.length > 0
          ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
          : 0;
        const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
        
        // For now, we'll use placeholder values for rank and achievements
        // In a real application, these would be fetched from Firestore or calculated
        const rank = 1247;
        const achievements = 8;
        const streakDays = 5;
        
        setAccountStats({
          testsCompleted: completedTests,
          totalStudyTime: totalTimeSpent,
          averageScore: Math.round(averageScore * 10) / 10,
          rank,
          achievements,
          streakDays
        });
        console.log('Set accountStats:', {
          testsCompleted: completedTests,
          totalStudyTime: totalTimeSpent,
          averageScore: Math.round(averageScore * 10) / 10,
          rank,
          achievements,
          streakDays
        });
      } catch (error) {
        console.error('Error fetching account stats:', error);
      }
    };
    
    fetchAccountStats();
  }, [userData]);
  
  // Log accountStats whenever they change
  useEffect(() => {
    console.log('accountStats updated:', accountStats);
  }, [accountStats]);
  

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    testReminders: true,
    achievementAlerts: true,
    weeklyReports: true,
    studyStreakReminders: true
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showProgress: true,
    showAchievements: true,
    allowFriendRequests: true,
    dataCollection: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
  });


  const handleSaveProfile = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been saved successfully.",
    });
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setShowPasswordDialog(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      showCurrentPassword: false,
      showNewPassword: false,
      showConfirmPassword: false
    });
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
    });
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    toast({
      title: "Account Deletion Requested",
      description: "Your account will be deleted within 24 hours. You can cancel this action by logging in again.",
      variant: "destructive"
    });
    logout();
  };

  const handleExportData = () => {
    // Simulate data export
    const data = {
      profile,
      stats: accountStats,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aptitude-test-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data Exported",
      description: "Your data has been downloaded successfully.",
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
        <h1 className="text-4xl font-bold gradient-text mb-4">Profile Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your account and preferences</p>
      </motion.div>

      {/* Profile Overview */}
      <AnimatedCard delay={0.2}>
        <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-32 h-32">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-3xl bg-gradient-primary text-primary-foreground">
                {profile.displayName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
              onClick={() => toast({ title: "Feature Coming Soon", description: "Avatar upload will be available soon." })}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{profile.displayName}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {formatDate(profile.joinedDate)}
                </p>
              </div>
              <Button
                variant={isEditing ? "destructive" : "outline"}
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                }}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>

            <p className="text-muted-foreground mb-6">{profile.bio}</p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Tests", value: accountStats.testsCompleted, icon: Target },
                { label: "Avg Score", value: `${accountStats.averageScore}%`, icon: CheckCircle },
                { label: "Study Time", value: `${Math.round(accountStats.totalStudyTime / 60)}h`, icon: Clock },
                { label: "Achievements", value: accountStats.achievements, icon: Shield }
              ].map((stat, index) => (
                <div key={index} className="text-center p-3 rounded-lg bg-background-secondary">
                  <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5 glass-card">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center space-x-2">
            <Lock className="w-4 h-4" />
            <span>Account</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <AnimatedCard delay={0.4}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={profile.timezone} 
                    onValueChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC-8 (Pacific)">UTC-8 (Pacific)</SelectItem>
                      <SelectItem value="UTC-7 (Mountain)">UTC-7 (Mountain)</SelectItem>
                      <SelectItem value="UTC-6 (Central)">UTC-6 (Central)</SelectItem>
                      <SelectItem value="UTC-5 (Eastern)">UTC-5 (Eastern)</SelectItem>
                      <SelectItem value="UTC+0 (GMT)">UTC+0 (GMT)</SelectItem>
                      <SelectItem value="UTC+1 (CET)">UTC+1 (CET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={profile.language} 
                    onValueChange={(value) => setProfile(prev => ({ ...prev, language: value }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Chinese">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <AnimatedCard delay={0.4}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Preferences
            </h3>
            
            <div className="space-y-6">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-base">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {key === 'emailNotifications' && 'Receive notifications via email'}
                      {key === 'pushNotifications' && 'Receive push notifications in browser'}
                      {key === 'testReminders' && 'Get reminded about upcoming tests'}
                      {key === 'achievementAlerts' && 'Get notified when you earn achievements'}
                      {key === 'weeklyReports' && 'Receive weekly progress reports'}
                      {key === 'studyStreakReminders' && 'Get reminded to maintain study streaks'}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <AnimatedCard delay={0.4}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Privacy Settings
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="profileVisibility">Profile Visibility</Label>
                <Select 
                  value={privacy.profileVisibility} 
                  onValueChange={(value: 'public' | 'friends' | 'private') => 
                    setPrivacy(prev => ({ ...prev, profileVisibility: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can see your profile</SelectItem>
                    <SelectItem value="friends">Friends - Only friends can see your profile</SelectItem>
                    <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {Object.entries(privacy).slice(1).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label htmlFor={key} className="text-base">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {key === 'showProgress' && 'Display your progress statistics on your profile'}
                      {key === 'showAchievements' && 'Display your achievements on your profile'}
                      {key === 'allowFriendRequests' && 'Allow other users to send you friend requests'}
                      {key === 'dataCollection' && 'Allow anonymous data collection for platform improvement'}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => 
                      setPrivacy(prev => ({ ...prev, [key]: checked }))
                    }
                  />
                </div>
              ))}
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <AnimatedCard delay={0.4}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              App Preferences
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={profile.theme} 
                    onValueChange={(value: 'light' | 'dark' | 'auto') => 
                      setProfile(prev => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Preferred Difficulty</Label>
                  <Select 
                    value={profile.preferredDifficulty} 
                    onValueChange={(value: 'Easy' | 'Medium' | 'Hard' | 'Adaptive') => 
                      setProfile(prev => ({ ...prev, preferredDifficulty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                      <SelectItem value="Adaptive">Adaptive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studyGoal">Weekly Study Goal (minutes)</Label>
                <Input
                  id="studyGoal"
                  type="number"
                  value={profile.studyGoal}
                  onChange={(e) => setProfile(prev => ({ ...prev, studyGoal: parseInt(e.target.value) || 0 }))}
                  min="30"
                  max="2000"
                  step="30"
                />
                <p className="text-sm text-muted-foreground">
                  Current goal: {Math.round(profile.studyGoal / 60)} hours per week
                </p>
              </div>
            </div>
          </AnimatedCard>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <AnimatedCard delay={0.4}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Account Security
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-background-secondary">
                <div>
                  <h4 className="font-medium">Password</h4>
                  <p className="text-sm text-muted-foreground">Last changed 2 weeks ago</p>
                </div>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Change Password</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={passwordData.showCurrentPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setPasswordData(prev => ({ ...prev, showCurrentPassword: !prev.showCurrentPassword }))}
                          >
                            {passwordData.showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={passwordData.showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setPasswordData(prev => ({ ...prev, showNewPassword: !prev.showNewPassword }))}
                          >
                            {passwordData.showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={passwordData.showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setPasswordData(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                          >
                            {passwordData.showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleChangePassword} disabled={loading}>
                        {loading ? 'Changing...' : 'Change Password'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Data & Privacy</h4>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-background-secondary">
                  <div>
                    <h5 className="font-medium">Export Your Data</h5>
                    <p className="text-sm text-muted-foreground">Download a copy of your data</p>
                  </div>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div>
                    <h5 className="font-medium text-destructive">Delete Account</h5>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <div className="flex items-center space-x-2 p-3 rounded bg-destructive/10 border border-destructive/20">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          <p className="text-sm text-destructive font-medium">
                            This action is irreversible. All your progress, achievements, and data will be lost.
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading}>
                          {loading ? 'Deleting...' : 'Delete Account'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.6}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Sign Out</h3>
                <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
              </div>
              <Button variant="outline" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </AnimatedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
