import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, 
  Brain, 
  Target, 
  Zap, 
  Trophy, 
  Clock, 
  Play, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Star,
  Timer,
  ArrowLeft,
  Volume2,
  VolumeX,
  Pause,
  Home,
  Award,
  TrendingUp
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Game {
  id: string;
  title: string;
  description: string;
  category: 'memory' | 'logic' | 'math' | 'pattern' | 'speed';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  icon: any;
  gradient: string;
  bestScore?: number;
  timesPlayed?: number;
}

interface GameState {
  currentGame: Game | null;
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  timeLeft: number;
  level: number;
  gameData: any;
}

interface GameSession {
  id?: string;
  userId: string;
  gameId: string;
  score: number;
  duration: number;
  completedAt: Date;
  level: number;
}

interface GameStats {
  totalGamesPlayed: number;
  bestScore: number;
  averageScore: number;
  skillLevel: string;
  gamesData: { [gameId: string]: { bestScore: number; timesPlayed: number; averageScore: number } };
}

const games: Game[] = [
  {
    id: 'number-sequence',
    title: 'Number Sequence',
    description: 'Find the pattern and complete the sequence',
    category: 'logic',
    difficulty: 'Medium',
    icon: Target,
    gradient: 'from-primary to-secondary'
  },
  {
    id: 'memory-cards',
    title: 'Memory Cards',
    description: 'Match pairs of cards to test your memory',
    category: 'memory',
    difficulty: 'Easy',
    icon: Brain,
    gradient: 'from-secondary to-accent'
  },
  {
    id: 'quick-math',
    title: 'Quick Math',
    description: 'Solve arithmetic problems as fast as you can',
    category: 'math',
    difficulty: 'Medium',
    icon: Zap,
    gradient: 'from-accent to-primary'
  },
  {
    id: 'pattern-match',
    title: 'Pattern Matching',
    description: 'Identify and complete visual patterns',
    category: 'pattern',
    difficulty: 'Hard',
    icon: Trophy,
    gradient: 'from-primary to-accent'
  },
  {
    id: 'reaction-time',
    title: 'Reaction Time',
    description: 'Test your reflexes and response speed',
    category: 'speed',
    difficulty: 'Easy',
    icon: Timer,
    gradient: 'from-secondary to-primary'
  },
  {
    id: 'word-builder',
    title: 'Word Builder',
    description: 'Create words from given letters',
    category: 'logic',
    difficulty: 'Medium',
    icon: Star,
    gradient: 'from-accent to-secondary'
  }
];

const categoryColors = {
  memory: 'bg-blue-500/20 text-blue-500',
  logic: 'bg-purple-500/20 text-purple-500',
  math: 'bg-green-500/20 text-green-500',
  pattern: 'bg-orange-500/20 text-orange-500',
  speed: 'bg-red-500/20 text-red-500'
};

const difficultyColors = {
  Easy: "bg-success/20 text-success",
  Medium: "bg-warning/20 text-warning",
  Hard: "bg-danger/20 text-danger"
};

export default function MiniGames() {
  const { toast } = useToast();
  const { userData } = useAuth();
  const mounted = useRef(true);
  
  const [gameState, setGameState] = useState<GameState>({
    currentGame: null,
    isPlaying: false,
    isPaused: false,
    score: 0,
    timeLeft: 60,
    level: 1,
    gameData: null
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalGamesPlayed: 0,
    bestScore: 0,
    averageScore: 0,
    skillLevel: 'Beginner',
    gamesData: {}
  });

  // Game Logic States
  const [mathProblem, setMathProblem] = useState<{
    question: string;
    answer: number;
    options: number[];
  } | null>(null);

  const [memoryCards, setMemoryCards] = useState<{
    cards: Array<{ id: number; value: string; isFlipped: boolean; isMatched: boolean }>;
    flippedCards: number[];
  }>({ cards: [], flippedCards: [] });

  const [numberSequence, setNumberSequence] = useState<{
    sequence: number[];
    missingIndex: number;
    options: number[];
  } | null>(null);

  useEffect(() => {
    if (userData) {
      fetchGameStats();
    }
    return () => {
      mounted.current = false;
    };
  }, [userData]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState.isPlaying && !gameState.isPaused && gameState.timeLeft > 0) {
      timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.isPlaying) {
      endGame();
    }
    return () => clearTimeout(timer);
  }, [gameState.isPlaying, gameState.isPaused, gameState.timeLeft]);

  const fetchGameStats = async () => {
    if (!userData || !mounted.current) return;

    try {
      setLoading(true);

      // Fetch user's game sessions
      const sessionsQuery = query(
        collection(db, 'gameSessions'),
        where('userId', '==', userData.uid),
        orderBy('completedAt', 'desc')
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      if (!mounted.current) return;

      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate()
      })) as GameSession[];

      // Calculate statistics
      const totalGamesPlayed = sessions.length;
      const bestScore = sessions.length > 0 ? Math.max(...sessions.map(s => s.score)) : 0;
      const averageScore = sessions.length > 0 
        ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
        : 0;

      // Calculate skill level based on average score and games played
      let skillLevel = 'Beginner';
      if (totalGamesPlayed >= 50 && averageScore >= 80) {
        skillLevel = 'Expert';
      } else if (totalGamesPlayed >= 20 && averageScore >= 60) {
        skillLevel = 'Advanced';
      } else if (totalGamesPlayed >= 10 && averageScore >= 40) {
        skillLevel = 'Intermediate';
      }

      // Calculate per-game statistics
      const gamesData: { [gameId: string]: { bestScore: number; timesPlayed: number; averageScore: number } } = {};
      
      games.forEach(game => {
        const gameSessions = sessions.filter(s => s.gameId === game.id);
        gamesData[game.id] = {
          bestScore: gameSessions.length > 0 ? Math.max(...gameSessions.map(s => s.score)) : 0,
          timesPlayed: gameSessions.length,
          averageScore: gameSessions.length > 0 
            ? Math.round(gameSessions.reduce((sum, s) => sum + s.score, 0) / gameSessions.length)
            : 0
        };
      });

      if (mounted.current) {
        setGameStats({
          totalGamesPlayed,
          bestScore,
          averageScore,
          skillLevel,
          gamesData
        });
      }
    } catch (error) {
      console.error('Error fetching game stats:', error);
      if (mounted.current) {
        toast({
          title: "Error",
          description: "Failed to load game statistics",
          variant: "destructive"
        });
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const saveGameSession = async (game: Game, score: number, duration: number, level: number) => {
    if (!userData) return;

    try {
      const session: Omit<GameSession, 'id'> = {
        userId: userData.uid,
        gameId: game.id,
        score,
        duration,
        level,
        completedAt: new Date()
      };

      await addDoc(collection(db, 'gameSessions'), session);
      
      // Refresh stats after saving
      fetchGameStats();
    } catch (error) {
      console.error('Error saving game session:', error);
    }
  };

  const startGame = (game: Game) => {
    setGameState({
      currentGame: game,
      isPlaying: true,
      isPaused: false,
      score: 0,
      timeLeft: 60,
      level: 1,
      gameData: null
    });

    // Initialize specific game data
    switch (game.id) {
      case 'quick-math':
        generateMathProblem();
        break;
      case 'memory-cards':
        initializeMemoryGame();
        break;
      case 'number-sequence':
        generateNumberSequence();
        break;
      default:
        break;
    }
  };

  const endGame = async () => {
    if (gameState.currentGame && userData) {
      const duration = 60 - gameState.timeLeft; // Calculate actual duration
      await saveGameSession(gameState.currentGame, gameState.score, duration, gameState.level);
      
      toast({
        title: "Game Complete!",
        description: `Final Score: ${gameState.score} points`,
      });
    }
    setGameState(prev => ({ ...prev, isPlaying: false }));
  };

  const pauseGame = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const quitGame = () => {
    setGameState({
      currentGame: null,
      isPlaying: false,
      isPaused: false,
      score: 0,
      timeLeft: 60,
      level: 1,
      gameData: null
    });
  };

  // Quick Math Game Functions
  const generateMathProblem = () => {
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let num1, num2, answer;

    switch (operator) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 25;
        num2 = Math.floor(Math.random() * 25) + 1;
        answer = num1 - num2;
        break;
      case '*':
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = num1 * num2;
        break;
      default:
        num1 = 1; num2 = 1; answer = 2;
    }

    const options = [answer];
    while (options.length < 4) {
      const wrong = answer + Math.floor(Math.random() * 20) - 10;
      if (wrong !== answer && !options.includes(wrong) && wrong > 0) {
        options.push(wrong);
      }
    }

    setMathProblem({
      question: `${num1} ${operator} ${num2} = ?`,
      answer,
      options: options.sort(() => Math.random() - 0.5)
    });
  };

  const handleMathAnswer = (selectedAnswer: number) => {
    if (mathProblem && selectedAnswer === mathProblem.answer) {
      setGameState(prev => ({ ...prev, score: prev.score + 10 }));
      generateMathProblem();
    } else {
      setGameState(prev => ({ ...prev, score: Math.max(0, prev.score - 5) }));
      generateMathProblem();
    }
  };

  // Memory Game Functions
  const initializeMemoryGame = () => {
    const symbols = ['🎯', '🎮', '🧠', '⚡', '🏆', '🎲', '🎪', '🎨'];
    const gameCards = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        value: symbol,
        isFlipped: false,
        isMatched: false
      }));

    setMemoryCards({ cards: gameCards, flippedCards: [] });
  };

  const handleCardClick = (cardId: number) => {
    if (memoryCards.flippedCards.length >= 2) return;
    if (memoryCards.cards[cardId].isFlipped || memoryCards.cards[cardId].isMatched) return;

    const newCards = [...memoryCards.cards];
    newCards[cardId].isFlipped = true;
    const newFlippedCards = [...memoryCards.flippedCards, cardId];

    if (newFlippedCards.length === 2) {
      const [first, second] = newFlippedCards;
      if (newCards[first].value === newCards[second].value) {
        newCards[first].isMatched = true;
        newCards[second].isMatched = true;
        setGameState(prev => ({ ...prev, score: prev.score + 20 }));
        setMemoryCards({ cards: newCards, flippedCards: [] });
      } else {
        setMemoryCards({ cards: newCards, flippedCards: newFlippedCards });
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setMemoryCards({ cards: resetCards, flippedCards: [] });
        }, 1000);
      }
    } else {
      setMemoryCards({ cards: newCards, flippedCards: newFlippedCards });
    }
  };

  // Number Sequence Game Functions
  const generateNumberSequence = () => {
    const patterns = [
      // Arithmetic sequence
      () => {
        const start = Math.floor(Math.random() * 10) + 1;
        const diff = Math.floor(Math.random() * 5) + 1;
        return Array.from({ length: 5 }, (_, i) => start + i * diff);
      },
      // Geometric sequence
      () => {
        const start = Math.floor(Math.random() * 3) + 1;
        const ratio = 2;
        return Array.from({ length: 5 }, (_, i) => start * Math.pow(ratio, i));
      },
      // Fibonacci-like
      () => {
        const seq = [1, 1];
        for (let i = 2; i < 5; i++) {
          seq[i] = seq[i-1] + seq[i-2];
        }
        return seq;
      }
    ];

    const pattern = patterns[Math.floor(Math.random() * patterns.length)]();
    const missingIndex = Math.floor(Math.random() * pattern.length);
    const correctAnswer = pattern[missingIndex];
    
    const options = [correctAnswer];
    while (options.length < 4) {
      const wrong = correctAnswer + Math.floor(Math.random() * 20) - 10;
      if (wrong !== correctAnswer && !options.includes(wrong) && wrong > 0) {
        options.push(wrong);
      }
    }

    setNumberSequence({
      sequence: pattern,
      missingIndex,
      options: options.sort(() => Math.random() - 0.5)
    });
  };

  const handleSequenceAnswer = (selectedAnswer: number) => {
    if (numberSequence && selectedAnswer === numberSequence.sequence[numberSequence.missingIndex]) {
      setGameState(prev => ({ ...prev, score: prev.score + 15 }));
      generateNumberSequence();
    } else {
      setGameState(prev => ({ ...prev, score: Math.max(0, prev.score - 8) }));
      generateNumberSequence();
    }
  };

  // Render game content based on current game
  const renderGameContent = () => {
    if (!gameState.currentGame) return null;

    switch (gameState.currentGame.id) {
      case 'quick-math':
        return (
          <div className="text-center space-y-6">
            {mathProblem && (
              <>
                <div className="text-4xl font-bold text-foreground mb-8">
                  {mathProblem.question}
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  {mathProblem.options.map((option, index) => (
                    <Button
                      key={index}
                      onClick={() => handleMathAnswer(option)}
                      className="h-16 text-xl bg-gradient-primary hover:shadow-glow"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'memory-cards':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {memoryCards.cards.map((card) => (
                <motion.button
                  key={card.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleCardClick(card.id)}
                  className={`aspect-square rounded-lg text-2xl font-bold transition-all duration-300 ${
                    card.isFlipped || card.isMatched
                      ? 'bg-gradient-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {card.isFlipped || card.isMatched ? card.value : '?'}
                </motion.button>
              ))}
            </div>
          </div>
        );

      case 'number-sequence':
        return (
          <div className="text-center space-y-6">
            {numberSequence && (
              <>
                <div className="text-lg text-muted-foreground mb-4">
                  Complete the sequence:
                </div>
                <div className="flex justify-center items-center space-x-4 mb-8">
                  {numberSequence.sequence.map((num, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-xl font-bold ${
                        index === numberSequence.missingIndex
                          ? 'bg-warning/20 border-2 border-warning text-warning'
                          : 'bg-gradient-primary text-white'
                      }`}>
                        {index === numberSequence.missingIndex ? '?' : num}
                      </div>
                      {index < numberSequence.sequence.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  {numberSequence.options.map((option, index) => (
                    <Button
                      key={index}
                      onClick={() => handleSequenceAnswer(option)}
                      className="h-16 text-xl bg-gradient-secondary hover:shadow-glow"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Game Coming Soon!</h3>
            <p className="text-muted-foreground">This game is under development.</p>
          </div>
        );
    }
  };

  if (gameState.isPlaying) {
    return (
      <div className="min-h-screen bg-background p-6">
        {/* Game Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={quitGame}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quit
            </Button>
            <h1 className="text-2xl font-bold gradient-text">
              {gameState.currentGame?.title}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={pauseGame}>
              <Pause className="w-4 h-4 mr-2" />
              {gameState.isPaused ? 'Resume' : 'Pause'}
            </Button>
          </div>
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 rounded-lg bg-background-secondary">
            <div className="text-2xl font-bold text-primary">{gameState.score}</div>
            <div className="text-sm text-muted-foreground">Score</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-background-secondary">
            <div className="text-2xl font-bold text-secondary">{gameState.timeLeft}s</div>
            <div className="text-sm text-muted-foreground">Time Left</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-background-secondary">
            <div className="text-2xl font-bold text-accent">{gameState.level}</div>
            <div className="text-sm text-muted-foreground">Level</div>
          </div>
        </div>

        {/* Game Content */}
        <AnimatedCard className="min-h-96">
          {gameState.isPaused ? (
            <div className="text-center py-20">
              <Pause className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Game Paused</h3>
              <p className="text-muted-foreground mb-4">Click Resume to continue playing</p>
              <Button onClick={pauseGame} className="bg-gradient-primary">
                Resume Game
              </Button>
            </div>
          ) : (
            renderGameContent()
          )}
        </AnimatedCard>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-8"
      >
        <h1 className="text-4xl font-bold gradient-text mb-4">Brain Training Games</h1>
        <p className="text-muted-foreground text-lg">Sharpen your cognitive skills with fun mini-games</p>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Games Played", value: gameStats.totalGamesPlayed.toString(), change: "Total sessions", icon: Gamepad2, gradient: "from-primary to-secondary" },
          { title: "Best Score", value: gameStats.bestScore.toString(), change: "Highest achievement", icon: Trophy, gradient: "from-secondary to-accent" },
          { title: "Avg Performance", value: gameStats.averageScore > 0 ? `${gameStats.averageScore}%` : "0%", change: "Across all games", icon: TrendingUp, gradient: "from-accent to-primary" },
          { title: "Skill Level", value: gameStats.skillLevel, change: "Keep practicing!", icon: Award, gradient: "from-primary to-accent" }
        ].map((stat, index) => (
          <AnimatedCard key={stat.title} delay={index * 0.1} glow>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">{stat.title}</p>
                <h3 className="text-3xl font-bold text-foreground mb-1">{stat.value}</h3>
                <p className="text-xs text-success font-medium">{stat.change}</p>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center shadow-glow`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your game statistics...</p>
        </div>
      )}

      {/* Games Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => {
            const gameData = gameStats.gamesData[game.id] || { bestScore: 0, timesPlayed: 0, averageScore: 0 };
            
            return (
              <AnimatedCard key={game.id} delay={0.5 + index * 0.1} glow>
                <div className="relative overflow-hidden">
                  <div className={`h-32 bg-gradient-to-r ${game.gradient} flex items-center justify-center mb-4 rounded-lg`}>
                    <game.icon className="w-12 h-12 text-white" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-foreground">{game.title}</h3>
                      <div className="flex space-x-2">
                        <Badge className={categoryColors[game.category]} variant="secondary">
                          {game.category}
                        </Badge>
                        <Badge className={difficultyColors[game.difficulty]}>
                          {game.difficulty}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm">{game.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Trophy className="w-4 h-4" />
                          <span>Best: {gameData.bestScore}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Play className="w-4 h-4" />
                          <span>Played: {gameData.timesPlayed}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => startGame(game)}
                      className={`w-full bg-gradient-to-r ${game.gradient} hover:shadow-glow`}
                      disabled={!userData}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play Game
                    </Button>
                  </div>
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      )}

      {/* Game Categories */}
      {!loading && (
        <AnimatedCard delay={0.8}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <Brain className="w-6 h-6 mr-2 text-primary" />
            Game Categories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(categoryColors).map(([category, colorClass]) => {
              const categoryGames = games.filter(game => game.category === category);
              const totalPlayed = categoryGames.reduce((sum, game) => {
                const gameData = gameStats.gamesData[game.id];
                return sum + (gameData?.timesPlayed || 0);
              }, 0);
              
              return (
                <div key={category} className="text-center p-4 rounded-lg bg-background-secondary border border-glass-border">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${colorClass} mb-2`}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </div>
                  <div className="text-2xl font-bold text-foreground">{categoryGames.length}</div>
                  <div className="text-xs text-muted-foreground">games</div>
                  <div className="text-xs text-muted-foreground mt-1">{totalPlayed} plays</div>
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      )}

      {!userData && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please log in to track your game progress and compete with others!</p>
        </div>
      )}
    </div>
  );
}
