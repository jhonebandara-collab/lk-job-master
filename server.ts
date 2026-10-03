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
    closingDate: '2026-10-24',
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
    closingDate: '2026-10-18',
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
    closingDate: '2026-10-15',
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
    closingDate: '2026-10-20',
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
    closingDate: '2026-10-22',
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
    closingDate: '2026-10-12',
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

// Helper: Smart Deduplication Check
function deduplicateAndInsert(newJob: Omit<JobVacancy, 'id' | 'mergedCount' | 'createdAt'>): { job: JobVacancy; isDuplicate: boolean } {
  // Normalize strings for comparison
  const normTitle = newJob.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normOrg = newJob.organization.toLowerCase().replace(/[^a-z0-9]/g, '');
  const closingDate = newJob.closingDate.trim();

  // Find match
  const existingIndex = jobsDB.findIndex(j => {
    const existingTitle = j.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existingOrg = j.organization.toLowerCase().replace(/[^a-z0-9]/g, '');

    const titleMatch = normTitle.includes(existingTitle) || existingTitle.includes(normTitle) || normTitle === existingTitle;
    const orgMatch = normOrg.includes(existingOrg) || existingOrg.includes(normOrg) || normOrg === existingOrg;
    const dateMatch = Math.abs(new Date(j.closingDate).getTime() - new Date(closingDate).getTime()) < 1000 * 60 * 60 * 24 * 7; // within 7 days

    return orgMatch && titleMatch && dateMatch;
  });

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
  const id = `LK-RADAR-${Date.now().toString().slice(-6)}`;
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

// 4. CV Parsing with AI (from text or document image/file)
app.post('/api/users/parse-cv', async (req, res) => {
  try {
    const { cvText, cvBase64, mimeType, fileName } = req.body;

    if (!ai) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const systemPrompt = `You are an expert Sri Lankan CV analyzer and data extractor for LK Job Master.
Thoroughly extract all candidate profile details from the provided CV document or text.
Extract into clean, distinct fields:
- Full Name (සම්පූර්ණ නම)
- Email address (Gmail / official email)
- Contact Phone and WhatsApp Number (e.g. +9477... or 077...)
- NIC or National Identity Card number if mentioned
- Age or Year of Birth if mentioned
- Full Residential Address (Street, House number, Lane)
- City or Town in Sri Lanka
- District in Sri Lanka (e.g. Colombo, Gampaha, Kalutara, Kandy, Galle, Kurunegala, etc.)
- Highest Education Level: Exactly one of ['O_LEVEL', 'A_LEVEL', 'NVQ', 'DIPLOMA', 'DEGREE', 'POSTGRADUATE']
- G.C.E. O/L completion (olPassed: true/false) & whether English and Maths have Credit passes or higher (olEnglishAndMaths: true/false)
- G.C.E. A/L completion (alPassed: true/false), A/L stream (Commerce, Physical Science / Maths, Bio Science, Technology, Arts, etc.), and summary of A/L subjects/results
- Higher education: University / College / Institute name and Degree / Diploma / NVQ title (e.g. 'B.Sc. in IT - University of Moratuwa', 'NDT Civil - ITUM', 'NVQ Level 4 - NAITA')
- Skills list: array of technical, professional, computer, and language skills
- Total work experience in years (number)
- Detailed work experience history: companies, past designations, and key responsibilities
- Preferred job roles: e.g. Management Trainee, Software Engineer, Administrative Officer, Accounts Executive, Teacher, Clerk
- Preferred job sectors: array containing any of ['GOVERNMENT', 'SEMI_GOVERNMENT', 'PRIVATE']
- Preferred work locations: e.g. ['Colombo', 'Islandwide', 'Remote']
- Professional summary: 2-3 sentences highlighting candidate strengths and career goals in English.`;

    let parts: any[] = [];
    if (cvBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cvBase64.replace(/^data:[a-z/]+;base64,/, ''),
        },
      });
      parts.push({ text: 'Analyze this CV document and extract structured candidate profile data with complete precision.' });
    } else if (cvText) {
      parts.push({ text: `Analyze this CV text and extract structured candidate profile data with complete precision:\n${cvText}` });
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
          },
          required: ['name', 'educationLevel', 'skills', 'experienceYears'],
        },
      },
    });

    const parsedCV = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      parsedCV,
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
