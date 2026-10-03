import React from 'react';
import { 
  Radar, 
  Sparkles, 
  ShieldCheck, 
  Bell, 
  Search, 
  UserCheck, 
  Layers, 
  Settings,
  Languages,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentTab: 'search' | 'matches' | 'profile' | 'subscription' | 'admin';
  setCurrentTab: (tab: 'search' | 'matches' | 'profile' | 'subscription' | 'admin') => void;
  lang: 'si' | 'en';
  setLang: (lang: 'si' | 'en') => void;
  currentUser: UserProfile | null;
  onOpenSubscription: () => void;
  totalJobs: number;
  duplicateMergedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  currentUser,
  onOpenSubscription,
  totalJobs,
  duplicateMergedCount,
}) => {
  const isSubscribed = currentUser?.subscription.status === 'ACTIVE';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top micro-bar for Government & Multi-Portal Radar Status */}
      <div className="bg-slate-900 text-slate-200 px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {lang === 'si' ? 'සජීවී රේඩාර් සක්‍රියයි' : 'Live Radar Active'}
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-300 text-xs hidden md:inline">
            {lang === 'si' 
              ? 'මූලාශ්‍ර: ගැසට් (documents.gov.lk), TopJobs, XpressJobs, Finders.lk' 
              : 'Sources: Gazette (gov.lk), TopJobs, XpressJobs, Finders.lk'}
          </span>
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-mono border border-amber-500/30">
            <Layers className="w-3 h-3 text-amber-400" />
            {lang === 'si' ? `${duplicateMergedCount} ක් අනුපිටපත් ඒකාබද්ධ කර ඇත` : `${duplicateMergedCount} Duplicates Merged`}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {currentUser && (
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-medium text-slate-100">{currentUser.userId}</span>
              {isSubscribed ? (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  PRO (Rs.500)
                </span>
              ) : (
                <button
                  onClick={onOpenSubscription}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded text-[11px] transition shadow-xs cursor-pointer"
                >
                  {lang === 'si' ? 'රු.500 සක්‍රිය කරන්න' : 'Activate Rs.500'}
                </button>
              )}
            </div>
          )}

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'si' ? 'en' : 'si')}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-xs transition border border-slate-700 cursor-pointer"
            title="Switch Language"
          >
            <Languages className="w-3 h-3 text-cyan-400" />
            <span className="font-bold">{lang === 'si' ? 'English' : 'සිංහල'}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Identity */}
          <div 
            onClick={() => setCurrentTab('search')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Radar className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 font-sans">
                  LK Job
                </span>
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white text-[11px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                  Master
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'si' 
                  ? 'ශ්‍රී ලංකා ජොබ් මාස්ටර් & ගැසට් රේඩාර්' 
                  : 'Sri Lanka Job Master & Gazette Radar'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCurrentTab('search')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentTab === 'search'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{lang === 'si' ? 'රැකියා සොයන්න' : 'Search & Radar'}</span>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {totalJobs}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('matches')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentTab === 'matches'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'si' ? 'මගේ ගැළපීම්' : 'AI Matches'}</span>
            </button>

            <button
              onClick={() => setCurrentTab('profile')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentTab === 'profile'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{lang === 'si' ? 'පැතිකඩ & CV' : 'Profile & CV'}</span>
            </button>

            <button
              onClick={() => setCurrentTab('subscription')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentTab === 'subscription'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-rose-500" />
              <span>{lang === 'si' ? 'රු.500 සේවාව' : 'Rs.500 Plan'}</span>
              {isSubscribed ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ) : (
                <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  Hot
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'si' ? 'පරිපාලක පුවරුව' : 'Admin Radar'}</span>
            </button>
          </nav>

          {/* Quick Action Button for Mobile or Desktop */}
          <div className="flex items-center gap-2">
            {!isSubscribed ? (
              <button
                onClick={onOpenSubscription}
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{lang === 'si' ? 'දිනපතා ඇලර්ට් (රු.500)' : 'Daily Alerts (Rs.500)'}</span>
              </button>
            ) : (
              <div className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'si' ? 'රේඩාර් ඇලර්ට් සක්‍රියයි' : 'Radar Alerts Active'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100">
          <button
            onClick={() => setCurrentTab('search')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              currentTab === 'search' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Search className="w-3 h-3" />
            {lang === 'si' ? 'සොයන්න' : 'Search'} ({totalJobs})
          </button>
          <button
            onClick={() => setCurrentTab('matches')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              currentTab === 'matches' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            {lang === 'si' ? 'ගැළපීම්' : 'Matches'}
          </button>
          <button
            onClick={() => setCurrentTab('profile')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              currentTab === 'profile' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            {lang === 'si' ? 'පැතිකඩ' : 'Profile'}
          </button>
          <button
            onClick={() => setCurrentTab('subscription')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              currentTab === 'subscription' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Bell className="w-3 h-3" />
            {lang === 'si' ? 'රු.500' : 'Rs.500'}
          </button>
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
              currentTab === 'admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Settings className="w-3 h-3" />
            {lang === 'si' ? 'පරිපාලක' : 'Admin'}
          </button>
        </div>
      </div>
    </header>
  );
};
