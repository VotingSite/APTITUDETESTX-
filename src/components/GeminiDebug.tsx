import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isGeminiConfigured } from '@/lib/gemini';
import { Wand2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function GeminiDebug() {
  const [testResult, setTestResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const testGeminiConnection = async () => {
    setTesting(true);
    setTestResult('');
    
    try {
      const { generateQuestionsWithAI } = await import('@/lib/gemini');
      
      const testQuestion = await generateQuestionsWithAI({
        topic: 'basic math',
        category: 'Math',
        difficulty: 'Easy',
        count: 1,
        type: 'mcq-single'
      });
      
      setTestResult(`✅ Success! Generated ${testQuestion.length} question(s)`);
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isConfigured = isGeminiConfigured();

  return (
    <Card className="w-full max-w-md glass-card border-glass-border">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Wand2 className="w-5 h-5" />
          <span>Gemini AI Debug</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">API Key Status:</span>
            <div className="flex items-center space-x-1">
              {isConfigured ? (
                <>
                  <CheckCircle className="w-4 h-4 text-success" />
                  <Badge variant="outline" className="text-success">Configured</Badge>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-danger" />
                  <Badge variant="outline" className="text-danger">Missing</Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            API Key: {apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found'}
          </div>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testGeminiConnection}
            disabled={!isConfigured || testing}
            className="w-full"
            size="sm"
          >
            {testing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Test AI Generation
          </Button>
          
          {testResult && (
            <div className="p-2 rounded text-xs bg-muted">
              {testResult}
            </div>
          )}
        </div>

        {!isConfigured && (
          <div className="flex items-start space-x-2 p-2 rounded bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
            <div className="text-xs text-warning">
              Gemini API key not configured. Set VITE_GEMINI_API_KEY environment variable.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
