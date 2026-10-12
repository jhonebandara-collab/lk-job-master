import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Layers, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Bell,
  Clock,
  Send
} from 'lucide-react';
import { JobMatchResult, UserProfile, JobVacancy } from '../types';

interface MatchesViewProps {
  matches: JobMatchResult[];
  currentUser: UserProfile;
  lang: 'si' | 'en';
  onSelectJob: (job: JobVacancy) => void;
  onNavigateToSubscription: () => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  matches,
  currentUser,
  lang,
  onSelectJob,
  onNavigateToSubscription,
}) => {
  const isSubscribed = currentUser.subscription.status === 'ACTIVE';

  const handleShareMatchesToWhatsApp = () => {
    const topMatches = matches.slice(0, 4);
    const text = encodeURIComponent(
      `🇱🇰 *LK Job Master - මගේ සුදුසුකම් වලට ගැළපෙන රැකියා* 🎯\n\n` +
      `පරිශීලක: ${currentUser.name} (${currentUser.userId})\n` +
      `අධ්‍යාපන මට්ටම: ${currentUser.educationLevel} | දිස්ත්‍රික්කය: ${currentUser.district}\n\n` +
      topMatches.map((m, i) => 
        `🔹 *${i + 1}. ${m.job.title}*\n` +
        `🏢 ${m.job.organization}\n` +
        `🎯 ගැළපීම: *${m.matchScore}%*\n` +
        `📅 අවසන් දිනය: ${m.job.closingDate}\n` +
        `🔗 ${m.job.applyAddressOrLink}\n`
      ).join('\n') +
      `\n_LK Job Master ස්වයංක්‍රීය පද්ධතියෙන් ලබාගන්නා ලදී._`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Match Highlights Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                {lang === 'si' ? 'ස්මාර්ට් AI ගැලපීම' : 'Smart AI Matching'}
              </span>
              <span className="text-slate-300 text-xs font-mono">
                {currentUser.userId}
              </span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black mt-2">
              {lang === 'si' ? 'ඔබට ගැළපෙන රැකියා සහ ගැසට් ඇබෑර්තු' : 'Jobs Matched To Your Qualifications'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {lang === 'si'
                ? `ඔබගේ අධ්‍යාපනය (${currentUser.educationLevel}), පළපුරුද්ද (${currentUser.experienceYears}y), සහ කුසලතා මත පදනම්ව රැකියා ${matches.length} ක් විශ්ලේෂණය කර ඇත.`
                : `Analyzed ${matches.length} jobs based on your education (${currentUser.educationLevel}), ${currentUser.experienceYears}y experience, and skills.`}
            </p>
          </div>

          {/* WhatsApp / Subscription actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={handleShareMatchesToWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{lang === 'si' ? 'WhatsApp මඟින් යවන්න' : 'Send to WhatsApp'}</span>
            </button>

            {!isSubscribed && (
              <button
                onClick={onNavigateToSubscription}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{lang === 'si' ? 'දිනපතා ඇලර්ට් සක්‍රිය (රු.500)' : 'Automate Daily (Rs.500)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Alert Prompt if user hasn't activated Rs.500 plan */}
      {!isSubscribed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-amber-950">
                {lang === 'si' ? 'ස්වයංක්‍රීය ඇලර්ට් සේවාව ලබාගන්න (මසකට රු. 500යි)' : 'Activate Daily Radar Alerts (Rs. 500 / Month)'}
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                {lang === 'si'
                  ? 'නව රජයේ ගැසට් නිකුත් වූ සිකුරාදා උදෑසනම සහ පෞද්ගලික රැකියා පළවූ සැණින් ඔබගේ WhatsApp / Email වෙත ස්වයංක්‍රීයව පණිවිඩ එවනු ලැබේ.'
                  : 'Receive instant WhatsApp and Email notifications as soon as a matching Government Gazette or private vacancy is published.'}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToSubscription}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl transition shadow-xs shrink-0 cursor-pointer text-center"
          >
            {lang === 'si' ? 'දැන්ම සක්‍රිය කරන්න' : 'Upgrade to Active'}
          </button>
        </div>
      )}

      {/* Matched Jobs List */}
      <div className="space-y-4">
        {matches.map((item, index) => {
          const job = item.job;
          const daysLeft = Math.ceil((new Date(job.closingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          return (
            <div 
              key={job.id ? `${job.id}-${index}` : `match-${index}`}
              className="bg-white rounded-3xl border border-slate-200/90 hover:border-blue-400 p-5 sm:p-6 shadow-xs transition hover:shadow-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {job.category === 'GOVERNMENT' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {lang === 'si' ? 'රජයේ ගැසට් පත්‍රය (IIA)' : 'Government Gazette'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        {job.category === 'SEMI_GOVERNMENT' ? 'Semi-Gov' : 'Private'}
                      </span>
                    )}

                    {job.mergedCount > 1 && (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                        <Layers className="w-3 h-3 text-purple-600" />
                        {job.mergedCount} {lang === 'si' ? 'අඩවි වලින් ඒකාබද්ධයි' : 'Sources Merged'}
                      </span>
                    )}

                    <span className="text-xs text-slate-500 font-medium">
                      📅 {lang === 'si' ? 'අවසන් දිනය:' : 'Closes:'} {job.closingDate} ({daysLeft > 0 ? `${daysLeft} days` : 'Closed'})
                    </span>
                  </div>

                  <h3 
                    onClick={() => onSelectJob(job)}
                    className="text-base sm:text-lg font-bold text-slate-900 hover:text-blue-600 cursor-pointer transition leading-snug"
                  >
                    {lang === 'si' && job.titleSi ? job.titleSi : job.title}
                  </h3>

                  <p className="text-xs sm:text-sm font-semibold text-slate-700">
                    {job.organization}
                  </p>
                </div>

                {/* Score badge */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0">
                  <div className={`px-4 py-1.5 rounded-2xl font-black text-sm sm:text-base flex items-center gap-1.5 shadow-xs ${
                    item.matchScore >= 80 
                      ? 'bg-emerald-600 text-white' 
                      : item.matchScore >= 65 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-slate-700 text-white'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                    <span>{item.matchScore}%</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {item.matchScore >= 80 
                      ? (lang === 'si' ? 'ඉහළ ගැළපීමක්' : 'High Compatibility') 
                      : (lang === 'si' ? 'මධ්‍යම ගැළපීමක්' : 'Moderate Match')}
                  </span>
                </div>
              </div>

              {/* Match Criteria Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                {/* Positive match reasons */}
                <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl space-y-1">
                  <span className="font-bold text-emerald-900 block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {lang === 'si' ? 'ගැළපෙන සුදුසුකම් (Why it matches):' : 'Criteria Met:'}
                  </span>
                  <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                    {item.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Missing / Caution items */}
                {item.missingQualifications.length > 0 ? (
                  <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-2xl space-y-1">
                    <span className="font-bold text-amber-900 block flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      {lang === 'si' ? 'අවධානයට (Criteria check):' : 'Criteria Checklist:'}
                    </span>
                    <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                      {item.missingQualifications.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl flex items-center text-blue-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                    <span>{lang === 'si' ? 'සියලුම මූලික සුදුසුකම් සපුරා ඇත!' : 'All essential criteria satisfied!'}</span>
                  </div>
                )}
              </div>

              {/* Action row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs font-bold text-slate-800">
                  {lang === 'si' ? 'වැටුප:' : 'Salary:'} <span className="text-blue-700">{job.salaryRange}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectJob(job)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                  >
                    {lang === 'si' ? 'විස්තර බලන්න' : 'Full Details'}
                  </button>

                  <a
                    href={job.applyAddressOrLink.startsWith('http') ? job.applyAddressOrLink : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!job.applyAddressOrLink.startsWith('http')) {
                        e.preventDefault();
                        onSelectJob(job);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
                  >
                    <span>{lang === 'si' ? 'අයදුම් කරන්න' : 'Apply'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
