import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Upload, 
  Building2, 
  CreditCard, 
  Sparkles, 
  AlertCircle,
  FileText,
  ArrowRight,
  Layers
} from 'lucide-react';
import { UserProfile } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onPaymentSubmitted: (paymentDetails: { paymentMethod: 'BANK_TRANSFER' | 'CARD_ONLINE'; referenceCode: string; slipUrl?: string }) => void;
  lang: 'si' | 'en';
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPaymentSubmitted,
  lang,
}) => {
  if (!isOpen) return null;

  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CARD_ONLINE'>('BANK_TRANSFER');
  const [referenceCode, setReferenceCode] = useState('');
  const [slipFileName, setSlipFileName] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAlreadyActive = currentUser.subscription.status === 'ACTIVE';
  const isPending = currentUser.subscription.status === 'PENDING_APPROVAL';

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setSlipUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onPaymentSubmitted({
      paymentMethod,
      referenceCode: referenceCode.trim() || `REF-${Date.now().toString().slice(-6)}`,
      slipUrl,
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="bg-slate-950/30 text-amber-100 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {lang === 'si' ? 'ස්වයංක්‍රීය ඇලර්ට් සේවාව' : 'Automated Radar Alerts'}
            </span>
          </div>

          <h2 className="text-2xl font-black mt-2">
            {lang === 'si' ? 'මාසික දායකත්ව සැලැස්ම' : 'Monthly Subscription Plan'}
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 mt-1">
            {lang === 'si'
              ? 'මසකට රු. 500ක් පමණි. පරිපාලක අනුමැතියෙන් පසු දිනපතා ගැළපෙන රැකියා ඇලර්ට් ඔබ වෙත පැමිණේ.'
              : 'Just Rs. 500 per month. Instant automated matching and alerts on WhatsApp & Email.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Current Status banner */}
          {isAlreadyActive ? (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  {lang === 'si' ? 'ඔබගේ රු. 500 සේවාව සක්‍රියව පවතී!' : 'Your Rs. 500 Service is Active!'}
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {lang === 'si'
                    ? `කල් ඉකුත්වන දිනය: ${currentUser.subscription.expiresAt?.split('T')[0] || 'මසකින් පසු'}. නව ඇබෑර්තු පැමිණි සැණින් WhatsApp / Email දැනුම්දීම් ඔබට ලැබෙනු ඇත.`
                    : `Expires on: ${currentUser.subscription.expiresAt?.split('T')[0] || 'In 30 days'}. You are receiving daily alerts.`}
                </p>
              </div>
            </div>
          ) : isPending ? (
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-spin-slow" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  {lang === 'si' ? 'ගෙවීම් අනුමැතිය අපේක්ෂාවෙන් (Pending Approval)' : 'Payment Under Admin Review'}
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  {lang === 'si'
                    ? 'ඔබගේ ගෙවීම් රිසිට්පත ලැබී ඇත. පරිපාලක විසින් එය පරීක්ෂා කර සක්‍රිය කළ වහාම පද්ධතිය ක්‍රියාත්මක වී එදින තෙක් ඇති සියලු රැකියා ඔබගේ WhatsApp වෙත එවනු ඇත.'
                    : 'We have received your payment proof. Once Admin verifies and activates your account, current & future matching vacancies will be automatically dispatched to your WhatsApp.'}
                </p>
              </div>
            </div>
          ) : null}

          {/* Pricing Highlight */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                {lang === 'si' ? 'මාසික ගාස්තුව' : 'Monthly Fee'}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">Rs. 500</span>
                <span className="text-xs font-semibold text-slate-500">/ {lang === 'si' ? 'මසකට' : 'month'}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                {lang === 'si' ? 'දින 30ක පූර්ණ ඇලර්ට්' : '30-Day Full Radar'}
              </span>
            </div>
          </div>

          {/* Feature Checklist */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {lang === 'si' ? 'ලැබෙන වරප්‍රසාද (Included Benefits):' : 'Included Radar Benefits:'}
            </h4>

            {[
              {
                si: 'සෑම සිකුරාදාවකම රජයේ ගැසට් පත්‍රය (Part I: Sec IIA) නිකුත් වූ සැණින් AI විග්‍රහය සහ ඇලර්ට්',
                en: 'Early Friday Government Gazette (Sec IIA) AI extraction and breakdown',
              },
              {
                si: 'TopJobs, XpressJobs, Finders.lk අඩවි වලින් අනුපිටපත් ඉවත් කළ (deduplicated) රැකියා ඇබෑර්තු',
                en: 'Deduplicated vacancies from TopJobs, XpressJobs, and Finders.lk with merged links',
              },
              {
                si: 'ඔබගේ WhatsApp ගිණුමට සෘජුවම සහ Email මඟින් ස්වයංක්‍රීය රැකියා දැනුම්දීම්',
                en: 'Instant automated WhatsApp alerts and email digests matching your qualifications',
              },
              {
                si: 'ගැසට් අයදුම්පත් ආකෘති සහ PDF සෘජුව බාගත කිරීමේ පහසුකම',
                en: 'Direct downloadable Gazette application templates & official PDFs',
              },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{lang === 'si' ? b.si : b.en}</span>
              </div>
            ))}
          </div>

          {/* Payment Form */}
          {!isAlreadyActive && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === 'si' ? 'ගෙවීම් ක්‍රමය තෝරන්න (Select Payment Method):' : 'Select Payment Method:'}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>{lang === 'si' ? 'බැංකු තැන්පතු / Slip' : 'Bank Deposit / Slip'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD_ONLINE')}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    paymentMethod === 'CARD_ONLINE'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>{lang === 'si' ? 'කාඩ්පත් / Quick Pay' : 'Online / Quick Pay'}</span>
                </button>
              </div>

              {/* Bank Details View */}
              {paymentMethod === 'BANK_TRANSFER' ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <span className="font-bold text-slate-900 block">
                    {lang === 'si' ? 'තැන්පත් කළ යුතු බැංකු ගිණුම් විස්තර:' : 'Bank Transfer Details:'}
                  </span>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-800 space-y-1 font-mono text-[11px]">
                    <p>🏦 <strong>Bank:</strong> Bank of Ceylon (BOC) / People's Bank</p>
                    <p>🏷️ <strong>Account Name:</strong> LK Job Master Services</p>
                    <p>🔢 <strong>Account Number:</strong> 0081-2093-4412</p>
                    <p>📍 <strong>Branch:</strong> Colombo Corporate / Torrington</p>
                    <p>📌 <strong>Remark / Reference:</strong> {currentUser.userId}</p>
                  </div>

                  {/* Slip Upload or Reference */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'si' ? 'ගෙවීම් රිසිට්පත (Slip) හෝ Screenshot එක:' : 'Upload Payment Slip / Screenshot:'}
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleSlipUpload}
                      className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {slipFileName && (
                      <span className="text-[11px] text-emerald-600 font-medium block mt-1">
                        📎 {slipFileName}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {lang === 'si' ? 'ගනුදෙනු අංකය (Transaction Reference):' : 'Transaction Reference / Slip No:'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BOC-TXN-984210"
                      value={referenceCode}
                      onChange={(e) => setReferenceCode(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                  <span className="font-bold text-emerald-950 block">
                    {lang === 'si' ? 'ක්ෂණික සක්‍රිය කිරීම (Quick Simulator)' : 'Quick Direct Activation Simulator'}
                  </span>
                  <p className="text-emerald-800 text-xs">
                    {lang === 'si'
                      ? 'පරීක්ෂා කිරීම සඳහා ක්ෂණික ගෙවීම් තහවුරු කිරීම ක්ලික් කරන්න. ඉන්පසු පරිපාලක පුවරුවෙන් (Admin Panel) සක්‍රිය කරගත හැක.'
                      : 'Click below to submit instant simulated card payment of Rs. 500 for testing.'}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs sm:text-sm py-3 rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>
                    {isPending 
                      ? (lang === 'si' ? 'නව රිසිට්පත යොමු කරන්න' : 'Update Payment Proof') 
                      : (lang === 'si' ? 'රු. 500 ගෙවීම තහවුරු කරන්න' : 'Submit Rs. 500 Payment')}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
