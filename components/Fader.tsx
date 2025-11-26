import React, { useState, useRef, useEffect } from 'react';
import { TOOLTIPS } from '../constants';

interface FaderProps {
  level: number;
  onChange: (val: number) => void;
  educationMode: boolean;
  label?: string;
}

export const Fader: React.FC<FaderProps> = ({ level, onChange, educationMode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Level is 0 to 1
  // DB conversion for display: Logarithmic-ish approximation
  const toDB = (val: number) => {
    if (val < 0.01) return '-oo';
    const db = 20 * Math.log10(val * 4); // Scale to emulate +10 top
    return db > 10 ? '+10' : db.toFixed(1);
  };

  const updateFromPosition = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    // Invert Y because fader goes up
    const relativeY = rect.bottom - clientY; 
    let newVal = relativeY / rect.height;
    newVal = Math.max(0, Math.min(1, newVal));
    onChange(newVal);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateFromPosition(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateFromPosition(e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updateFromPosition(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        if(e.cancelable) e.preventDefault(); // Stop scroll
        updateFromPosition(e.touches[0].clientY);
    }

    const handleEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return (
    <div className="h-64 w-12 flex flex-col items-center relative group">
       {educationMode && (
        <div className="absolute bottom-full mb-2 w-48 p-2 bg-yellow-100 text-black text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {TOOLTIPS['fader']}
        </div>
      )}

      {/* Fader Track */}
      <div 
        ref={trackRef}
        className="w-2 h-full bg-black rounded-full relative cursor-pointer border border-zinc-700 touch-none"
        onMouseDown={(e) => {
            // Click to jump logic
            updateFromPosition(e.clientY);
            setIsDragging(true);
        }}
        onTouchStart={(e) => {
            updateFromPosition(e.touches[0].clientY);
            setIsDragging(true);
        }}
      >
        {/* DB Markings */}
        <div className="absolute right-4 top-0 text-[8px] text-zinc-500">+10</div>
        <div className="absolute right-4 top-[20%] text-[8px] text-zinc-500">0</div>
        <div className="absolute right-4 top-[40%] text-[8px] text-zinc-500">-5</div>
        <div className="absolute right-4 top-[60%] text-[8px] text-zinc-500">-10</div>
        <div className="absolute right-4 top-[80%] text-[8px] text-zinc-500">-20</div>
        <div className="absolute right-4 bottom-0 text-[8px] text-zinc-500">-oo</div>

        {/* Fader Handle */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-8 h-12 bg-zinc-300 rounded shadow-lg border-b-4 border-zinc-500 flex items-center justify-center"
          style={{ bottom: `calc(${level * 100}% - 24px)` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
            <div className="w-full h-[1px] bg-black opacity-50"></div>
        </div>
      </div>
      
      <div className="mt-2 font-mono text-[9px] text-zinc-400 bg-black px-1 rounded border border-zinc-800 w-full text-center">
        {toDB(level)}
      </div>
    </div>
  );
};