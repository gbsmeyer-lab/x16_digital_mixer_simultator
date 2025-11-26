
import React from 'react';

interface MainMeterProps {
  level: number; // Linear level, 1.0 = 0dBFS
}

export const MainMeter: React.FC<MainMeterProps> = ({ level }) => {
  // Convert linear level to dBFS
  // Range: -60dB to 0dB
  const db = level < 0.001 ? -999 : 20 * Math.log10(level);
  
  // Calculate percentage height for the meter bar
  // min -60, max 0
  const minDb = -60;
  const maxDb = 0;
  
  let percent = ((db - minDb) / (maxDb - minDb)) * 100;
  percent = Math.max(0, Math.min(100, percent));

  const ticks = [0, -5, -10, -20, -30, -40, -60];

  return (
    <div className="w-16 bg-zinc-800 border-x border-zinc-900 p-2 flex flex-col items-center justify-between shrink-0 shadow-inner z-20">
      <div className="text-[9px] font-black text-zinc-500 mb-1 tracking-wider text-center">LEVEL</div>
      
      <div className="flex-1 w-full flex gap-1 relative py-1">
         {/* Scale Labels */}
         <div className="flex flex-col justify-between h-full py-[2px] text-[8px] text-zinc-500 font-mono text-right w-5">
             {ticks.map(t => (
                 <span key={t} className="leading-none">{t}</span>
             ))}
         </div>

         {/* Meter Container */}
         <div className="flex-1 h-full bg-black rounded-sm border border-zinc-700 relative overflow-hidden">
             {/* Background Grid/Segments */}
             <div className="absolute inset-0 z-10 w-full h-full flex flex-col justify-between pointer-events-none opacity-20">
                 {Array.from({ length: 30 }).map((_, i) => (
                     <div key={i} className="w-full h-[1px] bg-black"></div>
                 ))}
             </div>

             {/* Clip Indicator */}
             <div 
                className={`absolute top-0 w-full h-2 z-20 transition-colors duration-100 ${db >= 0 ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-red-900/20'}`}
             ></div>

             {/* The Meter Bar */}
             <div className="absolute bottom-0 w-full flex flex-col justify-end h-full">
                 <div 
                    className="w-full transition-all duration-75 ease-out"
                    style={{ 
                        height: `${percent}%`,
                        background: 'linear-gradient(to top, #33ff33 0%, #33ff33 60%, #ffff33 75%, #ff3333 90%, #ff0000 100%)'
                    }}
                 >
                 </div>
             </div>
         </div>
      </div>
      
      <div className="text-[8px] text-zinc-600 font-bold mt-1">dBFS</div>
    </div>
  );
};
