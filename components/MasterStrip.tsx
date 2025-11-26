import React from 'react';
import { Fader } from './Fader';
import { MasterState } from '../types';
import { TOOLTIPS } from '../constants';

interface MasterStripProps {
  state: MasterState;
  onChange: (updates: Partial<MasterState>) => void;
  educationMode: boolean;
  meterLevel: number;
}

export const MasterStrip: React.FC<MasterStripProps> = ({ state, onChange, educationMode, meterLevel }) => {
  // Convert linear level to dB percent (Logarithmic)
  const getMeterPercent = (level: number) => {
    const db = level < 0.001 ? -999 : 20 * Math.log10(level);
    const minDb = -60;
    const maxDb = 0;
    let percent = ((db - minDb) / (maxDb - minDb)) * 100;
    return Math.max(0, Math.min(100, percent));
  };

  const percent = getMeterPercent(meterLevel);

  return (
    <div className="w-24 bg-zinc-900 border-l-4 border-black p-2 flex flex-col items-center gap-2 relative shadow-2xl z-40 group">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50"></div>
        <div className="text-[10px] font-black text-zinc-500 mb-1 tracking-widest mt-1">MAIN LR</div>
        
        {/* Buttons */}
        <div className="flex flex-col gap-2 w-16 mb-2">
             <button 
                title={educationMode ? TOOLTIPS['masterMute'] : ''}
                onClick={() => onChange({ mute: !state.mute })}
                className={`h-8 w-full rounded shadow-md border flex items-center justify-center transition-colors ${state.mute ? 'bg-red-600 border-red-800 text-white shadow-[0_0_10px_red]' : 'bg-zinc-800 border-zinc-900 text-zinc-500'}`}
            >
                <span className="font-bold text-[10px]">MUTE</span>
            </button>
             <button 
                 onClick={() => onChange({ selected: !state.selected })}
                 className={`h-6 w-full rounded shadow-md border flex items-center justify-center transition-colors ${state.selected ? 'bg-x32-accent border-yellow-300 text-black shadow-[0_0_10px_#dfff00]' : 'bg-zinc-800 border-zinc-900 text-zinc-500'}`}
            >
                <span className="font-bold text-[9px]">SELECT</span>
            </button>
        </div>

        {/* Fader Area */}
        <div className="flex gap-2 h-64 bg-zinc-900/50 p-1 rounded border border-zinc-800/50">
             {/* Stereo Meter Mockup */}
             <div className="flex gap-[1px]">
                 <div className="w-1.5 h-full bg-black rounded-sm overflow-hidden flex flex-col justify-end">
                     <div 
                        className="w-full transition-all duration-75"
                        style={{ 
                            height: `${percent}%`,
                            background: 'linear-gradient(to top, #33ff33 0%, #33ff33 60%, #ffff33 75%, #ff3333 90%, #ff0000 100%)'
                        }}
                     ></div>
                 </div>
                 <div className="w-1.5 h-full bg-black rounded-sm overflow-hidden flex flex-col justify-end">
                     <div 
                        className="w-full transition-all duration-75"
                        style={{ 
                            height: `${Math.max(0, percent - 2)}%`, // Slight variation for stereo feel
                            background: 'linear-gradient(to top, #33ff33 0%, #33ff33 60%, #ffff33 75%, #ff3333 90%, #ff0000 100%)'
                        }}
                     ></div>
                 </div>
             </div>
            
             <div className="relative group/fader">
                {educationMode && (
                    <div className="absolute bottom-full right-full mb-2 w-48 p-2 bg-yellow-100 text-black text-xs rounded shadow-lg opacity-0 group-hover/fader:opacity-100 transition-opacity pointer-events-none z-50">
                        {TOOLTIPS['masterFader']}
                    </div>
                )}
                <Fader 
                    level={state.faderLevel} 
                    onChange={(val) => onChange({ faderLevel: val })}
                    educationMode={false} // Tooltip handled manually above
                    label="MAIN"
                />
             </div>
        </div>
        
        <div className="w-16 h-6 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-bold text-red-500 flex items-center justify-center mt-2 shadow-inner">
            MAIN LR
        </div>
    </div>
  );
};