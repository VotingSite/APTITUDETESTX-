import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserPlus } from 'lucide-react';

export function AdminCreator() {
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('admin123');
  const [displayName, setDisplayName] = useState('Admin User');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { toast } = useToast();

  const handleCreateAdmin = async () => {
    try {
      setLoading(true);
      await signup(email, password, displayName, 'admin');
      toast({
        title: "Success",
        description: `Admin account created! Email: ${email}, Password: ${password}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedCard>
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Create Admin Account</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label>Admin Email</Label>
            <Input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          
          <div>
            <Label>Password</Label>
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          
          <div>
            <Label>Display Name</Label>
            <Input 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Admin User"
            />
          </div>
        </div>

        <Button 
          onClick={handleCreateAdmin} 
          disabled={loading}
          className="w-full bg-gradient-primary"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {loading ? 'Creating...' : 'Create Admin Account'}
        </Button>

        <div className="text-xs text-muted-foreground bg-background-secondary p-3 rounded">
          <strong>Default credentials:</strong><br />
          Email: admin@test.com<br />
          Password: admin123
        </div>
      </div>
    </AnimatedCard>
  );
}
