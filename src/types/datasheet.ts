export interface ComponentDatasheet {
  id: string;
  partNumber: string;
  normalizedPartNumber: string;
  manufacturer: string;
  category: string;
  description: string;
  package?: string;
  pinCount?: number;
  mountingType?: 'Through Hole' | 'SMD' | 'Module' | 'Chassis';
  datasheetUrl: string;
  manufacturerUrl?: string;
  allDataSheetUrl?: string;
  verified: boolean;
  featured?: boolean;
  specs?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DatasheetCategory {
  slug: string;
  name: string;
  description: string;
  iconName?: string;
}
