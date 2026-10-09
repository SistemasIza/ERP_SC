import { useEffect, useState } from 'react';

/**
 * A sleek, high-end progress bar that appears at the top of the viewport.
 * Used during route transitions to give a "fast" feel.
 */
export const TopProgressBar = () => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simulated initial progress
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 90) {
          clearInterval(timer);
          return 90;
        }
        const diff = Math.random() * 20;
        return Math.min(oldProgress + diff, 90);
      });
    }, 200);

    return () => {
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => setIsVisible(false), 300);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div 
        className="h-full bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 shadow-[0_0_10px_rgba(55,80,240,0.5)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
      
      {/* Glow effect at the tip */}
      <div 
        className="absolute top-0 right-0 h-full w-[100px] bg-white opacity-40 blur-[2px] transform -skew-x-[45deg]"
        style={{ left: `${progress}%`, display: progress === 100 ? 'none' : 'block' }}
      />
    </div>
  );
};
