export interface FabricDimensions {
  clbWidth: number;
  clbHeight: number;
  channelCapacity: number;
}

export interface TrackSegment {
  channelX: number;
  channelY: number;
  trackIndex: number;
  congestion?: number; 
}

export interface PlacedBlock {
  gridX: number; 
  gridY: number; 
  label: string;
  isSwapping?: boolean; // Highlights blocks actively moving this step
}

export interface CostMetrics {
  totalWirelength: number;
  timingCriticality: number;
  totalCongestionCost: number;
  aggregateCost: number;
}

export type EdaPhase = 'PLACING' | 'ROUTING' | 'DONE';

export interface RenderState {
  phase: EdaPhase;
  currentStepDescription: string;
  blocks: PlacedBlock[];
  frontier: TrackSegment[];
  routedSegments: TrackSegment[];
  metrics: CostMetrics;
}
