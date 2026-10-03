import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  Briefcase, 
  GraduationCap, 
  Layers, 
  ExternalLink, 
  FileText, 
  Share2, 
  CheckCircle2, 
  ShieldCheck, 
  Send,
  AlertCircle
} from 'lucide-react';
import { JobVacancy, UserProfile } from '../types';

interface JobDetailsModalProps {
  job: JobVacancy | null;
  onClose: () => void;
  lang: 'si' | 'en';
  currentUser: UserProfile | null;
  onMatchClick?: (job: JobVacancy) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
  lang,
  currentUser,
  onMatchClick,
}) => {
  if (!job) return null;

  const daysLeft = Math.ceil((new Date(job.closingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🇱🇰 *LK Job Radar Alert: ${job.title}*\n\n` +
      `🏢 *ආයතනය / Ministry:* ${job.organization}\n` +
      `📜 *අවම සුදුසුකම්:* ${job.educationRequired.join(', ')}\n` +
      `💰 *වැටුප:* ${job.salaryRange}\n` +
      `📅 *අවසන් දිනය:* ${job.closingDate} (${daysLeft > 0 ? daysLeft + ' days left' : 'Closes soon'})\n` +
      (job.gazetteReference ? `🏛️ *ගැසට් අංකය:* ${job.gazetteReference}\n` : '') +
      `🔗 *අයදුම්පත් යොමුව:* ${job.applyAddressOrLink}\n\n` +
      `_LK Job & Gazette Radar වෙතින් ස්වයංක්‍රීයව ජනනය කරන ලදී._`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {job.category === 'GOVERNMENT' ? (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  {lang === 'si' ? 'රජයේ ගැසට් පත්‍රය (Part I: Sec IIA)' : 'Government Gazette (Sec IIA)'}
                </span>
              ) : job.category === 'SEMI_GOVERNMENT' ? (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 text-amber-700" />
                  {lang === 'si' ? 'අර්ධ රාජ්‍ය ආයතනය' : 'Semi-Government'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Briefcase className="w-3.5 h-3.5 text-blue-700" />
                  {lang === 'si' ? 'පෞද්ගලික අංශය' : 'Private Sector'}
                </span>
              )}

              {/* Deduplication merged count */}
              {job.mergedCount > 1 && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Layers className="w-3.5 h-3.5 text-purple-700" />
                  {lang === 'si' 
                    ? `අඩවි ${job.mergedCount} කින් එකතු කර ඇත` 
                    : `Verified on ${job.mergedCount} Portals`}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              {lang === 'si' && job.titleSi ? job.titleSi : job.title}
            </h2>
            {job.titleSi && lang === 'en' && (
              <p className="text-sm text-slate-500 font-medium mt-1">{job.titleSi}</p>
            )}
            {job.title && lang === 'si' && (
              <p className="text-sm text-slate-500 font-medium mt-1">{job.title}</p>
            )}
            
            <p className="text-sm font-semibold text-slate-700 mt-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{job.organization}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                {lang === 'si' ? 'අවසන් දිනය' : 'Closing Date'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {job.closingDate}
              </span>
              <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                {daysLeft > 0 ? `${daysLeft} ${lang === 'si' ? 'දින ඉතිරියි' : 'days remaining'}` : 'Expired'}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                {lang === 'si' ? 'වැටුප / පරිමාණය' : 'Salary / Scale'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 truncate">
                {job.salaryRange}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                {lang === 'si' ? 'වයස් සීමාව' : 'Age Limit'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5">
                {job.ageLimit}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">
                {lang === 'si' ? 'ස්ථානය' : 'Location'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {job.location}
              </span>
            </div>
          </div>

          {/* Official Gazette Reference Card (if Gov) */}
          {job.gazetteReference && (
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                {lang === 'si' ? 'රජයේ ගැසට් පත්‍රය තොරතුරු' : 'Official Gazette Reference'}
              </h4>
              <p className="text-sm font-mono font-medium text-emerald-800">
                {job.gazetteReference}
              </p>
              {job.gazetteDownloadUrl && (
                <div className="mt-3">
                  <a
                    href={job.gazetteDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{lang === 'si' ? 'ගැසට් පත්‍රය (PDF) බාගත කරන්න' : 'Download Official Gazette PDF'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Deduplicated Sources List */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Layers className="w-4 h-4 text-purple-600" />
              {lang === 'si' ? 'ස්කෑන් කළ මූලාශ්‍ර (Sources & Deduplication)' : 'Scanned Portals & Sources'}
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              {lang === 'si' 
                ? 'මෙම ඇබෑර්තුව ස්වයංක්‍රීයව ලංකාවේ ප්‍රධාන රැකියා අඩවි වලින් හඳුනාගෙන අනුපිටපත් ඉවත් කර ඇත:'
                : 'This job vacancy was discovered from the following verified portals:'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {job.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-800 transition shadow-2xs group"
                >
                  <span className="font-semibold text-slate-900 group-hover:text-blue-600">{src.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                </a>
              ))}
            </div>
          </div>

          {/* Detailed Qualifications */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              {lang === 'si' ? 'අවශ්‍ය සුදුසුකම් සහ නිර්ණායක' : 'Required Qualifications & Eligibility'}
            </h4>
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.qualificationsText}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {job.educationRequired.map((edu, idx) => (
                <span key={idx} className="bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg">
                  🎓 {edu}
                </span>
              ))}
              {job.tags.map((tag, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Application Method & Address */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <Send className="w-4 h-4 text-blue-600" />
              {lang === 'si' ? 'අයදුම්පත් යොමු කළ යුතු ආකාරය' : 'How to Apply / Application Address'}
            </h4>
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs sm:text-sm text-slate-800">
              <p className="font-semibold text-amber-950 mb-1">
                {job.applicationMethod === 'POSTAL_GAZETTE'
                  ? (lang === 'si' ? 'තැපැල් මඟින් හෝ ගැසට් ආකෘතියට අනුව:' : 'By Registered Post as per Gazette format:')
                  : job.applicationMethod === 'EMAIL'
                  ? (lang === 'si' ? 'විද්‍යුත් තැපෑල (Email) මඟින්:' : 'Directly via Email:')
                  : (lang === 'si' ? 'මාර්ගගත ක්‍රමවේදය (Online Portal):' : 'Online Application Portal:')}
              </p>
              <p className="font-mono text-slate-800 break-all select-all bg-white p-2.5 rounded-lg border border-amber-200/70 mt-2">
                {job.applyAddressOrLink}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'si' ? 'WhatsApp යවන්න' : 'Share on WhatsApp'}</span>
          </button>

          <div className="flex items-center gap-2">
            {job.applyAddressOrLink.startsWith('http') ? (
              <a
                href={job.applyAddressOrLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs"
              >
                <span>{lang === 'si' ? 'අයදුම් කරන්න (Apply Now)' : 'Apply Now Online'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                {lang === 'si' ? 'තහවුරු කළා' : 'Done'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
