import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  Briefcase, 
  GraduationCap, 
  Layers, 
  Bell, 
  ExternalLink,
  Calendar,
  MapPin,
  RefreshCw,
  PlusCircle,
  FileText
} from 'lucide-react';
import { Header } from './components/Header';
import { JobCard } from './components/JobCard';
import { JobDetailsModal } from './components/JobDetailsModal';
import { ProfileView } from './components/ProfileView';
import { MatchesView } from './components/MatchesView';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminPanel } from './components/AdminPanel';
import { JobVacancy, UserProfile, JobMatchResult } from './types';

// Default initial user
const initialUser: UserProfile = {
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
};

export default function App() {
  const [lang, setLang] = useState<'si' | 'en'>('si');
  const [currentTab, setCurrentTab] = useState<'search' | 'matches' | 'profile' | 'subscription' | 'admin'>('search');

  const [jobs, setJobs] = useState<JobVacancy[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(initialUser);
  const [matches, setMatches] = useState<JobMatchResult[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEducation, setSelectedEducation] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');

  // Modals
  const [selectedJobForModal, setSelectedJobForModal] = useState<JobVacancy | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Load jobs from server
  const fetchJobs = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedEducation !== 'ALL') params.append('education', selectedEducation);
      if (selectedDistrict !== 'ALL') params.append('district', selectedDistrict);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  // Fetch matches for current user
  const fetchMatches = async (user: UserProfile) => {
    try {
      const res = await fetch(`/api/users/${user.userId}/matches`);
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, [searchQuery, selectedCategory, selectedEducation, selectedDistrict]);

  useEffect(() => {
    if (currentUser?.userId) {
      fetchMatches(currentUser);
    }
  }, [currentUser, jobs]);

  // Handle Save Profile
  const handleSaveProfile = async (updated: UserProfile) => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
        fetchMatches(data.user);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  // Handle Payment Submit
  const handlePaymentSubmitted = async (details: any) => {
    try {
      const res = await fetch('/api/users/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          ...details,
        }),
      });
      const data = await res.json();
      if (data.success && data.subscription) {
        setCurrentUser(prev => ({
          ...prev,
          subscription: data.subscription,
        }));
      }
    } catch (err) {
      console.error('Error submitting payment:', err);
    }
  };

  // Count merged duplicates
  const totalDuplicatesMerged = jobs.reduce((acc, j) => acc + (j.mergedCount > 1 ? j.mergedCount - 1 : 0), 0);

  // Sri Lanka Districts
  const districts = [
    'ALL', 'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kurunegala', 'Anuradhapura', 'Badulla', 'Ratnapura'
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        lang={lang}
        setLang={setLang}
        currentUser={currentUser}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        totalJobs={jobs.length}
        duplicateMergedCount={totalDuplicatesMerged}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: Search & Radar */}
        {currentTab === 'search' && (
          <div className="space-y-6">
            {/* Hero / Filter Strip */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {lang === 'si' ? 'LK Job Master - ශ්‍රී ලංකා රැකියා සහ ගැසට් රේඩාර්' : 'LK Job Master - Sri Lanka Job & Gazette Radar'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {lang === 'si'
                      ? 'රජයේ ගැසට් (Section IIA) සහ ප්‍රමුඛ පෙළේ රැකියා අඩවි (TopJobs, XpressJobs, Finders.lk) එකම තැනකින්.'
                      : 'Government Gazettes & leading job sites deduplicated and updated daily.'}
                  </p>
                </div>

                {/* Quick stats tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {lang === 'si' ? 'ගැසට් IIA ඇබෑර්තු' : 'Gov Gazettes'}: {jobs.filter(j => j.category === 'GOVERNMENT').length}
                  </span>

                  <span className="bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    {lang === 'si' ? 'ඒකාබද්ධ අනුපිටපත්' : 'Deduplicated'}: {totalDuplicatesMerged}
                  </span>
                </div>
              </div>

              {/* Search Bar & Filters */}
              <div className="space-y-3 pt-2">
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      lang === 'si'
                        ? 'තනතුර, අමාත්‍යාංශය, ආයතනය හෝ සුදුසුකම් සෙවීම (උදා: Administrative, Bank, Software, Degree, O/L)...'
                        : 'Search by title, ministry, organization, or qualifications (e.g. Trainee, Customs, Degree, O/L)...'
                    }
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-blue-500 text-xs sm:text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Category Filter */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    {[
                      { key: 'ALL', label: lang === 'si' ? 'සියල්ල' : 'All Sectors' },
                      { key: 'GOVERNMENT', label: lang === 'si' ? '🏛️ රජයේ ගැසට්' : '🏛️ Gov Gazette' },
                      { key: 'SEMI_GOVERNMENT', label: lang === 'si' ? '🏢 අර්ධ රාජ්‍ය' : '🏢 Semi-Gov' },
                      { key: 'PRIVATE', label: lang === 'si' ? '💼 පෞද්ගලික' : '💼 Private' },
                    ].map(item => (
                      <button
                        key={item.key}
                        onClick={() => setSelectedCategory(item.key)}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer text-xs ${
                          selectedCategory === item.key
                            ? 'bg-white text-blue-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Education Filter */}
                  <select
                    value={selectedEducation}
                    onChange={(e) => setSelectedEducation(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded-xl focus:outline-hidden"
                  >
                    <option value="ALL">{lang === 'si' ? '🎓 සුදුසුකම: සියල්ල' : '🎓 Education: Any'}</option>
                    <option value="O/L">G.C.E. O/L</option>
                    <option value="A/L">G.C.E. A/L</option>
                    <option value="NVQ">NVQ Level</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="DEGREE">Degree / UGC</option>
                  </select>

                  {/* District Filter */}
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded-xl focus:outline-hidden"
                  >
                    <option value="ALL">{lang === 'si' ? '📍 දිස්ත්‍රික්කය: සියල්ල' : '📍 Location: Islandwide'}</option>
                    {districts.filter(d => d !== 'ALL').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                      setSelectedEducation('ALL');
                      setSelectedDistrict('ALL');
                    }}
                    className="text-xs text-slate-500 hover:text-blue-600 font-semibold px-2 py-1 ml-auto cursor-pointer"
                  >
                    {lang === 'si' ? 'පෙරහන් ඉවත් කරන්න' : 'Reset Filters'}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                {lang === 'si'
                  ? `සොයාගත් රැකියා ඇබෑර්තු: ${jobs.length}`
                  : `Found ${jobs.length} Active Vacancies`}
              </span>

              {/* Deduplication info note */}
              <span className="text-[11px] text-purple-700 font-medium hidden sm:inline-flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-600" />
                {lang === 'si'
                  ? 'එකම දැන්වීම විවිධ අඩවි වල පළවූ විට එකට ඒකාබද්ධ කර පෙන්වයි'
                  : 'Multi-site cross-postings are automatically merged'}
              </span>
            </div>

            {/* Jobs Grid */}
            {jobs.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  {lang === 'si' ? 'කිසිදු ඇබෑර්තුවක් හමු නොවීය' : 'No matching jobs found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {lang === 'si'
                    ? 'වෙනත් වචන හෝ පෙරහන් භාවිත කර නැවත සොයන්න.'
                    : 'Try changing your search terms or clearing the filters.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {jobs.map((job, idx) => (
                  <JobCard
                    key={`${job.id || 'job'}-${idx}`}
                    job={job}
                    lang={lang}
                    onSelect={(j) => setSelectedJobForModal(j)}
                    onMatchMyCv={() => setCurrentTab('matches')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI Matches */}
        {currentTab === 'matches' && (
          <MatchesView
            matches={matches}
            currentUser={currentUser}
            lang={lang}
            onSelectJob={(j) => setSelectedJobForModal(j)}
            onNavigateToSubscription={() => setIsSubscriptionModalOpen(true)}
          />
        )}

        {/* TAB 3: Profile & CV Upload */}
        {currentTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onSaveProfile={handleSaveProfile}
            lang={lang}
            onNavigateToSubscription={() => setIsSubscriptionModalOpen(true)}
          />
        )}

        {/* TAB 4: Subscription Page / Rs. 500 Plan */}
        {currentTab === 'subscription' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
              <span className="bg-slate-950/30 text-amber-100 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {lang === 'si' ? 'දිනපතා ස්වයංක්‍රීය ඇලර්ට් සේවාව' : 'Daily Automated Radar Alerts'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black mt-2">
                {lang === 'si' ? 'මසකට රු. 500යි - සක්‍රිය කර රැකියා ලබාගන්න' : 'Rs. 500 / Month - VIP Radar Alerts'}
              </h2>
              <p className="text-xs sm:text-sm text-amber-100 mt-1">
                {lang === 'si'
                  ? 'ඔබගේ සුදුසුකම් වලට ගැළපෙන නව රජයේ ගැසට් හෝ පෞද්ගලික රැකියා පළවූ සැණින් WhatsApp & Email වෙත කෙටි පණිවිඩ එවනු ලැබේ.'
                  : 'Instant WhatsApp & Email alerts as soon as a matching job or Gazette Part I (Sec IIA) is published.'}
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">
                    {lang === 'si' ? 'වර්තමාන තත්ත්වය:' : 'Current Radar Status:'}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                    {currentUser.subscription.status === 'ACTIVE' 
                      ? (lang === 'si' ? '✅ සක්‍රියයි (PRO Subscriber)' : '✅ Active (PRO Subscriber)')
                      : currentUser.subscription.status === 'PENDING_APPROVAL'
                      ? (lang === 'si' ? '⏳ අනුමැතිය අපේක්ෂාවෙන් (Pending Admin Review)' : '⏳ Pending Admin Verification')
                      : (lang === 'si' ? '❌ අක්‍රියයි (Inactive)' : '❌ Inactive')}
                  </span>
                </div>

                <button
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                >
                  {currentUser.subscription.status === 'ACTIVE'
                    ? (lang === 'si' ? 'විස්තර බලන්න' : 'View Plan')
                    : (lang === 'si' ? 'දැන්ම ගෙවන්න (රු.500)' : 'Pay Rs. 500 Now')}
                </button>
              </div>

              {/* Instructions on how it works */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  {lang === 'si' ? 'මෙම සේවාව ක්‍රියාත්මක වන ආකාරය:' : 'How the Rs. 500 Radar Service Works:'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[11px] mb-2">1</span>
                    <strong className="block text-slate-900">{lang === 'si' ? 'ගෙවීම් තහවුරු කිරීම' : 'Pay Rs. 500'}</strong>
                    <p className="text-slate-600">{lang === 'si' ? 'බැංකු තැන්පතු හෝ කාඩ්පත් මඟින් රු. 500 ගෙවා රිසිට්පත යොමු කරන්න.' : 'Submit bank transfer slip or use quick checkout.'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[11px] mb-2">2</span>
                    <strong className="block text-slate-900">{lang === 'si' ? 'පරිපාලක අනුමැතිය' : 'Admin Activation'}</strong>
                    <p className="text-slate-600">{lang === 'si' ? 'පරිපාලක විසින් රිසිට්පත තහවුරු කර ඔබගේ ගිණුම සක්‍රිය කරනු ඇත.' : 'Admin approves and triggers the automatic runner.'}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[11px] mb-2">3</span>
                    <strong className="block text-slate-900">{lang === 'si' ? 'ස්වයංක්‍රීය ඇලර්ට්' : 'Instant Alerts'}</strong>
                    <p className="text-slate-600">{lang === 'si' ? 'එදින තෙක් ඇති සියලු රැකියා සහ නව රැකියා WhatsApp වෙත කෙලින්ම එවනු ලැබේ.' : 'Matches are immediately sent to your WhatsApp number.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Admin Panel */}
        {currentTab === 'admin' && (
          <AdminPanel
            lang={lang}
            onJobAddedOrMerged={fetchJobs}
          />
        )}
      </main>

      {/* Details Modal */}
      <JobDetailsModal
        job={selectedJobForModal}
        onClose={() => setSelectedJobForModal(null)}
        lang={lang}
        currentUser={currentUser}
        onMatchClick={() => setCurrentTab('matches')}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        currentUser={currentUser}
        onPaymentSubmitted={handlePaymentSubmitted}
        lang={lang}
      />
    </div>
  );
}
