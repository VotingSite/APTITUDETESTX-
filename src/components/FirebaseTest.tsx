import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

export function FirebaseTest() {
  const [status, setStatus] = useState<string>('Testing...');
  const [error, setError] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number>(0);

  useEffect(() => {
    const testFirebase = async () => {
      try {
        setStatus('Testing Firebase connection...');
        
        // Test Firestore connection
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        setUserCount(snapshot.size);
        
        setStatus('Firebase connection successful!');
        console.log('Firebase test successful:', {
          auth: !!auth,
          db: !!db,
          userCount: snapshot.size
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setStatus('Firebase connection failed');
        console.error('Firebase test failed:', err);
      }
    };

    testFirebase();
  }, []);

  return (
    <div className="p-4 bg-background border rounded-lg">
      <h3 className="text-lg font-bold mb-2">Firebase Connection Test</h3>
      <p className="text-sm mb-2">Status: {status}</p>
      {error && (
        <p className="text-sm text-red-500 mb-2">Error: {error}</p>
      )}
      {userCount > 0 && (
        <p className="text-sm text-green-500 mb-2">Users found: {userCount}</p>
      )}
      <Button 
        onClick={() => window.location.reload()} 
        size="sm"
        variant="outline"
      >
        Retry Test
      </Button>
    </div>
  );
}
