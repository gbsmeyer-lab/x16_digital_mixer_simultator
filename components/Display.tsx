


import React from 'react';
import { Channel, ViewSection } from '../types';
import { Home, Link as LinkIcon } from 'lucide-react';

interface DisplayProps {
  channel: Channel;
  view: ViewSection;
  onViewChange?: (view: ViewSection) => void;
  onLinkToggle?: (id: number) => void;
}

export const Display: React.FC<DisplayProps> = ({ channel, view, onViewChange, onLinkToggle }) => {
  // Simple Visualization helpers
  
  // EQ Curve Generator
  const renderEQPath = () => {
    // This is a simplified mockup of an EQ curve
    // In a real app, this would use the Biquad filter formulas
    const width = 400;
    const height = 200;
    const points: [number, number][] = [];
    
    for (let x = 0; x <= width; x += 5) {
      let y = height / 2; // Flat line (0dB)
      
      // Normalize X to Frequency (Log scale roughly)
      const freq = 20 * Math.pow(1000, x / width);
      
      if (channel.eq.on) {
          channel.eq.bands.forEach(band => {
             // Simple Gaussian bell curve approximation for visualization
             const bw = band.freq / band.q;
             const diff = Math.abs(freq - band.freq);
             if (diff < bw * 2) {
                 const factor = Math.exp(-(diff * diff) / (2 * (bw/2) * (bw/2)));
                 y -= band.gain * 3 * factor; // Scale gain for visual height
             }
          });
      }

      // Visualize Low Cut (HPF at 80Hz)
      if (channel.lowCut) {
        if (freq < 80) {
            // Approx 12dB/octave roll-off
            // at 40hz -> -12dB
            // at 20hz -> -24dB
            // Gain reduction = 12 * log2(80/freq)
            const reduction = 12 * Math.log2(80 / freq);
            // Add reduction to Y (positive Y is down)
            // Scale factor 3 used above for gain.
            y += reduction * 3;
        }
      }
      
      points.push([x, Math.max(10, Math.min(height-10, y))]);
    }
    
    const d = points.reduce((acc, point, i) => 
      acc + (i === 0 ? `M ${point[0]} ${point[1]}` : ` L ${point[0]} ${point[1]}`), 
    "");
    
    return <path d={d} fill="none" stroke="#dfff00" strokeWidth="2" />;
  };

  const renderContent = () => {
    switch(view) {
      case ViewSection.GATE:
        return (
            <div className="flex flex-col h-full relative">
                <div className="absolute top-2 left-2 text-x32-accent font-bold">NOISE GATE</div>
                {/* Visual Gate Graph mockup */}
                <svg className="w-full h-full bg-zinc-900 border border-zinc-700 mt-2" viewBox="0 0 400 200">
                    <line x1="0" y1="200" x2="400" y2="0" stroke="#333" strokeDasharray="4"/>
                    {/* Threshold Line */}
                    <line x1="0" y1={200 - (channel.gate.threshold + 80)*2} x2="400" y2={200 - (channel.gate.threshold + 80)*2} stroke="orange" strokeWidth="2" />
                    <text x="10" y={200 - (channel.gate.threshold + 80)*2 - 5} fill="orange" fontSize="12">Threshold: {channel.gate.threshold}dB</text>
                    
                    {/* Gate State Visual */}
                    <circle cx="350" cy="50" r="10" fill={channel.gate.on ? "#33ff33" : "#333"} />
                    <text x="370" y="55" fill="white" fontSize="12">ACTIVE</text>
                </svg>
            </div>
        )
      case ViewSection.DYNAMICS:
         return (
            <div className="flex flex-col h-full relative">
                <div className="absolute top-2 left-2 text-x32-accent font-bold">COMPRESSOR</div>
                <svg className="w-full h-full bg-zinc-900 border border-zinc-700 mt-2" viewBox="0 0 400 200">
                    {/* 45 degree line (unity) */}
                    <line x1="0" y1="200" x2="200" y2="0" stroke="#333" strokeDasharray="4"/>
                    
                    {/* Compression Curve */}
                    {/* Knee at threshold */}
                    {/* Map -60db to 0db to X: 0-200 */}
                    {/* If thresh is -20, knee is at approx x=133 */}
                    {(()=>{
                        const zeroDBX = 200;
                        const range = 60; // display range 60db
                        const threshX = ((60 + channel.comp.threshold) / 60) * 200; 
                        const threshY = 200 - threshX;
                        
                        // Point 2 (reduction)
                        // If ratio is 4:1, and input is +10db above thresh
                        // output is +2.5db above thresh
                        const endInputX = 400; // way above
                        const inputDelta = endInputX - threshX;
                        const outputDelta = inputDelta / channel.comp.ratio;
                        const endOutputY = threshY - outputDelta;

                        return (
                            <polyline 
                                points={`0,200 ${threshX},${threshY} ${400},${endOutputY}`} 
                                fill="none" 
                                stroke={channel.comp.on ? "#dfff00" : "#555"} 
                                strokeWidth="3"
                            />
                        )
                    })()}
                </svg>
            </div>
         )
      case ViewSection.SENDS:
        return (
            <div className="flex flex-col h-full relative">
                 <div className="absolute top-2 left-2 text-x32-accent font-bold">BUS SENDS</div>
                 <div className="flex flex-col gap-4 mt-2 h-full pb-4">
                    {/* Row 1: 1-8 */}
                    <div className="flex-1 flex gap-2">
                         {channel.sends.slice(0, 8).map((val, i) => (
                             <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                 <div className="flex-1 w-full bg-zinc-900 border border-zinc-700 relative flex flex-col justify-end p-0.5">
                                      <div 
                                        className="w-full bg-cyan-400 transition-all duration-75"
                                        style={{ height: `${val * 100}%` }}
                                      />
                                 </div>
                                 <span className="text-[10px] text-zinc-500 font-mono">{i+1}</span>
                             </div>
                         ))}
                    </div>
                    {/* Row 2: 9-16 */}
                    <div className="flex-1 flex gap-2">
                         {channel.sends.slice(8, 16).map((val, i) => (
                             <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                 <div className="flex-1 w-full bg-zinc-900 border border-zinc-700 relative flex flex-col justify-end p-0.5">
                                      <div 
                                        className="w-full bg-cyan-400 transition-all duration-75"
                                        style={{ height: `${val * 100}%` }}
                                      />
                                 </div>
                                 <span className="text-[10px] text-zinc-500 font-mono">{i+9}</span>
                             </div>
                         ))}
                    </div>
                 </div>
            </div>
        )
      case ViewSection.EQ:
          return (
            <div className="flex flex-col h-full relative">
                <div className="absolute top-2 left-2 text-x32-accent font-bold">EQUALIZER</div>
                <div className="absolute top-2 right-24 text-xs text-zinc-400">{channel.eq.on ? 'EQ ON' : 'EQ BYPASSED'}</div>
                <svg className="w-full h-full bg-zinc-900 border border-zinc-700 mt-2" viewBox="0 0 400 200">
                {/* Grid */}
                <line x1="100" y1="0" x2="100" y2="200" stroke="#333" />
                <line x1="200" y1="0" x2="200" y2="200" stroke="#333" />
                <line x1="300" y1="0" x2="300" y2="200" stroke="#333" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="#444" />
                
                {renderEQPath()}
                
                {/* Handles */}
                {channel.eq.on && channel.eq.bands.map((band, idx) => {
                    // Calculate X pos based on log freq
                    // 20hz = 0, 20khz = 400
                    const x = (Math.log10(band.freq / 20) / Math.log10(1000)) * 400;
                    // Y pos based on gain (-15 to +15)
                    const y = 100 - (band.gain * (100/15));
                    return (
                        <g key={band.id}>
                            <circle cx={x} cy={y} r="6" fill="rgba(255,255,255,0.2)" stroke={COLORS[idx]} strokeWidth="2" />
                            <text x={x+8} y={y} fill="white" fontSize="10">{band.id.toUpperCase()}</text>
                        </g>
                    )
                })}
                </svg>
            </div>
          );
      case ViewSection.HOME:
      case ViewSection.CONFIG:
      default:
        return (
          <div className="flex flex-col gap-2 items-center justify-center h-full">
            <h2 className="text-2xl font-bold text-x32-accent">PREAMP CONFIG</h2>
            <div className="grid grid-cols-2 gap-4 text-center w-full max-w-lg">
               <div className="bg-zinc-800 p-4 rounded border border-zinc-600">
                  <div className="text-3xl font-mono mb-2">{channel.gain.toFixed(1)} dB</div>
                  <div className="text-zinc-400">Headamp Gain</div>
               </div>
               <div className="flex flex-col gap-4">
                  <div className="flex gap-2 justify-center">
                    <div className={`p-2 border rounded flex-1 ${channel.phantom48v ? 'bg-red-900 border-red-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                        +48V
                    </div>
                    <div className={`p-2 border rounded flex-1 ${channel.polarity ? 'bg-white text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                        Ø POLARITY
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <div className={`p-2 border rounded flex-1 ${channel.lowCut ? 'bg-x32-accent text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                         LOW CUT 80Hz
                     </div>
                     {/* Channel Linking Button (Only for Odd Channels) */}
                     {channel.id % 2 !== 0 && onLinkToggle && (
                         <button 
                             onClick={() => onLinkToggle(channel.id)}
                             className={`p-2 border rounded flex-1 flex items-center justify-center gap-2 ${channel.linked ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}
                         >
                             <LinkIcon size={14} />
                             <span className="text-[10px] font-bold">LINK {channel.linked ? 'ON' : 'OFF'}</span>
                         </button>
                     )}
                     {/* Placeholder if even to keep alignment? Or just omit. Flex handles it. */}
                  </div>
               </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full bg-black p-4 rounded-lg shadow-inner border-4 border-zinc-500 relative overflow-hidden">
      {/* Screen Glare */}
      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none"></div>
      
      {/* Content */}
      <div className="w-full h-full z-10 relative">
          {renderContent()}
      </div>
      
      {/* Active Channel Indicator on Screen */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {channel.linked && (
            <div className="bg-indigo-600 text-white px-2 py-1 font-bold rounded text-sm flex items-center gap-1">
                <LinkIcon size={12} /> LINK
            </div>
        )}
        <div className="bg-x32-accent text-black px-2 py-1 font-bold rounded text-sm">
            {channel.label}
        </div>
      </div>
    </div>
  );
};

const COLORS = ['#ff3333', '#33ff33', '#3333ff', '#ffff33'];