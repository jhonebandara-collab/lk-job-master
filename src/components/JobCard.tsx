import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Layers, 
  ExternalLink, 
  FileText, 
  Clock, 
  CheckCircle, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { JobVacancy } from '../types';

interface JobCardProps {
  job: JobVacancy;
  lang: 'si' | 'en';
  onSelect: (job: JobVacancy) => void;
  onMatchMyCv?: (job: JobVacancy) => void;
  matchScore?: number;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  lang,
  onSelect,
  onMatchMyCv,
  matchScore,
}) => {
  const [showSources, setShowSources] = useState(false);

  // Calculate days left
  const daysLeft = Math.ceil((new Date(job.closingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysLeft <= 5 && daysLeft >= 0;
  const isExpired = daysLeft < 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group relative overflow-hidden">
      {/* Category Accent top bar */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1 ${
          job.category === 'GOVERNMENT'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
            : job.category === 'SEMI_GOVERNMENT'
            ? 'bg-gradient-to-r from-amber-500 to-yellow-600'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}
      />

      <div>
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {job.category === 'GOVERNMENT' ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {lang === 'si' ? 'රජයේ ගැසට් පත්‍රය (IIA)' : 'Government Gazette'}
              </span>
            ) : job.category === 'SEMI_GOVERNMENT' ? (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                {lang === 'si' ? 'අර්ධ රාජ්‍ය / මණ්ඩල' : 'Semi-Government'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                {lang === 'si' ? 'පෞද්ගලික අංශය' : 'Private Sector'}
              </span>
            )}

            {/* Smart Deduplication Tag if merged from multiple portals */}
            {job.mergedCount > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSources(!showSources);
                }}
                className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer"
                title="Click to view all merged job sites"
              >
                <Layers className="w-3 h-3 text-purple-600" />
                <span>
                  {lang === 'si' 
                    ? `අඩවි ${job.mergedCount} කින් ඒකාබද්ධයි` 
                    : `Merged (${job.mergedCount} Sites)`}
                </span>
                {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Match Score Badge (if passed from matching engine) */}
          {matchScore !== undefined && (
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
              matchScore >= 80 
                ? 'bg-emerald-500 text-white shadow-xs' 
                : matchScore >= 60 
                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              <Sparkles className="w-3 h-3" />
              <span>{matchScore}% {lang === 'si' ? 'ගැළපීම' : 'Match'}</span>
            </div>
          )}
        </div>

        {/* Expandable Merged Sources List */}
        {showSources && job.sources.length > 1 && (
          <div className="mb-3 p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-200">
            <p className="font-semibold text-purple-900 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              {lang === 'si' 
                ? 'අනුපිටපත් වැළැක්වීම: මෙම ඇබෑර්තුව පහත අඩවි වලින් හඳුනාගෙන එකට ඒකාබද්ධ කර ඇත:'
                : 'Deduplicated: This single vacancy was found across multiple portals:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {job.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-md text-[11px] font-medium text-slate-700 hover:text-blue-600 border border-purple-200 shadow-2xs hover:border-blue-300"
                >
                  <span>{src.name}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <h3 
          onClick={() => onSelect(job)}
          className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer leading-snug"
        >
          {lang === 'si' && job.titleSi ? job.titleSi : job.title}
        </h3>

        {/* Sinhala Subtitle if viewing in English or vice-versa */}
        {job.titleSi && lang === 'en' && (
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
            {job.titleSi}
          </p>
        )}
        {lang === 'si' && job.title && job.titleSi && (
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
            {job.title}
          </p>
        )}

        {/* Organization */}
        <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="line-clamp-1">{job.organization}</span>
        </p>

        {/* Gazette Reference tag if present */}
        {job.gazetteReference && (
          <p className="text-[11px] font-mono text-emerald-700 bg-emerald-50/70 border border-emerald-100 px-2 py-0.5 rounded-md mt-2 line-clamp-1">
            📜 {job.gazetteReference}
          </p>
        )}

        {/* Key Requirements snippet */}
        <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
          {job.qualificationsText}
        </p>

        {/* Education Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
          {job.educationRequired.map((edu, idx) => (
            <span 
              key={idx}
              className="bg-slate-100 text-slate-800 text-[11px] font-medium px-2 py-0.5 rounded-md"
            >
              {edu}
            </span>
          ))}

          {job.experienceYears > 0 ? (
            <span className="bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded-md">
              {job.experienceYears}y+ {lang === 'si' ? 'පළපුරුද්ද' : 'Exp'}
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2 py-0.5 rounded-md">
              {lang === 'si' ? 'අභ්‍යාසලාභී / Freshers' : 'Freshers Welcome'}
            </span>
          )}
        </div>

        {/* Metadata info grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>

          <div className="flex items-center gap-1.5 justify-end">
            <Clock className={`w-3.5 h-3.5 shrink-0 ${isExpiringSoon ? 'text-rose-500' : 'text-slate-400'}`} />
            <span className={`font-medium ${isExpiringSoon ? 'text-rose-600 font-bold' : isExpired ? 'text-slate-400' : 'text-slate-700'}`}>
              {isExpired 
                ? (lang === 'si' ? 'කල් ඉකුත් වී ඇත' : 'Expired')
                : daysLeft === 0 
                ? (lang === 'si' ? 'අද අවසන් දිනය!' : 'Closes Today!') 
                : `${daysLeft} ${lang === 'si' ? 'දින ඉතිරියි' : 'days left'}`}
            </span>
          </div>
        </div>

        {/* Salary */}
        <div className="mt-2 text-xs font-semibold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg flex items-center justify-between">
          <span className="text-slate-500">{lang === 'si' ? 'වැටුප / පරිමාණය:' : 'Salary / Scale:'}</span>
          <span className="text-blue-800 truncate ml-1">{job.salaryRange}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <button
          onClick={() => onSelect(job)}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{lang === 'si' ? 'විස්තර බලන්න' : 'Full Details'}</span>
        </button>

        {job.gazetteDownloadUrl ? (
          <a
            href={job.gazetteDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition shadow-xs flex items-center gap-1"
            title="Download Official Gazette PDF"
          >
            <span>PDF</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <a
            href={job.applyAddressOrLink.startsWith('http') ? job.applyAddressOrLink : '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!job.applyAddressOrLink.startsWith('http')) {
                e.preventDefault();
                onSelect(job);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition shadow-xs flex items-center gap-1"
          >
            <span>{lang === 'si' ? 'අයදුම් කරන්න' : 'Apply'}</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
