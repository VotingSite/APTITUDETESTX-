import { auth, db } from '@/lib/firebase';

export function FirebaseConfigDisplay() {
  const config = {
    apiKey: "AIzaSyBjpkElOt5H4hQlTvvVuwC4Sh79wBT1dck",
    authDomain: "aptitude-test-x-6d5b5.firebaseapp.com",
    databaseURL: "https://aptitude-test-x-6d5b5-default-rtdb.firebaseio.com",
    projectId: "aptitude-test-x-6d5b5",
    storageBucket: "aptitude-test-x-6d5b5.firebasestorage.app",
    messagingSenderId: "1010351737990",
    appId: "1:1010351737990:web:0147372fed08f011301507",
    measurementId: "G-PKRPJ1E6N7"
  };

  return (
    <div className="p-4 bg-background border rounded-lg mb-4">
      <h3 className="text-lg font-bold mb-2">Current Firebase Configuration</h3>
      <div className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
      <div className="mt-2 text-sm">
        <p>Auth initialized: {auth ? '✅ Yes' : '❌ No'}</p>
        <p>Firestore initialized: {db ? '✅ Yes' : '❌ No'}</p>
        <p>Project ID: {config.projectId}</p>
        <p>Auth Domain: {config.authDomain}</p>
      </div>
    </div>
  );
}
