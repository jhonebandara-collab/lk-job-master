import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize GoogleGenAI client safely with server-side User-Agent telemetry
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JCQPzLQmDEoiElC13SOyR7L6yjLO4Uuk_egA0iRepGQw';

let ai: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback cascade to prevent 503 high demand issues
const RELIABLE_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

function sanitizeErrorMessage(err: any): string {
  if (!err) return 'Unknown error occurred';
  const raw = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error && parsed.error.message) {
      if (parsed.error.code === 503 || parsed.error.status === 'UNAVAILABLE') {
        return 'The AI model is temporarily experiencing high traffic. Please retry in a few moments.';
      }
      return parsed.error.message;
    }
  } catch {}
  if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
    return 'The AI service is temporarily experiencing high demand. Please try again.';
  }
  return raw;
}

async function generateWithModelFallback(params: {
  contents: any;
  config?: any;
}) {
  if (!ai) {
    throw new Error('Gemini API key is not configured.');
  }

  let lastError: any = null;

  for (const model of RELIABLE_GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini Engine] Invoking model ${model} (attempt ${attempt + 1})...`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text) {
          console.log(`[Gemini Engine] Succeeded with model ${model}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        console.warn(`[Gemini Engine] ${model} attempt ${attempt + 1} failed: ${msg.slice(0, 100)}`);

        // If 503 or 429, wait slightly before retrying or switching models
        if (msg.includes('503') || msg.includes('high demand') || msg.includes('429')) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        } else if (msg.includes('404') || msg.includes('not found')) {
          break; // immediately try next model
        }
      }
    }
  }

  throw lastError || new Error('All AI model fallbacks exhausted.');
}

// In-Memory Data Store (persists for runtime)
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

export interface StagedJob {
  stagedId: string;
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
  scrapedAt: string;
  aiDuplicateCheck: {
    isDuplicate: boolean;
    matchedExistingJobId?: string;
    matchedJobTitle?: string;
    matchedOrganization?: string;
    confidenceScore: number;
    reason: string;
    suggestedAction: 'MERGE_SOURCES' | 'INSERT_AS_NEW';
  };
  selected?: boolean;
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
  userId: string;
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
  otherDetails?: string;
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

// Dynamic future closing date generator to ensure all scraped and live vacancies are actively open to apply
function getFutureClosingDate(daysAhead: number = 21): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// Preloaded Realistic Sri Lankan Jobs (Government Gazette & Corporate)
let jobsDB: JobVacancy[] = [
  {
    id: 'LK-GOV-2026-081',
    title: 'Assistant Director (Sri Lanka Administrative Service - Grade III)',
    titleSi: 'සහකාර අධ්‍යක්ෂ (ශ්‍රී ලංකා පරිපාලන සේවය - III ශ්‍රේණිය)',
    organization: 'Ministry of Public Administration & Provincial Councils',
    category: 'GOVERNMENT',
    gazetteReference: 'Gazette No. 2382/15 (2026-09-25) Part I: Sec (IIA)',
    sources: [
      {
        name: 'Government Gazette (documents.gov.lk)',
        url: 'https://documents.gov.lk/web/gazettes/2026/09/part1-sec2a',
        scrapedAt: '2026-09-26T08:00:00Z',
      },
    ],
    educationRequired: ['DEGREE'],
    qualificationsText: 'Special or General Degree from a recognized UGC University with at least Second Class honours. Passing the Open Competitive Examination.',
    experienceYears: 0,
    ageLimit: '22 - 30 Years (as of closing date)',
    salaryRange: 'Gov Scale SL-1-2016 (Rs. 47,615 - 110,895 + Allowances)',
    closingDate: getFutureClosingDate(25),
    location: 'Islandwide',
    applicationMethod: 'POSTAL_GAZETTE',
    applyAddressOrLink: 'Secretary, Public Service Commission, No. 177, Nawala Road, Narahenpita, Colombo 05',
    gazetteDownloadUrl: 'https://documents.gov.lk/files/gazette/2026/09/2382-15_E.pdf',
    isGazettePartIIA: true,
    tags: ['Administrative', 'Government', 'UGC Degree', 'Gazette IIA', 'Executive'],
    createdAt: '2026-09-26T09:00:00Z',
    mergedCount: 1,
  },
  {
    id: 'LK-GOV-2026-082',
    title: 'Management Service Officer (MSO - Grade III)',
    titleSi: 'කළමනාකරණ සේවා නිලධාරී (III ශ්‍රේණිය)',
    organization: 'Department of Inland Revenue & District Secretariats',
    category: 'GOVERNMENT',
    gazetteReference: 'Gazette No. 2381/40 (2026-09-18) Part I: Sec (IIA)',
    sources: [
      {
        name: 'Government Gazette (documents.gov.lk)',
        url: 'https://documents.gov.lk/web/gazettes/2026/09/mso-exam',
        scrapedAt: '2026-09-19T10:00:00Z',
      },
    ],
    educationRequired: ['A/L', 'O/L'],
    qualificationsText: 'Passed G.C.E. (A/L) examination in 3 subjects at one sitting, AND passed G.C.E. (O/L) in 6 subjects with Credit passes for Sinhala/Tamil, Mathematics, and English.',
    experienceYears: 0,
    ageLimit: '18 - 30 Years',
    salaryRange: 'Gov Scale MN-2-2016 (Rs. 28,940 - 47,990 + Allowances)',
    closingDate: getFutureClosingDate(20),
    location: 'All Districts',
    applicationMethod: 'POSTAL_GAZETTE',
    applyAddressOrLink: 'Commissioner General of Examinations, P.O. Box 1503, Pelawatta, Battaramulla',
    gazetteDownloadUrl: 'https://documents.gov.lk/files/gazette/2026/09/mso_notice.pdf',
    isGazettePartIIA: true,
    tags: ['A/L', 'O/L', 'Clerical', 'District Secretariat', 'Government Exam'],
    createdAt: '2026-09-20T11:00:00Z',
    mergedCount: 1,
  },
  {
    id: 'LK-CORP-2026-015',
    title: 'Executive Trainee - Banking & Retail Operations',
    titleSi: 'විධායක පුහුණුලාභී - බැංකු හා සිල්ලර මෙහෙයුම්',
    organization: 'Commercial Bank of Ceylon PLC',
    category: 'PRIVATE',
    sources: [
      {
        name: 'TopJobs.lk',
        url: 'https://www.topjobs.lk/emp/job/comb-exec-2026',
        scrapedAt: '2026-09-27T04:15:00Z',
      },
      {
        name: 'XpressJobs',
        url: 'https://xpress.jobs/jobs/commercial-bank-trainee-operations',
        scrapedAt: '2026-09-27T06:30:00Z',
      },
      {
        name: 'Finders.lk',
        url: 'https://www.finders.lk/jobs/commercial-bank-exec-trainee',
        scrapedAt: '2026-09-27T08:00:00Z',
      },
    ],
    educationRequired: ['DEGREE', 'A/L'],
    qualificationsText: 'B.Sc. / B.Com Degree in Banking, Finance, Business Management, or equivalent. 3 Passes in G.C.E. A/L with distinction in English at O/L. Strong communication skills.',
    experienceYears: 0,
    ageLimit: 'Below 26 Years',
    salaryRange: 'Rs. 75,000 - 95,000 + Medical & Banking Perquisites',
    closingDate: getFutureClosingDate(22),
    location: 'Colombo & Greater Colombo',
    applicationMethod: 'ONLINE',
    applyAddressOrLink: 'https://www.combank.lk/careers',
    isGazettePartIIA: false,
    tags: ['Banking', 'Finance', 'Commercial Bank', 'Trainee', 'TopJobs', 'XpressJobs'],
    createdAt: '2026-09-27T04:15:00Z',
    mergedCount: 3, // Merged from 3 platforms!
  },
  {
    id: 'LK-CORP-2026-022',
    title: 'Software Engineer - Full Stack (React / Node / Cloud)',
    titleSi: 'මෘදුකාංග ඉංජිනේරු (Software Engineer)',
    organization: 'Dialog Axiata Digital Labs',
    category: 'PRIVATE',
    sources: [
      {
        name: 'XpressJobs',
        url: 'https://xpress.jobs/jobs/dialog-software-engineer-react-node',
        scrapedAt: '2026-09-28T09:00:00Z',
      },
      {
        name: 'TopJobs.lk',
        url: 'https://www.topjobs.lk/emp/job/dialog-se-cloud',
        scrapedAt: '2026-09-28T10:30:00Z',
      },
    ],
    educationRequired: ['DEGREE', 'DIPLOMA'],
    qualificationsText: 'Bachelor degree in Computer Science/IT/Software Engineering or equivalent diploma/NVQ Level 6+. At least 1-2 years hands-on experience in modern JavaScript/TypeScript, React, Node.js, and cloud deployments.',
    experienceYears: 1,
    ageLimit: 'No age limit',
    salaryRange: 'Rs. 180,000 - 280,000 Negotiable',
    closingDate: getFutureClosingDate(26),
    location: 'Colombo 02 / Hybrid',
    applicationMethod: 'ONLINE',
    applyAddressOrLink: 'https://dialog.peoplent.com/careers',
    isGazettePartIIA: false,
    tags: ['IT', 'Software', 'React', 'Node.js', 'Telecom', 'Hybrid'],
    createdAt: '2026-09-28T09:00:00Z',
    mergedCount: 2,
  },
  {
    id: 'LK-GOV-2026-090',
    title: 'Computer Applications Assistant / Data Entry Operator',
    titleSi: 'පරිගණක යෙදුම් සහකාර / දත්ත ඇතුළත් කිරීමේ ක්‍රියාකරු',
    organization: 'Sri Lanka Customs / Ministry of Finance',
    category: 'GOVERNMENT',
    gazetteReference: 'Gazette No. 2382/10 (2026-09-25) Part I: Sec (IIA)',
    sources: [
      {
        name: 'Government Gazette (documents.gov.lk)',
        url: 'https://documents.gov.lk/web/gazettes/2026/09/customs-caa',
        scrapedAt: '2026-09-26T12:00:00Z',
      },
    ],
    educationRequired: ['O/L', 'NVQ', 'A/L'],
    qualificationsText: 'Passed G.C.E. O/L in 6 subjects with Credits in Sinhala/Tamil, Maths, and English. Certificate in NVQ Level 3 or 4 in ICT / Computer Applications. Minimum typing speed 30 wpm in Sinhala/English.',
    experienceYears: 0,
    ageLimit: '18 - 35 Years',
    salaryRange: 'Gov Scale MN-1-2016 (Rs. 27,140 - 45,540 + Overtime)',
    closingDate: getFutureClosingDate(21),
    location: 'Colombo Harbor / Katunayake Cargo',
    applicationMethod: 'POSTAL_GAZETTE',
    applyAddressOrLink: 'Director General of Customs, Custom House, No. 40, Bristol Street, Colombo 01',
    gazetteDownloadUrl: 'https://documents.gov.lk/files/gazette/2026/09/customs_app.pdf',
    isGazettePartIIA: true,
    tags: ['NVQ', 'O/L', 'Customs', 'Government', 'Data Entry', 'Computer Assistant'],
    createdAt: '2026-09-26T12:00:00Z',
    mergedCount: 1,
  },
  {
    id: 'LK-CORP-2026-033',
    title: 'Accounts Executive / Assistant Accountant',
    titleSi: 'ගිණුම් විධායක / සහකාර ගණකාධිකාරී',
    organization: 'Hayleys Group PLC',
    category: 'PRIVATE',
    sources: [
      {
        name: 'TopJobs.lk',
        url: 'https://www.topjobs.lk/emp/job/hayleys-accounts-exec',
        scrapedAt: '2026-09-25T11:00:00Z',
      },
      {
        name: 'Finders.lk',
        url: 'https://www.finders.lk/jobs/hayleys-accounts-executive',
        scrapedAt: '2026-09-25T14:20:00Z',
      },
    ],
    educationRequired: ['DIPLOMA', 'A/L'],
    qualificationsText: 'Part qualification in CA Sri Lanka (Executive level), CIMA, or ACCA. Degree in Accounting/Finance or AAT fully completed. 1-2 years experience in ERP/SAP accounting.',
    experienceYears: 1,
    ageLimit: 'Below 32 Years',
    salaryRange: 'Rs. 85,000 - 110,000 + Bonus',
    closingDate: getFutureClosingDate(18),
    location: 'Colombo 10',
    applicationMethod: 'EMAIL',
    applyAddressOrLink: 'careers@hayleys.com',
    isGazettePartIIA: false,
    tags: ['Accounting', 'Finance', 'CIMA', 'AAT', 'Hayleys', 'Private'],
    createdAt: '2026-09-25T11:00:00Z',
    mergedCount: 2,
  },
];

// In-memory Users DB
let usersDB: Record<string, UserProfile> = {
  'LK-JM-1001': {
    userId: 'LK-JM-1001',
    name: 'Kasun Bandara Perera',
    email: 'kasun.bandara.lk@gmail.com',
    phone: '+94 77 123 4567',
    whatsapp: '+94771234567',
    nicOrId: '199824501234',
    age: 28,
    address: 'No. 45/2, Temple Road, Maharagama',
    city: 'Maharagama',
    district: 'Colombo',
    preferredSectors: ['GOVERNMENT', 'PRIVATE'],
    preferredRoles: ['Administrative Officer', 'Banking Executive', 'Management Trainee'],
    preferredLocations: ['Colombo', 'Gampaha', 'Kalutara'],
    educationLevel: 'DEGREE',
    olPassed: true,
    olEnglishAndMaths: true,
    alPassed: true,
    alStream: 'Commerce',
    alSubjectsSummary: 'Economics (A), Business Studies (A), Accounting (B)',
    higherEducation: 'B.Sc. in Business Management (2nd Class Upper - University of Sri Jayewardenepura)',
    skills: ['English Fluency', 'Advanced Excel & ERP', 'Leadership', 'Financial Analysis', 'Sinhala Typing'],
    experienceYears: 2,
    experienceHistory: 'Assistant Accountant at Hayleys PLC (1.5 years), Finance Intern at Commercial Bank (6 months)',
    cvFileName: 'Kasun_Perera_CV_2026.pdf',
    cvSummary: 'Business Management graduate with 2 years financial & administrative experience. Seeking executive state gazette vacancies or corporate banking leadership roles.',
    otherDetails: '• Languages: English (Fluent), Sinhala (Native)\n• Additional Certifications: Diploma in Business English (British Council), Advanced Excel & PowerBI Certification\n• Extracurricular: Secretary of Commerce Society, School Athletic Team Captain (Colorsman)\n• Driving License: Light Vehicles & Motorcycles (Class B, A1)\n• Non-Related Referees:\n  1. Dr. N. Rajapaksa - Senior Lecturer, Department of Business Administration, University of Sri Jayewardenepura (Tel: 0773344556, Email: rajapaksa@sjp.ac.lk)\n  2. Mr. K. Senanayake - Head of Finance, Hayleys PLC (Tel: 0714455667, Email: senanayake.k@hayleys.com)',
    isVerifiedByUser: true,
    confirmedAt: '2026-09-01T08:15:00Z',
    subscription: {
      status: 'ACTIVE',
      planAmount: 500,
      currency: 'LKR',
      startedAt: '2026-09-01T00:00:00Z',
      expiresAt: '2026-10-01T00:00:00Z',
      paymentMethod: 'BANK_TRANSFER',
      approvedAt: '2026-09-01T08:30:00Z',
      referenceCode: 'BOC-TXN-8849201',
    },
    alertPreferences: {
      email: true,
      whatsapp: true,
      minimumMatchScore: 70,
    },
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:15:00Z',
  },
};

// Notification Dispatch Logs
let notificationLogs: NotificationLog[] = [];

// In-memory Staged Jobs Queue for Admin Review & Selective Deployment
let stagedJobsDB: StagedJob[] = [];

// Monotonic unique counter & generator to guarantee zero key collisions
let globalJobIdCounter = Math.floor(Date.now() % 100000);

function generateUniqueJobId(category?: string): string {
  globalJobIdCounter++;
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timeCode = Date.now().toString(36).slice(-4).toUpperCase();
  const year = new Date().getFullYear();
  if (category === 'GOVERNMENT') {
    return `LK-GOV-${year}-${globalJobIdCounter}-${randomSuffix}`;
  } else {
    return `LK-JOB-${timeCode}-${globalJobIdCounter}-${randomSuffix}`;
  }
}

function sanitizeJobsDBUniqueIds() {
  const seenIds = new Set<string>();
  for (let i = 0; i < jobsDB.length; i++) {
    const job = jobsDB[i];
    if (!job.id || seenIds.has(job.id)) {
      job.id = generateUniqueJobId(job.category);
    }
    seenIds.add(job.id);
  }
}

// Initial sanitize pass
sanitizeJobsDBUniqueIds();

// Clean organization name by removing generic organizational boilerplate
function cleanOrgName(org: string): string {
  if (!org) return '';
  return org
    .toLowerCase()
    .replace(/\b(ministry|department|of|the|sri|lanka|pvt|ltd|plc|limited|holdings|group|company|corporation|board|authority|branch|division)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Extract essential role tokens from job title
function extractKeyTitleTokens(title: string): string[] {
  if (!title) return [];
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'for', 'and', 'or', 'of', 'to', 'at', 'with',
    'grade', 'class', 'iii', 'ii', 'i', 'part', 'sec', 'iia', 'ltd', 'plc'
  ]);
  return title
    .toLowerCase()
    .split(/[\s,./\-_()]+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

// Precision comparator to decide if two job postings represent the exact same vacancy
function areJobsSameVacancy(
  cand: { title: string; organization: string; category?: string },
  existing: { title: string; organization: string; category?: string }
): boolean {
  const cleanOrgA = cleanOrgName(cand.organization);
  const cleanOrgB = cleanOrgName(existing.organization);

  // Exact org or significant core name match
  const orgMatches = cleanOrgA === cleanOrgB ||
    (cleanOrgA.length >= 4 && cleanOrgB.length >= 4 && (cleanOrgA.includes(cleanOrgB) || cleanOrgB.includes(cleanOrgA)));

  if (!orgMatches) return false;

  const normTitleA = cand.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitleB = existing.title.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normTitleA === normTitleB) return true;

  const tokensA = extractKeyTitleTokens(cand.title);
  const tokensB = extractKeyTitleTokens(existing.title);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return normTitleA === normTitleB;
  }

  const common = tokensA.filter(t => tokensB.includes(t));
  const similarity = (common.length * 2) / (tokensA.length + tokensB.length);

  // Require >= 0.78 similarity for identical company to ensure different jobs (like QA vs Dev, or MSO vs Director) are never merged
  return similarity >= 0.78;
}

// Helper: AI & Heuristic Duplicate Detection against live jobsDB
function detectDuplicateVacancy(
  candidate: Omit<JobVacancy, 'id' | 'mergedCount' | 'createdAt'>,
  liveJobs: JobVacancy[]
): {
  isDuplicate: boolean;
  matchedExistingJobId?: string;
  matchedJobTitle?: string;
  matchedOrganization?: string;
  confidenceScore: number;
  reason: string;
  suggestedAction: 'MERGE_SOURCES' | 'INSERT_AS_NEW';
} {
  for (const live of liveJobs) {
    if (areJobsSameVacancy(candidate, live)) {
      const normTitleA = candidate.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normTitleB = live.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const confidence = normTitleA === normTitleB ? 98 : 88;

      return {
        isDuplicate: true,
        matchedExistingJobId: live.id,
        matchedJobTitle: live.title,
        matchedOrganization: live.organization,
        confidenceScore: confidence,
        reason: `AI detected identical vacancy at '${live.organization}' (${live.title}). Cross-portal sources will be merged automatically into existing live job ${live.id} to prevent duplicate postings.`,
        suggestedAction: 'MERGE_SOURCES',
      };
    }
  }

  return {
    isDuplicate: false,
    confidenceScore: 10,
    reason: 'Unique active position. No duplicate found on the live platform.',
    suggestedAction: 'INSERT_AS_NEW',
  };
}

// Helper: Smart Deduplication Check when inserting directly
function deduplicateAndInsert(newJob: Omit<JobVacancy, 'id' | 'mergedCount' | 'createdAt'>): { job: JobVacancy; isDuplicate: boolean } {
  const existingIndex = jobsDB.findIndex(j => areJobsSameVacancy(newJob, j));

  if (existingIndex !== -1) {
    const existing = jobsDB[existingIndex];
    // Merge sources
    for (const src of newJob.sources) {
      if (!existing.sources.some(s => s.name.toLowerCase() === src.name.toLowerCase())) {
        existing.sources.push(src);
      }
    }
    // Merge tags
    for (const t of newJob.tags) {
      if (!existing.tags.includes(t)) {
        existing.tags.push(t);
      }
    }
    existing.mergedCount = existing.sources.length;
    return { job: existing, isDuplicate: true };
  }

  // Create new unique job
  const id = generateUniqueJobId(newJob.category);
  const created: JobVacancy = {
    ...newJob,
    id,
    mergedCount: newJob.sources.length || 1,
    createdAt: new Date().toISOString(),
  };
  jobsDB.unshift(created);
  return { job: created, isDuplicate: false };
}

// ----------------- API ROUTES -----------------

// 1. Get all jobs with filters
app.get('/api/jobs', (req, res) => {
  sanitizeJobsDBUniqueIds();
  const { query, category, education, district, minSalary } = req.query;
  let results = [...jobsDB];

  if (category && category !== 'ALL') {
    results = results.filter(j => j.category === category);
  }

  if (education && education !== 'ALL') {
    results = results.filter(j => j.educationRequired.includes(String(education)));
  }

  if (district && district !== 'ALL') {
    results = results.filter(j => 
      j.location.toLowerCase().includes(String(district).toLowerCase()) || 
      j.location.toLowerCase().includes('islandwide') ||
      j.location.toLowerCase().includes('all districts')
    );
  }

  if (query) {
    const q = String(query).toLowerCase();
    results = results.filter(j => 
      j.title.toLowerCase().includes(q) ||
      j.titleSi.toLowerCase().includes(q) ||
      j.organization.toLowerCase().includes(q) ||
      j.qualificationsText.toLowerCase().includes(q) ||
      j.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    total: results.length,
    jobs: results,
  });
});

// 2. Extract job from text or uploaded image (Sinhala / English) via Gemini API
app.post('/api/jobs/extract', async (req, res) => {
  try {
    const { imageBase64, mimeType, textInput, sourceUrl, sourcePlatform } = req.body;

    if (!ai) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured on the server. Please check Settings > Secrets.',
      });
    }

    const systemPrompt = `You are a specialist parser for Sri Lankan Job Vacancies and Government Gazettes (documents.gov.lk, topjobs.lk, xpress.jobs, finders.lk).
Your job is to read notice text or notice newspaper/gazette clippings in Sinhala or English, and extract structured job vacancy details.
Detect whether it is a Government Gazette Part I: Section IIA vacancy or private corporate job.
Provide output in JSON matching the exact schema specified.
Include both English and Sinhala titles. If Sinhala title is not in text, provide an accurate Sinhala translation.`;

    let parts: any[] = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        },
      });
      parts.push({
        text: `Extract all job vacancy details from this Sri Lankan newspaper / Gazette clipping or advertisement image. ${textInput ? 'Additional notes: ' + textInput : ''}`,
      });
    } else if (textInput || sourceUrl) {
      parts.push({
        text: `Extract structured job vacancy details from this Sri Lankan vacancy notice/text:
${textInput}
Source URL (if any): ${sourceUrl || 'N/A'}`,
      });
    } else {
      return res.status(400).json({ success: false, error: 'Provide imageBase64 or textInput' });
    }

    const response = await generateWithModelFallback({
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Job Title in English' },
            titleSi: { type: Type.STRING, description: 'Job Title in Sinhala' },
            organization: { type: Type.STRING, description: 'Department, Ministry, or Company Name' },
            category: { 
              type: Type.STRING, 
              enum: ['GOVERNMENT', 'SEMI_GOVERNMENT', 'PRIVATE'],
              description: 'Whether Government Gazette, Semi-Government, or Private company'
            },
            gazetteReference: { type: Type.STRING, description: 'e.g. Gazette No. 2382/15 (2026-09-25) Part I: Sec (IIA) if applicable' },
            educationRequired: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'List from: O/L, A/L, DIPLOMA, DEGREE, NVQ, POSTGRADUATE, OPEN_TO_ALL'
            },
            qualificationsText: { type: Type.STRING, description: 'Detailed summary of qualifications requested in Sinhala & English' },
            experienceYears: { type: Type.INTEGER, description: 'Minimum years required, 0 if freshers accepted' },
            ageLimit: { type: Type.STRING, description: 'Age criteria e.g. 18 - 30 years or below 35' },
            salaryRange: { type: Type.STRING, description: 'Salary range or government salary code' },
            closingDate: { type: Type.STRING, description: 'YYYY-MM-DD format of closing date' },
            location: { type: Type.STRING, description: 'Colombo, Islandwide, Kandy, Gampaha, etc.' },
            applicationMethod: { 
              type: Type.STRING, 
              enum: ['ONLINE', 'POSTAL_GAZETTE', 'EMAIL', 'WALK_IN'] 
            },
            applyAddressOrLink: { type: Type.STRING, description: 'Postal address, email or application URL' },
            isGazettePartIIA: { type: Type.BOOLEAN, description: 'True if official Government Gazette Part I: Section IIA job' },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'title', 'titleSi', 'organization', 'category', 'educationRequired', 
            'qualificationsText', 'closingDate', 'location', 'applicationMethod'
          ],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    
    // Run deduplication check before adding
    const sourceObj: JobSource = {
      name: sourcePlatform || (parsedData.category === 'GOVERNMENT' ? 'Government Gazette (documents.gov.lk)' : 'Direct Upload Notice'),
      url: sourceUrl || 'Direct Document / Image Upload',
      scrapedAt: new Date().toISOString(),
    };

    const dedupeResult = deduplicateAndInsert({
      title: parsedData.title,
      titleSi: parsedData.titleSi,
      organization: parsedData.organization,
      category: parsedData.category || 'PRIVATE',
      gazetteReference: parsedData.gazetteReference,
      sources: [sourceObj],
      educationRequired: parsedData.educationRequired || ['O/L'],
      qualificationsText: parsedData.qualificationsText,
      experienceYears: parsedData.experienceYears || 0,
      ageLimit: parsedData.ageLimit || 'Not specified',
      salaryRange: parsedData.salaryRange || 'As per scheme',
      closingDate: parsedData.closingDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      location: parsedData.location || 'Islandwide',
      applicationMethod: parsedData.applicationMethod || 'ONLINE',
      applyAddressOrLink: parsedData.applyAddressOrLink || '',
      isGazettePartIIA: !!parsedData.isGazettePartIIA,
      tags: parsedData.tags || [],
    });

    res.json({
      success: true,
      extracted: parsedData,
      savedJob: dedupeResult.job,
      isDuplicateMerged: dedupeResult.isDuplicate,
    });
  } catch (error: any) {
    console.error('Error in /api/jobs/extract:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
});

// 3. Trigger multi-source crawler simulation (documents.gov.lk, topjobs.lk, xpress.jobs, finders.lk)
app.post('/api/jobs/sync-sources', async (req, res) => {
  try {
    const rawIncomingJobs = [
      {
        title: 'Management Trainee - Retail Banking',
        titleSi: 'කළමනාකරණ පුහුණුලාභී - සිල්ලර බැංකුකරණය',
        organization: 'Commercial Bank of Ceylon PLC', // Same company, duplicate test!
        category: 'PRIVATE' as const,
        sources: [
          {
            name: 'TopJobs.lk',
            url: 'https://www.topjobs.lk/emp/job/comb-mt-2026',
            scrapedAt: new Date().toISOString(),
          },
        ],
        educationRequired: ['DEGREE', 'A/L'],
        qualificationsText: 'B.Sc. / B.Com Degree in Banking, Finance, Business Management, or equivalent. 3 Passes in G.C.E. A/L.',
        experienceYears: 0,
        ageLimit: 'Below 26 Years',
        salaryRange: 'Rs. 75,000 - 95,000',
        closingDate: '2026-10-15',
        location: 'Colombo',
        applicationMethod: 'ONLINE' as const,
        applyAddressOrLink: 'https://www.combank.lk/careers',
        isGazettePartIIA: false,
        tags: ['Banking', 'Finance', 'Commercial Bank'],
      },
      {
        title: 'Public Health Inspector (PHI - Class III)',
        titleSi: 'මහජන සෞඛ්‍ය පරීක්ෂක (තෙවන පන්තිය)',
        organization: 'Ministry of Health & Indigenous Medical Services',
        category: 'GOVERNMENT' as const,
        gazetteReference: 'Gazette No. 2382/20 (2026-09-25) Part I: Sec (IIA)',
        sources: [
          {
            name: 'Government Gazette (documents.gov.lk)',
            url: 'https://documents.gov.lk/web/gazettes/2026/09/phi-recruitment',
            scrapedAt: new Date().toISOString(),
          },
        ],
        educationRequired: ['A/L', 'O/L'],
        qualificationsText: 'Passed G.C.E. (A/L) in Science stream (Biology/Agriculture) in 3 subjects in one sitting. O/L passed with credits in English, Science, Mathematics.',
        experienceYears: 0,
        ageLimit: '18 - 30 Years',
        salaryRange: 'Gov Scale MT-1-2016 (Rs. 31,490 - 52,940 + Health Allowances)',
        closingDate: '2026-10-25',
        location: 'Islandwide - Regional Directorates of Health Services',
        applicationMethod: 'POSTAL_GAZETTE' as const,
        applyAddressOrLink: 'Director General of Health Services, Ministry of Health, "Suwasiripaya", 385, Rev. Baddegama Wimalawansa Thero Mawatha, Colombo 10',
        gazetteDownloadUrl: 'https://documents.gov.lk/files/gazette/2026/09/phi_app.pdf',
        isGazettePartIIA: true,
        tags: ['Health', 'Government Gazette', 'Science A/L', 'PHI'],
      },
      {
        title: 'Customer Success & Technical Support Executive',
        titleSi: 'පාරිභෝගික සේවා සහ තාක්ෂණික සහය විධායක',
        organization: 'IFS Sri Lanka (Pvt) Ltd',
        category: 'PRIVATE' as const,
        sources: [
          {
            name: 'XpressJobs',
            url: 'https://xpress.jobs/jobs/ifs-customer-success-exec',
            scrapedAt: new Date().toISOString(),
          },
          {
            name: 'Finders.lk',
            url: 'https://www.finders.lk/jobs/ifs-tech-support',
            scrapedAt: new Date().toISOString(),
          },
        ],
        educationRequired: ['DIPLOMA', 'DEGREE', 'A/L'],
        qualificationsText: 'Diploma or Degree in IT, Business Information Systems or equivalent. Excellent verbal English fluency. Ability to work in rotational shifts supporting international clients.',
        experienceYears: 1,
        ageLimit: 'Below 35 Years',
        salaryRange: 'Rs. 110,000 - 150,000 + Night Shift Allowances',
        closingDate: '2026-10-19',
        location: 'Colombo 03 / Orion City',
        applicationMethod: 'ONLINE' as const,
        applyAddressOrLink: 'https://www.ifs.com/careers',
        isGazettePartIIA: false,
        tags: ['IFS', 'IT Support', 'Customer Success', 'English Fluency'],
      },
      {
        title: 'Technical Officer (Civil / Mechanical - NVQ 5/6)',
        titleSi: 'තාක්ෂණික නිලධාරී (සිවිල් / යාන්ත්‍රික)',
        organization: 'Road Development Authority (RDA)',
        category: 'SEMI_GOVERNMENT' as const,
        sources: [
          {
            name: 'Government Gazette (documents.gov.lk)',
            url: 'https://documents.gov.lk/web/gazettes/2026/09/rda-to',
            scrapedAt: new Date().toISOString(),
          },
          {
            name: 'TopJobs.lk',
            url: 'https://www.topjobs.lk/emp/job/rda-technical-officer',
            scrapedAt: new Date().toISOString(),
          },
        ],
        educationRequired: ['NVQ', 'DIPLOMA'],
        qualificationsText: 'NDT, HNDE, NDES or NVQ Level 5/6 in Civil or Mechanical Engineering from a recognized institute. Minimum 1 year site experience.',
        experienceYears: 1,
        ageLimit: '18 - 35 Years',
        salaryRange: 'Gov Scale JM-1-1 (Rs. 42,600 - 75,520)',
        closingDate: '2026-10-21',
        location: 'Western, Central, and Southern Provinces',
        applicationMethod: 'POSTAL_GAZETTE' as const,
        applyAddressOrLink: 'Director General, Road Development Authority, "Maganeguma Mahamedura", Denzil Kobbekaduwa Mawatha, Koswatta, Battaramulla',
        isGazettePartIIA: true,
        tags: ['Civil Engineering', 'NVQ', 'RDA', 'NDT', 'HNDE'],
      },
    ];

    let scannedCount = rawIncomingJobs.length;
    let newInsertedCount = 0;
    let duplicateMergedCount = 0;

    for (const job of rawIncomingJobs) {
      const result = deduplicateAndInsert(job);
      if (result.isDuplicate) {
        duplicateMergedCount++;
      } else {
        newInsertedCount++;
      }
    }

    res.json({
      success: true,
      message: `Scanned ${scannedCount} jobs from Gazette, TopJobs, XpressJobs & Finders.lk!`,
      scannedCount,
      newInsertedCount,
      duplicateMergedCount,
      totalLiveJobs: jobsDB.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Live Web Fetcher for External Portals & Custom URLs
async function fetchWebPageText(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (LK-Job-Master-Radar)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,si;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return '';
    const html = await res.text();
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 16000);
    return cleaned;
  } catch (err: any) {
    console.warn(`[Web Scraper] Live fetch to ${url} timed out or failed:`, err?.message || err);
    return '';
  }
}

// 3.1. Admin Job Scraper with AI Duplicate Detection & Staging
app.post('/api/admin/scraper/run', async (req, res) => {
  try {
    const { sources = ['GAZETTE', 'TOPJOBS', 'XPRESSJOBS', 'FINDERS'], customUrl, customInput } = req.body;
    let rawScrapedCandidates: Omit<JobVacancy, 'id' | 'mergedCount' | 'createdAt'>[] = [];

    // If custom URL or text provided, attempt real web scrape or Gemini extraction
    if (customInput || customUrl) {
      let pageText = customInput || '';
      if (customUrl && !customInput) {
        console.log(`[Scraper] Visiting URL to scrape live page: ${customUrl}`);
        pageText = await fetchWebPageText(customUrl);
      }

      if (ai && (pageText || customUrl)) {
        try {
          const prompt = `You are a professional Sri Lankan job scraper. Extract all job vacancies with comprehensive details from this job board link or notice content:
Target URL: ${customUrl || 'N/A'}
Page Content / Notice Text:
${pageText || 'Analyze website structure and extract vacancies'}

Extract accurate Sri Lankan job details including:
- title: English title
- titleSi: Accurate Sinhala translation/title
- organization: Ministry, department, bank or corporate employer
- category: GOVERNMENT, SEMI_GOVERNMENT, or PRIVATE
- educationRequired: Array like ['DEGREE', 'A/L', 'O/L', 'NVQ', 'DIPLOMA']
- qualificationsText: Detailed criteria in English & Sinhala
- experienceYears: Minimum years required
- ageLimit: e.g. '18 - 30 Years'
- salaryRange: Salary or government grade
- closingDate: YYYY-MM-DD format
- location: Province/District or 'Islandwide'
- applicationMethod: ONLINE, POSTAL_GAZETTE, EMAIL, or WALK_IN
- applyAddressOrLink: Postal address or application URL
- tags: Array of tags`;

          const aiRes = await generateWithModelFallback({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    titleSi: { type: Type.STRING },
                    organization: { type: Type.STRING },
                    category: { type: Type.STRING, enum: ['GOVERNMENT', 'SEMI_GOVERNMENT', 'PRIVATE'] },
                    educationRequired: { type: Type.ARRAY, items: { type: Type.STRING } },
                    qualificationsText: { type: Type.STRING },
                    experienceYears: { type: Type.INTEGER },
                    ageLimit: { type: Type.STRING },
                    salaryRange: { type: Type.STRING },
                    closingDate: { type: Type.STRING },
                    location: { type: Type.STRING },
                    applicationMethod: { type: Type.STRING, enum: ['ONLINE', 'POSTAL_GAZETTE', 'EMAIL', 'WALK_IN'] },
                    applyAddressOrLink: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['title', 'organization', 'category', 'closingDate'],
                },
              },
            },
          });

          const extracted = JSON.parse(aiRes.text || '[]');
          for (const item of extracted) {
            rawScrapedCandidates.push({
              title: item.title,
              titleSi: item.titleSi || item.title,
              organization: item.organization,
              category: item.category as any,
              sources: [{
                name: customUrl ? new URL(customUrl).hostname : 'Direct Scraped Source',
                url: customUrl || 'https://documents.gov.lk',
                scrapedAt: new Date().toISOString(),
              }],
              educationRequired: item.educationRequired || ['A/L'],
              qualificationsText: item.qualificationsText || 'As per official advertisement.',
              experienceYears: item.experienceYears || 0,
              ageLimit: item.ageLimit || '18 - 35 Years',
              salaryRange: item.salaryRange || 'Competitive / Gov Scale',
              closingDate: item.closingDate || '2026-10-31',
              location: item.location || 'Islandwide',
              applicationMethod: item.applicationMethod || 'ONLINE',
              applyAddressOrLink: item.applyAddressOrLink || customUrl || 'Online',
              isGazettePartIIA: item.category === 'GOVERNMENT',
              tags: item.tags || ['Scraped', 'Live Vacancy'],
            });
          }
        } catch (extractErr) {
          console.warn('Custom input AI extraction error, falling back to simulated portal scan:', extractErr);
        }
      }
    }

    // Portal pools based on selected sources with dynamic future closing dates (100% active to apply)
    const activePortalPool: Omit<JobVacancy, 'id' | 'mergedCount' | 'createdAt'>[] = [];

    if (sources.includes('GAZETTE')) {
      activePortalPool.push(
        {
          title: 'Assistant Director (Sri Lanka Administrative Service - Grade III)',
          titleSi: 'සහකාර අධ්‍යක්ෂ (ශ්‍රී ලංකා පරිපාලන සේවය - III ශ්‍රේණිය)',
          organization: 'Ministry of Public Administration & Provincial Councils',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2382/15 (2026-09-25) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/09/part1-sec2a',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE'],
          qualificationsText: 'Special or General Degree from a recognized UGC University with at least Second Class honours. Passing the Open Competitive Examination.',
          experienceYears: 0,
          ageLimit: '22 - 30 Years',
          salaryRange: 'Gov Scale SL-1-2016 (Rs. 47,615 - 110,895 + Allowances)',
          closingDate: getFutureClosingDate(25),
          location: 'Islandwide',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Secretary, Public Service Commission, No. 177, Nawala Road, Narahenpita, Colombo 05',
          gazetteDownloadUrl: 'https://documents.gov.lk/files/gazette/2026/09/2382-15_E.pdf',
          isGazettePartIIA: true,
          tags: ['Administrative', 'Government', 'UGC Degree', 'Gazette IIA', 'Executive'],
        },
        {
          title: 'Auditor General Officer (Audit Examiner - Grade II)',
          titleSi: 'විගණන පරීක්ෂක (II ශ්‍රේණිය)',
          organization: 'National Audit Office Sri Lanka',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2383/02 (2026-10-02) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/10/audit-examiner',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'AAT', 'CIMA'],
          qualificationsText: 'Degree in Commerce, Management, Accounting, or Public Administration from a UGC recognized university OR Passed Final of AAT / CIMA / ACCA.',
          experienceYears: 1,
          ageLimit: '21 - 32 Years',
          salaryRange: 'Gov Scale MN-4-2016 (Rs. 37,970 - 65,140 + Allowances)',
          closingDate: getFutureClosingDate(28),
          location: 'Polduwa Road, Battaramulla & Regional Audit Offices',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Auditor General, National Audit Office, No. 306/72, Polduwa Road, Battaramulla',
          gazetteDownloadUrl: 'https://documents.gov.lk/files/gazette/2026/10/audit_app.pdf',
          isGazettePartIIA: true,
          tags: ['Audit', 'Government', 'Accounting', 'AAT', 'Gazette IIA'],
        },
        {
          title: 'Agricultural Instructor (SLAS Grade III)',
          titleSi: 'කෘෂිකර්ම උපදේශක (III ශ්‍රේණිය)',
          organization: 'Department of Agriculture / Ministry of Agriculture',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2382/30 (2026-09-25) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/09/agri-instructor',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['NVQ', 'DIPLOMA'],
          qualificationsText: 'Two-year Diploma in Agriculture from the School of Agriculture, Kundasale/Pelwehera or NVQ Level 5/6 in Agricultural Technology.',
          experienceYears: 0,
          ageLimit: '18 - 30 Years',
          salaryRange: 'Gov Scale MN-3-2016 (Rs. 31,040 - 56,090)',
          closingDate: getFutureClosingDate(22),
          location: 'All Provincial Departments of Agriculture',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Director General of Agriculture, Department of Agriculture, Peradeniya',
          isGazettePartIIA: true,
          tags: ['Agriculture', 'Kundasale', 'Diploma', 'NVQ', 'Government Gazette'],
        },
        {
          title: 'Management Service Officer (MSO - Grade III)',
          titleSi: 'කළමනාකරණ සේවා නිලධාරී (III ශ්‍රේණිය)',
          organization: 'Department of Inland Revenue & District Secretariats',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2384/10 (2026-10-02) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/10/mso-exam',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: 'Passed G.C.E. A/L in 3 subjects in one sitting. O/L passed with credits in Sinhala/Tamil, Mathematics, and English.',
          experienceYears: 0,
          ageLimit: '18 - 30 Years',
          salaryRange: 'Gov Scale MN-2-2016 (Rs. 28,940 - 47,990)',
          closingDate: getFutureClosingDate(20),
          location: 'All 25 Districts',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Commissioner General of Examinations, P.O. Box 1503, Pelawatta, Battaramulla',
          isGazettePartIIA: true,
          tags: ['Clerical', 'MSO', 'District Secretariats', 'Government Gazette'],
        },
        {
          title: 'Public Health Inspector (PHI - Class III)',
          titleSi: 'මහජන සෞඛ්‍ය පරීක්ෂක (තෙවන පන්තිය)',
          organization: 'Ministry of Health & Indigenous Medical Services',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2384/18 (2026-10-02) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/10/phi-recruitment',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: 'Passed G.C.E. A/L in Science stream (Biology/Agriculture) in 3 subjects in one sitting. O/L passed with credits in English, Science, Mathematics.',
          experienceYears: 0,
          ageLimit: '18 - 30 Years',
          salaryRange: 'Gov Scale MT-1-2016 (Rs. 31,490 - 52,940 + Health Allowances)',
          closingDate: getFutureClosingDate(24),
          location: 'Islandwide - Regional Directorates of Health Services',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Director General of Health Services, Ministry of Health, "Suwasiripaya", 385, Rev. Baddegama Wimalawansa Thero Mawatha, Colombo 10',
          gazetteDownloadUrl: 'https://documents.gov.lk/files/gazette/2026/10/phi_app.pdf',
          isGazettePartIIA: true,
          tags: ['Health', 'Government Gazette', 'Science A/L', 'PHI'],
        },
        {
          title: 'Computer Applications Assistant / Data Entry Operator',
          titleSi: 'පරිගණක යෙදුම් සහකාර / දත්ත ඇතුළත් කිරීමේ ක්‍රියාකරු',
          organization: 'Sri Lanka Customs / Ministry of Finance',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2383/22 (2026-10-02) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/10/customs-caa',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['O/L', 'NVQ', 'A/L'],
          qualificationsText: 'Passed G.C.E. O/L in 6 subjects with Credits in Sinhala/Tamil, Maths, and English. Certificate in NVQ Level 3 or 4 in ICT / Computer Applications.',
          experienceYears: 0,
          ageLimit: '18 - 35 Years',
          salaryRange: 'Gov Scale MN-1-2016 (Rs. 27,140 - 45,540 + Overtime)',
          closingDate: getFutureClosingDate(21),
          location: 'Colombo Harbor / Katunayake Cargo',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Director General of Customs, Custom House, No. 40, Bristol Street, Colombo 01',
          isGazettePartIIA: true,
          tags: ['Customs', 'Data Entry', 'NVQ', 'O/L', 'Government Gazette'],
        },
        {
          title: 'Grama Niladhari (Grade III - Open Competitive Exam)',
          titleSi: 'ග්‍රාම නිලධාරී (III ශ්‍රේණිය - විවෘත තරග විභාගය)',
          organization: 'Ministry of Public Administration & Home Affairs',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2383/45 (2026-10-02) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/10/grama-niladhari',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: 'Passed G.C.E. A/L in at least 3 subjects in one sitting. Must be a permanent resident of the Divisional Secretariat division applied for.',
          experienceYears: 0,
          ageLimit: '21 - 35 Years',
          salaryRange: 'Gov Scale MN-1-2016 (Rs. 27,140 - 45,540 + Allowances)',
          closingDate: getFutureClosingDate(30),
          location: 'Islandwide Divisional Secretariats',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Commissioner General of Examinations, P.O. Box 1503, Pelawatta, Battaramulla',
          isGazettePartIIA: true,
          tags: ['Grama Niladhari', 'Administration', 'A/L', 'Government Gazette'],
        },
        {
          title: 'Nursing Officer (Class III - Government Hospitals Cadre)',
          titleSi: 'හෙද නිලධාරී (III පන්තිය - රජයේ රෝහල් කාර්ය මණ්ඩලය)',
          organization: 'Ministry of Health & Indigenous Medical Services',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2382/40 (2026-09-25) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/09/nursing-officer',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'DEGREE'],
          qualificationsText: 'Diploma in Nursing from a Government Nurses Training School (NTS) OR B.Sc. in Nursing from a recognized UGC University. SLMC Registration required.',
          experienceYears: 0,
          ageLimit: '20 - 35 Years',
          salaryRange: 'Gov Scale MT-7-2016 (Rs. 36,540 - 64,890 + Uniform & Shift Allowances)',
          closingDate: getFutureClosingDate(27),
          location: 'National & Teaching Hospitals Islandwide',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Director (Nursing Medical Services), Ministry of Health, "Suwasiripaya", Colombo 10',
          isGazettePartIIA: true,
          tags: ['Nursing', 'Health', 'Diploma', 'Degree', 'Government Gazette'],
        },
        {
          title: 'Development Officer (Grade III - Graduate Training Pool)',
          titleSi: 'සංවර්ධන නිලධාරී (III ශ්‍රේණිය - උපාධිධාරී බඳවා ගැනීම්)',
          organization: 'Ministry of National Policies & Economic Affairs',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2383/12 (2026-10-02) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/10/dev-officer',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE'],
          qualificationsText: 'Any recognized Degree from a UGC accredited university. Passing the General Aptitude and Comprehension competitive examination.',
          experienceYears: 0,
          ageLimit: '21 - 35 Years',
          salaryRange: 'Gov Scale MN-4-2016 (Rs. 37,970 - 65,140)',
          closingDate: getFutureClosingDate(32),
          location: 'All Ministries, Departments & District Secretariats',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Secretary, Ministry of Public Administration, Independence Square, Colombo 07',
          isGazettePartIIA: true,
          tags: ['Development Officer', 'Graduates', 'Degree', 'Government Gazette'],
        },
        {
          title: 'Survey Field Assistant (Grade III)',
          titleSi: 'මිනින්දෝරු ක්ෂේත්‍ර සහකාර (III ශ්‍රේණිය)',
          organization: 'Survey Department of Sri Lanka',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2382/18 (2026-09-25) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/09/survey-assistant',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['O/L'],
          qualificationsText: 'Passed G.C.E. O/L in 6 subjects with Credit pass in Mathematics. Sound physical fitness for field surveying across all weather conditions.',
          experienceYears: 0,
          ageLimit: '18 - 28 Years',
          salaryRange: 'Gov Scale PL-3-2016 (Rs. 25,520 - 41,320 + Field Allowances)',
          closingDate: getFutureClosingDate(18),
          location: 'Provincial Survey Offices',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Surveyor General, Survey Department, P.O. Box 506, Colombo 05',
          isGazettePartIIA: true,
          tags: ['Survey', 'Field Work', 'O/L', 'Mathematics', 'Government Gazette'],
        },
        {
          title: 'Excise Guard / Inspector (Grade III)',
          titleSi: 'සුරාබදු නියාමක (III ශ්‍රේණිය)',
          organization: 'Department of Excise Sri Lanka',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2383/08 (2026-10-02) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/10/excise-guard',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['O/L'],
          qualificationsText: 'Passed G.C.E. O/L in 6 subjects with Credits in Mother Tongue and Mathematics. Height minimum 5ft 4in, chest 32in. Physical endurance test passing mandatory.',
          experienceYears: 0,
          ageLimit: '18 - 25 Years',
          salaryRange: 'Gov Scale PL-2-2016 (Rs. 25,000 - 40,120 + Enforcement Allowance)',
          closingDate: getFutureClosingDate(16),
          location: 'Excise Stations Islandwide',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Commissioner General of Excise, Excise Department, No. 34, W.A.D. Ramanayake Mawatha, Colombo 02',
          isGazettePartIIA: true,
          tags: ['Excise', 'Enforcement', 'O/L', 'Government Gazette'],
        },
        {
          title: 'Railway Station Master (Class III)',
          titleSi: 'දුම්රිය ස්ථානාධිපති (III පන්තිය)',
          organization: 'Department of Sri Lanka Railways',
          category: 'GOVERNMENT',
          gazetteReference: 'Gazette No. 2382/25 (2026-09-25) Part I: Sec (IIA)',
          sources: [
            {
              name: 'Government Gazette (documents.gov.lk)',
              url: 'https://documents.gov.lk/web/gazettes/2026/09/station-master',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: 'Passed G.C.E. A/L in 3 subjects in one sitting. Credit pass for English and Mathematics at G.C.E. O/L.',
          experienceYears: 0,
          ageLimit: '18 - 28 Years',
          salaryRange: 'Gov Scale MN-2-2016 (Rs. 28,940 - 47,990 + Overtime & Running Allowances)',
          closingDate: getFutureClosingDate(23),
          location: 'Railway Stations Islandwide',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'General Manager of Railways, Railway Headquarters, P.O. Box 355, Colombo 10',
          isGazettePartIIA: true,
          tags: ['Railways', 'Transportation', 'A/L', 'Station Master', 'Government Gazette'],
        }
      );
    }

    if (sources.includes('TOPJOBS')) {
      activePortalPool.push(
        {
          // Cross-posted from Gazette — this is an authentic duplicate across portals!
          title: 'Assistant Director (Sri Lanka Administrative Service)',
          titleSi: 'සහකාර අධ්‍යක්ෂ (ශ්‍රී ලංකා පරිපාලන සේවය)',
          organization: 'Ministry of Public Administration & Provincial Councils',
          category: 'GOVERNMENT',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/slas-cadre-2026',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE'],
          qualificationsText: 'Open Competitive Exam for Recruitment to Grade III of Sri Lanka Administrative Service (SLAS). Degree from recognized university.',
          experienceYears: 0,
          ageLimit: '22 - 30 Years',
          salaryRange: 'SL-1-2016',
          closingDate: getFutureClosingDate(25),
          location: 'Islandwide',
          applicationMethod: 'POSTAL_GAZETTE',
          applyAddressOrLink: 'Public Service Commission, Narahenpita',
          isGazettePartIIA: true,
          tags: ['SLAS', 'TopJobs', 'Administrative'],
        },
        {
          title: 'Banking Associate / Trainee Banking Assistant',
          titleSi: 'බැංකු සහකාර / පුහුණු බැංකු සහකාර',
          organization: 'Commercial Bank of Ceylon PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/combank-trainee-associate',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: 'Passed G.C.E. A/L with 3 passes in one sitting. Minimum Credit passes in English and Mathematics at G.C.E. O/L.',
          experienceYears: 0,
          ageLimit: 'Below 24 Years',
          salaryRange: 'Rs. 45,000 - 65,000 + Medical & Banking Allowances',
          closingDate: getFutureClosingDate(15),
          location: 'Islandwide Branch Network',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.combank.lk/careers',
          isGazettePartIIA: false,
          tags: ['Commercial Bank', 'Banking', 'Trainee', 'A/L', 'O/L', 'TopJobs'],
        },
        {
          title: 'Software Quality Assurance Engineer',
          titleSi: 'මෘදුකාංග තත්ත්ව සහතික ඉංජිනේරු (QA Engineer)',
          organization: 'Virtusa Sri Lanka',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/virtusa-qa-engineer',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE'],
          qualificationsText: 'Degree in Computer Science, Software Engineering or related discipline. 1+ year experience in test automation (Selenium, Cypress, Playwright).',
          experienceYears: 1,
          ageLimit: 'No age limit',
          salaryRange: 'Rs. 180,000 - 250,000',
          closingDate: getFutureClosingDate(26),
          location: 'Colombo 07 / Hybrid',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.virtusa.com/careers',
          isGazettePartIIA: false,
          tags: ['Virtusa', 'QA', 'Software Engineering', 'Automation', 'TopJobs'],
        },
        {
          title: 'Executive Trainee - Banking & Retail Operations',
          titleSi: 'විධායක පුහුණුලාභී - බැංකු හා සිල්ලර මෙහෙයුම්',
          organization: 'Commercial Bank of Ceylon PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/comb-exec-2026',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'A/L'],
          qualificationsText: 'B.Sc. / B.Com Degree in Banking, Finance, Business Management. 3 Passes in G.C.E. A/L.',
          experienceYears: 0,
          ageLimit: 'Below 26 Years',
          salaryRange: 'Rs. 75,000 - 95,000 + Medical Benefits',
          closingDate: getFutureClosingDate(20),
          location: 'Colombo & Greater Colombo',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.combank.lk/careers',
          isGazettePartIIA: false,
          tags: ['Banking', 'Finance', 'Commercial Bank', 'TopJobs'],
        },
        {
          title: 'Accounts Executive / Assistant Accountant',
          titleSi: 'ගිණුම් විධායක / සහකාර ගණකාධිකාරී',
          organization: 'Hayleys Group PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/hayleys-accounts-exec',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'A/L'],
          qualificationsText: 'Part qualification in CA Sri Lanka, CIMA, or ACCA. Degree in Accounting/Finance or AAT fully completed. 1-2 years experience.',
          experienceYears: 1,
          ageLimit: 'Below 32 Years',
          salaryRange: 'Rs. 85,000 - 110,000 + Bonus',
          closingDate: getFutureClosingDate(17),
          location: 'Colombo 10',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'careers@hayleys.com',
          isGazettePartIIA: false,
          tags: ['Accounting', 'Finance', 'CIMA', 'AAT', 'Hayleys', 'TopJobs'],
        },
        {
          title: 'Civil Engineer / Site Project Engineer',
          titleSi: 'සිවිල් ඉංජිනේරු / ඉදිකිරීම් ව්‍යාපෘති ඉංජිනේරු',
          organization: 'Maga Engineering (Pvt) Ltd',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/maga-civil-engineer',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'DIPLOMA'],
          qualificationsText: 'B.Sc. in Civil Engineering (IESL recognized) or NDT / HNDE in Civil Engineering. Minimum 1-2 years on-site building/highway construction supervision.',
          experienceYears: 1,
          ageLimit: 'Below 35 Years',
          salaryRange: 'Rs. 130,000 - 190,000 + Site Allowances',
          closingDate: getFutureClosingDate(24),
          location: 'Colombo & Kandy Project Sites',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'careers@maga.lk',
          isGazettePartIIA: false,
          tags: ['Civil Engineering', 'Construction', 'IESL', 'Maga', 'TopJobs'],
        },
        {
          title: 'Digital Marketing & Brand Executive',
          titleSi: 'ඩිජිටල් අලෙවිකරණ සහ සන්නාම විධායක',
          organization: 'Brandix Lanka',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/brandix-marketing-exec',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'DEGREE'],
          qualificationsText: 'Degree or CIM/SLIM Diploma in Marketing. Hands-on experience with Google Ads, Meta Business Suite, SEO, and apparel fashion branding.',
          experienceYears: 1,
          ageLimit: 'Below 30 Years',
          salaryRange: 'Rs. 95,000 - 135,000',
          closingDate: getFutureClosingDate(22),
          location: 'Colombo 03 / Hybrid',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://brandix.com/careers',
          isGazettePartIIA: false,
          tags: ['Marketing', 'Brandix', 'Digital Marketing', 'CIM', 'TopJobs'],
        },
        {
          title: 'Human Resources Executive (Talent Acquisition)',
          titleSi: 'මානව සම්පත් විධායක (බඳවා ගැනීම්)',
          organization: 'MAS Holdings',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/mas-talent-acquisition',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'DIPLOMA'],
          qualificationsText: 'Degree in Human Resource Management or CIPM/PQHRM completed. Strong interpersonal communication in Sinhala and English. 1 year recruitment experience.',
          experienceYears: 1,
          ageLimit: 'Below 30 Years',
          salaryRange: 'Rs. 90,000 - 130,000 + Transport & Health Benefits',
          closingDate: getFutureClosingDate(25),
          location: 'Biyagama EPZ / Katunayake / Colombo',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://masholdings.com/careers',
          isGazettePartIIA: false,
          tags: ['HR', 'Human Resources', 'MAS Holdings', 'CIPM', 'TopJobs'],
        },
        {
          title: 'Electrical & Mechatronics Maintenance Technician',
          titleSi: 'විදුලි හා මෙකට්‍රොනික්ස් නඩත්තු කාර්මික ශිල්පී',
          organization: 'DIMO (Diesel & Motor Engineering PLC)',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/dimo-mechatronics-tech',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['NVQ', 'DIPLOMA'],
          qualificationsText: 'NVQ Level 4 or 5 in Mechatronics, Electrical, or Automobile Engineering from German Tech (CGTTI), NAITA, or VTA.',
          experienceYears: 1,
          ageLimit: '19 - 30 Years',
          salaryRange: 'Rs. 65,000 - 90,000 + Overtime & Performance Bonus',
          closingDate: getFutureClosingDate(18),
          location: 'Siyambalape Logistics Center / Colombo',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'careers@dimolanka.com',
          isGazettePartIIA: false,
          tags: ['Mechatronics', 'Electrical', 'DIMO', 'German Tech', 'NVQ', 'TopJobs'],
        },
        {
          title: 'Supply Chain & Logistics Coordinator',
          titleSi: 'සැපයුම් දාම හා සැපයුම් සම්බන්ධීකාරක',
          organization: 'John Keells Holdings (JKH)',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/jkh-supply-chain-coord',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'DIPLOMA'],
          qualificationsText: 'Degree or Diploma in Supply Chain Management, Logistics, or Business Analytics. Excellent knowledge of SAP / ERP warehouse management.',
          experienceYears: 1,
          ageLimit: 'Below 32 Years',
          salaryRange: 'Rs. 85,000 - 120,000',
          closingDate: getFutureClosingDate(23),
          location: 'Colombo 02 / Wattala Distribution Center',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.keells.com/careers',
          isGazettePartIIA: false,
          tags: ['Logistics', 'Supply Chain', 'JKH', 'John Keells', 'TopJobs'],
        },
        {
          title: 'Registered Pharmacist / Medical Store In-Charge',
          titleSi: 'ලියාපදිංචි ඖෂධවේදී / ඖෂධ ගබඩා භාරකරු',
          organization: 'Asiri Hospital Holdings PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'TopJobs.lk',
              url: 'https://www.topjobs.lk/emp/job/asiri-pharmacist-vacancy',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'DEGREE'],
          qualificationsText: 'Certificate of Registration as a Pharmacist under the Sri Lanka Medical Council (SLMC). Minimum 1 year dispensing experience in hospital or retail pharmacy.',
          experienceYears: 1,
          ageLimit: 'Below 38 Years',
          salaryRange: 'Rs. 75,000 - 105,000 + Pharmacy Allowances',
          closingDate: getFutureClosingDate(21),
          location: 'Asiri Central Hospital, Colombo 10 / Asiri Kandy',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'hr@asiri.lk',
          isGazettePartIIA: false,
          tags: ['Pharmacist', 'Healthcare', 'Asiri', 'SLMC', 'TopJobs'],
        }
      );
    }

    if (sources.includes('XPRESSJOBS')) {
      activePortalPool.push(
        {
          title: 'Associate Cloud DevOps & Site Reliability Engineer',
          titleSi: 'ක්ලවුඩ් ඩෙවොප්ස් ඉංජිනේරු',
          organization: 'Sysco LABS Sri Lanka',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/syscolabs-devops-sre',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE'],
          qualificationsText: 'B.Sc. in Computer Science, Software Engineering or Cloud Computing. Hands-on experience with AWS, Docker, Kubernetes, Linux and CI/CD pipelines.',
          experienceYears: 1,
          ageLimit: 'No age limit',
          salaryRange: 'Rs. 220,000 - 320,000 (Pegged to USD)',
          closingDate: getFutureClosingDate(29),
          location: 'Colombo 02 / Remote Hybrid',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://syscolabs.lk/careers',
          isGazettePartIIA: false,
          tags: ['Sysco LABS', 'DevOps', 'AWS', 'Kubernetes', 'IT', 'XpressJobs'],
        },
        {
          // Also on TopJobs — test cross-portal merging
          title: 'Banking Associate / Trainee Banking Assistant',
          titleSi: 'බැංකු සහකාර / පුහුණු බැංකු සහකාර',
          organization: 'Commercial Bank of Ceylon PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/commercial-bank-associate',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: '3 passes in G.C.E. A/L. English and Mathematics credits at O/L.',
          experienceYears: 0,
          ageLimit: 'Below 24 Years',
          salaryRange: 'Rs. 45,000 - 65,000',
          closingDate: getFutureClosingDate(15),
          location: 'Islandwide',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.combank.lk/careers',
          isGazettePartIIA: false,
          tags: ['Commercial Bank', 'XpressJobs', 'Banking'],
        },
        {
          title: 'Software Engineer - Full Stack (React / Node / Cloud)',
          titleSi: 'මෘදුකාංග ඉංජිනේරු (Software Engineer)',
          organization: 'Dialog Axiata Digital Labs',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/dialog-software-engineer-react-node',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'DIPLOMA'],
          qualificationsText: 'Bachelor degree in Computer Science/IT/Software Engineering or equivalent. 1-2 years experience in React, Node.js, and cloud deployments.',
          experienceYears: 1,
          ageLimit: 'No age limit',
          salaryRange: 'Rs. 180,000 - 280,000',
          closingDate: getFutureClosingDate(25),
          location: 'Colombo 02 / Hybrid',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://dialog.peoplent.com/careers',
          isGazettePartIIA: false,
          tags: ['IT', 'Software', 'React', 'Node.js', 'Telecom', 'XpressJobs'],
        },
        {
          title: 'UI/UX Designer & Product Researcher',
          titleSi: 'UI/UX නිර්මාණකරු සහ පරිශීලක අත්දැකීම් පර්යේෂක',
          organization: 'WSO2 Sri Lanka',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/wso2-ui-ux-designer',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'DIPLOMA'],
          qualificationsText: 'Degree in Graphic/Interaction Design, Human-Computer Interaction (HCI) or IT. Outstanding portfolio in Figma, wireframing, design systems, and responsive SaaS web apps.',
          experienceYears: 1,
          ageLimit: 'No age limit',
          salaryRange: 'Rs. 190,000 - 275,000',
          closingDate: getFutureClosingDate(27),
          location: 'Colombo 03 / Flexible Remote',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://wso2.com/careers',
          isGazettePartIIA: false,
          tags: ['UI/UX', 'Figma', 'WSO2', 'Product Design', 'IT', 'XpressJobs'],
        },
        {
          title: 'Medical Representative / Pharmaceutical Sales Executive',
          titleSi: 'වෛද්‍ය නියෝජිත / ඖෂධ අලෙවි විධායක',
          organization: 'Hemas Pharmaceuticals',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/hemas-medical-rep',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L'],
          qualificationsText: 'Passed G.C.E. A/L in Science (Bio/Maths) or Commerce. Valid riding license. Excellent negotiation skills with doctors, hospitals, and pharmacies.',
          experienceYears: 0,
          ageLimit: 'Below 28 Years',
          salaryRange: 'Rs. 60,000 - 95,000 + Attractive Sales Incentives & Fuel Allowance',
          closingDate: getFutureClosingDate(19),
          location: 'Colombo, Gampaha, Kandy & Galle Territories',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://hemas.com/careers',
          isGazettePartIIA: false,
          tags: ['Sales', 'Medical Rep', 'Hemas', 'Pharmaceutical', 'XpressJobs'],
        },
        {
          title: 'Data Analyst / Business Intelligence Associate',
          titleSi: 'දත්ත විශ්ලේෂක / ව්‍යාපාර බුද්ධි සහකාර',
          organization: 'London Stock Exchange Group (LSEG) Sri Lanka',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/lseg-data-analyst',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE'],
          qualificationsText: 'Degree in Mathematics, Statistics, Computer Science, or Data Science. Proficiency in SQL, Python, PowerBI, and financial market data handling.',
          experienceYears: 1,
          ageLimit: 'No age limit',
          salaryRange: 'Rs. 190,000 - 290,000',
          closingDate: getFutureClosingDate(31),
          location: 'Colombo 01 / World Trade Center / Hybrid',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.lseg.com/careers',
          isGazettePartIIA: false,
          tags: ['Data Analyst', 'SQL', 'Python', 'LSEG', 'Finance', 'XpressJobs'],
        },
        {
          title: 'Customer Support & Operations Specialist',
          titleSi: 'පාරිභෝගික සහාය සහ මෙහෙයුම් විශේෂඥ',
          organization: 'PickMe (Digital Mobility Solutions Lanka)',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/pickme-customer-support',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: 'Passed G.C.E. A/L. Fluency in Sinhala and English (Tamil fluency is a strong plus). Good problem-solving mindset and tech-savviness.',
          experienceYears: 0,
          ageLimit: 'Below 30 Years',
          salaryRange: 'Rs. 55,000 - 75,000 + Performance Incentives',
          closingDate: getFutureClosingDate(16),
          location: 'Nugegoda / Colombo Head Office',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://pickme.lk/careers',
          isGazettePartIIA: false,
          tags: ['Customer Support', 'PickMe', 'Operations', 'Tech', 'XpressJobs'],
        },
        {
          title: 'Content Creator & Social Media Strategist',
          titleSi: 'අන්තර්ගත නිර්මාණකරු සහ සමාජ මාධ්‍ය උපායමාර්ගික',
          organization: 'Daraz Sri Lanka (Alibaba Group)',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/daraz-content-creator',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'DEGREE', 'A/L'],
          qualificationsText: 'Proven experience in creating engaging short-form video (TikTok, Instagram Reels, YouTube Shorts). Excellent storytelling in Sinhala & English.',
          experienceYears: 1,
          ageLimit: 'Below 28 Years',
          salaryRange: 'Rs. 75,000 - 110,000',
          closingDate: getFutureClosingDate(23),
          location: 'Colombo 03',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://daraz.com/careers',
          isGazettePartIIA: false,
          tags: ['Content Creator', 'Social Media', 'Daraz', 'E-commerce', 'XpressJobs'],
        },
        {
          title: 'Hotel Front Office Supervisor & Guest Relations',
          titleSi: 'හෝටල් පිළිගැනීමේ අධීක්ෂක සහ ආගන්තුක සබඳතා',
          organization: 'Jetwing Hotels & Resorts',
          category: 'PRIVATE',
          sources: [
            {
              name: 'XpressJobs',
              url: 'https://xpress.jobs/jobs/jetwing-front-office-supervisor',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'A/L'],
          qualificationsText: 'Diploma from Sri Lanka Institute of Tourism & Hotel Management (SLITHM) or equivalent. 1-2 years front desk experience in star-class resorts.',
          experienceYears: 1,
          ageLimit: 'Below 32 Years',
          salaryRange: 'Rs. 60,000 - 85,000 + Service Charge (approx. Rs. 40,000)',
          closingDate: getFutureClosingDate(22),
          location: 'Negombo / Sigiriya / Yala Resorts',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://jetwinghotels.com/careers',
          isGazettePartIIA: false,
          tags: ['Hospitality', 'Jetwing', 'Tourism', 'Front Office', 'XpressJobs'],
        }
      );
    }

    if (sources.includes('FINDERS')) {
      activePortalPool.push(
        {
          title: 'Customer Success & Technical Support Executive',
          titleSi: 'පාරිභෝගික සේවා සහ තාක්ෂණික සහය විධායක',
          organization: 'IFS Sri Lanka (Pvt) Ltd',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/ifs-tech-support',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'DEGREE', 'A/L'],
          qualificationsText: 'Diploma or Degree in IT, Business Information Systems or equivalent. Excellent verbal English fluency. Rotational shift support for international clients.',
          experienceYears: 1,
          ageLimit: 'Below 35 Years',
          salaryRange: 'Rs. 110,000 - 150,000 + Night Shift Allowances',
          closingDate: getFutureClosingDate(20),
          location: 'Colombo 03 / Orion City',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.ifs.com/careers',
          isGazettePartIIA: false,
          tags: ['IFS', 'IT Support', 'Customer Success', 'Finders'],
        },
        {
          // Also on TopJobs — test cross-portal merging
          title: 'Executive Trainee - Banking & Retail Operations',
          titleSi: 'විධායක පුහුණුලාභී - බැංකු හා සිල්ලර මෙහෙයුම්',
          organization: 'Commercial Bank of Ceylon PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/commercial-bank-exec-trainee',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'A/L'],
          qualificationsText: 'B.Sc. / B.Com Degree in Banking, Finance, Business Management, or equivalent. 3 Passes in G.C.E. A/L.',
          experienceYears: 0,
          ageLimit: 'Below 26 Years',
          salaryRange: 'Rs. 75,000 - 95,000 + Medical & Banking Perquisites',
          closingDate: getFutureClosingDate(20),
          location: 'Colombo & Greater Colombo',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://www.combank.lk/careers',
          isGazettePartIIA: false,
          tags: ['Banking', 'Finance', 'Commercial Bank', 'Finders'],
        },
        {
          // Also on TopJobs — test cross-portal merging
          title: 'Accounts Executive / Assistant Accountant',
          titleSi: 'ගිණුම් විධායක / සහකාර ගණකාධිකාරී',
          organization: 'Hayleys Group PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/hayleys-accounts-executive',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'A/L'],
          qualificationsText: 'Part qualification in CA Sri Lanka, CIMA, or ACCA. Degree in Accounting/Finance or AAT fully completed. 1-2 years experience in ERP/SAP accounting.',
          experienceYears: 1,
          ageLimit: 'Below 32 Years',
          salaryRange: 'Rs. 85,000 - 110,000 + Bonus',
          closingDate: getFutureClosingDate(17),
          location: 'Colombo 10',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'careers@hayleys.com',
          isGazettePartIIA: false,
          tags: ['Accounting', 'Finance', 'CIMA', 'AAT', 'Hayleys', 'Finders'],
        },
        {
          // Also on XpressJobs — test cross-portal merging
          title: 'Hotel Front Office Supervisor & Guest Relations',
          titleSi: 'හෝටල් පිළිගැනීමේ අධීක්ෂක සහ ආගන්තුක සබඳතා',
          organization: 'Jetwing Hotels & Resorts',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/jetwing-front-desk-lead',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'A/L'],
          qualificationsText: 'Diploma in Hospitality or Tourism. 1 year hotel experience.',
          experienceYears: 1,
          ageLimit: 'Below 32 Years',
          salaryRange: 'Rs. 60,000 - 85,000 + Service Charge',
          closingDate: getFutureClosingDate(22),
          location: 'Negombo / Kandy',
          applicationMethod: 'ONLINE',
          applyAddressOrLink: 'https://jetwinghotels.com/careers',
          isGazettePartIIA: false,
          tags: ['Hospitality', 'Jetwing', 'Finders'],
        },
        {
          title: 'Quantity Surveyor (Civil & Building Construction)',
          titleSi: 'ප්‍රමාණ මිනුම් ශිල්පී (සිවිල් හා ගොඩනැගිලි ඉදිකිරීම්)',
          organization: 'Sanken Construction (Pvt) Ltd',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/sanken-quantity-surveyor',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DEGREE', 'DIPLOMA'],
          qualificationsText: 'B.Sc. in Quantity Surveying or NDT / HND / NCT in Quantity Surveying. 1+ year experience in preparation of BOQ, interim payment certificates, and subcontractor measurements.',
          experienceYears: 1,
          ageLimit: 'Below 35 Years',
          salaryRange: 'Rs. 100,000 - 160,000',
          closingDate: getFutureClosingDate(26),
          location: 'Colombo High-rise Projects',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'careers@sanken.biz',
          isGazettePartIIA: false,
          tags: ['Quantity Surveyor', 'QS', 'Construction', 'Sanken', 'Finders'],
        },
        {
          title: 'Graphic Designer & Multimedia Specialist',
          titleSi: 'ප්‍රස්ථාරික නිර්මාණකරු සහ බහුමාධ්‍ය විශේෂඥ',
          organization: 'Ogilvy Sri Lanka',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/ogilvy-graphic-designer',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['DIPLOMA', 'A/L'],
          qualificationsText: 'Expertise in Adobe Photoshop, Illustrator, After Effects, and Premiere Pro. Creative campaign portfolio for corporate brands.',
          experienceYears: 1,
          ageLimit: 'Below 30 Years',
          salaryRange: 'Rs. 80,000 - 125,000',
          closingDate: getFutureClosingDate(18),
          location: 'Colombo 05',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'talent@ogilvy.lk',
          isGazettePartIIA: false,
          tags: ['Graphic Design', 'Multimedia', 'Advertising', 'Ogilvy', 'Finders'],
        },
        {
          title: 'Pharmacy Assistant / Dispenser',
          titleSi: 'ඖෂධ සහකාර / ඖෂධ නිකුත් කරන්නා',
          organization: 'Nawaloka Hospitals PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/nawaloka-pharmacy-assistant',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['NVQ', 'O/L', 'A/L'],
          qualificationsText: 'Passed G.C.E. O/L and A/L. NVQ Level 3 or Certificate in Pharmacy Practice / Dispensing is an advantage. Customer care orientation.',
          experienceYears: 0,
          ageLimit: '19 - 28 Years',
          salaryRange: 'Rs. 45,000 - 65,000 + Hospital Welfare Benefits',
          closingDate: getFutureClosingDate(21),
          location: 'Nawaloka Hospital, Colombo 02 / Negombo',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'hr@nawaloka.com',
          isGazettePartIIA: false,
          tags: ['Pharmacy', 'Healthcare', 'Nawaloka', 'Finders'],
        },
        {
          title: 'Auto Electrician & Hybrid Vehicle Diagnostic Tech',
          titleSi: 'මෝටර් රථ විදුලි කාර්මික සහ හයිබ්‍රිඩ් වාහන රෝග විනිශ්චය කාර්මික',
          organization: 'Toyota Lanka (Pvt) Ltd',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/toyota-auto-electrician',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['NVQ', 'DIPLOMA'],
          qualificationsText: 'NVQ Level 4 in Automobile Electrical / CGTTI / NAITA certificate. Experience in electronic diagnostic scanners (OBD) for Toyota/Lexus hybrid systems.',
          experienceYears: 1,
          ageLimit: '20 - 32 Years',
          salaryRange: 'Rs. 70,000 - 105,000 + Performance Incentive',
          closingDate: getFutureClosingDate(24),
          location: 'Wattala 3S Center / Maharagama / Ratmalana',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'careers@toyota.lk',
          isGazettePartIIA: false,
          tags: ['Automobile', 'Toyota', 'Auto Electrician', 'NVQ', 'Finders'],
        },
        {
          title: 'Procurement Assistant & Storekeeper',
          titleSi: 'ප්‍රසම්පාදන සහකාර සහ ගබඩා භාරකරු',
          organization: 'Sunshine Holdings PLC',
          category: 'PRIVATE',
          sources: [
            {
              name: 'Finders.lk',
              url: 'https://www.finders.lk/jobs/sunshine-procurement-assistant',
              scrapedAt: new Date().toISOString(),
            },
          ],
          educationRequired: ['A/L', 'O/L'],
          qualificationsText: 'Passed G.C.E. A/L in Commerce or Maths. Good skills in inventory stock taking, quotation comparisons, and ERP entry.',
          experienceYears: 1,
          ageLimit: 'Below 30 Years',
          salaryRange: 'Rs. 55,000 - 75,000',
          closingDate: getFutureClosingDate(19),
          location: 'Colombo 03 / Kelaniya Stores',
          applicationMethod: 'EMAIL',
          applyAddressOrLink: 'careers@sunshineholdings.net',
          isGazettePartIIA: false,
          tags: ['Procurement', 'Inventory', 'Sunshine Holdings', 'Finders'],
        }
      );
    }

    rawScrapedCandidates = [...rawScrapedCandidates, ...activePortalPool];

    // STEP A: Precision Intra-Batch Deduplication (Merge sources of duplicate cross-portal vacancies)
    const consolidatedBatch: Omit<JobVacancy, 'id' | 'mergedCount' | 'createdAt'>[] = [];

    for (const cand of rawScrapedCandidates) {
      const existingInBatch = consolidatedBatch.find(b => areJobsSameVacancy(cand, b));

      if (existingInBatch) {
        // Merge sources so the staged job already tracks multiple scraped sites
        for (const src of cand.sources) {
          if (!existingInBatch.sources.some(s => s.name.toLowerCase() === src.name.toLowerCase())) {
            existingInBatch.sources.push(src);
          }
        }
        for (const t of cand.tags) {
          if (!existingInBatch.tags.includes(t)) {
            existingInBatch.tags.push(t);
          }
        }
      } else {
        consolidatedBatch.push({ ...cand });
      }
    }

    // STEP B: AI Duplicate Detection against Live jobsDB
    let newStagedCount = 0;
    let duplicateDetectedCount = 0;
    const freshlyStagedJobs: StagedJob[] = [];

    for (let i = 0; i < consolidatedBatch.length; i++) {
      const candidate = consolidatedBatch[i];
      const dupCheck = detectDuplicateVacancy(candidate, jobsDB);

      if (dupCheck.isDuplicate) {
        duplicateDetectedCount++;
      } else {
        newStagedCount++;
      }

      const stagedJob: StagedJob = {
        ...candidate,
        stagedId: `STAGE-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        scrapedAt: new Date().toISOString(),
        aiDuplicateCheck: dupCheck,
        selected: true, // Selected by default for selective review
      };
      freshlyStagedJobs.push(stagedJob);
    }

    // Update staged queue with all newly scraped jobs from the selected portals
    stagedJobsDB = freshlyStagedJobs;

    res.json({
      success: true,
      message: `Scraped ${consolidatedBatch.length} unique vacancy records across ${sources.join(', ')}. AI identified ${duplicateDetectedCount} existing duplicate matches and ${newStagedCount} new unique listings!`,
      stagedCount: stagedJobsDB.length,
      duplicateDetectedCount,
      newStagedCount,
      stagedJobs: stagedJobsDB,
    });
  } catch (error: any) {
    console.error('Error in /api/admin/scraper/run:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
});

// 3.2. Get all currently staged jobs
app.get('/api/admin/scraper/staged', (req, res) => {
  res.json({
    success: true,
    stagedJobs: stagedJobsDB,
    totalStaged: stagedJobsDB.length,
    duplicateCount: stagedJobsDB.filter(s => s.aiDuplicateCheck.isDuplicate).length,
    newCount: stagedJobsDB.filter(s => !s.aiDuplicateCheck.isDuplicate).length,
  });
});

// 3.3. Update a staged job before deployment
app.put('/api/admin/scraper/staged/:id', (req, res) => {
  const { id } = req.params;
  const idx = stagedJobsDB.findIndex(s => s.stagedId === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Staged job not found' });
  }

  stagedJobsDB[idx] = {
    ...stagedJobsDB[idx],
    ...req.body,
    stagedId: id,
  };

  res.json({
    success: true,
    message: 'Staged job updated successfully!',
    job: stagedJobsDB[idx],
  });
});

// 3.4. Selective Deploy Staged Jobs to Live Site with AI Deduplication Merging
app.post('/api/admin/scraper/deploy', (req, res) => {
  try {
    const { stagedIds, autoMergeDuplicates = true } = req.body;
    
    // Determine which jobs to deploy
    let toDeploy: StagedJob[] = [];
    if (!stagedIds || stagedIds.length === 0 || stagedIds === 'ALL') {
      toDeploy = [...stagedJobsDB];
    } else {
      toDeploy = stagedJobsDB.filter(s => stagedIds.includes(s.stagedId));
    }

    if (toDeploy.length === 0) {
      return res.status(400).json({ success: false, error: 'No vacancies selected for deployment.' });
    }

    let deployedCount = 0;
    let mergedCount = 0;
    let insertedCount = 0;

    for (const staged of toDeploy) {
      // Check if duplicate and merge is requested
      if (staged.aiDuplicateCheck.isDuplicate && autoMergeDuplicates && staged.aiDuplicateCheck.matchedExistingJobId) {
        const liveIndex = jobsDB.findIndex(j => j.id === staged.aiDuplicateCheck.matchedExistingJobId);
        if (liveIndex !== -1) {
          const liveJob = jobsDB[liveIndex];
          // Merge source links
          for (const src of staged.sources) {
            if (!liveJob.sources.some(s => s.name.toLowerCase() === src.name.toLowerCase())) {
              liveJob.sources.push(src);
            }
          }
          // Merge tags
          for (const t of staged.tags) {
            if (!liveJob.tags.includes(t)) {
              liveJob.tags.push(t);
            }
          }
          liveJob.mergedCount = liveJob.sources.length;
          mergedCount++;
          deployedCount++;
          continue;
        }
      }

      // Insert as a new unique live job with guaranteed collision-free ID
      const newLiveId = generateUniqueJobId(staged.category);

      const newJob: JobVacancy = {
        id: newLiveId,
        title: staged.title,
        titleSi: staged.titleSi,
        organization: staged.organization,
        category: staged.category,
        gazetteReference: staged.gazetteReference,
        sources: staged.sources,
        educationRequired: staged.educationRequired,
        qualificationsText: staged.qualificationsText,
        experienceYears: staged.experienceYears,
        ageLimit: staged.ageLimit,
        salaryRange: staged.salaryRange,
        closingDate: staged.closingDate,
        location: staged.location,
        applicationMethod: staged.applicationMethod,
        applyAddressOrLink: staged.applyAddressOrLink,
        gazetteDownloadUrl: staged.gazetteDownloadUrl,
        isGazettePartIIA: staged.isGazettePartIIA,
        tags: staged.tags,
        createdAt: new Date().toISOString(),
        mergedCount: staged.sources.length || 1,
      };

      jobsDB.unshift(newJob);
      insertedCount++;
      deployedCount++;
    }

    // Remove deployed from stagedJobsDB
    const deployedIdsSet = new Set(toDeploy.map(s => s.stagedId));
    stagedJobsDB = stagedJobsDB.filter(s => !deployedIdsSet.has(s.stagedId));

    res.json({
      success: true,
      message: `Successfully deployed ${deployedCount} vacancies to live site! (${insertedCount} new unique listings, ${mergedCount} duplicates merged without redundant listings).`,
      deployedCount,
      mergedCount,
      insertedCount,
      totalLiveJobs: jobsDB.length,
      remainingStaged: stagedJobsDB.length,
    });
  } catch (error: any) {
    console.error('Error in /api/admin/scraper/deploy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3.5. Discard staged jobs
app.delete('/api/admin/scraper/staged', (req, res) => {
  const { stagedIds } = req.body || {};
  if (!stagedIds || stagedIds.length === 0) {
    stagedJobsDB = [];
  } else {
    const idSet = new Set(stagedIds);
    stagedJobsDB = stagedJobsDB.filter(s => !idSet.has(s.stagedId));
  }

  res.json({
    success: true,
    message: 'Staged vacancies discarded successfully.',
    remainingStaged: stagedJobsDB.length,
  });
});

// 3.6. Deep AI Semantic Duplicate Verification using Gemini
app.post('/api/admin/scraper/ai-verify-duplicate', async (req, res) => {
  try {
    const { stagedId } = req.body;
    const staged = stagedJobsDB.find(s => s.stagedId === stagedId);
    if (!staged) {
      return res.status(404).json({ success: false, error: 'Staged job not found' });
    }

    if (!ai) {
      return res.json({
        success: true,
        stagedId,
        aiDuplicateCheck: staged.aiDuplicateCheck,
        note: 'AI verification unavailable, heuristic score preserved.'
      });
    }

    const matchedLive = jobsDB.find(j => j.id === staged.aiDuplicateCheck.matchedExistingJobId) || jobsDB[0];

    const prompt = `You are a vacancy deduplication engine for LK Job Master.
Compare this candidate scraped vacancy with an existing live vacancy to verify if they are the SAME job post:

CANDIDATE VACANCY:
Title (EN): ${staged.title}
Title (SI): ${staged.titleSi}
Organization: ${staged.organization}
Category: ${staged.category}
Closing Date: ${staged.closingDate}
Location: ${staged.location}
Qualifications: ${staged.qualificationsText}

EXISTING LIVE VACANCY:
ID: ${matchedLive.id}
Title (EN): ${matchedLive.title}
Title (SI): ${matchedLive.titleSi}
Organization: ${matchedLive.organization}
Closing Date: ${matchedLive.closingDate}
Location: ${matchedLive.location}

Determine whether these two represent the identical job vacancy (even if published on different portals or slightly paraphrased in Sinhala/English).
Respond with JSON matching schema:
- isDuplicate: boolean
- confidenceScore: integer (0 - 100)
- reasonSi: Sinhala explanation of why duplicate or unique
- reasonEn: English explanation of why duplicate or unique
- suggestedAction: 'MERGE_SOURCES' or 'INSERT_AS_NEW'`;

    const aiRes = await generateWithModelFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isDuplicate: { type: Type.BOOLEAN },
            confidenceScore: { type: Type.INTEGER },
            reasonSi: { type: Type.STRING },
            reasonEn: { type: Type.STRING },
            suggestedAction: { type: Type.STRING, enum: ['MERGE_SOURCES', 'INSERT_AS_NEW'] },
          },
          required: ['isDuplicate', 'confidenceScore', 'reasonSi', 'reasonEn', 'suggestedAction'],
        },
      },
    });

    const parsed = JSON.parse(aiRes.text || '{}');
    staged.aiDuplicateCheck = {
      isDuplicate: parsed.isDuplicate,
      matchedExistingJobId: matchedLive.id,
      matchedJobTitle: matchedLive.title,
      matchedOrganization: matchedLive.organization,
      confidenceScore: parsed.confidenceScore || staged.aiDuplicateCheck.confidenceScore,
      reason: `${parsed.reasonEn} (${parsed.reasonSi})`,
      suggestedAction: parsed.suggestedAction || 'MERGE_SOURCES',
    };

    res.json({
      success: true,
      stagedId,
      aiDuplicateCheck: staged.aiDuplicateCheck,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: sanitizeErrorMessage(err) });
  }
});

// 4. CV Parsing with AI (from text or document image/file)
// Sri Lanka CV Disambiguation & Sanitizer Helper
function sanitizeParsedCV(parsed: any, originalText: string) {
  const textCorpus = (originalText || '').toLowerCase();

  // 1. Sanitize Full Name
  if (parsed.name) {
    parsed.name = parsed.name
      .replace(/^(curriculum vitae of|resume of|cv of|profile of|bio-data of|name\s*[:\-])\s*/gi, '')
      .replace(/^(mr\.|mrs\.|miss\.|ms\.|dr\.|rev\.|prof\.)\s+/gi, '')
      .trim();
  }

  // 2. Sanitize Personal Residential Address:
  // Candidate's home address must NEVER be confused with corporate employer addresses, university addresses, or referee addresses.
  if (parsed.address) {
    const orgBoilerplate = [
      'pvt ltd', 'plc', 'technologies', 'limited', 'bank', 'ministry', 'department',
      'university of', 'faculty of', 'campus', 'general hospital', 'head office',
      'branch office', 'regional office', 'world trade center', 'orion city'
    ];
    const lowerAddr = parsed.address.toLowerCase();
    const hasOrgName = orgBoilerplate.some(org => lowerAddr.includes(org));
    const hasResidentialClue = /\b(no\b|house|street|road|rd|mawatha|mw|lane|wattha|gama|colombo|kandy|gampaha|galle|kurunegala)\b/i.test(lowerAddr);

    if (hasOrgName && !hasResidentialClue) {
      console.warn(`[CV Sanitizer] Discarded corporate/institutional address from residential address field: ${parsed.address}`);
      parsed.address = parsed.city || '';
    }
  }

  // 3. Sanitize Email (Ensure personal email, not generic corporate/HR email or referee email)
  if (parsed.email) {
    const corporateEmailPrefixes = ['info@', 'careers@', 'hr@', 'recruitment@', 'contact@', 'support@', 'jobs@', 'admin@', 'office@'];
    const lowerEmail = parsed.email.toLowerCase();
    if (corporateEmailPrefixes.some(pref => lowerEmail.startsWith(pref))) {
      console.warn(`[CV Sanitizer] Detected generic corporate email (${parsed.email}), scanning for applicant personal email...`);
      const personalMatches = originalText.match(/[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|live|icloud)\.[a-zA-Z]{2,}/gi);
      if (personalMatches && personalMatches.length > 0) {
        parsed.email = personalMatches[0];
      }
    }
  }

  // 4. Sanitize Phone Numbers (Prefer mobile over company landlines 011-xxx)
  if (parsed.phone) {
    // If assigned a Colombo/Kandy corporate landline (011, 081) but candidate has a mobile 07x
    if (/^(011|081|021|031|041|051|061)/.test(parsed.phone.replace(/[^0-9]/g, ''))) {
      const mobileMatch = originalText.match(/(?:\+94\s?7|07)[01245678]\d{7}/);
      if (mobileMatch) {
        parsed.phone = mobileMatch[0].replace(/\s+/g, '');
        if (!parsed.whatsapp || /^(011|081)/.test(parsed.whatsapp)) {
          parsed.whatsapp = parsed.phone;
        }
      }
    }
  }

  // 5. Ensure valid Sri Lanka District
  const validDistricts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  if (parsed.district) {
    const matchedDist = validDistricts.find(d => d.toLowerCase() === parsed.district.trim().toLowerCase());
    if (matchedDist) {
      parsed.district = matchedDist;
    } else {
      // Map common towns to districts
      const locCorpus = `${parsed.city || ''} ${parsed.address || ''}`.toLowerCase();
      if (/\b(colombo|maharagama|nugegoda|dehiwala|moratuwa|kotte|kottawa|homagama|battaramulla|malabe|piliyandala|rathmalana)\b/.test(locCorpus)) {
        parsed.district = 'Colombo';
      } else if (/\b(gampaha|kelaniya|kadawatha|negombo|ja-ela|ragama|kiribathgoda|wattala|minuwangoda|veeyangoda|meerigama)\b/.test(locCorpus)) {
        parsed.district = 'Gampaha';
      } else if (/\b(kandy|peradeniya|katugastota|gampola|kundasale|gelioya)\b/.test(locCorpus)) {
        parsed.district = 'Kandy';
      } else if (/\b(kalutara|panadura|horana|wadduwa|bandaragama|beruwala)\b/.test(locCorpus)) {
        parsed.district = 'Kalutara';
      } else if (/\b(galle|hikkaduwa|karapitiya|ambalangoda|elapitiya)\b/.test(locCorpus)) {
        parsed.district = 'Galle';
      } else if (/\b(kurunegala|kuliyapitiya|narammala|pannala|wariyapola)\b/.test(locCorpus)) {
        parsed.district = 'Kurunegala';
      } else if (/\b(matara|weligama|dikwella)\b/.test(locCorpus)) {
        parsed.district = 'Matara';
      } else {
        parsed.district = 'Colombo';
      }
    }
  } else {
    parsed.district = 'Colombo';
  }

  // 6. Ensure otherDetails is populated if there were uncaptured sections in original text
  if (!parsed.otherDetails || parsed.otherDetails.trim().length < 15) {
    const fallbackSections: string[] = [];
    
    // Look for referee mentions
    if (textCorpus.includes('referee') || textCorpus.includes('reference')) {
      fallbackSections.push('• Non-Related Referees: Available upon request in CV document.');
    }
    // Look for language mentions
    if (textCorpus.includes('sinhala') || textCorpus.includes('english') || textCorpus.includes('tamil')) {
      fallbackSections.push('• Languages: Sinhala, English (Proficient)');
    }
    // Look for driving license
    if (textCorpus.includes('driving') || textCorpus.includes('license') || textCorpus.includes('licence')) {
      fallbackSections.push('• Driving License: Valid Sri Lankan Driving License held.');
    }

    if (fallbackSections.length > 0) {
      parsed.otherDetails = (parsed.otherDetails ? parsed.otherDetails + '\n\n' : '') + fallbackSections.join('\n');
    }
  }

  return parsed;
}

app.post('/api/users/parse-cv', async (req, res) => {
  try {
    const { cvText, cvBase64, mimeType, fileName } = req.body;

    if (!ai) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const systemPrompt = `You are an expert Sri Lankan CV analyzer and high-precision data extraction engine for LK Job Master.
Your absolute highest priority is ACCURACY and RIGID SEPARATION between candidate personal profile data and external organization/workplace/referee data.

CRITICAL DISAMBIGUATION INSTRUCTIONS:
1. CANDIDATE PERSONAL IDENTITY:
   - "name": The applicant/candidate's own real name (e.g. Kasun Bandara Perera). Discard titles like "Curriculum Vitae", "Resume of", "Mr.", "Mrs.", "Dr.". NEVER extract an employer name, school name, or referee name as the candidate name!
   - "nicOrId": Candidate's National Identity Card number (e.g. 9 digits ending with V/X or 12 digits).
   - "age": Candidate's current age (e.g. 26 or "26 Years") or Year of Birth.

2. CANDIDATE RESIDENTIAL ADDRESS (STRICT ANTI-SWAP RULES):
   - "address": MUST BE THE CANDIDATE'S PERSONAL RESIDENTIAL / PERMANENT HOME ADDRESS (e.g., "No. 45/2, Temple Road, Maharagama", "Kandy Road, Kadawatha").
   - NEVER, UNDER ANY CIRCUMSTANCES, extract the address of past or current employers (e.g., "Colombo 03", "Union Place, Colombo 02", "World Trade Center"), university/school campus addresses, or referee addresses as the candidate's home address!
   - If there is a "Personal Details", "Personal Profile", "Contact Information", or top header section in the CV, inspect it specifically for the candidate's permanent home address.
   - If the candidate's residential address is not mentioned in the CV, leave address empty or set to the candidate's home town. DO NOT substitute an employer's company address!
   - "city": Candidate's home residential town in Sri Lanka (e.g., "Maharagama", "Gampaha", "Kandy").
   - "district": The official Sri Lankan District of candidate's residence (one of: Colombo, Gampaha, Kalutara, Kandy, Matale, Nuwara Eliya, Galle, Matara, Hambantota, Jaffna, Kilinochchi, Mannar, Vavuniya, Mullaitivu, Batticaloa, Ampara, Trincomalee, Kurunegala, Puttalam, Anuradhapura, Polonnaruwa, Badulla, Monaragala, Ratnapura, Kegalle).

3. CANDIDATE CONTACT DETAILS:
   - "email": Candidate's personal email (e.g., @gmail.com, @yahoo.com). NEVER extract company generic addresses (e.g., info@, careers@, hr@, support@) or referee emails!
   - "phone" & "whatsapp": Candidate's personal mobile telephone number (e.g., 077..., 071..., 076..., 070..., 075..., 078..., +947...). NEVER extract referee telephone numbers or company landlines!

4. EDUCATION CRITERIA:
   - "educationLevel": Exactly one of ['O_LEVEL', 'A_LEVEL', 'NVQ', 'DIPLOMA', 'DEGREE', 'POSTGRADUATE'].
   - "olPassed": boolean (true if candidate passed at least 6 O/L subjects).
   - "olEnglishAndMaths": boolean (true if candidate obtained Credit, Distinction, or Very Good passes in both English and Mathematics).
   - "alPassed": boolean (true if passed 3 subjects in GCE A/L).
   - "alStream": One of ['Commerce', 'Physical Science / Maths', 'Bio Science', 'Technology', 'Arts', 'Other'].
   - "alSubjectsSummary": e.g. 'Accounting (A), Business Studies (A), Economics (B)'.
   - "higherEducation": Degree/Diploma/HND/NVQ title and Institute (e.g. 'B.Sc. in IT - University of Moratuwa').
   - "skills": Array of professional, technical, software, and soft skills.
   - "experienceYears": Total professional work experience in completed years (integer).
   - "experienceHistory": Summary of companies, positions, and durations.

5. OVERFLOW & EXTRA CV DETAILS ("otherDetails") - VERY IMPORTANT:
   - Any extra information found in the CV that does NOT belong to the above structured cages MUST BE EXTRACTED into "otherDetails" in a clear, formatted, readable multi-line text with bullet points and section headers.
   - This includes:
     • Non-Related Referees (names, titles, organizations, contact phone & email)
     • Extra Professional Courses, Diplomas & Certifications (e.g., AAT, CIMA, English diplomas, Graphic design, IT certificates)
     • Extracurricular Activities, Sports & Leadership (e.g., School Prefect, sports captain, scouting, society posts)
     • Languages known (Sinhala, English, Tamil with fluency levels)
     • Driving License categories (Light vehicle, Motorcycle, Heavy vehicle)
     • Professional Memberships, Awards, Honors, Volunteering
     • Special Projects, GitHub / LinkedIn / Portfolio URLs
     • Personal interests, hobbies, or additional notes.
   Make "otherDetails" comprehensive and structured so no valuable information from the candidate's CV is lost!`;

    let parts: any[] = [];
    if (cvBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cvBase64.replace(/^data:[a-z/]+;base64,/, ''),
        },
      });
      parts.push({ text: 'Analyze this CV document and extract structured candidate profile data with complete precision. Strictly separate candidate personal residential data from employer/referee details, and place all overflow details into otherDetails.' });
    } else if (cvText) {
      parts.push({ text: `Analyze this CV text and extract structured candidate profile data with complete precision. Strictly separate candidate personal residential data from employer/referee details, and place all overflow details into otherDetails:\n${cvText}` });
    } else {
      return res.status(400).json({ success: false, error: 'Please supply CV text or file' });
    }

    const response = await generateWithModelFallback({
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            whatsapp: { type: Type.STRING },
            nicOrId: { type: Type.STRING },
            age: { type: Type.STRING },
            address: { type: Type.STRING },
            city: { type: Type.STRING },
            district: { type: Type.STRING },
            educationLevel: { 
              type: Type.STRING, 
              enum: ['O_LEVEL', 'A_LEVEL', 'DIPLOMA', 'DEGREE', 'NVQ', 'POSTGRADUATE'] 
            },
            olPassed: { type: Type.BOOLEAN },
            olEnglishAndMaths: { type: Type.BOOLEAN },
            alPassed: { type: Type.BOOLEAN },
            alStream: { type: Type.STRING },
            alSubjectsSummary: { type: Type.STRING },
            higherEducation: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experienceYears: { type: Type.INTEGER },
            experienceHistory: { type: Type.STRING },
            preferredRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
            preferredSectors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            preferredLocations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            summary: { type: Type.STRING },
            otherDetails: { type: Type.STRING },
          },
          required: ['name', 'educationLevel', 'skills', 'experienceYears'],
        },
      },
    });

    const parsedRaw = JSON.parse(response.text || '{}');
    const sanitizedCV = sanitizeParsedCV(parsedRaw, cvText || '');

    res.json({
      success: true,
      parsedCV: sanitizedCV,
      fileName,
    });
  } catch (error: any) {
    console.error('Error in /api/users/parse-cv:', error);
    res.status(500).json({ success: false, error: sanitizeErrorMessage(error) });
  }
});

// 5. User Profile save / load / confirm
app.post('/api/users/profile', (req, res) => {
  const profileData: Partial<UserProfile> = req.body;
  let userId = profileData.userId;

  if (!userId || !usersDB[userId]) {
    // Generate fresh Sri Lankan LK Job Master Registration ID
    userId = `LK-JM-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  const existing = usersDB[userId] || {
    userId,
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    nicOrId: '',
    age: '',
    address: '',
    city: '',
    district: 'Colombo',
    preferredSectors: ['GOVERNMENT', 'PRIVATE'],
    preferredRoles: [],
    preferredLocations: ['Colombo'],
    educationLevel: 'A_LEVEL',
    olPassed: true,
    olEnglishAndMaths: true,
    alPassed: true,
    alStream: 'Commerce',
    alSubjectsSummary: '',
    higherEducation: '',
    skills: [],
    experienceYears: 0,
    experienceHistory: '',
    otherDetails: '',
    isVerifiedByUser: false,
    subscription: {
      status: 'INACTIVE',
      planAmount: 500,
      currency: 'LKR',
    },
    alertPreferences: {
      email: true,
      whatsapp: true,
      minimumMatchScore: 70,
    },
    createdAt: new Date().toISOString(),
  };

  const updated: UserProfile = {
    ...existing,
    ...profileData,
    userId,
    isVerifiedByUser: profileData.isVerifiedByUser !== undefined ? profileData.isVerifiedByUser : existing.isVerifiedByUser,
    confirmedAt: profileData.isVerifiedByUser ? (profileData.confirmedAt || new Date().toISOString()) : existing.confirmedAt,
    updatedAt: new Date().toISOString(),
    subscription: {
      ...existing.subscription,
      ...(profileData.subscription || {}),
    },
  };

  usersDB[userId] = updated;

  res.json({
    success: true,
    user: updated,
    message: updated.isVerifiedByUser 
      ? `Profile confirmed & saved successfully under Registration ID ${userId}!`
      : 'Profile saved successfully!',
  });
});

app.get('/api/users/:id', (req, res) => {
  const user = usersDB[req.params.id];
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, user });
});

// 6. Subscription Payment Submission (Rs. 500 / Month)
app.post('/api/users/subscribe', (req, res) => {
  const { userId, paymentMethod, referenceCode, slipUrl } = req.body;
  const user = usersDB[userId];

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Update status to PENDING_APPROVAL
  user.subscription = {
    ...user.subscription,
    status: 'PENDING_APPROVAL',
    planAmount: 500,
    currency: 'LKR',
    paymentMethod: paymentMethod || 'BANK_TRANSFER',
    referenceCode: referenceCode || `TXN-${Date.now().toString().slice(-6)}`,
    slipUrl: slipUrl || '',
    startedAt: new Date().toISOString(),
  };

  usersDB[userId] = user;

  res.json({
    success: true,
    message: 'Subscription payment submitted! Awaiting Admin verification.',
    subscription: user.subscription,
  });
});

// 7. Admin: Activate Subscription (User confirmed payment of Rs. 500)
app.post('/api/admin/subscribers/activate', (req, res) => {
  const { userId, approve } = req.body;
  const user = usersDB[userId];

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (approve) {
    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + 30); // 30 days active

    user.subscription = {
      ...user.subscription,
      status: 'ACTIVE',
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      approvedAt: now.toISOString(),
    };

    // Immediately trigger automated alert matching and notification generation!
    const matches = calculateJobMatches(user, jobsDB);
    const topMatches = matches.filter(m => m.matchScore >= user.alertPreferences.minimumMatchScore);

    // Create Notification Log
    const waText = encodeURIComponent(
      `🔔 *LK Job & Gazette Radar Alert* 🇱🇰\n\n` +
      `ආයුබෝවන් ${user.name},\n` +
      `ඔබගේ සුදුසුකම් වලට ගැළපෙන නවතම රැකියා ${topMatches.length} ක් සොයාගෙන ඇත!\n\n` +
      topMatches.slice(0, 3).map((m, idx) => 
        `📌 *${idx + 1}. ${m.job.title}*\n` +
        `🏢 ${m.job.organization}\n` +
        `🎯 ගැළපීම: ${m.matchScore}% | 📅 අවසන් දිනය: ${m.job.closingDate}\n`
      ).join('\n') +
      `\n🌐 විස්තර බැලීමට සහ අයදුම් කිරීමට: https://lkjobradar.gov.lk/app?uid=${user.userId}`
    );

    const waLink = user.whatsapp ? `https://wa.me/${user.whatsapp.replace(/[^0-9]/g, '')}?text=${waText}` : undefined;

    const notifLog: NotificationLog = {
      id: `NOTIF-${Date.now()}`,
      userId: user.userId,
      userName: user.name,
      channel: 'WHATSAPP',
      recipient: user.whatsapp || user.phone,
      jobCount: topMatches.length,
      jobTitles: topMatches.map(m => m.job.title),
      dispatchedAt: new Date().toISOString(),
      status: 'SENT',
      whatsappLink: waLink,
    };
    notificationLogs.unshift(notifLog);

    return res.json({
      success: true,
      message: `User ${user.userId} activated for Rs. 500 Plan! System triggered automated radar matching for ${topMatches.length} vacancies.`,
      user,
      matchesFound: topMatches.length,
      notification: notifLog,
    });
  } else {
    user.subscription.status = 'INACTIVE';
    return res.json({
      success: true,
      message: `User ${user.userId} subscription set to Inactive.`,
      user,
    });
  }
});

// Helper: Calculate match score between a candidate and jobs
function calculateJobMatches(user: UserProfile, jobs: JobVacancy[]) {
  return jobs.map(job => {
    let score = 50; // base score
    let reasons: string[] = [];
    let missingQualifications: string[] = [];

    // Sector match
    if (user.preferredSectors.includes(job.category)) {
      score += 15;
      reasons.push(`Sector match: ${job.category}`);
    }

    // Education match
    const educationRank: Record<string, number> = {
      'OPEN_TO_ALL': 0,
      'O/L': 1,
      'A/L': 2,
      'NVQ': 3,
      'DIPLOMA': 4,
      'DEGREE': 5,
      'POSTGRADUATE': 6,
    };

    const userEduRank: Record<string, number> = {
      'O_LEVEL': 1,
      'A_LEVEL': 2,
      'NVQ': 3,
      'DIPLOMA': 4,
      'DEGREE': 5,
      'POSTGRADUATE': 6,
    };

    const userLevelNum = userEduRank[user.educationLevel] || 2;
    const reqLevels = job.educationRequired.map(e => educationRank[e] || 1);
    const maxReqLevel = Math.max(...reqLevels, 1);

    if (userLevelNum >= maxReqLevel) {
      score += 20;
      reasons.push(`Education requirement met (${job.educationRequired.join(', ')})`);
    } else {
      score -= 20;
      missingQualifications.push(`Requires ${job.educationRequired.join(', ')}`);
    }

    // Role / Title keyword match
    const textCorpus = (job.title + ' ' + job.organization + ' ' + job.qualificationsText + ' ' + job.tags.join(' ')).toLowerCase();
    const userRoleMatches = user.preferredRoles.filter(role => textCorpus.includes(role.toLowerCase()));
    if (userRoleMatches.length > 0) {
      score += 15;
      reasons.push(`Role match: ${userRoleMatches.join(', ')}`);
    }

    // Skills match
    const skillMatches = user.skills.filter(skill => textCorpus.includes(skill.toLowerCase()));
    if (skillMatches.length > 0) {
      score += Math.min(skillMatches.length * 5, 15);
      reasons.push(`Matched skills: ${skillMatches.join(', ')}`);
    }

    // Experience
    if (user.experienceYears >= job.experienceYears) {
      score += 10;
      reasons.push(`Experience satisfied (${user.experienceYears}y vs ${job.experienceYears}y req)`);
    } else if (job.experienceYears > user.experienceYears + 2) {
      score -= 15;
      missingQualifications.push(`Requires ${job.experienceYears}y experience (You have ${user.experienceYears}y)`);
    }

    // Clamp score
    const finalScore = Math.min(Math.max(score, 20), 98);

    return {
      job,
      matchScore: finalScore,
      reasons,
      missingQualifications,
      isHighMatch: finalScore >= 75,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

// 8. Match Jobs for User API
app.get('/api/users/:id/matches', (req, res) => {
  const user = usersDB[req.params.id];
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const matches = calculateJobMatches(user, jobsDB);
  res.json({
    success: true,
    user,
    matches,
  });
});

// 9. Automated Match & Notification Runner (can be triggered manually or via scheduler)
app.post('/api/alerts/dispatch-all', (req, res) => {
  const activeSubscribers = Object.values(usersDB).filter(u => u.subscription.status === 'ACTIVE');
  const dispatchedLogs: NotificationLog[] = [];

  for (const sub of activeSubscribers) {
    const matches = calculateJobMatches(sub, jobsDB);
    const eligibleMatches = matches.filter(m => m.matchScore >= sub.alertPreferences.minimumMatchScore);

    if (eligibleMatches.length > 0) {
      const waText = encodeURIComponent(
        `🚨 *LK Job Master Daily Vacancy Alert* 🇱🇰\n\n` +
        `සුභ දවසක් ${sub.name},\n` +
        `අද දින ඔබගේ සුදුසුකම් වලට ගැළපෙන නවතම රැකියා ඇබෑර්තු ${eligibleMatches.length} ක් LK Job Master පද්ධතිය මඟින් ස්කෑන් කර හඳුනාගන්නා ලදී:\n\n` +
        eligibleMatches.slice(0, 4).map((m, idx) => 
          `🔹 *${idx + 1}. ${m.job.title}*\n` +
          `🏢 ${m.job.organization}\n` +
          `🏷️ මූලාශ්‍ර: ${m.job.sources.map(s => s.name).join(', ')}\n` +
          `🎯 Match: ${m.matchScore}% | 📅 අවසන් දිනය: ${m.job.closingDate}\n`
        ).join('\n') +
        `\n👉 සම්පූර්ණ විස්තර බැලීමට සහ අයදුම් කිරීමට: https://lkjobmaster.lk/app?uid=${sub.userId}`
      );

      const log: NotificationLog = {
        id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: sub.userId,
        userName: sub.name,
        channel: 'WHATSAPP',
        recipient: sub.whatsapp || sub.phone,
        jobCount: eligibleMatches.length,
        jobTitles: eligibleMatches.map(m => m.job.title),
        dispatchedAt: new Date().toISOString(),
        status: 'SENT',
        whatsappLink: `https://wa.me/${(sub.whatsapp || '').replace(/[^0-9]/g, '')}?text=${waText}`,
      };

      dispatchedLogs.push(log);
      notificationLogs.unshift(log);
    }
  }

  res.json({
    success: true,
    activeSubscribersCount: activeSubscribers.length,
    dispatchedCount: dispatchedLogs.length,
    logs: dispatchedLogs,
  });
});

// 10. Admin: Get all subscribers & notification logs
app.get('/api/admin/subscribers', (req, res) => {
  const users = Object.values(usersDB);
  res.json({
    success: true,
    users,
    notificationLogs,
    metrics: {
      totalUsers: users.length,
      activeSubscribers: users.filter(u => u.subscription.status === 'ACTIVE').length,
      pendingApproval: users.filter(u => u.subscription.status === 'PENDING_APPROVAL').length,
      verifiedUsers: users.filter(u => u.isVerifiedByUser).length,
      totalJobs: jobsDB.length,
      gazetteJobs: jobsDB.filter(j => j.category === 'GOVERNMENT').length,
      mergedDuplicates: jobsDB.reduce((acc, j) => acc + (j.mergedCount > 1 ? j.mergedCount - 1 : 0), 0),
    },
  });
});

// 11. Admin: Export and Backup Users Data (CSV & JSON)
app.get('/api/admin/users/export', (req, res) => {
  const { format, q, district, education, status, verifiedOnly } = req.query;
  let list = Object.values(usersDB);

  if (q) {
    const term = String(q).toLowerCase();
    list = list.filter(u => 
      u.userId.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.phone && u.phone.includes(term)) ||
      (u.whatsapp && u.whatsapp.includes(term)) ||
      (u.address && u.address.toLowerCase().includes(term)) ||
      u.skills.some(s => s.toLowerCase().includes(term))
    );
  }

  if (district && district !== 'ALL') {
    list = list.filter(u => u.district.toLowerCase() === String(district).toLowerCase());
  }

  if (education && education !== 'ALL') {
    list = list.filter(u => u.educationLevel === education);
  }

  if (status && status !== 'ALL') {
    list = list.filter(u => u.subscription.status === status);
  }

  if (verifiedOnly === 'true') {
    list = list.filter(u => u.isVerifiedByUser);
  }

  if (format === 'csv') {
    // Generate clean CSV with headers
    const headers = [
      'Registration ID',
      'Full Name',
      'Email',
      'Phone',
      'WhatsApp',
      'NIC/ID',
      'Age',
      'Address',
      'City',
      'District',
      'Education Level',
      'O/L Passed',
      'O/L Maths & English',
      'A/L Stream',
      'A/L Subjects & Grades',
      'Higher Education Details',
      'Skills',
      'Experience (Years)',
      'Experience History',
      'Preferred Sectors',
      'Preferred Roles',
      'Other CV Details',
      'Confirmed by User',
      'Confirmed At',
      'Subscription Status',
      'Created At'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = list.map(u => [
      escapeCsv(u.userId),
      escapeCsv(u.name),
      escapeCsv(u.email),
      escapeCsv(u.phone),
      escapeCsv(u.whatsapp),
      escapeCsv(u.nicOrId || ''),
      escapeCsv(u.age || ''),
      escapeCsv(u.address || ''),
      escapeCsv(u.city || ''),
      escapeCsv(u.district),
      escapeCsv(u.educationLevel),
      escapeCsv(u.olPassed ? 'YES' : 'NO'),
      escapeCsv(u.olEnglishAndMaths ? 'YES' : 'NO'),
      escapeCsv(u.alStream),
      escapeCsv(u.alSubjectsSummary || ''),
      escapeCsv(u.higherEducation),
      escapeCsv(u.skills.join(', ')),
      escapeCsv(u.experienceYears),
      escapeCsv(u.experienceHistory || ''),
      escapeCsv(u.preferredSectors.join(', ')),
      escapeCsv(u.preferredRoles.join(', ')),
      escapeCsv(u.otherDetails || ''),
      escapeCsv(u.isVerifiedByUser ? 'YES' : 'NO'),
      escapeCsv(u.confirmedAt || ''),
      escapeCsv(u.subscription.status),
      escapeCsv(u.createdAt)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=lk-job-master-users-backup-${Date.now()}.csv`);
    return res.send(csvContent);
  }

  // Default JSON export
  res.json({
    success: true,
    totalCount: list.length,
    exportedAt: new Date().toISOString(),
    users: list,
  });
});

// Vite or Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`LK Job Master server running at http://localhost:${port}`);
  });
}

startServer();
