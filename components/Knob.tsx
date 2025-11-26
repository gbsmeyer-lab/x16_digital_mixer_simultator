
import React, { useState, useRef, useEffect } from 'react';
import { TOOLTIPS } from '../constants';

interface KnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label?: string;
  tooltipKey?: string;
  onChange: (val: number) => void;
  educationMode: boolean;
  color?: string;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  min,
  max,
  label,
  tooltipKey,
  onChange,
  educationMode,
  color = '#dfff00' // Default X32 accent
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startVal = useRef<number>(0);

  const handleStart = (clientY: number) => {
    setIsDragging(true);
    startY.current = clientY;
    startVal.current = value;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientY);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMove = (clientY: number) => {
      if (!isDragging) return;
      const deltaY = startY.current - clientY;
      const range = max - min;
      // Sensitivity: 200px drag = full range
      const deltaVal = (deltaY / 200) * range;
      let newVal = startVal.current + deltaVal;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    
    const handleTouchEnd = () => setIsDragging(false);
    const handleTouchMove = (e: TouchEvent) => {
        if(!isDragging) return;
        if(e.cancelable) e.preventDefault(); // Important for preventing scroll on iPad
        handleMove(e.touches[0].clientY);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, max, min, onChange]);

  // Calculations for SVG Ring
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // We define a 270-degree arc (0.75 of circle) for the knob track
  const arcLength = circumference * 0.75;
  const dashArray = `${arcLength} ${circumference}`; // Draw arc, then gap
  const dashOffset = arcLength - (percentage * arcLength); // Reveal arc based on value

  // Knob rotation logic (-135 to +135 degrees)
  const rotation = -135 + (percentage * 270);

  return (
    <div className="flex flex-col items-center gap-1 group relative select-none touch-none">
       {educationMode && tooltipKey && (
        <div className="absolute bottom-full mb-2 w-48 p-2 bg-yellow-100 text-black text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-sans">
          <strong>{label}:</strong> {TOOLTIPS[tooltipKey]}
        </div>
      )}
      
      <div 
        className="w-10 h-10 relative cursor-ns-resize touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
         {/* SVG Ring System - Handles both background track and colored value ring */}
         <svg className="w-full h-full absolute inset-0 pointer-events-none">
             {/* Background Track (Grey) */}
             <circle 
                cx="20" cy="20" r={radius} 
                fill="none" 
                stroke="#52525b" // zinc-600 matching panel borders
                strokeWidth="2.5"
                strokeDasharray={dashArray}
                strokeLinecap="round"
                // Rotate circle so the gap is at the bottom (start at 135deg)
                transform="rotate(135, 20, 20)"
                className="opacity-50"
             />
             
             {/* Value Ring (Colored) */}
             <circle 
                cx="20" cy="20" r={radius} 
                fill="none" 
                stroke={color} 
                strokeWidth="2.5"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(135, 20, 20)"
             />
         </svg>

        {/* Knob Cap (Inner) */}
        <div 
          className="absolute top-1/2 left-1/2 w-7 h-7 rounded-full bg-zinc-800 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] border border-zinc-900"
          style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
        >
          {/* Indicator Line */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/90 rounded-full shadow-[0_0_2px_rgba(255,255,255,0.5)]"></div>
        </div>
      </div>
      
      <div className="flex flex-col items-center -mt-1">
        {label && <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider leading-none mb-0.5">{label}</span>}
        <span className="text-[8px] text-zinc-500 font-mono leading-none">{value.toFixed(1)}</span>
      </div>
    </div>
  );
};
