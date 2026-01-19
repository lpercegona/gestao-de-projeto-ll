import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MarqueeTextProps {
  text: string;
  className?: string;
  pauseDuration?: number; // Duration to pause at start (in ms)
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className,
  pauseDuration = 3000,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(10);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      
      // Only animate if text is wider than container
      if (textWidth > containerWidth) {
        setShouldAnimate(true);
        // Calculate animation duration based on text length (approx 50px/sec)
        const baseDuration = Math.max(8, textWidth / 50);
        setAnimationDuration(baseDuration);
      } else {
        setShouldAnimate(false);
      }
    }
  }, [text]);

  if (!shouldAnimate) {
    return (
      <div ref={containerRef} className={cn("overflow-hidden whitespace-nowrap", className)}>
        <span ref={textRef} className="inline-block">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={cn("overflow-hidden whitespace-nowrap", className)}
    >
      <span
        ref={textRef}
        className="inline-block"
        style={{
          animation: `marquee-infinite ${animationDuration}s linear infinite`,
          paddingRight: '2rem',
        }}
      >
        {text}
        <span className="px-8">•</span>
        {text}
      </span>
      <style>{`
        @keyframes marquee-infinite {
          0%, ${(pauseDuration / (animationDuration * 1000)) * 100}% {
            transform: translateX(0);
          }
          ${100 - (pauseDuration / (animationDuration * 1000)) * 100}%, 100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};
