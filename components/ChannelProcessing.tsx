

import React, { useState } from 'react';
import { Channel, ViewSection } from '../types';
import { Knob } from './Knob';
import { TOOLTIPS } from '../constants';
import { Monitor, Activity, BarChart3, Settings2, Sliders } from 'lucide-react';

interface Props {
  channel: Channel;
  updateChannel: (id: number, updates: Partial<Channel>) => void;
  setView: (v: ViewSection) => void;
  activeView: ViewSection;
  educationMode: boolean;
}

const SectionHeader = ({ title, active, onView, icon: Icon }: any) => (
  <div className="flex justify-between items-center bg-zinc-800 p-1.5 mb-1 rounded border-b border-zinc-600">
    <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-zinc-400" />}
        <span className="text-[10px] font-bold text-zinc-300 tracking-widest">{title}</span>
    </div>
    {onView && (
        <button 
        onClick={onView}
        className={`px-2 py-[1px] text-[8px] font-bold rounded border ${active ? 'bg-x32-screen text-black border-x32-screen' : 'bg-zinc-700 text-zinc-400 border-zinc-600 hover:bg-zinc-600'}`}
        >
        VIEW
        </button>
    )}
  </div>
);

export const ChannelProcessing: React.FC<Props> = ({ channel, updateChannel, setView, activeView, educationMode }) => {
  const [sendsPage, setSendsPage] = useState(0); // 0 = 1-4, 1 = 5-8...
  const [selectedEQBandId, setSelectedEQBandId] = useState<string>('lomid');

  // Helper to update nested state
  const updateGate = (key: string, val: any) => updateChannel(channel.id, { gate: { ...channel.gate, [key]: val } });
  const updateComp = (key: string, val: any) => updateChannel(channel.id, { comp: { ...channel.comp, [key]: val } });
  const updateEQ = (bandId: string, key: string, val: any) => {
    const newBands = channel.eq.bands.map(b => b.id === bandId ? { ...b, [key]: val } : b);
    updateChannel(channel.id, { eq: { ...channel.eq, bands: newBands } });
  };
  const updateSend = (index: number, val: number) => {
      const newSends = [...channel.sends];
      newSends[index] = val;
      updateChannel(channel.id, { sends: newSends });
  }

  const activeEQBand = channel.eq.bands.find(b => b.id === selectedEQBandId) || channel.eq.bands[0];
  const eqBandIndex = channel.eq.bands.indexOf(activeEQBand);
  const eqColor = COLORS[eqBandIndex];

  return (
    <div className="flex h-full gap-2 p-1 overflow-x-auto">
      
      {/* CONFIG / PREAMP - Border contrast increased */}
      <div className="flex flex-col w-36 shrink-0 bg-x32-panel border border-zinc-500 rounded p-1.5">
        <SectionHeader 
            title="CONFIG" 
            icon={Settings2} 
            active={activeView === ViewSection.CONFIG || activeView === ViewSection.HOME}
            onView={() => setView(ViewSection.CONFIG)}
        />
        <div className="flex flex-col items-center gap-2 flex-1 justify-center">
            <Knob 
                value={channel.gain} min={-12} max={60} label="GAIN" tooltipKey="gain" educationMode={educationMode} 
                onChange={(v) => updateChannel(channel.id, { gain: v })} color="#ff3333"
            />
            <div className="flex gap-1 w-full justify-center">
                <button 
                   onClick={() => updateChannel(channel.id, { phantom48v: !channel.phantom48v })}
                   className={`w-9 h-7 rounded border text-[9px] font-bold transition-all shadow-md ${channel.phantom48v ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_red]' : 'bg-zinc-800 border-zinc-600 text-zinc-500'}`}
                   title={educationMode ? TOOLTIPS['phantom48v'] : ''}
                >
                    +48V
                </button>
                <button 
                   onClick={() => updateChannel(channel.id, { polarity: !channel.polarity })}
                   className={`w-9 h-7 rounded border text-[9px] font-bold transition-all ${channel.polarity ? 'bg-white border-gray-300 text-black' : 'bg-zinc-800 border-zinc-600 text-zinc-500'}`}
                   title={educationMode ? TOOLTIPS['polarity'] : ''}
                >
                    Ø
                </button>
            </div>
            
            <div className="w-full h-[1px] bg-zinc-700 my-1"></div>
            
            <button 
               onClick={() => updateChannel(channel.id, { lowCut: !channel.lowCut })}
               className={`w-full h-7 rounded border text-[9px] font-bold transition-all ${channel.lowCut ? 'bg-x32-accent border-yellow-300 text-black shadow-[0_0_5px_#dfff00]' : 'bg-zinc-800 border-zinc-600 text-zinc-500'}`}
               title={educationMode ? TOOLTIPS['lowCut'] : ''}
            >
                LOW CUT 80Hz
            </button>
        </div>
      </div>

      {/* DYNAMICS - Border contrast increased */}
      <div className="flex flex-col w-44 shrink-0 bg-x32-panel border border-zinc-500 rounded p-1.5">
        <SectionHeader title="DYNAMICS" active={activeView === ViewSection.DYNAMICS} onView={() => setView(ViewSection.DYNAMICS)} icon={BarChart3} />
        <div className="grid grid-cols-2 gap-y-1 gap-x-2 flex-1 items-center content-center px-1">
            <div className="col-span-2 flex justify-center mb-0.5">
                 <button 
                   onClick={() => updateComp('on', !channel.comp.on)}
                   className={`w-12 h-6 rounded-full border text-[9px] font-bold transition-all ${channel.comp.on ? 'bg-yellow-500 border-yellow-300 text-black shadow-[0_0_8px_orange]' : 'bg-zinc-800 border-zinc-600 text-zinc-500'}`}
                >
                    COMP
                </button>
            </div>
            <Knob 
                value={channel.comp.threshold} min={-60} max={0} label="THR" tooltipKey="compThresh" educationMode={educationMode} 
                onChange={(v) => updateComp('threshold', v)} color="#ffff33"
            />
            <Knob 
                value={channel.comp.ratio} min={1} max={100} label="RATIO" tooltipKey="compRatio" educationMode={educationMode} 
                onChange={(v) => updateComp('ratio', v)} color="#ffff33"
            />
            <Knob 
                value={channel.comp.attack} min={0} max={120} label="ATTACK" educationMode={educationMode} 
                onChange={(v) => updateComp('attack', v)}
            />
             <Knob 
                value={channel.comp.release} min={5} max={1000} label="HOLD" educationMode={educationMode} 
                onChange={(v) => updateComp('release', v)}
            />
        </div>
      </div>

      {/* EQ - Widened to w-44, Border contrast increased */}
      <div className="flex flex-col w-44 shrink-0 bg-x32-panel border border-zinc-500 rounded p-1.5">
        <SectionHeader title="EQUALIZER" active={activeView === ViewSection.EQ} onView={() => setView(ViewSection.EQ)} icon={Sliders} />
        <div className="flex flex-1 gap-1">
             {/* Band Select Buttons */}
             <div className="flex flex-col justify-center gap-1">
                 <button 
                   onClick={() => updateChannel(channel.id, { eq: { ...channel.eq, on: !channel.eq.on } })}
                   className={`w-10 h-6 rounded border text-[8px] font-bold transition-all mb-1 ${channel.eq.on ? 'bg-x32-accent border-yellow-200 text-black shadow-[0_0_5px_#dfff00]' : 'bg-zinc-800 border-zinc-600 text-zinc-500'}`}
                >
                    EQ ON
                </button>
                 {channel.eq.bands.map((band, idx) => (
                     <button
                        key={band.id}
                        onClick={() => setSelectedEQBandId(band.id)}
                        className={`w-10 h-7 rounded border text-[8px] font-bold uppercase transition-all flex items-center justify-center
                            ${selectedEQBandId === band.id 
                                ? `bg-zinc-700 border-[${COLORS[idx]}] text-white shadow-inner` 
                                : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:bg-zinc-800'
                            }`}
                        style={{ borderColor: selectedEQBandId === band.id ? COLORS[idx] : undefined }}
                     >
                         {band.id}
                     </button>
                 ))}
             </div>

             {/* Selected Band Controls */}
             <div className="flex flex-col justify-center gap-2 items-center flex-1 bg-zinc-900/50 rounded p-1 border border-zinc-800 py-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-0.5 tracking-wider" style={{color: eqColor}}>{activeEQBand.id}</span>
                <Knob 
                    value={activeEQBand.gain} min={-15} max={15} label="GAIN" tooltipKey="eqGain" educationMode={educationMode} 
                    onChange={(v) => updateEQ(activeEQBand.id, 'gain', v)} color={eqColor}
                />
                <Knob 
                    value={activeEQBand.freq} min={20} max={20000} label="FREQ" educationMode={educationMode} 
                    onChange={(v) => updateEQ(activeEQBand.id, 'freq', v)} color={eqColor}
                />
                 <Knob 
                    value={activeEQBand.q} min={0.1} max={10} step={0.1} label="Q" educationMode={educationMode} 
                    onChange={(v) => updateEQ(activeEQBand.id, 'q', v)} color={eqColor}
                />
             </div>
        </div>
      </div>

       {/* SENDS - Reduced width to w-36, Border contrast increased */}
       <div className="flex flex-col w-36 shrink-0 bg-x32-panel border border-zinc-500 rounded p-1.5">
        <SectionHeader title="BUS SENDS" active={activeView === ViewSection.SENDS} onView={() => setView(ViewSection.SENDS)} icon={Monitor} />
        <div className="flex h-full gap-2">
            {/* Sends Paging Vertical Buttons */}
            <div className="flex flex-col justify-center gap-1 w-8">
                {[0, 1, 2, 3].map(page => (
                    <button 
                        key={page}
                        onClick={() => setSendsPage(page)}
                        className={`text-[8px] flex-1 w-full rounded border flex items-center justify-center font-bold
                            ${sendsPage === page ? 'bg-orange-600 text-white border-orange-400' : 'bg-zinc-800 text-zinc-500 border-zinc-600 hover:bg-zinc-700'}`}
                    >
                        {page*4+1}-{page*4+4}
                    </button>
                ))}
            </div>
            
            {/* 4 Knobs Vertically */}
            <div className="flex flex-col flex-1 justify-between items-center bg-zinc-900/30 rounded py-1">
                {[0,1,2,3].map(i => {
                    const busIndex = (sendsPage * 4) + i;
                    return (
                        <div key={busIndex} className="flex items-center gap-1">
                             <span className="text-[8px] w-4 text-right text-zinc-500 font-mono">{busIndex+1 < 10 ? '0'+(busIndex+1) : busIndex+1}</span>
                             <Knob 
                                value={channel.sends[busIndex]} 
                                min={0} max={1} 
                                label="" 
                                tooltipKey="sends"
                                educationMode={educationMode} 
                                onChange={(v) => updateSend(busIndex, v)} 
                                color="#33ccff"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

    </div>
  );
};

const COLORS = ['#ff3333', '#33ff33', '#3333ff', '#ffff33'];
