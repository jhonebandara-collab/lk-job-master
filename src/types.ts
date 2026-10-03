export interface JobSource {
  name: string;
  url: string;
  sourceJobId?: string;
  scrapedAt: string;
}

export interface JobVacancy {
  id: string;
  title: string;
  titleSi: string;
  organization: string;
  category: 'GOVERNMENT' | 'SEMI_GOVERNMENT' | 'PRIVATE';
  gazetteReference?: string;
  sources: JobSource[];
  educationRequired: string[];
  qualificationsText: string;
  experienceYears: number;
  ageLimit: string;
  salaryRange: string;
  closingDate: string;
  location: string;
  applicationMethod: 'ONLINE' | 'POSTAL_GAZETTE' | 'EMAIL' | 'WALK_IN';
  applyAddressOrLink: string;
  gazetteDownloadUrl?: string;
  isGazettePartIIA: boolean;
  tags: string[];
  createdAt: string;
  mergedCount: number;
}

export interface UserSubscription {
  status: 'INACTIVE' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED';
  planAmount: number;
  currency: string;
  startedAt?: string;
  expiresAt?: string;
  paymentMethod?: 'BANK_TRANSFER' | 'CARD_ONLINE';
  slipUrl?: string;
  referenceCode?: string;
  approvedAt?: string;
}

export interface UserProfile {
  userId: string; // e.g. LK-JM-82910
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  nicOrId?: string;
  age?: number | string;
  address?: string;
  city?: string;
  district: string;
  preferredSectors: string[];
  preferredRoles: string[];
  preferredLocations?: string[];
  educationLevel: string;
  olPassed: boolean;
  olEnglishAndMaths: boolean;
  alPassed: boolean;
  alStream: string;
  alSubjectsSummary?: string;
  higherEducation: string;
  skills: string[];
  experienceYears: number;
  experienceHistory?: string;
  cvFileName?: string;
  cvSummary?: string;
  isVerifiedByUser?: boolean;
  confirmedAt?: string;
  subscription: UserSubscription;
  alertPreferences: {
    email: boolean;
    whatsapp: boolean;
    minimumMatchScore: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface JobMatchResult {
  job: JobVacancy;
  matchScore: number;
  reasons: string[];
  missingQualifications: string[];
  isHighMatch: boolean;
}

export interface NotificationLog {
  id: string;
  userId: string;
  userName: string;
  channel: 'WHATSAPP' | 'EMAIL';
  recipient: string;
  jobCount: number;
  jobTitles: string[];
  dispatchedAt: string;
  status: 'SENT' | 'SIMULATED';
  whatsappLink?: string;
}
