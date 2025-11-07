import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Gemini API key not found. AI question generation will not work.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface AIQuestionRequest {
  topic: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  count: number;
  type: 'mcq-single' | 'mcq-multiple' | 'true-false' | 'numeric';
}

export interface AIGeneratedQuestion {
  question: string;
  type: 'mcq-single' | 'mcq-multiple' | 'true-false' | 'numeric';
  options?: string[];
  correctAnswer: number | number[] | boolean | string;
  explanation: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
}

const createPrompt = (request: AIQuestionRequest): string => {
  const difficultyContext = {
    Easy: 'basic level, suitable for beginners',
    Medium: 'intermediate level, requiring some analysis',
    Hard: 'advanced level, requiring deep thinking and complex reasoning'
  };

  const typeInstructions = {
    'mcq-single': 'Create multiple choice questions with exactly 4 options (A, B, C, D) where only ONE option is correct.',
    'mcq-multiple': 'Create multiple choice questions with exactly 4 options (A, B, C, D) where MULTIPLE options can be correct.',
    'true-false': 'Create true/false questions with clear statements that are either definitely true or definitely false.',
    'numeric': 'Create questions that require a specific numeric answer (integer or decimal).'
  };

  return `Generate ${request.count} high-quality ${request.category.toLowerCase()} questions about "${request.topic}" at ${difficultyContext[request.difficulty]} difficulty.

Question Type: ${typeInstructions[request.type]}

Requirements:
- Questions must be clearly worded and unambiguous
- For MCQ questions, provide exactly 4 options labeled A, B, C, D
- Options should be plausible but only the correct ones should be right
- Include detailed explanations for why the answer is correct
- Make questions relevant to aptitude tests and ${request.category.toLowerCase()} reasoning
- Difficulty should be appropriate for ${request.difficulty} level

Format your response as a JSON array with this exact structure:
[
  {
    "question": "The actual question text",
    "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQ types
    "correctAnswer": 0, // Index for single MCQ, array of indices for multiple MCQ, true/false for boolean, number for numeric
    "explanation": "Detailed explanation of why this answer is correct",
    "tags": ["tag1", "tag2", "tag3"] // 2-3 relevant tags
  }
]

Generate exactly ${request.count} questions following this format.`;
};

export async function generateQuestionsWithAI(request: AIQuestionRequest): Promise<AIGeneratedQuestion[]> {
  // Use server-side proxy to avoid exposing API keys in the browser.
  // The proxy will forward the prompt to Google/OpenRouter and return the raw response text.
  try {
    const prompt = createPrompt(request);
    console.log('Requesting server to generate questions with prompt:', prompt);

    const resp = await fetch((import.meta.env.VITE_GEN_PROXY_URL || '') + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Proxy generation failed: ${resp.status} ${body}`);
    }

    const data = await resp.json();
    let text = data?.text || '';
    console.log('AI Response (via proxy):', text);

    // Clean the response text to extract JSON
    let jsonText = (typeof text === 'string' ? text : JSON.stringify(text)).trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '');
    }

    // Try to parse the JSON directly, then fall back to extraction + sanitization
    let questions: any;
    try {
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('Initial JSON.parse failed, attempting to sanitize and extract JSON array', parseError?.message || parseError);
      // Try to extract a JSON array from the text
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      let candidate = jsonMatch ? jsonMatch[0] : jsonText;

      // Remove unprintable control characters (except common whitespace)
      candidate = candidate.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

      // Escape backslashes that are not part of a valid JSON escape sequence
      // (turn "\x" into "\\x" so JSON.parse won't choke on invalid escapes)
      candidate = candidate.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');

      // Remove trailing commas before closing brackets/braces (common formatting issue)
      candidate = candidate.replace(/,\s*(?=[\]}])/g, '');

      try {
        questions = JSON.parse(candidate);
      } catch (secondError) {
        console.error('Failed to parse AI response after sanitization:', secondError, '\nCandidate was:\n', candidate);
        throw new Error('Could not extract valid JSON from AI response');
      }
    }

    if (!Array.isArray(questions)) {
      throw new Error('AI response is not an array of questions');
    }

    // Process and validate the questions
    const processedQuestions: AIGeneratedQuestion[] = questions.map((q: any, index: number) => {
      if (!q.question || !q.explanation) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }

      // Ensure options are present for MCQ questions
      if (request.type.includes('mcq') && (!q.options || !Array.isArray(q.options) || q.options.length !== 4)) {
        throw new Error(`Question ${index + 1} must have exactly 4 options for MCQ type`);
      }

      // Convert correctAnswer based on type
      let correctAnswer = q.correctAnswer;
      if (request.type === 'true-false') {
        correctAnswer = typeof q.correctAnswer === 'boolean' ? q.correctAnswer : q.correctAnswer === 1 || q.correctAnswer === 'true';
      } else if (request.type === 'numeric') {
        correctAnswer = parseFloat(q.correctAnswer.toString());
      }

      return {
        question: q.question,
        type: request.type,
        options: request.type.includes('mcq') ? q.options : undefined,
        correctAnswer,
        explanation: q.explanation,
        category: request.category,
        difficulty: request.difficulty,
        tags: Array.isArray(q.tags) ? q.tags : [request.topic.toLowerCase(), 'ai-generated']
      };
    });

    console.log('Successfully generated', processedQuestions.length, 'questions');
    return processedQuestions;

  } catch (error) {
    console.error('Error generating questions with AI:', error);
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isGeminiConfigured(): boolean {
  // Consider Gemini configured if either a local API key is present (not recommended for prod)
  // or if a server proxy URL is set (preferred). This prevents the UI from showing
  // a missing-key warning when using the server-side proxy.
  const proxyUrl = (import.meta.env as any).VITE_GEN_PROXY_URL || (import.meta.env as any).VITE_GEN_PROXY;
  return !!apiKey || !!proxyUrl;
}
