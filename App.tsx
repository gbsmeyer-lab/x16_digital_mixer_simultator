

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { INITIAL_CHANNELS } from './constants';
import { Channel, AppState, ViewSection } from './types';
import { ChannelProcessing } from './components/ChannelProcessing';
import { Display } from './components/Display';
import { ChannelStrip } from './components/ChannelStrip';
import { ControlRoom } from './components/ControlRoom';
import { MasterStrip } from './components/MasterStrip';
import { MainMeter } from './components/MainMeter';
import { GraduationCap } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    channels: INITIAL_CHANNELS,
    selectedChannelId: 1,
    layer: 0,
    busLayer: 0,
    educationMode: false,
    activeView: ViewSection.HOME,
    controlRoom: {
      monitorLevel: 0.5,
      phonesLevel: 0.5,
      talkbackLevel: 0,
      talkbackOn: false
    },
    master: {
      faderLevel: 0.75, // approx 0dB
      mute: false,
      selected: false
    }
  });

  // Animation State for Meters
  const [meterLevels, setMeterLevels] = useState<Record<number, number>>({});
  
  // Ref for the animation loop to access latest state.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Audio Simulation Loop
  useEffect(() => {
    let animationFrameId: number;

    const updateMeters = (timestamp: number) => {
      const time = timestamp / 1000; // time in seconds
      const currentState = stateRef.current;
      const currentChannels = currentState.channels;
      
      if (!currentChannels) return;

      setMeterLevels(prev => {
        const next: Record<number, number> = {};
        let masterSum = 0;
        
        currentChannels.forEach(ch => {
           // 1. Signal Generation (Simulated Input)
           const speed = 1 + (ch.id % 7) * 0.15;
           const phase = ch.id * 10;
           
           // Continuous sine wave + some noise
           const signalBase = (Math.sin(time * speed * 2 + phase) + 1) / 2; 
           const jitter = (Math.random() - 0.5) * 0.05;
           
           // Base Input Level: "Mic Signal"
           const inputLevel = (signalBase * 0.4) + 0.1 + jitter; 

           // 2. Preamp Gain Stage
           const gainLinear = Math.pow(10, ch.gain / 20);
           let processedSignal = inputLevel * gainLinear;
           
           // 3. Gate Processing
           if (ch.gate.on) {
               const threshLinear = Math.pow(10, ch.gate.threshold / 20);
               if (processedSignal < threshLinear) {
                   processedSignal = 0;
               }
           }

           // --- SELECTED CHANNEL METER (Pre-Fader / Post-Gain) ---
           // We calculate this regardless of mute status
           if (ch.id === currentState.selectedChannelId) {
                const currentPFL = prev[-1] || 0;
                const attack = 0.5;
                const release = 0.1;
                let newPFL = currentPFL;
                
                if (processedSignal > currentPFL) {
                    newPFL = currentPFL + (processedSignal - currentPFL) * attack;
                } else {
                    newPFL = currentPFL - (currentPFL - processedSignal) * release;
                }
                next[-1] = Math.max(0, Math.min(2.0, newPFL));
           }

           // --- CHANNEL STRIP METER (Post-Fader) ---
           if (ch.mute) {
               next[ch.id] = 0;
           } else {
               // 4. Fader Stage
               const faderGain = ch.faderLevel > 0 ? Math.pow(ch.faderLevel, 1.5) * 2 : 0;
               const outputLevel = processedSignal * faderGain;
               
               // Add to master sum (simplified mix engine)
               if (ch.id <= 16) { // Only input channels for now
                  masterSum += outputLevel;
               }
               
               // 5. Meter Ballistics (Attack/Release)
               const currentLevel = prev[ch.id] || 0;
               const attack = 0.5;   // Instant rise
               const release = 0.1; // Slow decay
               
               let newLevel = currentLevel;
               if (outputLevel > currentLevel) {
                   newLevel = currentLevel + (outputLevel - currentLevel) * attack;
               } else {
                   newLevel = currentLevel - (currentLevel - outputLevel) * release;
               }
               
               next[ch.id] = Math.max(0, Math.min(1.2, newLevel)); 
           }
        });

        // Update Master Meter (ID 999)
        const masterOut = currentState.master.mute ? 0 : (masterSum * 0.3 * (currentState.master.faderLevel * 1.5));
        const currentMaster = prev[999] || 0;
        const attack = 0.5;
        const release = 0.1;
        let newMaster = currentMaster;
        if (masterOut > currentMaster) {
            newMaster = currentMaster + (masterOut - currentMaster) * attack;
        } else {
            newMaster = currentMaster - (currentMaster - masterOut) * release;
        }
        next[999] = Math.max(0, Math.min(1.2, newMaster));

        return next;
      });
      animationFrameId = requestAnimationFrame(updateMeters);
    };

    animationFrameId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animationFrameId);
  }, []); 

  const selectedChannel = useMemo(() => 
    state.channels.find(c => c.id === state.selectedChannelId) || state.channels[0],
    [state.channels, state.selectedChannelId]
  );

  const updateChannel = useCallback((id: number, updates: Partial<Channel>) => {
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  }, []);

  const handleMute = useCallback((id: number) => {
    setState(prev => {
      const channel = prev.channels.find(c => c.id === id);
      if (!channel) return prev;
      return {
        ...prev,
        channels: prev.channels.map(c => c.id === id ? { ...c, mute: !c.mute } : c)
      };
    });
  }, []);

  const handleSolo = useCallback((id: number) => {
    setState(prev => {
      const channel = prev.channels.find(c => c.id === id);
      if (!channel) return prev;
      return {
        ...prev,
        channels: prev.channels.map(c => c.id === id ? { ...c, solo: !c.solo } : c)
      };
    });
  }, []);

  const handleSelect = useCallback((id: number) => {
    setState(s => ({ ...s, selectedChannelId: id }));
  }, []);

  const handleLinkToggle = useCallback((id: number) => {
    setState(prev => {
        // Pairs are (1,2), (3,4), etc.
        // Partner ID logic
        const isOdd = id % 2 !== 0;
        const partnerId = isOdd ? id + 1 : id - 1;
        
        const channel = prev.channels.find(c => c.id === id);
        const partner = prev.channels.find(c => c.id === partnerId);
        
        if (!channel || !partner) return prev;
        
        const newLinkState = !channel.linked;
        
        return {
            ...prev,
            channels: prev.channels.map(c => {
                if (c.id === id || c.id === partnerId) {
                    return { ...c, linked: newLinkState };
                }
                return c;
            })
        };
    });
  }, []);

  const handleFaderChange = useCallback((id: number, val: number) => {
    setState(prev => {
        const channel = prev.channels.find(c => c.id === id);
        if (!channel) return prev;
        
        const updates: {id: number, val: number}[] = [{id, val}];
        
        if (channel.linked) {
            const isOdd = channel.id % 2 !== 0;
            const partnerId = isOdd ? channel.id + 1 : channel.id - 1;
            const partner = prev.channels.find(c => c.id === partnerId);
            
            if (partner) {
                const oldLevel = channel.faderLevel;
                let partnerNewLevel = partner.faderLevel;

                if (oldLevel === 0 && partner.faderLevel === 0) {
                    // Both starting from bottom - move together
                    partnerNewLevel = val;
                } else if (oldLevel > 0) {
                     // Calculate relative change ratio
                     const ratio = val / oldLevel;
                     partnerNewLevel = partner.faderLevel * ratio;
                }
                // If oldLevel was 0 but partner wasn't, we can't establish a ratio.
                // In that case, we leave the partner alone to avoid infinite jumps.
                
                partnerNewLevel = Math.max(0, Math.min(1, partnerNewLevel));
                updates.push({ id: partnerId, val: partnerNewLevel });
            }
        }
        
        return {
          ...prev,
          channels: prev.channels.map(c => {
             const update = updates.find(u => u.id === c.id);
             return update ? { ...c, faderLevel: update.val } : c;
          })
        };
    });
  }, []);

  const currentLayerChannels = useMemo(() => {
     const start = state.layer * 8;
     // Input channels are 0-15 (IDs 1-16)
     return state.channels.slice(start, start + 8);
  }, [state.channels, state.layer]);

  const currentBusChannels = useMemo(() => {
     const start = 16 + (state.busLayer * 4); // Busses start at index 16
     return state.channels.slice(start, start + 4);
  }, [state.channels, state.busLayer]);

  return (
    <div className="flex flex-col h-full bg-x32-dark text-gray-200">
      
      {/* --- TOP BAR --- */}
      <div className="h-10 bg-black flex items-center justify-between px-4 border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-2">
            <div className="font-black italic text-xl tracking-tighter text-gray-100">BEHRINGER <span className="text-x32-accent">X32</span> <span className="text-xs font-normal not-italic text-zinc-500 ml-1 opacity-50">EDU-SIM</span></div>
        </div>
        
        <button 
          onClick={() => setState(s => ({ ...s, educationMode: !s.educationMode }))}
          className={`flex items-center gap-2 px-4 py-1 rounded-full border transition-all ${state.educationMode ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700'}`}
        >
          <GraduationCap size={18} />
          <span className="text-xs font-bold uppercase">Education Mode: {state.educationMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* --- UPPER SECTION (SCREEN + STRIP + CONTROL ROOM) --- */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* Left: Channel Strip Controls */}
        <div className="flex-[2] bg-zinc-800 border-r border-zinc-900 p-2 min-w-0">
             <ChannelProcessing 
                channel={selectedChannel} 
                updateChannel={updateChannel} 
                activeView={state.activeView}
                setView={(v) => setState(s => ({ ...s, activeView: v }))}
                educationMode={state.educationMode}
             />
        </div>

        {/* Center: Main Display */}
        <div className="flex-[1.5] bg-black p-4 min-w-[300px] border-l border-zinc-700 flex flex-col z-10">
            <Display 
                channel={selectedChannel} 
                view={state.activeView} 
                onViewChange={(v) => setState(s => ({ ...s, activeView: v }))}
                onLinkToggle={handleLinkToggle}
            />
        </div>
        
        {/* Metering Strip */}
        <MainMeter level={meterLevels[-1] || 0} />

        {/* Right: Control Room */}
        <ControlRoom 
            state={state.controlRoom}
            onChange={(updates) => setState(s => ({ ...s, controlRoom: { ...s.controlRoom, ...updates } }))}
            educationMode={state.educationMode}
        />
      </div>

      {/* --- LOWER SECTION (FADER BANK) --- */}
      <div className="h-[55%] bg-x32-panel border-t-4 border-black shadow-2xl flex relative z-20 shrink-0">
         
         {/* 1. INPUT LAYERS (Left) */}
         <div className="w-16 bg-zinc-900 border-r border-black flex flex-col gap-2 p-1 z-30 flex-shrink-0">
            <div className="text-[9px] text-center text-zinc-500 font-bold mb-1">INPUTS</div>
            <button 
                onClick={() => setState(s => ({ ...s, layer: 0 }))}
                className={`flex-1 rounded flex flex-col items-center justify-center border ${state.layer === 0 ? 'bg-zinc-700 border-zinc-500 shadow-inner' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
            >
                <span className="text-xs font-bold">CH</span>
                <span className="text-[10px]">1-8</span>
            </button>
            <button 
                onClick={() => setState(s => ({ ...s, layer: 1 }))}
                className={`flex-1 rounded flex flex-col items-center justify-center border ${state.layer === 1 ? 'bg-zinc-700 border-zinc-500 shadow-inner' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
            >
                <span className="text-xs font-bold">CH</span>
                <span className="text-[10px]">9-16</span>
            </button>
         </div>

         {/* 2. INPUT FADERS (Middle Scrollable) */}
         <div className="flex-1 overflow-x-auto flex items-end pb-4 px-2 gap-1 bg-gradient-to-b from-zinc-800 to-zinc-900">
            {currentLayerChannels.map((ch) => (
              <ChannelStrip 
                key={ch.id}
                channel={ch}
                meterLevel={meterLevels[ch.id]}
                isSelected={state.selectedChannelId === ch.id}
                educationMode={state.educationMode}
                onSelect={handleSelect}
                onMute={handleMute}
                onSolo={handleSolo}
                onFaderChange={handleFaderChange}
              />
            ))}
         </div>

         {/* 3. BUS LAYERS (Divider/Controls) */}
         <div className="w-12 bg-zinc-900 border-x border-black flex flex-col gap-1 p-1 z-30 flex-shrink-0 justify-center">
            <div className="text-[8px] text-center text-zinc-500 font-bold mb-1 -rotate-90 whitespace-nowrap">BUS MASTER</div>
            {[0, 1, 2, 3].map(layerIdx => (
                <button 
                    key={layerIdx}
                    onClick={() => setState(s => ({ ...s, busLayer: layerIdx }))}
                    className={`h-10 rounded flex flex-col items-center justify-center border transition-all
                        ${state.busLayer === layerIdx ? 'bg-cyan-700 border-cyan-400 text-white shadow-inner' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700'}`}
                >
                    <span className="text-[9px] font-bold">{layerIdx*4+1}-{layerIdx*4+4}</span>
                </button>
            ))}
         </div>

         {/* 4. BUS FADERS (Right Fixed) */}
         <div className="w-[340px] flex items-end justify-center pb-4 px-2 gap-1 bg-zinc-850 flex-shrink-0 bg-gradient-to-b from-zinc-800 to-zinc-900/50">
             {currentBusChannels.map((ch) => (
                <ChannelStrip 
                  key={ch.id}
                  channel={ch}
                  meterLevel={meterLevels[ch.id]}
                  isSelected={state.selectedChannelId === ch.id}
                  educationMode={state.educationMode}
                  onSelect={handleSelect}
                  onMute={handleMute}
                  onSolo={handleSolo}
                  onFaderChange={handleFaderChange}
                />
             ))}
         </div>

         {/* 5. MASTER FADER (Very Right) */}
         <MasterStrip 
            state={state.master}
            onChange={(updates) => setState(s => ({ ...s, master: { ...s.master, ...updates } }))}
            educationMode={state.educationMode}
            meterLevel={meterLevels[999] || 0}
         />

      </div>
    </div>
  );
};

export default App;