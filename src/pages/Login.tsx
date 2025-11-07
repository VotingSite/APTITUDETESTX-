import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Zap, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const { login, loginWithGoogle, signup, currentUser, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect authenticated users to their dashboard (only if they came to login page directly)
  useEffect(() => {
    if (currentUser && userData) {
      // Check if user came from a protected route
      const previousPath = sessionStorage.getItem('previousPath');
      if (previousPath && (previousPath.startsWith('/admin') || previousPath.startsWith('/student'))) {
        // Redirect back to where they were
        navigate(previousPath, { replace: true });
        sessionStorage.removeItem('previousPath');
      } else {
        // Default redirect based on role
        if (userData.role === 'student') {
          navigate('/student', { replace: true });
        } else if (userData.role === 'admin') {
          navigate('/admin', { replace: true });
        }
      }
    }
  }, [currentUser, userData, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      // Login successful - redirect will be handled by useEffect
    } catch (error: any) {
      let errorMessage = "Failed to log in";

      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email. Please check your email or sign up.";
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/invalid-login-credentials') {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast({
        title: "Success",
        description: "Logged in with Google successfully!",
      });
      // Let AuthRoutes handle the redirect automatically
    } catch (error: any) {
      let errorMessage = "Failed to log in with Google";

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Google sign-in was cancelled.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function createDemoAdmin() {
    try {
      setCreatingAccount(true);
      await signup('admin@test.com', 'admin123', 'Admin User', 'admin');
      toast({
        title: "Success",
        description: "Admin account created! You can now login with admin@test.com / admin123",
      });
      setEmail('admin@test.com');
      setPassword('admin123');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: "Account Exists",
          description: "Admin account already exists. Use admin@test.com / admin123 to login.",
        });
        setEmail('admin@test.com');
        setPassword('admin123');
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create admin account",
          variant: "destructive"
        });
      }
    } finally {
      setCreatingAccount(false);
    }
  }

  async function createDemoStudent() {
    try {
      setCreatingAccount(true);
      await signup('student@test.com', 'student123', 'Demo Student', 'student');
      toast({
        title: "Success",
        description: "Student account created! You can now login with student@test.com / student123",
      });
      setEmail('student@test.com');
      setPassword('student123');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: "Account Exists",
          description: "Student account already exists. Use student@test.com / student123 to login.",
        });
        setEmail('student@test.com');
        setPassword('student123');
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create student account",
          variant: "destructive"
        });
      }
    } finally {
      setCreatingAccount(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-primary flex items-center justify-center primary-glow"
          >
            <Zap className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to Aptitude Test X</p>
        </div>

        <AnimatedCard delay={0.3} glow>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10 glass-card border-glass-border focus:border-primary"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 glass-card border-glass-border focus:border-primary"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-primary hover:shadow-glow text-primary-foreground font-semibold transition-all duration-300"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-glass-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 glass-card border-glass-border hover:border-primary hover:shadow-glow transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-primary hover:text-primary-glow font-medium transition-colors"
              >
                Sign up here
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              Need to create an admin account?{' '}
              <Link
                to="/setup-admin"
                className="text-secondary hover:text-secondary-glow font-medium transition-colors"
              >
                Setup Admin
              </Link>
            </p>
          </div>
        </AnimatedCard>

        {/* Quick Demo Account Creation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 rounded-lg glass-card border border-glass-border"
        >
          <h3 className="text-sm font-medium text-foreground mb-3">Quick Demo Account Creation</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Button
              onClick={createDemoAdmin}
              disabled={creatingAccount || loading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Shield className="w-3 h-3 mr-1" />
              {creatingAccount ? 'Creating...' : 'Create Admin'}
            </Button>
            <Button
              onClick={createDemoStudent}
              disabled={creatingAccount || loading}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              {creatingAccount ? 'Creating...' : 'Create Student'}
            </Button>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>Admin:</strong> admin@test.com / admin123</p>
            <p><strong>Student:</strong> student@test.com / student123</p>
            <p className="text-xs text-success mt-2">↑ Click buttons above to create these accounts instantly</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
