

import React, { memo } from 'react';
import { Channel } from '../types';
import { Fader } from './Fader';
import { Mic, Activity } from 'lucide-react';

interface ChannelStripProps {
  channel: Channel;
  meterLevel: number;
  isSelected: boolean;
  educationMode: boolean;
  onSelect: (id: number) => void;
  onMute: (id: number) => void;
  onSolo: (id: number) => void;
  onFaderChange: (id: number, val: number) => void;
}

export const ChannelStrip: React.FC<ChannelStripProps> = memo(({
  channel,
  meterLevel,
  isSelected,
  educationMode,
  onSelect,
  onMute,
  onSolo,
  onFaderChange
}) => {
  return (
    <div className="w-20 flex-shrink-0 flex flex-col items-center gap-2 group">
        {/* Scribble Strip */}
        <div 
            className="w-16 h-10 rounded mb-1 flex flex-col items-center justify-center text-black shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] border border-black"
            style={{ backgroundColor: channel.color }}
        >
             {channel.id > 16 ? <Activity size={12} className="opacity-70" /> : <Mic size={12} className="opacity-70" />}
             <span className="text-[9px] font-bold leading-none">{channel.label}</span>
        </div>

        {/* Mute / Solo / Select */}
        <div className="flex flex-col gap-2 w-14 mb-2">
            <button 
                onClick={() => onMute(channel.id)}
                className={`h-8 w-full rounded shadow-md border flex items-center justify-center transition-colors ${channel.mute ? 'bg-red-600 border-red-800 text-white shadow-[0_0_10px_red]' : 'bg-zinc-800 border-zinc-900 text-zinc-500'}`}
            >
                <span className="font-bold text-[10px]">MUTE</span>
            </button>
            <button 
                 onClick={() => onSolo(channel.id)}
                 className={`h-6 w-full rounded shadow-md border flex items-center justify-center transition-colors ${channel.solo ? 'bg-yellow-500 border-yellow-700 text-black shadow-[0_0_10px_orange]' : 'bg-zinc-800 border-zinc-900 text-zinc-500'}`}
            >
                <span className="font-bold text-[9px]">SOLO</span>
            </button>
             <button 
                 onClick={() => onSelect(channel.id)}
                 className={`h-6 w-full rounded shadow-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-x32-accent border-yellow-300 text-black shadow-[0_0_10px_#dfff00]' : 'bg-zinc-800 border-zinc-900 text-zinc-500'}`}
            >
                <span className="font-bold text-[9px]">SELECT</span>
            </button>
        </div>

        {/* Fader & Meters */}
        <div className="flex gap-1 h-64">
             {/* Simple Meter */}
             <div className="w-2 h-full bg-black rounded-full overflow-hidden flex flex-col justify-end p-[1px] border border-zinc-800 relative">
                 <div 
                    className="w-full rounded-full transition-all ease-linear"
                    style={{ 
                        height: `${Math.min(100, (meterLevel || 0) * 100)}%`,
                        transitionDuration: '50ms', 
                        background: 'linear-gradient(to top, #33ff33 0%, #33ff33 60%, #ffff33 80%, #ff3333 100%)',
                        boxShadow: '0 0 5px rgba(51, 255, 51, 0.5)'
                    }}
                 ></div>
             </div>
             
             <Fader 
                level={channel.faderLevel} 
                onChange={(val) => onFaderChange(channel.id, val)}
                educationMode={educationMode}
             />
        </div>
    </div>
  );
});