import { motion } from "framer-motion";
import { ArrowRight, Brain, Zap, Target, Users, Trophy, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AdminCreator } from "@/components/AdminCreator";
// import heroImage from "@/assets/hero-brain.jpg";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analytics",
    description: "Advanced algorithms analyze your performance and provide personalized insights",
    gradient: "from-primary to-secondary"
  },
  {
    icon: Target,
    title: "Adaptive Testing",
    description: "Tests that adjust difficulty based on your performance for optimal learning",
    gradient: "from-secondary to-accent"
  },
  {
    icon: Trophy,
    title: "Gamified Learning",
    description: "Engaging mini-games and achievements to make learning fun and competitive",
    gradient: "from-accent to-primary"
  },
  {
    icon: Users,
    title: "Real-time Monitoring",
    description: "Track student progress and performance with live administrative dashboards",
    gradient: "from-primary to-accent"
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card border-b border-glass-border sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center primary-glow">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">Aptitude Test X</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="px-6 py-2 rounded-lg glass-card hover:glass-card-glow transition-all duration-300 text-foreground font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2 rounded-lg bg-gradient-primary hover:shadow-glow transition-all duration-300 text-primary-foreground font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <h1 className="text-5xl md:text-6xl font-bold gradient-text leading-tight">
                The Future of
                <br />
                Aptitude Testing
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Experience next-generation adaptive testing with AI-powered analytics, 
                real-time monitoring, and gamified learning experiences.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/signup"
                  className="group relative px-8 py-4 rounded-xl bg-gradient-primary hover:shadow-glow transition-all duration-300 text-primary-foreground font-semibold text-lg flex items-center justify-center"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Learning
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="group px-8 py-4 rounded-xl glass-card hover:glass-card-glow transition-all duration-300 text-foreground font-semibold text-lg flex items-center justify-center"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Sign In
                </Link>
              </div>
            </motion.div>

            {/* Right Column - Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden glass-card-glow">
                <div className="w-full h-96 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="w-24 h-24 mx-auto mb-4 text-primary animate-pulse" />
                    <h3 className="text-xl font-bold gradient-text">AI-Powered Testing</h3>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-primary/20 blur-xl animate-float"></div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-secondary/20 blur-xl animate-float" style={{ animationDelay: '-1s' }}></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold gradient-text mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need for modern aptitude testing
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <AnimatedCard key={feature.title} delay={0.2 + index * 0.1} glow>
                <div className="text-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center shadow-glow`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Temporary Admin Creator - Development Only */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl font-bold gradient-text mb-4">Development Tools</h2>
            <p className="text-muted-foreground">Create admin account for testing</p>
          </motion.div>

          <div className="max-w-md mx-auto">
            <AdminCreator />
          </div>
        </div>
      </section>
    </div>
  );
}
