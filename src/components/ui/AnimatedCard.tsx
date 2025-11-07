import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  glow?: boolean;
  hover?: boolean;
}

export function AnimatedCard({ 
  children, 
  className, 
  delay = 0, 
  glow = false,
  hover = true 
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay, 
        duration: 0.4, 
        ease: "easeOut" 
      }}
      whileHover={hover ? { 
        y: -4, 
        scale: 1.02,
        transition: { duration: 0.2 }
      } : undefined}
      className={cn(
        "glass-card rounded-xl p-6 transition-all duration-300",
        glow && "glass-card-glow",
        hover && "hover-lift cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}