import { useAuth } from '@/contexts/AuthContext';

interface DebugInfoProps {
  componentName: string;
}

export function DebugInfo({ componentName }: DebugInfoProps) {
  const { currentUser, userData, loading } = useAuth();

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs z-50 max-w-xs">
        <div className="font-bold mb-2">Debug: {componentName}</div>
        <div>Loading: {loading ? 'true' : 'false'}</div>
        <div>User: {currentUser ? 'logged in' : 'not logged in'}</div>
        <div>UserData: {userData ? 'loaded' : 'not loaded'}</div>
        <div>Role: {userData?.role || 'none'}</div>
        <div>Time: {new Date().toLocaleTimeString()}</div>
      </div>
    );
  }

  return null;
}
