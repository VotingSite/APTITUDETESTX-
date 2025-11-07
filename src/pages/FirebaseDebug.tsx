import { FirebaseTest } from '@/components/FirebaseTest';
import { FirebaseConfigDisplay } from '@/components/FirebaseConfigDisplay';
import { ProjectSwitcher } from '@/components/ProjectSwitcher';

export default function FirebaseDebug() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Firebase Debug Page</h1>
        <p className="text-muted-foreground mb-8">
          Use this page to test Firebase connections and switch between projects.
        </p>
        
        <ProjectSwitcher />
        <FirebaseConfigDisplay />
        <FirebaseTest />
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-lg font-bold mb-2">Instructions:</h3>
          <ul className="text-sm space-y-1">
            <li>• Use the Project Switcher to switch between Firebase projects</li>
            <li>• Check the Firebase Configuration to see current settings</li>
            <li>• Use the Firebase Test to verify connection</li>
            <li>• Check browser console for detailed error messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
