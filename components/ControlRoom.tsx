
import React from 'react';
import { Knob } from './Knob';
import { Mic, Headphones, Speaker } from 'lucide-react';
import { ControlRoomState } from '../types';

interface ControlRoomProps {
  state: ControlRoomState;
  onChange: (updates: Partial<ControlRoomState>) => void;
  educationMode: boolean;
}

export const ControlRoom: React.FC<ControlRoomProps> = ({ state, onChange, educationMode }) => {
  return (
    <div className="w-40 flex flex-col bg-zinc-800 border-l border-zinc-900 p-2 shrink-0 z-20 shadow-xl ml-1">
       <div className="text-xs font-black text-zinc-400 mb-4 border-b border-zinc-600 pb-1 tracking-wider text-center">MONITOR / TB</div>
       
       <div className="flex flex-col items-center gap-6 flex-1">
          {/* Monitor */}
          <div className="flex flex-col items-center gap-1">
             <div className="text-[10px] font-bold text-zinc-500 mb-1 flex items-center gap-1">
                <Speaker size={12} /> MONITOR
             </div>
             <Knob 
                value={state.monitorLevel} min={0} max={1} 
                label="LEVEL" 
                tooltipKey="monitorLevel"
                educationMode={educationMode} 
                onChange={(v) => onChange({ monitorLevel: v })} 
                color="#33ccff"
             />
          </div>

          {/* Phones */}
          <div className="flex flex-col items-center gap-1">
             <div className="text-[10px] font-bold text-zinc-500 mb-1 flex items-center gap-1">
                <Headphones size={12} /> PHONES
             </div>
             <Knob 
                value={state.phonesLevel} min={0} max={1} 
                label="LEVEL" 
                tooltipKey="phonesLevel"
                educationMode={educationMode} 
                onChange={(v) => onChange({ phonesLevel: v })} 
                color="#33ccff"
             />
          </div>

          {/* Spacer Line */}
          <div className="w-full h-[1px] bg-zinc-700"></div>

          {/* Talkback */}
          <div className="flex flex-col items-center gap-2">
             <div className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                <Mic size={12} /> TALKBACK
             </div>
             <Knob 
                value={state.talkbackLevel} min={0} max={1} 
                label="LEVEL" 
                tooltipKey="talkbackLevel"
                educationMode={educationMode} 
                onChange={(v) => onChange({ talkbackLevel: v })} 
                color="#ffaa00"
             />
             <button 
                onClick={() => onChange({ talkbackOn: !state.talkbackOn })}
                className={`w-16 h-8 mt-1 rounded border shadow-lg flex items-center justify-center font-bold text-[10px] transition-all
                    ${state.talkbackOn 
                        ? 'bg-orange-500 border-orange-400 text-black shadow-[0_0_10px_orange]' 
                        : 'bg-zinc-700 border-zinc-600 text-zinc-400'}`}
             >
                 TALK A
             </button>
          </div>
       </div>
    </div>
  );
};
