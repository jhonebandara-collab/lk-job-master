import React, { useState } from 'react';
import { 
  UserCheck, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  GraduationCap, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  Send, 
  Loader2, 
  Info,
  Clock,
  IdCard,
  Edit3,
  Calendar,
  Plus,
  X,
  Copy,
  Check
} from 'lucide-react';
import { UserProfile } from '../types';
import { compressImageFile } from '../utils/imageCompressor';

interface ProfileViewProps {
  currentUser: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  lang: 'si' | 'en';
  onNavigateToSubscription: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onSaveProfile,
  lang,
  onNavigateToSubscription,
}) => {
  const [formData, setFormData] = useState<UserProfile>(currentUser);
  const [isParsingCv, setIsParsingCv] = useState(false);
  const [cvText, setCvText] = useState('');
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedOther, setCopiedOther] = useState(false);

  React.useEffect(() => {
    setFormData(currentUser);
  }, [currentUser]);

  // Sri Lanka Districts
  const districts = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
  ];

  // Handle CV file upload & AI Parsing via /api/users/parse-cv
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingCv(true);
    setParseStatus(lang === 'si' ? 'AI මඟින් ඔබගේ CV පත්‍රය කියවමින් පවතී...' : 'AI is reading & extracting your CV data...');

    try {
      if (file.type.startsWith('image/')) {
        const { base64, mimeType } = await compressImageFile(file, 1400, 0.85);
        await submitCvForParsing({
          cvBase64: base64,
          mimeType,
          fileName: file.name,
        });
      } else {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = async () => {
          await submitCvForParsing({
            cvText: reader.result as string,
            fileName: file.name,
          });
        };
      }
    } catch (err: any) {
      setIsParsingCv(false);
      setParseStatus(`❌ ${err.message || 'Failed to read file'}`);
    }
  };

  const submitCvForParsing = async (payload: any) => {
    try {
      const res = await fetch('/api/users/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.parsedCV) {
        const p = data.parsedCV;
        setFormData(prev => ({
          ...prev,
          name: p.name || prev.name,
          email: p.email || prev.email,
          phone: p.phone || prev.phone,
          whatsapp: p.whatsapp || p.phone || prev.whatsapp,
          nicOrId: p.nicOrId || prev.nicOrId || '',
          age: p.age || prev.age || '',
          address: p.address || prev.address || '',
          city: p.city || prev.city || '',
          district: p.district || prev.district,
          educationLevel: p.educationLevel || prev.educationLevel,
          olPassed: p.olPassed !== undefined ? p.olPassed : prev.olPassed,
          olEnglishAndMaths: p.olEnglishAndMaths !== undefined ? p.olEnglishAndMaths : prev.olEnglishAndMaths,
          alPassed: p.alPassed !== undefined ? p.alPassed : prev.alPassed,
          alStream: p.alStream || prev.alStream,
          alSubjectsSummary: p.alSubjectsSummary || prev.alSubjectsSummary || '',
          higherEducation: p.higherEducation || prev.higherEducation,
          skills: p.skills?.length ? p.skills : prev.skills,
          experienceYears: p.experienceYears !== undefined ? p.experienceYears : prev.experienceYears,
          experienceHistory: p.experienceHistory || prev.experienceHistory || '',
          preferredRoles: p.preferredRoles?.length ? p.preferredRoles : prev.preferredRoles,
          preferredSectors: p.preferredSectors?.length ? p.preferredSectors : prev.preferredSectors,
          preferredLocations: p.preferredLocations?.length ? p.preferredLocations : prev.preferredLocations,
          otherDetails: p.otherDetails || prev.otherDetails || '',
          cvFileName: payload.fileName,
          cvSummary: p.summary,
          isVerifiedByUser: false, // will be confirmed by user
        }));

        setIsReviewMode(true);
        setParseStatus(
          lang === 'si' 
            ? '✨ CV තොරතුරු සාර්ථකව කියවන ලදී! පුද්ගලික ලිපිනය නිවැරදිව වෙන්කර හඳුනාගත් අතර, Referees, භාෂා, රියදුරු බලපත්‍ර හා අමතර සුදුසුකම් පහත "Other Information" විශාල කොටුවට ඇතුළත් කරන ලදී.' 
            : '✨ CV extracted! Personal home address was cleanly separated from workplace/referee data, and overflow details were placed in the large Other Details box below.'
        );
      } else {
        throw new Error(data.error || 'Parsing error');
      }
    } catch (err: any) {
      const friendlyMsg = err.message?.includes('503') || err.message?.includes('high demand')
        ? (lang === 'si' 
            ? 'AI සේවාව තාවකාලිකව කාර්යබහුලයි. කරුණාකර නැවත උත්සාහ කරන්න.' 
            : 'AI service temporarily busy. Please retry in a few seconds.')
        : err.message;
      setParseStatus(`❌ ${friendlyMsg}`);
    } finally {
      setIsParsingCv(false);
    }
  };

  // Submit manual CV Text
  const handleParseManualText = async () => {
    if (!cvText.trim()) return;
    setIsParsingCv(true);
    setParseStatus(lang === 'si' ? 'AI මඟින් පෙළ විශ්ලේෂණය කරමින් පවතී...' : 'AI analyzing CV text...');
    await submitCvForParsing({ cvText, fileName: 'Manual_Paste_CV.txt' });
  };

  // User confirms profile after manual check/edit
  const handleConfirmAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    const confirmedProfile: UserProfile = {
      ...formData,
      isVerifiedByUser: true,
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFormData(confirmedProfile);
    onSaveProfile(confirmedProfile);
    setSavedSuccess(true);
    setIsReviewMode(false);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleCopyId = () => {
    if (formData.userId) {
      navigator.clipboard.writeText(formData.userId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const toggleSector = (sector: string) => {
    setFormData(prev => {
      const exists = prev.preferredSectors.includes(sector);
      return {
        ...prev,
        preferredSectors: exists 
          ? prev.preferredSectors.filter(s => s !== sector)
          : [...prev.preferredSectors, sector],
      };
    });
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newSkillInput.trim()) return;
    if (!formData.skills.includes(newSkillInput.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkillInput.trim()] }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleAddRole = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newRoleInput.trim()) return;
    if (!formData.preferredRoles.includes(newRoleInput.trim())) {
      setFormData(prev => ({ ...prev, preferredRoles: [...prev.preferredRoles, newRoleInput.trim()] }));
    }
    setNewRoleInput('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      preferredRoles: prev.preferredRoles.filter(r => r !== roleToRemove)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner / User ID & Backup Status */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                <IdCard className="w-3.5 h-3.5" />
                {lang === 'si' ? 'ලියාපදිංචි අංකය (LK Job Master ID)' : 'Registration ID'}
              </span>
              <button
                onClick={handleCopyId}
                className="font-mono text-lg sm:text-xl font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
                title="Click to copy registration ID"
              >
                <span>{formData.userId}</span>
                {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400 opacity-70" />}
              </button>

              {formData.isVerifiedByUser && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {lang === 'si' ? 'පරිශීලකයා විසින් තහවුරු කරන ලදී' : 'Verified by User'}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black mt-2">
              {formData.name || (lang === 'si' ? 'ඔබගේ පැතිකඩ සම්පූර්ණ කරන්න' : 'Complete Your Profile')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {lang === 'si'
                ? 'ඔබගේ CV පත්‍රය හෝ සුදුසුකම් ඇතුළත් කරන්න. දත්ත නිවැරදිව තහවුරු කළ පසු Registration ID යටතේ Backups වල සුරක්ෂිත වේ.'
                : 'Upload your CV or enter qualifications. Once confirmed, data is backed up under your unique Registration ID.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:text-right shrink-0">
            <span className="text-xs text-slate-300 block">
              {lang === 'si' ? 'ස්වයංක්‍රීය ඇලර්ට් සේවාව' : 'Radar Alerts Status'}
            </span>
            <div className="mt-1">
              {formData.subscription.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {lang === 'si' ? 'ක්‍රියාකාරීයි (රු.500 සැලැස්ම)' : 'Active (Rs. 500 Plan)'}
                </span>
              ) : formData.subscription.status === 'PENDING_APPROVAL' ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-xs">
                  <Clock className="w-4 h-4" />
                  {lang === 'si' ? 'අනුමැතිය අපේක්ෂාවෙන්' : 'Verification Pending'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onNavigateToSubscription}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'si' ? 'රු.500 සක්‍රිය කරන්න' : 'Upgrade to Rs.500'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CV AI Auto-Parser Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {lang === 'si' ? 'පියවර 1: CV පත්‍රය AI මඟින් කියවීම (CV Auto-Reader)' : 'Step 1: Upload CV for AI Auto-Extraction'}
            </h3>
          </div>
          {formData.cvFileName && (
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-mono">
              📄 {formData.cvFileName}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-4">
          {lang === 'si'
            ? 'ඔබගේ CV පත්‍රය (PDF, Word, Text හෝ Image) මෙතැනට යොමු කරන්න. Gemini AI මඟින් ඔබගේ නම, ලිපිනය, දුරකථන, O/L, A/L, උපාධි සහ පළපුරුද්ද තත්පර කිහිපයකින් වෙන්කර හඳුනාගනු ඇත.'
            : 'Upload your CV or paste text. Gemini AI extracts your full name, contact, address, O/L, A/L, degrees, and work history.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Upload Zone */}
          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition">
            <Upload className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              {lang === 'si' ? 'CV ගොනුව තෝරන්න (PDF, PNG, JPG, Docx)' : 'Choose CV Document'}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              {lang === 'si' ? 'ක්ලික් කර ඔබගේ ගොනුව අප්ලෝඩ් කරන්න' : 'Click to browse files'}
            </span>
            <input 
              type="file" 
              accept=".pdf,.doc,.docx,.txt,image/*" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isParsingCv}
            />
          </label>

          {/* Paste CV text alternative */}
          <div className="space-y-2">
            <textarea
              placeholder={lang === 'si' ? 'නැතහොත් ඔබගේ CV විස්තර මෙහි Paste කරන්න...' : 'Or paste your CV text or bio here...'}
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={3}
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50 resize-none"
            />
            <button
              type="button"
              onClick={handleParseManualText}
              disabled={isParsingCv || !cvText.trim()}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isParsingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
              <span>{lang === 'si' ? 'AI මඟින් පෙළ කියවන්න' : 'Analyze Pasted Text'}</span>
            </button>
          </div>
        </div>

        {parseStatus && (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium flex items-center gap-2">
            {isParsingCv && <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />}
            <span>{parseStatus}</span>
          </div>
        )}

        {formData.cvSummary && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <span className="text-xs font-bold text-emerald-900 block mb-1">
              {lang === 'si' ? 'AI සාරාංශය (Extracted Profile Summary):' : 'AI Extracted Profile Summary:'}
            </span>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {formData.cvSummary}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation & Manual Edit Form */}
      <form onSubmit={handleConfirmAndSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {lang === 'si' ? 'පියවර 2: තොරතුරු පරීක්ෂා කිරීම සහ තහවුරු කිරීම (Review & Confirm)' : 'Step 2: Review & Confirm Profile Details'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'si'
                ? 'AI මඟින් කියවූ තොරතුරු අවශ්‍ය නම් වෙනස් කරන්න (Manual Edit). ඉන්පසු පහත Confirmation බොත්තම ඔබන්න.'
                : 'Review all AI extracted details. You can edit any field before confirming to save under your Registration ID.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {formData.isVerifiedByUser && (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'si' ? 'තහවුරු කර ඇත' : 'Confirmed'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Highlight notification if fresh extraction */}
        {isReviewMode && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">
                {lang === 'si' ? '✨ CV එකෙන් දත්ත වෙන්කර ගන්නා ලදී!' : '✨ Data Scraped from CV!'}
              </p>
              <p className="text-amber-800">
                {lang === 'si' 
                  ? 'කරුණාකර ඔබගේ නම, ලිපිනය, දුරකථන, O/L, A/L සහ පළපුරුද්ද නිවැරදි දැයි බලන්න. වැරදි හෝ අඩුපාඩු ඇත්නම් edit කර පහත "Confirm & Save Profile" බොත්තම ඔබන්න.'
                  : 'Please check your name, address, contact, O/L, A/L and qualifications. Edit any incorrect field, then click "Confirm & Save Profile" below.'}
              </p>
            </div>
          </div>
        )}

        {/* Section A: Personal & Contact Information */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-blue-800">
            <IdCard className="w-4 h-4 text-blue-600" />
            <span>{lang === 'si' ? 'මූලික තොරතුරු සහ සම්බන්ධතා (Personal & Contact)' : 'Personal & Contact Information'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'සම්පූර්ණ නම' : 'Full Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Kasun Bandara Perera"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'si' ? 'Gmail / විද්‍යුත් තැපෑල' : 'Gmail / Email'} *</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@gmail.com"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === 'si' ? 'WhatsApp අංකය (ඇලර්ට් සඳහා)' : 'WhatsApp Number'} *</span>
              </label>
              <input
                type="text"
                required
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value, phone: e.target.value })}
                placeholder="e.g. +94771234567"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'ජාතික හැඳුනුම්පත් අංකය (NIC / ID)' : 'NIC / Identification No'}
              </label>
              <input
                type="text"
                value={formData.nicOrId || ''}
                onChange={(e) => setFormData({ ...formData, nicOrId: e.target.value })}
                placeholder="e.g. 199512345678 or 951234567V"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'වයස (Age / Year of Birth)' : 'Age'}
              </label>
              <input
                type="text"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 26 Years"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'si' ? 'දිස්ත්‍රික්කය' : 'District in Sri Lanka'} *</span>
              </label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white font-medium"
              >
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Residential Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">
                  {lang === 'si' ? 'පදිංචි ස්ථිර ලිපිනය (Personal Residential Address)' : 'Personal Residential Address'}
                </label>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  {lang === 'si' ? 'නිවසේ ලිපිනය පමණි' : 'Home address only'}
                </span>
              </div>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. No. 45/2, Temple Road, Maharagama"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
              <p className="text-[10px] text-slate-500 leading-tight">
                {lang === 'si'
                  ? '💡 කරුණාකර ඔබගේ පුද්ගලික ස්ථිර නිවසේ ලිපිනය පමණක් යොදන්න. (රැකියා ස්ථානයේ හෝ නිර්දේශකයින්ගේ ලිපින මෙහි නොයොදන්න - AI මඟින් ඒවා පහත අමතර තොරතුරු කොටුවට ඇතුළත් කර ඇත).'
                  : '💡 Enter candidate personal residential home address only. Workplace and referee addresses belong in Other Details below.'}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'නගරය (City / Town)' : 'City / Town'}
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Maharagama"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>
          </div>
        </div>

        {/* Section B: Education Breakdown (O/L, A/L, Higher Ed, NVQ) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-blue-800">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>{lang === 'si' ? 'අධ්‍යාපන සුදුසුකම් (Education & Qualifications)' : 'Education & Qualifications'}</span>
          </h4>

          {/* Highest Level & A/L Stream */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {lang === 'si' ? 'ඉහළම අධ්‍යාපන මට්ටම' : 'Highest Education Level'}
              </label>
              <select
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="O_LEVEL">G.C.E. O/L (සාමාන්‍ය පෙළ)</option>
                <option value="A_LEVEL">G.C.E. A/L (උසස් පෙළ)</option>
                <option value="NVQ">NVQ Level 3 / 4 / 5 / 6</option>
                <option value="DIPLOMA">Diploma (ඩිප්ලෝමා)</option>
                <option value="DEGREE">Bachelor Degree (උපාධිය)</option>
                <option value="POSTGRADUATE">Postgraduate / Masters (පශ්චාත් උපාධි)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {lang === 'si' ? 'උසස් පෙළ (A/L) ධාරාව' : 'A/L Stream'}
              </label>
              <select
                value={formData.alStream}
                onChange={(e) => setFormData({ ...formData, alStream: e.target.value })}
                className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
              >
                <option value="Commerce">Commerce (වාණිජ)</option>
                <option value="Physical Science / Maths">Maths (ගණිත ධාරාව)</option>
                <option value="Bio Science">Bio Science (ජීව විද්‍යා)</option>
                <option value="Technology">Technology (තාක්ෂණවේදය)</option>
                <option value="Arts">Arts (කලා ධාරාව)</option>
                <option value="Other">Other / Not Applicable</option>
              </select>
            </div>
          </div>

          {/* O/L Checkboxes for Gov Gazettes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={formData.olPassed}
                onChange={(e) => setFormData({ ...formData, olPassed: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>{lang === 'si' ? 'සාමාන්‍ය පෙළ (O/L) විෂයයන් 6ක් සමත්' : 'Passed G.C.E. O/L in 6 subjects'}</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={formData.olEnglishAndMaths}
                onChange={(e) => setFormData({ ...formData, olEnglishAndMaths: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <span>{lang === 'si' ? 'ගණිතය සහ ඉංග්‍රීසි සඳහා සාමාර්ථ (Credits)' : 'Credit passes for Maths & English'}</span>
            </label>
          </div>

          {/* A/L Results Summary */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {lang === 'si' ? 'උසස් පෙළ (A/L) විෂයයන් සහ ප්‍රතිඵල' : 'A/L Subjects & Passes Summary'}
            </label>
            <input
              type="text"
              value={formData.alSubjectsSummary || ''}
              onChange={(e) => setFormData({ ...formData, alSubjectsSummary: e.target.value })}
              placeholder="e.g. Economics (A), Accounting (B), Business Studies (A)"
              className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>

          {/* Higher Education details */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              {lang === 'si' ? 'උපාධිය, ඩිප්ලෝමාව හෝ NVQ ආයතනය සහ නම' : 'Degree / Diploma / NVQ Institute & Course Title'}
            </label>
            <input
              type="text"
              value={formData.higherEducation}
              onChange={(e) => setFormData({ ...formData, higherEducation: e.target.value })}
              placeholder="e.g. B.Sc in Business / IT - University of Kelaniya, NDT Civil, NVQ Level 4 in ICT"
              className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
        </div>

        {/* Section C: Skills & Work Experience */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-blue-800">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <span>{lang === 'si' ? 'පළපුරුද්ද සහ කුසලතා (Experience & Skills)' : 'Experience & Skills'}</span>
          </h4>

          {/* Skills Management */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {lang === 'si' ? 'හඳුනාගත් කුසලතා (Skills & Competencies)' : 'Key Skills'}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {formData.skills.map((skill, idx) => (
                <span 
                  key={idx} 
                  className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder={lang === 'si' ? 'අලුත් කුසලතාවයක් එක් කරන්න (Type skill & click Add)...' : 'Add custom skill...'}
                className="text-xs p-2.5 rounded-xl border border-slate-200 flex-1 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'si' ? 'එක් කරන්න' : 'Add'}</span>
              </button>
            </div>
          </div>

          {/* Experience Years & Past Roles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'සම්පූර්ණ පළපුරුද්ද (වසර)' : 'Total Experience (Years)'}
              </label>
              <input
                type="number"
                min="0"
                max="40"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-slate-50/50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'පෙර රැකියා ඉතිහාසය (Past Roles & Companies)' : 'Past Roles & Companies'}
              </label>
              <input
                type="text"
                value={formData.experienceHistory || ''}
                onChange={(e) => setFormData({ ...formData, experienceHistory: e.target.value })}
                placeholder="e.g. Accounts Assistant at ABC Ltd (2 years), Intern at Commercial Bank"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Preferred Roles & Sectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'කැමති අංශ (Preferred Sectors)' : 'Preferred Sectors'}
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { key: 'GOVERNMENT', label: lang === 'si' ? 'රජයේ (Gazette)' : 'Government' },
                  { key: 'SEMI_GOVERNMENT', label: lang === 'si' ? 'අර්ධ රාජ්‍ය' : 'Semi-Gov' },
                  { key: 'PRIVATE', label: lang === 'si' ? 'පෞද්ගලික' : 'Private' },
                ].map(s => (
                  <button
                    type="button"
                    key={s.key}
                    onClick={() => toggleSector(s.key)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      formData.preferredSectors.includes(s.key)
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {lang === 'si' ? 'කැමති තනතුරු (Preferred Job Roles)' : 'Preferred Job Roles'}
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.preferredRoles.map((role, idx) => (
                  <span 
                    key={idx} 
                    className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <span>{role}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role)}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={handleAddRole}
                  placeholder={lang === 'si' ? 'e.g. Accounts Executive, Teacher...' : 'e.g. IT Officer, Clerk...'}
                  className="text-xs p-2 rounded-xl border border-slate-200 flex-1 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={handleAddRole}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section D: Large Other Details Box (අමතර තොරතුරු සහ සුදුසුකම්) */}
        <div className="bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50 p-5 sm:p-6 rounded-3xl border-2 border-amber-300/80 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider text-amber-950">
                  {lang === 'si' ? 'අමතර තොරතුරු සහ සුදුසුකම් (Other CV Information & Details)' : 'Section D: Other Information & Supplementary CV Data'}
                </h4>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  {lang === 'si' ? 'විශාල කොටුව (Other Box)' : 'Other Details Box'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {lang === 'si'
                  ? 'CV පත්‍රයේ ඇති ඉහත cages (කොටු) වලට සෘජුව අයත් නොවන අනෙකුත් සියලුම අමතර තොරතුරු මෙහි අඩංගු වේ: නිර්දේශකයින් (Non-Related Referees), අමතර වෘත්තීය පාඨමාලා සහ ඩිප්ලෝමා (Extra Courses & Certifications), භාෂා ප්‍රවීණතාව (Languages), රියදුරු බලපත්‍රය (Driving License), ක්‍රීඩා/පාසල් ජයග්‍රහණ, ව්‍යාපෘති සහ අමතර සටහන්. ඔබට අවශ්‍ය පරිදි මෙහි සංස්කරණය කළ හැක.'
                  : 'All supplementary CV information not fitting the cages above is organized here: Non-related referees, extra certifications/courses, language proficiencies, driving license, extracurricular achievements, projects, and special remarks. You can edit and format this box freely.'}
              </p>
            </div>

            {/* Quick helper action buttons */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const sample = `\n• Non-Related Referees:\n  1. Name: Dr./Mr. [Full Name], Designation: [Position], Organization: [Company/University], Phone: [07xxxxxxxx], Email: [referee@email.com]\n  2. Name: Dr./Mr. [Full Name], Designation: [Position], Organization: [Company/University], Phone: [07xxxxxxxx], Email: [referee@email.com]`;
                  setFormData(prev => ({ ...prev, otherDetails: (prev.otherDetails ? prev.otherDetails + '\n' : '') + sample }));
                }}
                className="bg-white hover:bg-amber-100 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer shadow-xs"
                title="Append Referees Template"
              >
                + {lang === 'si' ? 'නිර්දේශකයින් (Referees)' : 'Referees'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const sample = `\n• Languages Known:\n  - Sinhala: Mother Tongue (Native)\n  - English: Fluent in Speaking, Reading & Writing\n  - Tamil: Basic Working Knowledge`;
                  setFormData(prev => ({ ...prev, otherDetails: (prev.otherDetails ? prev.otherDetails + '\n' : '') + sample }));
                }}
                className="bg-white hover:bg-amber-100 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer shadow-xs"
                title="Append Languages"
              >
                + {lang === 'si' ? 'භාෂා (Languages)' : 'Languages'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const sample = `\n• Driving License:\n  - Valid Sri Lankan Driving License (Classes: Light Vehicles - B, Dual Purpose, Motorcycles - A1)`;
                  setFormData(prev => ({ ...prev, otherDetails: (prev.otherDetails ? prev.otherDetails + '\n' : '') + sample }));
                }}
                className="bg-white hover:bg-amber-100 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer shadow-xs"
                title="Append Driving License"
              >
                + {lang === 'si' ? 'රියදුරු බලපත්‍ර' : 'Driving License'}
              </button>

              <button
                type="button"
                onClick={() => {
                  const sample = `\n• Additional Certifications & Courses:\n  - Diploma in Information Technology & Software Applications\n  - Certificate Course in Business English & Professional Communication`;
                  setFormData(prev => ({ ...prev, otherDetails: (prev.otherDetails ? prev.otherDetails + '\n' : '') + sample }));
                }}
                className="bg-white hover:bg-amber-100 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer shadow-xs"
                title="Append Certifications"
              >
                + {lang === 'si' ? 'අමතර සහතික' : 'Certificates'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (formData.otherDetails) {
                    navigator.clipboard.writeText(formData.otherDetails);
                    setCopiedOther(true);
                    setTimeout(() => setCopiedOther(false), 2000);
                  }
                }}
                className="bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1 shadow-xs"
                title="Copy Other Details"
              >
                {copiedOther ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedOther ? 'Copied' : (lang === 'si' ? 'පිටපත්' : 'Copy')}</span>
              </button>
            </div>
          </div>

          <div>
            <textarea
              rows={8}
              value={formData.otherDetails || ''}
              onChange={(e) => setFormData({ ...formData, otherDetails: e.target.value })}
              placeholder={
                lang === 'si'
                  ? 'CV එකේ ඇති අනෙකුත් සියලුම අමතර තොරතුරු මෙහි ඇතුළත් වේ...\n• Languages: Sinhala (Native), English (Fluent)\n• Additional Courses & Certifications: Diploma in Information Technology, Certificate in Graphic Design\n• Driving License: Light Vehicles (Class B) & Motorbikes\n• Extracurricular Activities: School Prefect, Cricket Team Captain\n• Non-Related Referees:\n  1. Dr. A. Perera (Senior Lecturer, Tel: 077xxxxxxx, Email: perera@univ.lk)\n  2. Mr. B. Silva (Finance Director, Tel: 071xxxxxxx, Email: silva@company.lk)'
                  : 'Enter or review all extra CV details...\n• Languages: Sinhala, English (Fluent)\n• Additional Courses: Diploma in IT, Certificate in Graphic Design\n• Driving License: Light Vehicles (Class B) & Motorbikes\n• Non-Related Referees: Dr. A. Perera (077xxxxxxx), Mr. B. Silva (071xxxxxxx)'
              }
              className="w-full text-xs sm:text-sm p-4 rounded-2xl border border-slate-300 focus:outline-hidden focus:border-amber-500 bg-white shadow-inner font-mono leading-relaxed resize-y min-h-[220px]"
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[11px] text-slate-500 mt-2 px-1 gap-1">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{lang === 'si' ? 'අවශ්‍ය පරිදි ඕනෑම අමතර සටහනක් මෙම විශාල කොටුවේ ලියා තැබිය හැක.' : 'You can freely add, format, or edit extra notes in this large box.'}</span>
              </span>
              <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {(formData.otherDetails || '').length} characters • {((formData.otherDetails || '').match(/\n/g) || []).length + 1} lines
              </span>
            </div>
          </div>
        </div>

        {/* Confirmation & Save CTA Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {lang === 'si' 
                  ? `තහවුරු කිරීම: ${formData.userId} යටතේ Backups සුරැකේ`
                  : `Confirmation: Backed up under ID ${formData.userId}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'si'
                ? 'තහවුරු කළ පසු පරිපාලක පුවරුවට (Admin Panel) සහ AI Match එන්ජිමට ඔබගේ සම්පූර්ණ තොරතුරු වහාම යොමුවේ.'
                : 'Confirming saves your data in backups and enables automated match matching.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'si' ? 'සාර්ථකව තහවුරු විය!' : 'Confirmed & Saved!'}</span>
              </span>
            )}

            <button
              type="submit"
              className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl transition shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {lang === 'si' 
                  ? 'තහවුරු කර Profile එක Save කරන්න (Confirm & Save)' 
                  : 'Confirm & Save Profile'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
