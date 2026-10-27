export interface BlastRadiusRequest {
  sourceNodeId: string;
  nodes: Array<{
    id: string;
    name: string;
  }>;
  edges: Array<{
    fromNodeId: string;
    toNodeId: string;
  }>;
  isolateNodeIds?: string[];
}

export interface BlastRadiusResponse {
  reachableBefore: string[];
  reachableAfter: string[];
  pathsBefore: string[][];
  pathsAfter: string[][];
  countBefore: number;
  countAfter: number;
}
