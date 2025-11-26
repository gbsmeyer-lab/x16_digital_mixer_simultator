
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
      faderLevel: 0.75,
      mute: false,
      selected: false
    }
  });

  // --- AUDIO ENGINE SIMULATION STATE ---
  // We use a Ref to store the "Live" audio state. This is updated synchronously
  // by event handlers, allowing the audio loop to read instant values 
  // without waiting for React state updates/renders.
  const audioState = useRef({
    channels: JSON.parse(JSON.stringify(INITIAL_CHANNELS)) as Channel[],
    selectedChannelId: 1,
    controlRoom: {
      monitorLevel: 0.5,
      phonesLevel: 0.5,
      talkbackLevel: 0,
      talkbackOn: false
    },
    master: {
      faderLevel: 0.75,
      mute: false,
      selected: false
    }
  });

  // Animation State for Meters
  const [meterLevels, setMeterLevels] = useState<Record<number, number>>({});
  
  // --- ZOOM / PAN STATE ---
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const gestureRef = useRef<{
    startScale: number;
    startX: number;
    startY: number;
    startDist: number;
  } | null>(null);

  // Audio Simulation Loop
  useEffect(() => {
    let animationFrameId: number;

    const getFaderGain = (level: number) => {
        if (level < 0.05) return 0;
        const db = (level * 40) - 30; 
        return Math.pow(10, db / 20);
    };

    const updateMeters = () => {
      // Read directly from the synchronous Ref, not the potentially stale React state
      const currentAudio = audioState.current;
      const currentChannels = currentAudio.channels;
      
      setMeterLevels(prev => {
        const next: Record<number, number> = {};
        
        const INPUT_SIGNAL_LEVEL = 0.001; 
        const NOISE_FLOOR = 0.00001;

        const busSums = new Float32Array(16);
        let masterLeftSum = 0;

        // --- PASS 1: PROCESS INPUT CHANNELS (1-16) ---
        for (let i = 0; i < 16; i++) {
             const ch = currentChannels[i];
             // Safety check
             if (!ch) continue;

             // 1. Preamp Gain
             const gainFactor = Math.pow(10, ch.gain / 20);
             let signal = INPUT_SIGNAL_LEVEL * gainFactor;

             // PFL Meter
             if (ch.id === currentAudio.selectedChannelId) {
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

             // 4. Distribute to Busses
             for (let b = 0; b < 16; b++) {
                 const sendAmt = ch.sends[b];
                 if (sendAmt > 0) {
                     busSums[b] += signal * sendAmt;
                 }
             }

             // 5. Channel Strip Fader
             const faderGain = getFaderGain(ch.faderLevel);
             let postFader = signal * faderGain;
             if (ch.mute) postFader = 0;

             // Channel Meter
             const currentCh = prev[ch.id] || 0;
             next[ch.id] = currentCh + (postFader - currentCh) * 0.3;

             if (!ch.mute) {
                 masterLeftSum += postFader;
             }
        }

        // --- PASS 2: PROCESS BUS CHANNELS (17-32) ---
        for (let i = 16; i < 32; i++) {
             const ch = currentChannels[i];
             if (!ch) continue;
             
             const busIndex = i - 16;
             let signal = busSums[busIndex];

             // Bus Trim
             const gainFactor = Math.pow(10, ch.gain / 20);
             signal *= gainFactor;

             // Bus PFL
             if (ch.id === currentAudio.selectedChannelId) {
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

             const currentCh = prev[ch.id] || 0;
             next[ch.id] = currentCh + (postFader - currentCh) * 0.3;
        }

        // --- MASTER FADER METER ---
        let masterOut = masterLeftSum * 0.2; 
        const masterFaderGain = getFaderGain(currentAudio.master.faderLevel);
        masterOut *= masterFaderGain;
        if (currentAudio.master.mute) masterOut = 0;

        const currentMaster = prev[999] || 0;
        next[999] = currentMaster + (masterOut - currentMaster) * 0.3;

        return next;
      });
      
      animationFrameId = requestAnimationFrame(updateMeters);
    };

    animationFrameId = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animationFrameId);
  }, []); 

  // --- HANDLERS (Update State AND Audio Ref) ---

  const updateChannel = useCallback((id: number, updates: Partial<Channel>) => {
    // 1. Update Simulation Ref immediately
    const chRef = audioState.current.channels.find(c => c.id === id);
    if (chRef) {
        // Handle nested updates (comp/eq)
        if (updates.comp) Object.assign(chRef.comp, updates.comp);
        else if (updates.eq) {
            if (updates.eq.bands) chRef.eq.bands = updates.eq.bands; // Replace array or specific band logic if needed
            if (updates.eq.on !== undefined) chRef.eq.on = updates.eq.on;
        } 
        else if (updates.sends) {
            chRef.sends = updates.sends;
        }
        else {
            Object.assign(chRef, updates);
        }
    }

    // 2. Update React State
    setState(prev => ({
      ...prev,
      channels: prev.channels.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  }, []);

  const handleMute = useCallback((id: number) => {
    // 1. Ref
    const chRef = audioState.current.channels.find(c => c.id === id);
    if (chRef) chRef.mute = !chRef.mute;

    // 2. State
    setState(prev => {
      return {
        ...prev,
        channels: prev.channels.map(c => c.id === id ? { ...c, mute: !c.mute } : c)
      };
    });
  }, []);

  const handleSolo = useCallback((id: number) => {
    // Solo doesn't affect audio path in this sim, but kept for consistency
    setState(prev => {
      return {
        ...prev,
        channels: prev.channels.map(c => c.id === id ? { ...c, solo: !c.solo } : c)
      };
    });
  }, []);

  const handleSelect = useCallback((id: number) => {
    audioState.current.selectedChannelId = id;
    setState(s => ({ ...s, selectedChannelId: id }));
  }, []);

  const handleLinkToggle = useCallback((id: number) => {
     setState(prev => {
        const isOdd = id % 2 !== 0;
        const partnerId = isOdd ? id + 1 : id - 1;
        const channel = prev.channels.find(c => c.id === id);
        if (!channel) return prev;
        const newLinkState = !channel.linked;

        // Ref Update
        const chRef = audioState.current.channels.find(c => c.id === id);
        const pRef = audioState.current.channels.find(c => c.id === partnerId);
        if(chRef) chRef.linked = newLinkState;
        if(pRef) pRef.linked = newLinkState;

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
    // 1. Update Ref Logic (including Linking)
    const chRef = audioState.current.channels.find(c => c.id === id);
    if(chRef) {
        chRef.faderLevel = val;
        if (chRef.linked) {
             const isOdd = chRef.id % 2 !== 0;
             const partnerId = isOdd ? chRef.id + 1 : chRef.id - 1;
             const pRef = audioState.current.channels.find(c => c.id === partnerId);
             if (pRef) pRef.faderLevel = val;
        }
    }

    // 2. Update React State
    setState(prev => {
        const channel = prev.channels.find(c => c.id === id);
        if (!channel) return prev;
        
        const updates: {id: number, val: number}[] = [{id, val}];
        
        if (channel.linked) {
            const isOdd = channel.id % 2 !== 0;
            const partnerId = isOdd ? channel.id + 1 : channel.id - 1;
            const partner = prev.channels.find(c => c.id === partnerId);
            if (partner) {
                updates.push({ id: partnerId, val: val });
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

  const handleMasterChange = useCallback((updates: Partial<typeof state.master>) => {
      // Ref
      Object.assign(audioState.current.master, updates);
      // State
      setState(s => ({ ...s, master: { ...s.master, ...updates } }));
  }, [state.master]);

  const handleControlRoomChange = useCallback((updates: Partial<typeof state.controlRoom>) => {
      Object.assign(audioState.current.controlRoom, updates);
      setState(s => ({ ...s, controlRoom: { ...s.controlRoom, ...updates } }));
  }, [state.controlRoom]);


  // --- VIEW HELPERS ---
  const selectedChannel = useMemo(() => 
    state.channels.find(c => c.id === state.selectedChannelId) || state.channels[0],
    [state.channels, state.selectedChannelId]
  );

  const currentLayerChannels = useMemo(() => {
     const start = state.layer * 8;
     return state.channels.slice(start, start + 8);
  }, [state.channels, state.layer]);

  const currentBusChannels = useMemo(() => {
     const start = 16 + (state.busLayer * 4);
     return state.channels.slice(start, start + 4);
  }, [state.channels, state.busLayer]);


  // --- ZOOM GESTURE HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault(); // Prevent native browser pinch
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      
      gestureRef.current = {
        startScale: transform.scale,
        startDist: dist,
        startX: cx - transform.x,
        startY: cy - transform.y
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && gestureRef.current) {
       e.preventDefault();
       const t1 = e.touches[0];
       const t2 = e.touches[1];
       const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
       const cx = (t1.clientX + t2.clientX) / 2;
       const cy = (t1.clientY + t2.clientY) / 2;

       const { startScale, startDist, startX, startY } = gestureRef.current;
       
       const newScale = Math.max(0.5, Math.min(3, startScale * (dist / startDist)));
       const newX = cx - startX; // Simplified panning
       const newY = cy - startY;

       setTransform({ scale: newScale, x: newX, y: newY });
    }
  };

  return (
    <div 
        className="w-full h-full overflow-hidden bg-black touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
    >
      <div 
        style={{ 
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%'
        }}
        className="flex flex-col bg-x32-dark text-gray-200 transition-transform duration-75 ease-out"
      >
        
        {/* --- UPPER SECTION (SCREEN + STRIP + CONTROL ROOM) --- */}
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
          
          <MainMeter level={meterLevels[-1] || 0} />

          {/* Right: Control Room */}
          <ControlRoom 
              state={state.controlRoom}
              onChange={handleControlRoomChange}
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
              onChange={handleMasterChange}
              educationMode={state.educationMode}
              meterLevel={meterLevels[999] || 0}
          />

        </div>
      </div>
    </div>
  );
};

export default App;
