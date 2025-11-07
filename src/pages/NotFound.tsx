import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, AlertTriangle, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card-glow rounded-2xl p-12"
        >
          {/* Error Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center shadow-glow"
          >
            <AlertTriangle className="w-12 h-12 text-white" />
          </motion.div>

          {/* 404 Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-8xl font-bold gradient-text mb-4"
          >
            404
          </motion.h1>

          {/* Error Message */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl font-bold text-foreground mb-4"
          >
            Page Not Found
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-muted-foreground text-lg mb-8"
          >
            The page you're looking for doesn't exist in our futuristic testing platform.
            Let's get you back on the right path.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Link
              to="/"
              className="group px-6 py-3 rounded-xl glass-card hover:glass-card-glow transition-all duration-300 text-foreground font-medium flex items-center justify-center"
            >
              <Home className="w-5 h-5 mr-2" />
              Home
            </Link>
            
            <Link
              to="/student"
              className="group px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all duration-300 text-primary-foreground font-medium flex items-center justify-center"
            >
              <Zap className="w-5 h-5 mr-2" />
              Student Portal
            </Link>
            
            <Link
              to="/admin"
              className="group px-6 py-3 rounded-xl bg-gradient-to-r from-secondary to-accent hover:shadow-glow transition-all duration-300 text-secondary-foreground font-medium flex items-center justify-center"
            >
              <Zap className="w-5 h-5 mr-2" />
              Admin Portal
            </Link>
          </motion.div>

          {/* Floating Elements */}
          <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-primary/10 blur-xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-20 h-20 rounded-full bg-secondary/10 blur-xl animate-float" style={{ animationDelay: '-1s' }}></div>
        </motion.div>
      </div>
    </div>
  );
}
