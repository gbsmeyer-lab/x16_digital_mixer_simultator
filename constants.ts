
import { Channel } from './types';

const COLORS = [
  '#ff3333', // Red
  '#33ff33', // Green
  '#3333ff', // Blue
  '#ffff33', // Yellow
  '#00ffff', // Cyan
  '#ff00ff', // Magenta
  '#ffffff', // White
];

export const INITIAL_CHANNELS: Channel[] = Array.from({ length: 32 }, (_, i) => {
  const isBus = i >= 16;
  const id = i + 1;
  const busIndex = id - 16;
  
  return {
    id: id,
    label: isBus 
      ? `BUS ${busIndex < 10 ? '0' + busIndex : busIndex}` 
      : `CH ${id < 10 ? '0' + id : id}`,
    color: isBus ? '#00ffff' : COLORS[i % COLORS.length], // Cyan for busses
    icon: isBus ? 'activity' : 'mic',
    gain: -12, // Start fully closed (min -12dB)
    phantom48v: false,
    polarity: false,
    lowCut: false,
    gate: {
      on: false,
      threshold: -60,
    },
    comp: {
      on: false,
      threshold: -20,
      ratio: 2,
      attack: 20,
      release: 200,
    },
    eq: {
      on: true,
      bands: [
        { id: 'low', type: 'shelf', freq: 80, gain: 0, q: 1 },
        { id: 'lomid', type: 'peaking', freq: 400, gain: 0, q: 2 },
        { id: 'himid', type: 'peaking', freq: 2000, gain: 0, q: 2 },
        { id: 'high', type: 'shelf', freq: 10000, gain: 0, q: 1 },
      ]
    },
    sends: Array(16).fill(0),
    faderLevel: 0, // -inf
    mute: false,
    solo: false,
    linked: false,
  };
});

export const TOOLTIPS: Record<string, string> = {
  gain: "Gain (Preamp): Adjusts the input sensitivity. Proper gain staging is the first and most critical step in mixing.",
  phantom48v: "48V Phantom Power: Provides power to condenser microphones. Do not use with ribbon mics unless specified!",
  polarity: "Polarity Invert: Flips the phase of the signal by 180 degrees. Useful for aligning dual-mic setups (e.g., snare top/bottom).",
  lowCut: "Low Cut (HPF): Cuts off frequencies below 80Hz. Essential for removing rumble, stage noise, and plosives from non-bass sources.",
  gateThresh: "Gate Threshold: The level below which the signal is silenced. Removes background noise when the musician isn't playing.",
  compThresh: "Compressor Threshold: The level where gain reduction begins. Signals above this level will be squashed.",
  compRatio: "Compressor Ratio: How much the signal is reduced once it passes the threshold. 4:1 means 4dB in = 1dB out.",
  eqGain: "EQ Gain: Boost or cut the selected frequency. Use cuts to remove problem frequencies and boosts for color.",
  fader: "Channel Fader: Controls the volume of this channel in the Main LR Mix.",
  sends: "Bus Send: Sends a copy of this signal to a Mix Bus (e.g., for Stage Monitors or Effects).",
  view: "View Button: Switches the main display to show detailed visualization for this processing block.",
  monitorLevel: "Monitor Level: Controls the volume of the control room speakers (Nearfields).",
  phonesLevel: "Phones Level: Controls the volume of the headphone output.",
  talkbackLevel: "Talkback Level: Sets the volume of the talkback microphone sent to destinations.",
  masterFader: "Master Fader (Main LR): The final volume control for the main PA system output.",
  masterMute: "Master Mute: Silences the entire PA system. Use in emergencies or during breaks!"
};
