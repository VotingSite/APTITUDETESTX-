import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { firebaseConfigs, switchFirebaseProject } from '@/lib/firebase-config';

export function ProjectSwitcher() {
  const [selectedProject, setSelectedProject] = useState('aptitude-test-x-6d5b5');

  const handleProjectSwitch = (projectId: string) => {
    setSelectedProject(projectId);
    switchFirebaseProject(projectId as keyof typeof firebaseConfigs);
    // Reload the page to reinitialize Firebase with new config
    window.location.reload();
  };

  return (
    <div className="p-4 bg-background border rounded-lg mb-4">
      <h3 className="text-lg font-bold mb-2">Firebase Project Switcher</h3>
      <div className="flex items-center space-x-2">
        <Select value={selectedProject} onValueChange={handleProjectSwitch}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(firebaseConfigs).map(projectId => (
              <SelectItem key={projectId} value={projectId}>
                {projectId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={() => window.location.reload()} 
          size="sm"
          variant="outline"
        >
          Reload
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Current project: {selectedProject}
      </p>
    </div>
  );
}
