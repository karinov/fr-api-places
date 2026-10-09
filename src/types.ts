export interface RetailChain {
  id: string;
  name: string;
  queryName: string;
  category: string;
  color: string;
  logoLetter: string;
}

export interface FrenchCity {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  population: number;
  radiusMeters: number;
  level?: 'national' | 'region' | 'territory' | 'city';
}

export interface PlaceReview {
  name?: string;
  relativePublishTimeDescription?: string;
  rating?: number;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string; languageCode?: string };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
  [key: string]: any;
}

export interface PlaceItem {
  id: string; // Google Place ID
  chainId: string;
  chainName: string;
  cityId: string; // FRENCH_CITIES id of the coverage tag (national/region/territory/city)
  cityName: string;
  regionId?: string; // FRENCH_CITIES id of the region/territory the store sits in
  regionName?: string;
  localityName?: string; // actual commune from addressComponents
  displayName: string;
  formattedAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[]; [key: string]: any };
  restroom?: boolean;
  priceLevel?: string;
  reviews?: PlaceReview[];
  editorialSummary?: { text?: string; languageCode?: string };
  generativeSummary?: { overview?: { text?: string }; description?: { text?: string }; [key: string]: any };
  reviewSummary?: { text?: { text?: string }; [key: string]: any };
  fetchedAt: string;
  rawData: Record<string, any>;
}

export interface ExtractionLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
  chainName?: string;
  cityName?: string;
}

export interface ExtractionProgress {
  isRunning: boolean;
  isPaused: boolean;
  totalTasks: number;
  completedTasks: number;
  currentTaskIndex: number;
  currentChain?: string;
  currentCity?: string;
  foundCount: number;
  duplicateCount: number;
  errorCount: number;
}

export interface ExtractionConfig {
  apiKey: string;
  selectedChainIds: string[];
  selectedCityIds: string[];
  delayMs: number;
  radiusMeters: number;
  maxResultsPerQuery: number;
  language: string;
  includeEditorialSummary: boolean;
  includeGenerativeSummary: boolean;
  includeReviewSummary: boolean;
  includeReviews: boolean;
  includeRestroom: boolean;
  includePriceLevel: boolean;
}

export interface PlacesSearchResponse {
  places?: Array<{
    id?: string;
    name?: string;
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    businessStatus?: string;
    types?: string[];
    primaryType?: string;
    reviews?: PlaceReview[];
    editorialSummary?: { text?: string; languageCode?: string };
    generativeSummary?: any;
    reviewSummary?: any;
    [key: string]: any;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}
