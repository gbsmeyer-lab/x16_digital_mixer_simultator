

export interface EQBand {
  id: 'low' | 'lomid' | 'himid' | 'high';
  type: 'shelf' | 'peaking' | 'cut';
  freq: number; // 20 - 20000 Hz
  gain: number; // -15 to +15 dB
  q: number; // 0.1 to 10
}

export interface GateSettings {
  on: boolean;
  threshold: number; // -80 to 0 dB
}

export interface CompSettings {
  on: boolean;
  threshold: number; // -60 to 0 dB
  ratio: number; // 1 to 100
  attack: number; // ms
  release: number; // ms
}

export interface Channel {
  id: number;
  label: string;
  color: string; // Hex color for scribble strip
  icon: string; // Lucide icon name placeholder
  
  // Processing
  gain: number; // -12 to +60 dB
  phantom48v: boolean;
  polarity: boolean;
  lowCut: boolean;
  
  gate: GateSettings;
  comp: CompSettings;
  eq: {
    on: boolean;
    bands: EQBand[];
  };
  
  sends: number[]; // Levels for Bus 1-16 (0-1 float)
  
  // Mix
  faderLevel: number; // 0 to 1 float
  mute: boolean;
  solo: boolean;
  linked: boolean;
}

export enum ViewSection {
  HOME = 'HOME',
  CONFIG = 'CONFIG',
  GATE = 'GATE',
  DYNAMICS = 'DYNAMICS',
  EQ = 'EQ',
  SENDS = 'SENDS'
}

export interface ControlRoomState {
  monitorLevel: number;
  phonesLevel: number;
  talkbackLevel: number;
  talkbackOn: boolean;
}

export interface MasterState {
  faderLevel: number;
  mute: boolean;
  selected: boolean;
}

export interface AppState {
  channels: Channel[];
  selectedChannelId: number;
  layer: number; // 0 = 1-16, 1 = 17-32, etc.
  busLayer: number; // 0 = 1-4, 1 = 5-8, 2 = 9-12, 3 = 13-16
  educationMode: boolean;
  activeView: ViewSection;
  controlRoom: ControlRoomState;
  master: MasterState;
}