
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { INITIAL_CHANNELS } from './constants';
import { Channel, AppState, ViewSection } from './types';
import { ChannelProcessing } from './components/ChannelProcessing';
import { Display } from './components/Display';
import { ChannelStrip } from './components/ChannelStrip';
import { ControlRoom } from './components/ControlRoom';
import { MasterStrip } from './components/MasterStrip';
import { MainMeter } from './components/MainMeter';

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
      faderLevel: 0.75, // Set to 0.75 for Unity Gain (0dB) start
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

    const getFaderGain = (level: number) => {
        // Logarithmic Fader Curve Simulation
        // 1.0  (100%) = +10 dB
        // 0.75 (75%)  = 0 dB (Unity)
        // 0.5  (50%)  = -10 dB
        // 0.25 (25%)  = -30 dB (approx)
        // 0.0  (0%)   = -infinity
        if (level < 0.05) return 0;
        const db = (level * 40) - 30; 
        return Math.pow(10, db / 20);
    };

    const updateMeters = (timestamp: number) => {
      const currentState = stateRef.current;
      const currentChannels = currentState.channels;
      
      if (!currentChannels) return;

      setMeterLevels(prev => {
        const next: Record<number, number> = {};
        
        // Simulation Constants
        // Input Signal Level adjusted to 0.003 (~ -50dBFS)
        // At default Gain -12dB: -50 - 12 = -62dBFS (Below -60dBFS meter floor)
        // At nominal Gain +30dB: -50 + 30 = -20dBFS (Nominal Level)
        const INPUT_SIGNAL_LEVEL = 0.003; 
        const NOISE_FLOOR = 0.00001;

        // Accumulators for Bus Signals (Bus 1-16)
        const busSums = new Float32Array(16); // initialized to 0
        let masterLeftSum = 0;

        // --- PASS 1: PROCESS INPUT CHANNELS (1-16) ---
        for (let i = 0; i < 16; i++) {
             const ch = currentChannels[i];
             if (!ch) continue;

             // 1. Preamp Gain
             const gainFactor = Math.pow(10, ch.gain / 20);
             let signal = INPUT_SIGNAL_LEVEL * gainFactor;

             // PFL (Selected Channel Meter) - Tapped Post-Gain
             // Shows the signal level immediately after the gain stage, before Gate/Comp/Fader.
             if (ch.id === currentState.selectedChannelId) {
                const currentPFL = prev[-1] || 0;
                next[-1] = currentPFL + (signal - currentPFL) * 0.5;
             }

             // 2. Dynamics: Gate
             if (ch.gate.on) {
                 const sigDB = signal > 0 ? 20 * Math.log10(signal) : -100;
                 if (sigDB < ch.gate.threshold) {
                     signal = 0;
                 }
             }

             // 3. Dynamics: Compressor
             if (ch.comp.on && signal > NOISE_FLOOR) {
                 const sigDB = 20 * Math.log10(signal);
                 if (sigDB > ch.comp.threshold) {
                     const over = sigDB - ch.comp.threshold;
                     const reduction = over * (1 - (1/ch.comp.ratio));
                     signal = signal / Math.pow(10, reduction / 20);
                 }
             }

             // 'signal' is now the processed channel signal (Pre-Fader)

             // 4. Distribute to Busses
             // We assume sends are tapped here (Pre-Fader) for this simulation
             for (let b = 0; b < 16; b++) {
                 const sendAmt = ch.sends[b];
                 if (sendAmt > 0) {
                     busSums[b] += signal * sendAmt;
                 }
             }

             // 5. Channel Strip Fader (Post-Fader)
             const faderGain = getFaderGain(ch.faderLevel);
             let postFader = signal * faderGain;
             if (ch.mute) postFader = 0;

             // Update Channel Meter (Post Fader)
             const currentCh = prev[ch.id] || 0;
             next[ch.id] = currentCh + (postFader - currentCh) * 0.3;

             // Add to Main Mix
             if (!ch.mute) {
                 masterLeftSum += postFader;
             }
        }

        // --- PASS 2: PROCESS BUS CHANNELS (17-32) ---
        for (let i = 16; i < 32; i++) {
             const ch = currentChannels[i];
             if (!ch) continue;
             
             const busIndex = i - 16;
             // Input is the summed sends
             let signal = busSums[busIndex];

             // Apply Bus Trim (using gain knob)
             const gainFactor = Math.pow(10, ch.gain / 20);
             signal *= gainFactor;

             // Bus PFL - Tapped Post-Trim
             if (ch.id === currentState.selectedChannelId) {
                const currentPFL = prev[-1] || 0;
                next[-1] = currentPFL + (signal - currentPFL) * 0.5;
             }

             // Bus Compressor
             if (ch.comp.on && signal > NOISE_FLOOR) {
                 const sigDB = 20 * Math.log10(signal);
                 if (sigDB > ch.comp.threshold) {
                     const over = sigDB - ch.comp.threshold;
                     const reduction = over * (1 - (1/ch.comp.ratio));
                     signal = signal / Math.pow(10, reduction / 20);
                 }
             }

             // Bus Fader
             const faderGain = getFaderGain(ch.faderLevel);
             let postFader = signal * faderGain;
             if (ch.mute) postFader = 0;

             // Update Bus Meter
             const currentCh = prev[ch.id] || 0;
             next[ch.id] = currentCh + (postFader - currentCh) * 0.3;
        }

        // --- MASTER FADER METER ---
        let masterOut = masterLeftSum * 0.2; // Headroom scaling for summing
        
        const masterFaderGain = getFaderGain(currentState.master.faderLevel);
        masterOut *= masterFaderGain;
        
        if (currentState.master.mute) masterOut = 0;

        const currentMaster = prev[999] || 0;
        next[999] = currentMaster + (masterOut - currentMaster) * 0.3;

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
                let partnerNewLevel = partner.faderLevel;
                // Basic relative linking or absolute match. X32 usually absolute matches on touch.
                partnerNewLevel = val; 
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
     return state.channels.slice(start, start + 8);
  }, [state.channels, state.layer]);

  const currentBusChannels = useMemo(() => {
     const start = 16 + (state.busLayer * 4); // Busses start at index 16
     return state.channels.slice(start, start + 4);
  }, [state.channels, state.busLayer]);

  return (
    <div className="flex flex-col h-full bg-x32-dark text-gray-200">
      
      {/* --- UPPER SECTION (SCREEN + STRIP + CONTROL ROOM) --- */}
      {/* Reduced height by increasing lower section flex/height */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-900">
        
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
        <div className="flex-[1.5] bg-black p-4 min-w-[300px] border-l border-zinc-700 flex flex-col z-10 relative">
             {/* PFL Meter Label Overlay */}
             <div className="absolute top-2 right-2 z-20 pointer-events-none">
                 <span className="text-[10px] font-bold text-zinc-500 bg-black/50 px-1 rounded border border-zinc-800">PFL / SOLO</span>
             </div>
            <Display 
                channel={selectedChannel} 
                view={state.activeView} 
                onViewChange={(v) => setState(s => ({ ...s, activeView: v }))}
                onLinkToggle={handleLinkToggle}
            />
        </div>
        
        {/* Metering Strip (PFL) */}
        <MainMeter level={meterLevels[-1] || 0} />

        {/* Right: Control Room */}
        <ControlRoom 
            state={state.controlRoom}
            onChange={(updates) => setState(s => ({ ...s, controlRoom: { ...s.controlRoom, ...updates } }))}
            educationMode={state.educationMode}
        />
      </div>

      {/* --- LOWER SECTION (FADER BANK) --- */}
      {/* Adjusted to 55% */}
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
