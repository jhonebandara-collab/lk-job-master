import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  RefreshCw, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Send, 
  UserCheck, 
  ShieldCheck, 
  ExternalLink,
  Building2,
  FileText,
  DollarSign,
  Radio,
  Loader2,
  ArrowRight,
  Download,
  Search,
  Filter,
  Eye,
  Copy,
  Check,
  Globe,
  GitBranch,
  Terminal,
  Server,
  Key,
  X,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { UserProfile, NotificationLog } from '../types';
import { compressImageFile } from '../utils/imageCompressor';

interface AdminPanelProps {
  lang: 'si' | 'en';
  onJobAddedOrMerged: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  lang,
  onJobAddedOrMerged,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'scanner' | 'subscribers' | 'logs' | 'hosting'>('users');
  const [subscribers, setSubscribers] = useState<UserProfile[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [metrics, setMetrics] = useState<any>({
    totalUsers: 0,
    activeSubscribers: 0,
    pendingApproval: 0,
    verifiedUsers: 0,
    totalJobs: 0,
    gazetteJobs: 0,
    mergedDuplicates: 0,
  });

  // User Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('ALL');
  const [filterEdu, setFilterEdu] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [selectedUserDossier, setSelectedUserDossier] = useState<UserProfile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Ingestion form state
  const [ocrText, setOcrText] = useState('');
  const [ocrSourceUrl, setOcrSourceUrl] = useState('');
  const [ocrSourcePlatform, setOcrSourcePlatform] = useState('Government Gazette (documents.gov.lk)');
  const [ocrImageBase64, setOcrImageBase64] = useState<string | null>(null);
  const [ocrImageName, setOcrImageName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Sri Lanka Districts
  const districts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  // Load Admin Data
  const loadAdminData = async () => {
    try {
      const res = await fetch('/api/admin/subscribers');
      const data = await res.json();
      if (data.success) {
        setSubscribers(data.users || []);
        setNotificationLogs(data.notificationLogs || []);
        setMetrics(data.metrics || {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Filtered users for backup & search
  const filteredUsers = subscribers.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        u.userId.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.whatsapp && u.whatsapp.includes(q)) ||
        (u.address && u.address.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q)) ||
        u.skills.some(s => s.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (filterDistrict !== 'ALL' && u.district !== filterDistrict) {
      return false;
    }

    if (filterEdu !== 'ALL' && u.educationLevel !== filterEdu) {
      return false;
    }

    if (filterStatus !== 'ALL' && u.subscription.status !== filterStatus) {
      return false;
    }

    if (filterVerifiedOnly && !u.isVerifiedByUser) {
      return false;
    }

    return true;
  });

  // Export to CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams({
      format: 'csv',
      q: searchQuery,
      district: filterDistrict,
      education: filterEdu,
      status: filterStatus,
      verifiedOnly: filterVerifiedOnly ? 'true' : 'false',
    });
    window.location.href = `/api/admin/users/export?${params.toString()}`;
  };

  // Export to JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredUsers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lk-job-master-users-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Trigger Multi-source crawler
  const handleRunScanner = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/jobs/sync-sources', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setScanResult(data);
        onJobAddedOrMerged();
        await loadAdminData();
      }
    } catch (err: any) {
      setScanResult({ error: err.message });
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Image Upload for OCR
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOcrImageName(file.name);
      setIsCompressing(true);
      try {
        const { base64 } = await compressImageFile(file, 1400, 0.85);
        setOcrImageBase64(base64);
      } catch (err) {
        console.error('Image compression error, using standard reader:', err);
        const reader = new FileReader();
        reader.onload = () => {
          setOcrImageBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  // Submit Notice / Image to Gemini API
  const handleExtractJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrText.trim() && !ocrImageBase64) return;

    setIsExtracting(true);
    setExtractSuccessMsg(null);

    try {
      const res = await fetch('/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: ocrImageBase64,
          textInput: ocrText,
          sourceUrl: ocrSourceUrl,
          sourcePlatform: ocrSourcePlatform,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const msg = data.isDuplicateMerged
          ? (lang === 'si' 
              ? `✅ ඇබෑර්තුව හඳුනාගෙන පවතින අඩවි ලැයිස්තුවට සාර්ථකව ඒකාබද්ධ කරන ලදී! (${data.savedJob.title})` 
              : `✅ Duplicate vacancy detected and cleanly merged into unified listing! (${data.savedJob.title})`)
          : (lang === 'si' 
              ? `✅ නව ඇබෑර්තුව සාර්ථකව LK Job Master දත්ත ගබඩාවට එක් කරන ලදී! (${data.savedJob.title})` 
              : `✅ New unique vacancy added to database! (${data.savedJob.title})`);

        setExtractSuccessMsg(msg);
        setOcrText('');
        setOcrImageBase64(null);
        setOcrImageName('');
        onJobAddedOrMerged();
        await loadAdminData();
      } else {
        throw new Error(data.error || 'Failed to extract');
      }
    } catch (err: any) {
      const friendlyMsg = err.message?.includes('503') || err.message?.includes('high demand')
        ? (lang === 'si' 
            ? 'AI සේවාව තාවකාලිකව කාර්යබහුලයි. කරුණාකර නැවත උත්සාහ කරන්න.' 
            : 'AI service temporarily busy. Please retry in a few seconds.')
        : err.message;
      setExtractSuccessMsg(`❌ ${friendlyMsg}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Activate / Approve subscriber
  const handleActivateSubscriber = async (userId: string, approve: boolean) => {
    try {
      const res = await fetch('/api/admin/subscribers/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve }),
      });
      const data = await res.json();
      if (data.success) {
        await loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copySnippet = (code: string, snippetId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeSnippet(snippetId);
    setTimeout(() => setCopiedCodeSnippet(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Admin Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'si' ? 'LK Job Master පරිපාලක පාලන මධ්‍යස්ථානය' : 'LK Job Master Admin Control Hub'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-2">
              {lang === 'si' ? 'පද්ධති පාලනය, දත්ත Backups & සත්කාරක උපදෙස්' : 'System Radar, User Backups & Hosting'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              {lang === 'si'
                ? 'පරිශීලක Registration ID යටතේ Backups පිරික්සීම, CSV/JSON Extract කිරීම, ගැසට් ස්කෑන් කිරීම, සහ GitHub + Render සත්කාරක (Hosting) සැකසුම මෙහිදී කළ හැක.'
                : 'Search & extract discrete candidate backups by Registration ID, merge vacancies, approve Rs. 500 alerts, and deploy to Render.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={loadAdminData}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === 'si' ? 'යාවත්කාලීන කරන්න' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => setActiveTab('hosting')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'si' ? '🚀 GitHub & Render Hosting' : '🚀 Hosting Guide'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">{lang === 'si' ? 'ලියාපදිංචි පරිශීලකයින්' : 'Total Registered'}</span>
            <span className="text-lg font-black text-white mt-0.5 block">{metrics.totalUsers}</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">{lang === 'si' ? 'තහවුරු කළ Profile' : 'Verified Backups'}</span>
            <span className="text-lg font-black text-emerald-400 mt-0.5 block">{metrics.verifiedUsers || 0}</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">{lang === 'si' ? 'ක්‍රියාකාරී ග්‍රාහකයින්' : 'Active (Rs. 500)'}</span>
            <span className="text-lg font-black text-cyan-400 mt-0.5 block">{metrics.activeSubscribers}</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">{lang === 'si' ? 'අනුමැතිය අපේක්ෂිත' : 'Pending Verification'}</span>
            <span className="text-lg font-black text-amber-400 mt-0.5 block">{metrics.pendingApproval}</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">{lang === 'si' ? 'සජීවී ඇබෑර්තු' : 'Live Vacancies'}</span>
            <span className="text-lg font-black text-white mt-0.5 block">{metrics.totalJobs}</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">{lang === 'si' ? 'ඒකාබද්ධ අනුපිටපත්' : 'Duplicates Merged'}</span>
            <span className="text-lg font-black text-purple-400 mt-0.5 block">{metrics.mergedDuplicates}</span>
          </div>
        </div>
      </div>

      {/* Admin Navigation Sub-tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>{lang === 'si' ? 'පරිශීලක දත්ත සහ Backups (User Records)' : 'User Profiles & Backups'}</span>
          <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {subscribers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === 'subscribers'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span>{lang === 'si' ? 'රු. 500 ගෙවීම් අනුමැතිය' : 'Rs. 500 Approvals'}</span>
          {metrics.pendingApproval > 0 && (
            <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {metrics.pendingApproval} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === 'scanner'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-indigo-600" />
          <span>{lang === 'si' ? 'මූලාශ්‍ර ස්කෑනරය සහ OCR Extractor' : 'Multi-Source Scanner & OCR'}</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-rose-500" />
          <span>{lang === 'si' ? 'ඇලර්ට් පිටවීමේ සටහන් (Alert Logs)' : 'Dispatch Logs'}</span>
        </button>

        <button
          onClick={() => setActiveTab('hosting')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeTab === 'hosting'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{lang === 'si' ? 'GitHub & Render Deployment උපදෙස්' : 'GitHub & Render Hosting'}</span>
        </button>
      </div>

      {/* TAB 1: User Profiles & Backups (Primary Focus) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search, Filter & Extract Toolbar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <span>{lang === 'si' ? 'පරිශීලක දත්ත සහ Registration ID Backups' : 'User Profiles & Backups Archive'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'si'
                    ? 'පරිශීලකයා CV එකෙන් තහවුරු කළ සියලු තොරතුරු (නම, ලිපිනය, O/L, A/L, කුසලතා, පළපුරුද්ද) වෙන් වෙන්ව පහසුවෙන් සොයා ගැනීමට හා Extract කර ගැනීමට.'
                    : 'Search candidate dossiers, filter by district/qualifications, and export cleanly separated records.'}
                </p>
              </div>

              {/* Data Extraction / Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Download all user data as CSV for Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'si' ? 'Excel / CSV Backup බාගන්න' : 'Export CSV (Excel)'}</span>
                </button>

                <button
                  onClick={handleExportJson}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Download complete JSON database backup"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'si' ? 'JSON Backup' : 'Export JSON'}</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'si' ? 'ID (LK-JM-..), නම, දුරකථන, ලිපිනය...' : 'Search by ID, name, phone, address, skills...'}
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="ALL">{lang === 'si' ? 'සියලුම දිස්ත්‍රික්ක (All Districts)' : 'All Districts'}</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterEdu}
                  onChange={(e) => setFilterEdu(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="ALL">{lang === 'si' ? 'සියලු අධ්‍යාපන මට්ටම් (All Education)' : 'All Education'}</option>
                  <option value="DEGREE">Bachelor Degree (උපාධිය)</option>
                  <option value="DIPLOMA">Diploma (ඩිප්ලෝමා)</option>
                  <option value="NVQ">NVQ Level 3-6</option>
                  <option value="A_LEVEL">G.C.E. A/L (උසස් පෙළ)</option>
                  <option value="O_LEVEL">G.C.E. O/L (සාමාන්‍ය පෙළ)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                >
                  <option value="ALL">{lang === 'si' ? 'සියලු සැලසුම් (All Plans)' : 'All Plans'}</option>
                  <option value="ACTIVE">Active (Rs. 500)</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="INACTIVE">Free / Inactive</option>
                </select>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap cursor-pointer bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={filterVerifiedOnly}
                    onChange={(e) => setFilterVerifiedOnly(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>{lang === 'si' ? 'තහවුරු කළ පමණක්' : 'Verified only'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* User Dossiers List / Table */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
                {lang === 'si' ? 'සොයන ලද නිර්ණායක වලට අදාළ පරිශීලකයින් හමු නොවීය.' : 'No users match the search criteria.'}
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isVerified = u.isVerifiedByUser;
                const isActive = u.subscription.status === 'ACTIVE';

                return (
                  <div
                    key={u.userId}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 shadow-xs transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                          {u.userId}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{u.name}</h4>
                        {isVerified && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {lang === 'si' ? 'තහවුරු කළ Profile' : 'Verified Profile'}
                          </span>
                        )}
                        {isActive ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            PRO Rs.500
                          </span>
                        ) : u.subscription.status === 'PENDING_APPROVAL' ? (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            Pending Approval
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedUserDossier(u)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{lang === 'si' ? 'සම්පූර්ණ තොරතුරු බලන්න' : 'View Full Dossier'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Discrete User Data Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">{lang === 'si' ? 'සම්බන්ධතා' : 'Contact'}</span>
                        <div className="font-medium text-slate-800 mt-0.5 space-y-0.5">
                          <p>📱 {u.whatsapp || u.phone}</p>
                          <p className="truncate">📧 {u.email}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">{lang === 'si' ? 'ලිපිනය සහ නගරය' : 'Address & District'}</span>
                        <div className="font-medium text-slate-800 mt-0.5">
                          <p>{u.district} {u.city ? `(${u.city})` : ''}</p>
                          {u.address && <p className="text-[11px] text-slate-500 truncate">{u.address}</p>}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">{lang === 'si' ? 'අධ්‍යාපනය සහ O/L' : 'Education'}</span>
                        <div className="font-medium text-slate-800 mt-0.5">
                          <p>{u.educationLevel} • {u.alStream}</p>
                          <p className="text-[11px] text-slate-500">
                            {u.olEnglishAndMaths ? 'O/L Maths & Eng Passed' : 'O/L Checked'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">{lang === 'si' ? 'පළපුරුද්ද සහ කුසලතා' : 'Experience & Skills'}</span>
                        <div className="font-medium text-slate-800 mt-0.5">
                          <p>{u.experienceYears} Years Experience</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {u.skills.slice(0, 3).join(', ')}
                            {u.skills.length > 3 ? ` +${u.skills.length - 3}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Subscribers & Payment Approvals */}
      {activeTab === 'subscribers' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>{lang === 'si' ? 'රු. 500 ග්‍රාහක කළමනාකරණය (Subscribers)' : 'Rs. 500 Subscriber Approvals'}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {lang === 'si'
                  ? 'ගෙවීම් රිසිට්පත් පරීක්ෂා කර පරිශීලකයින් සක්‍රිය කරන්න. සක්‍රිය කළ සැණින් එදින තෙක් ඇති සියලු රැකියා ගැළපීම් WhatsApp මඟින් ස්වයංක්‍රීයව පිටවේ.'
                  : 'Review payment proof and activate subscribers. Activating triggers the automated match runner.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {subscribers.map((u) => {
              const isPending = u.subscription.status === 'PENDING_APPROVAL';
              const isActive = u.subscription.status === 'ACTIVE';

              return (
                <div 
                  key={u.userId}
                  className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isPending 
                      ? 'border-amber-300 bg-amber-50/50' 
                      : isActive 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {u.userId}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{u.name}</span>
                      {isActive ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ACTIVE (Rs.500)
                        </span>
                      ) : isPending ? (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          PENDING APPROVAL
                        </span>
                      ) : (
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          INACTIVE
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                      <span>📧 {u.email}</span>
                      <span>📱 {u.whatsapp || u.phone}</span>
                      <span>📍 {u.district}</span>
                      <span>🎓 {u.educationLevel}</span>
                    </div>

                    {u.subscription.referenceCode && (
                      <div className="text-xs text-slate-700 font-mono pt-1">
                        🏷️ Ref: <strong>{u.subscription.referenceCode}</strong> | Method: {u.subscription.paymentMethod}
                        {u.subscription.slipUrl && (
                          <a 
                            href={u.subscription.slipUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="ml-2 text-blue-600 underline font-semibold"
                          >
                            View Slip
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive ? (
                      <button
                        onClick={() => handleActivateSubscriber(u.userId, true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === 'si' ? 'සක්‍රිය කර රැකියා යවන්න' : 'Approve & Dispatch'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateSubscriber(u.userId, false)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                      >
                        <span>{lang === 'si' ? 'අක්‍රිය කරන්න' : 'Deactivate'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Multi-Source Scanner & OCR Extractor */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          {/* Multi-Source Web Scanner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-600" />
                  <span>{lang === 'si' ? 'ශ්‍රී ලංකා රැකියා මූලාශ්‍ර ස්කෑනරය (Web Sources Crawler)' : 'Multi-Source Crawler Simulator'}</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  {lang === 'si'
                    ? 'documents.gov.lk (ගැසට්), TopJobs.lk, XpressJobs, සහ Finders.lk යන අඩවි පිරික්සා අනුපිටපත් (Duplicates) ඒකාබද්ධ කරයි.'
                    : 'Scans official Sri Lankan job boards, identifies duplicate postings, and consolidates them.'}
                </p>
              </div>

              <button
                onClick={handleRunScanner}
                disabled={isScanning}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{lang === 'si' ? 'දැන්ම ස්කෑන් කරන්න' : 'Run Full Multi-Portal Scan'}</span>
              </button>
            </div>

            {scanResult && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-2">
                <span className="font-bold text-blue-900 block">{scanResult.message}</span>
                <div className="flex flex-wrap gap-3">
                  <span className="bg-white p-2 rounded-lg border border-blue-200">
                    📥 Scanned: <strong>{scanResult.scannedCount}</strong>
                  </span>
                  <span className="bg-white p-2 rounded-lg border border-blue-200 text-emerald-700">
                    ✨ New Added: <strong>{scanResult.newInsertedCount}</strong>
                  </span>
                  <span className="bg-white p-2 rounded-lg border border-blue-200 text-purple-700">
                    🧬 Duplicates Merged: <strong>{scanResult.duplicateMergedCount}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* AI Gazette & Newspaper Notice Ingestion */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>{lang === 'si' ? 'ගැසට් පත්‍රය / පුවත්පත් දැන්වීම් AI ඔස්සේ කියවීම (OCR Extraction)' : 'AI Gazette & Notice Extractor (Sinhala / English)'}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {lang === 'si'
                  ? 'රජයේ ගැසට් පත්‍රයක හෝ පුවත්පත් දැන්වීමක ඡායාරූපයක් (Image) හෝ පෙළ (Sinhala / English) මෙහි ඇතුළත් කරන්න. Gemini AI මඟින් අදාළ සියලු සුදුසුකම් හා විස්තර නිවැරදිව කියවා දත්ත ගබඩාවට එක් කරනු ඇත.'
                  : 'Upload an image of a Government Gazette clipping or newspaper ad in Sinhala or English. Gemini AI extracts structured vacancy details.'}
              </p>
            </div>

            <form onSubmit={handleExtractJob} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    {lang === 'si' ? 'දැන්වීමේ ඡායාරූපය (JPG / PNG / Clipping):' : 'Notice Clipping / Image:'}
                  </label>
                  <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition">
                    <Upload className="w-6 h-6 text-blue-600 mb-1" />
                    <span className="text-xs font-bold text-slate-800">
                      {ocrImageName || (lang === 'si' ? 'ඡායාරූපය තෝරන්න' : 'Upload Image')}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Sinhala or English notice
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>

                  {isCompressing ? (
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-medium animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'si' ? 'ඡායාරූපය ප්‍රශස්තකරණය වෙමින් පවතී...' : 'Optimizing notice image...'}</span>
                    </div>
                  ) : ocrImageBase64 ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{ocrImageName} {lang === 'si' ? 'කියවීමට සූදානම්' : 'ready for OCR'}</span>
                    </div>
                  ) : null}
                </div>

                {/* Source Details & Text */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === 'si' ? 'මූලාශ්‍රය' : 'Source Platform'}
                      </label>
                      <select
                        value={ocrSourcePlatform}
                        onChange={(e) => setOcrSourcePlatform(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="Government Gazette (documents.gov.lk)">documents.gov.lk (Gazette)</option>
                        <option value="TopJobs.lk">TopJobs.lk</option>
                        <option value="XpressJobs">XpressJobs</option>
                        <option value="Finders.lk">Finders.lk</option>
                        <option value="Silumina / Sunday Observer Notice">Silumina / Observer (Newspaper)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === 'si' ? 'මූලාශ්‍ර Link එක' : 'Source URL (Optional)'}
                      </label>
                      <input
                        type="text"
                        value={ocrSourceUrl}
                        onChange={(e) => setOcrSourceUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {lang === 'si' ? 'නැතහොත් පෙළ (Notice Text in Sinhala / English):' : 'Or Paste Notice Text:'}
                    </label>
                    <textarea
                      rows={3}
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      placeholder={lang === 'si' ? 'ගැසට් පත්‍රයේ හෝ දැන්වීමේ සඳහන් පෙළ කොටස මෙහි ඇතුළත් කරන්න...' : 'Paste text from Gazette Part I: Sec (IIA) or newspaper notice...'}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                {extractSuccessMsg ? (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    extractSuccessMsg.startsWith('❌') 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {extractSuccessMsg.startsWith('❌') ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>{extractSuccessMsg.replace(/^[❌✅]\s*/, '')}</span>
                  </div>
                ) : <div />}

                <button
                  type="submit"
                  disabled={isExtracting || isCompressing || (!ocrText.trim() && !ocrImageBase64)}
                  className="ml-auto bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
                >
                  {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                  <span>{lang === 'si' ? 'AI මඟින් නිස්සාරණය කර එක් කරන්න' : 'Extract & Ingest via Gemini'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: Notification Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            <span>{lang === 'si' ? 'ස්වයංක්‍රීය ඇලර්ට් පිටවීමේ සටහන් (Dispatch Logs)' : 'Automated Notification Logs'}</span>
          </h3>

          {notificationLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              No notification logs yet.
            </div>
          ) : (
            <div className="space-y-2">
              {notificationLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className="text-emerald-600 font-bold">[{log.channel}]</span>
                      <span>To: {log.userName} ({log.recipient})</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.dispatchedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Matched {log.jobCount} jobs: {log.jobTitles?.slice(0, 2).join(', ')}...
                    </p>
                  </div>

                  {log.whatsappLink && (
                    <a
                      href={log.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs shrink-0"
                    >
                      <span>Open WhatsApp Test</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: GitHub & Render Hosting Guide */}
      {activeTab === 'hosting' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600" />
              <span>{lang === 'si' ? 'GitHub එකට දමා Render මඟින් නොමිලේ Host කරන ආකාරය' : 'Deploy LK Job Master to GitHub & Render (Step-by-Step)'}</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {lang === 'si' 
                ? 'මෙම සම්පූර්ණ Full-stack React + Express + Gemini AI යෙදුම Render.com හි පහසුවෙන් නොමිලේ Host කළ හැක.'
                : 'Complete step-by-step instructions to push code to GitHub and host live on Render web services.'}
            </p>
          </div>

          {/* Step 1: Git setup */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">1</span>
              <h4 className="font-bold text-sm text-slate-900">
                {lang === 'si' ? 'GitHub වෙත Code එක Push කිරීම (Git Setup)' : 'Push Code to GitHub'}
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              {lang === 'si'
                ? 'ඔබගේ පරිගණකයේ Terminal එක විවෘත කර Project ෆෝල්ඩරය තුළ පහත commands ක්‍රියාත්මක කරන්න:'
                : 'Open your terminal in the project root directory and run:'}
            </p>
            <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 text-xs font-mono relative">
              <pre className="overflow-x-auto whitespace-pre">
{`git init
git add .
git commit -m "Initial commit for LK Job Master"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lk-job-master.git
git push -u origin main`}
              </pre>
              <button
                onClick={() => copySnippet(`git init\ngit add .\ngit commit -m "Initial commit for LK Job Master"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USERNAME/lk-job-master.git\ngit push -u origin main`, 'git-commands')}
                className="absolute top-2.5 right-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[11px] cursor-pointer"
              >
                {copiedCodeSnippet === 'git-commands' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Step 2: Render.com Setup */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">2</span>
              <h4 className="font-bold text-sm text-slate-900">
                {lang === 'si' ? 'Render.com හි New Web Service එකක් සෑදීම' : 'Create Web Service on Render'}
              </h4>
            </div>
            <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
              <li>{lang === 'si' ? 'Render.com (https://render.com) වෙත ගොස් ඔබගේ GitHub ගිණුමෙන් Sign in වන්න.' : 'Visit https://render.com and sign in with GitHub.'}</li>
              <li>{lang === 'si' ? 'Dashboard එකේ "New +" ක්ලික් කර "Web Service" තෝරන්න.' : 'Click "New +" > "Web Service".'}</li>
              <li>{lang === 'si' ? 'ඉහත සාදන ලද "lk-job-master" GitHub repository එක Connect කරන්න.' : 'Connect your "lk-job-master" repository.'}</li>
              <li>
                <strong>Runtime:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">Node</span>
              </li>
              <li>
                <strong>Build Command:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">npm install && npm run build</span>
              </li>
              <li>
                <strong>Start Command:</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">npm start</span> (or <span className="font-mono">npx tsx server.ts</span>)
              </li>
            </ul>
          </div>

          {/* Step 3: Environment Variables */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-slate-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">3</span>
              <h4 className="font-bold text-sm text-slate-900">
                {lang === 'si' ? 'පරිසර විචල්‍යයන් (Environment Variables) එකතු කිරීම' : 'Add Environment Variables in Render'}
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              {lang === 'si'
                ? 'Render dashboard එකේ "Environment Variables" කොටසට පහත keys එකතු කරන්න:'
                : 'In Render service settings, add these environment variables:'}
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-blue-700 font-bold">GEMINI_API_KEY</span> = <span className="text-slate-600">AQ.Ab8RN6JCQPzLQmDEoiElC13SOyR7L6yjLO4Uuk_egA0iRepGQw</span>
                </div>
                <button
                  onClick={() => copySnippet('AQ.Ab8RN6JCQPzLQmDEoiElC13SOyR7L6yjLO4Uuk_egA0iRepGQw', 'key-snippet')}
                  className="text-slate-400 hover:text-slate-800 cursor-pointer"
                >
                  {copiedCodeSnippet === 'key-snippet' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-blue-700 font-bold">NODE_ENV</span> = <span className="text-slate-600">production</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-blue-700 font-bold">PORT</span> = <span className="text-slate-600">3000</span>
              </div>
            </div>
          </div>

          {/* Step 4: Verification */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <p className="font-bold">
                {lang === 'si' ? '✅ Deploy වූ පසු ඔබගේ App එක සජීවීව ක්‍රියාත්මක වේ!' : '✅ Live URL Activated!'}
              </p>
              <p className="text-emerald-800">
                {lang === 'si'
                  ? 'Render මඟින් ඔබට නොමිලේ https://lk-job-master.onrender.com වැනි SSL සහතික සහිත සජීවී සබැඳියක් ලබාදෙනු ඇත. පරිශීලකයින්ට සහ Admin ට ඕනෑම තැනක සිට පිවිසිය හැක.'
                  : 'Render provides a free live HTTPS URL (e.g. https://lk-job-master.onrender.com). The CV reader, gazette pipeline, and WhatsApp alert engine will function smoothly.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed User Dossier Modal */}
      {selectedUserDossier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-900 font-mono text-xs px-2.5 py-0.5 rounded-lg font-bold">
                    {selectedUserDossier.userId}
                  </span>
                  {selectedUserDossier.isVerifiedByUser && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified Candidate
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">{selectedUserDossier.name}</h3>
                <p className="text-xs text-slate-500">
                  Registered: {new Date(selectedUserDossier.createdAt).toLocaleDateString()}
                  {selectedUserDossier.confirmedAt && ` • Confirmed: ${new Date(selectedUserDossier.confirmedAt).toLocaleDateString()}`}
                </p>
              </div>

              <button
                onClick={() => setSelectedUserDossier(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier sections */}
            <div className="space-y-4 text-xs">
              {/* Contact & Personal */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">Personal & Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <p><strong>Email:</strong> {selectedUserDossier.email}</p>
                  <p><strong>Phone / WhatsApp:</strong> {selectedUserDossier.whatsapp || selectedUserDossier.phone}</p>
                  <p><strong>District:</strong> {selectedUserDossier.district}</p>
                  <p><strong>City:</strong> {selectedUserDossier.city || 'N/A'}</p>
                  <p><strong>Address:</strong> {selectedUserDossier.address || 'N/A'}</p>
                  <p><strong>NIC / ID:</strong> {selectedUserDossier.nicOrId || 'N/A'}</p>
                  <p><strong>Age:</strong> {selectedUserDossier.age || 'N/A'}</p>
                </div>
              </div>

              {/* Education */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">Education Criteria</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <p><strong>Highest Level:</strong> {selectedUserDossier.educationLevel}</p>
                  <p><strong>A/L Stream:</strong> {selectedUserDossier.alStream}</p>
                  <p><strong>O/L Passed:</strong> {selectedUserDossier.olPassed ? 'Yes (6 subjects)' : 'No'}</p>
                  <p><strong>Maths & English Credits:</strong> {selectedUserDossier.olEnglishAndMaths ? 'Yes' : 'No'}</p>
                  {selectedUserDossier.alSubjectsSummary && (
                    <p className="sm:col-span-2"><strong>A/L Results:</strong> {selectedUserDossier.alSubjectsSummary}</p>
                  )}
                  {selectedUserDossier.higherEducation && (
                    <p className="sm:col-span-2"><strong>Degree / Institute:</strong> {selectedUserDossier.higherEducation}</p>
                  )}
                </div>
              </div>

              {/* Experience & Skills */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">Experience & Skills</span>
                <p><strong>Total Experience:</strong> {selectedUserDossier.experienceYears} Years</p>
                {selectedUserDossier.experienceHistory && (
                  <p><strong>History:</strong> {selectedUserDossier.experienceHistory}</p>
                )}
                <div className="pt-1">
                  <strong>Skills:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedUserDossier.skills.map((s, i) => (
                      <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
                <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">Target Vacancies</span>
                <p><strong>Preferred Sectors:</strong> {selectedUserDossier.preferredSectors.join(', ')}</p>
                {selectedUserDossier.preferredRoles?.length > 0 && (
                  <p><strong>Preferred Roles:</strong> {selectedUserDossier.preferredRoles.join(', ')}</p>
                )}
              </div>

              {selectedUserDossier.cvSummary && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                  <span className="font-bold text-emerald-900 block mb-1">AI CV Summary:</span>
                  <p className="text-emerald-800 leading-relaxed">{selectedUserDossier.cvSummary}</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const text = `User Registration Dossier:
Registration ID: ${selectedUserDossier.userId}
Name: ${selectedUserDossier.name}
Email: ${selectedUserDossier.email}
Phone: ${selectedUserDossier.whatsapp || selectedUserDossier.phone}
Address: ${selectedUserDossier.address || ''}, ${selectedUserDossier.city || ''}, ${selectedUserDossier.district}
Education: ${selectedUserDossier.educationLevel} (${selectedUserDossier.higherEducation || ''})
Skills: ${selectedUserDossier.skills.join(', ')}
Experience: ${selectedUserDossier.experienceYears}y - ${selectedUserDossier.experienceHistory || ''}`;
                  copyToClipboard(text, selectedUserDossier.userId);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                {copiedId === selectedUserDossier.userId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedUserDossier.userId ? 'Copied Dossier!' : 'Copy Dossier to Clipboard'}</span>
              </button>

              <button
                onClick={() => setSelectedUserDossier(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
