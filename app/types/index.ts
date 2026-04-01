export interface Facility {
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  googleType?: string;
}

export interface MetricBreakdown {
  score: number;
}

export interface LocalitySearchResponse {
  regionId: number;
  formattedAddress: string;
  centroidLat: number;
  centroidLng: number;
  localityScore: number;
  aiSummary: string;
  facilities: Record<string, Facility[]>;
  connectivity?: MetricBreakdown;
  traffic?: MetricBreakdown;
  // Based on the planning questions, safety and pollution might be missing,
  // we'll optionally expect them and use defaults/estimates if empty
  safety?: MetricBreakdown;
  pollution?: MetricBreakdown;
}
