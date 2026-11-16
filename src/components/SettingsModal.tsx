import React, { useRef } from 'react';
import {
  X,
  RotateCcw,
  Upload,
  Check,
  Ruler,
  Store,
  Type,
  MessageSquareHeart,
  Sliders,
} from 'lucide-react';
import {
  BuiltinLogoVariant,
  PaperWidthOption,
  ReceiptFontFamily,
  ReceiptFontSizeScale,
  ReceiptSettings,
} from '../types/receipt';
import { DEFAULT_SETTINGS } from '../data/companies';
import { BlueMobileLogo } from './BlueMobileLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReceiptSettings;
  onUpdateSettings: (next: ReceiptSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const printableWidthMm = Math.max(25, settings.paperWidthMm - settings.rightBlankMarginMm);

  const handleFieldChange = <K extends keyof ReceiptSettings>(
    key: K,
    value: ReceiptSettings[K]
  ) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateSettings({
          ...settings,
          logoVariant: 'custom',
          customLogoDataUrl: reader.result,
          showLogo: true,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    onUpdateSettings({ ...DEFAULT_SETTINGS });
  };

  const logoOptions: { id: BuiltinLogoVariant; label: string }[] = [
    { id: 'signal-card', label: 'شريحة وإشارة (افتراضي)' },
    { id: 'geometric-b', label: 'حرف B هندسي' },
    { id: 'minimal-badge', label: 'هاتف رقمي مبسّط' },
  ];

  const fontFamilies: { id: ReceiptFontFamily; label: string; sample: string }[] = [
    { id: 'Cairo', label: 'خط القاهرة (Cairo)', sample: 'واضح ومثالي للطباعة الحرارية' },
    { id: 'Tajawal', label: 'خط تجوّل (Tajawal)', sample: 'أنيق وعصري بحواف ناعمة' },
    { id: 'IBM Plex Sans Arabic', label: 'خط IBM Plex Arabic', sample: 'هندسي عالي الدقة للأرقام' },
  ];

  const fontSizes: { id: ReceiptFontSizeScale; label: string }[] = [
    { id: 'sm', label: 'صغير (مضغوط)' },
    { id: 'md', label: 'متوسط (القياسي)' },
    { id: 'lg', label: 'كبير (بارز)' },
  ];

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0066CC]/10 text-[#0066CC] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                إعدادات الوصل والطابعة الحرارية
              </h2>
              <p className="text-xs text-slate-500">
                تُطبّق التعديلات فوراً على جميع الوصولات وصادرات PNG و PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-right">
          {/* 1. Physical Paper & Mandatory 15mm Offset Section */}
          <section className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0066CC]">
                <Ruler className="w-4 h-4" />
                <h3 className="text-sm font-extrabold">أبعاد الورق الحراري والهامش الأيمن الإلزامي</h3>
              </div>
              <span className="text-[11px] font-mono-code font-bold px-2.5 py-0.5 rounded-full bg-[#0066CC] text-white">
                {settings.paperWidthMm}mm = {printableWidthMm}mm + {settings.rightBlankMarginMm}mm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Paper Width */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عرض ورق الطابعة (Paper Width)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([58, 57] as PaperWidthOption[]).map((w) => {
                    const active = settings.paperWidthMm === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleFieldChange('paperWidthMm', w)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-[#0066CC] text-white border-[#0066CC] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span dir="ltr">{w} mm</span>
                        {w === 58 && (
                          <span className={`text-[10px] ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                            (الافتراضي)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Blank Margin (Default 15mm) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    الهامش الأيمن الفارغ (Right Blank Space)
                  </label>
                  {settings.rightBlankMarginMm !== 15 && (
                    <button
                      type="button"
                      onClick={() => handleFieldChange('rightBlankMarginMm', 15)}
                      className="text-[11px] font-bold text-[#0066CC] hover:underline cursor-pointer"
                    >
                      إعادة لـ 15mm
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={25}
                    step={0.5}
                    dir="ltr"
                    value={settings.rightBlankMarginMm}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        handleFieldChange('rightBlankMarginMm', Math.max(0, Math.min(25, val)));
                      }
                    }}
                    className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-mono-code text-sm font-extrabold text-slate-900 focus:border-[#0066CC] focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600">ملم (mm) على اليمين</span>
                </div>
              </div>
            </div>

            {/* Visual diagram of the paper split */}
            <div className="pt-1">
              <div
                dir="ltr"
                className="w-full h-7 rounded-lg overflow-hidden border border-slate-300 grid text-[11px] font-mono-code font-bold"
                style={{
                  gridTemplateColumns: `${printableWidthMm}fr ${Math.max(1, settings.rightBlankMarginMm)}fr`,
                }}
              >
                <div className="bg-white text-slate-900 flex items-center justify-center border-r border-dashed border-amber-500">
                  Printable Area: {printableWidthMm}mm
                </div>
                <div className="bg-amber-50 text-amber-900 flex items-center justify-center">
                  Blank Right: {settings.rightBlankMarginMm}mm
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                يُحجز <strong className="text-slate-900">{settings.rightBlankMarginMm}mm</strong> فارغ تماماً على الجهة اليمنى من الوصل لتعويض إزاحة الطابعات الحرارية المحمولة، وتبقى منطقة المحتوى الفعلي <strong className="text-slate-900">{printableWidthMm}mm</strong>.
              </p>
            </div>
          </section>

          {/* 2. Store Identity Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Store className="w-4 h-4 text-[#0066CC]" />
              <h3 className="text-sm font-extrabold">هوية المتجر والشعار</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم المتجر (Store Name)
                </label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => handleFieldChange('storeName', e.target.value)}
                  placeholder="Blue Mobile"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#0066CC] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  عنوان المتجر (Store Address)
                </label>
                <input
                  type="text"
                  value={settings.storeAddress}
                  onChange={(e) => handleFieldChange('storeAddress', e.target.value)}
                  placeholder="الخمس - الحارة"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#0066CC] focus:outline-none"
                />
              </div>
            </div>

            {/* Logo Selection & Upload */}
            <div className="rounded-xl border border-slate-200 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">شعار الوصل (أبيض وأسود حراري)</span>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showLogo}
                    onChange={(e) => handleFieldChange('showLogo', e.target.checked)}
                    className="rounded border-slate-300 text-[#0066CC] focus:ring-[#0066CC]"
                  />
                  <span>إظهار الشعار أعلى الوصل</span>
                </label>
              </div>

              {settings.showLogo && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {logoOptions.map((opt) => {
                    const selected = settings.logoVariant === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleFieldChange('logoVariant', opt.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          selected
                            ? 'border-[#0066CC] bg-blue-50/50 ring-2 ring-[#0066CC]/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <BlueMobileLogo variant={opt.id} monochrome={true} size={34} />
                        <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}

                  {/* Custom Logo Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      settings.logoVariant === 'custom'
                        ? 'border-[#0066CC] bg-blue-50/50 ring-2 ring-[#0066CC]/20'
                        : 'border-dashed border-slate-300 bg-slate-50/50 hover:border-[#0066CC]'
                    }`}
                  >
                    {settings.customLogoDataUrl ? (
                      <BlueMobileLogo
                        variant="custom"
                        customLogoDataUrl={settings.customLogoDataUrl}
                        monochrome={true}
                        size={34}
                      />
                    ) : (
                      <div className="w-[34px] h-[34px] rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-600">
                        <Upload className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">
                      {settings.customLogoDataUrl ? 'شعار مخصص (تغيير)' : 'رفع شعار خاص'}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 3. Typography & Font Scale */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Type className="w-4 h-4 text-[#0066CC]" />
              <h3 className="text-sm font-extrabold">الخطوط وحجم النص الحراري</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {fontFamilies.map((f) => {
                const active = settings.fontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFieldChange('fontFamily', f.id)}
                    style={{ fontFamily: `'${f.id}', sans-serif` }}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      active
                        ? 'border-[#0066CC] bg-blue-50/50 ring-2 ring-[#0066CC]/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-900">{f.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-[#0066CC]" />}
                    </div>
                    <p className="text-[11px] text-slate-500">{f.sample}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  حجم خط الوصل (Font Size)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {fontSizes.map((s) => {
                    const active = settings.fontSizeScale === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleFieldChange('fontSizeScale', s.id)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-[#0066CC] text-white border-[#0066CC]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  دقة التصدير الحراري (Export DPI)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([300, 203] as const).map((dpiVal) => {
                    const active = settings.exportDpi === dpiVal;
                    return (
                      <button
                        key={dpiVal}
                        type="button"
                        onClick={() => handleFieldChange('exportDpi', dpiVal)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-[#0066CC] text-white border-[#0066CC]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span dir="ltr">{dpiVal} DPI</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Thank-You Message */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900">
              <MessageSquareHeart className="w-4 h-4 text-[#0066CC]" />
              <h3 className="text-sm font-extrabold">رسالة الشكر أسفل الوصل</h3>
            </div>
            <input
              type="text"
              value={settings.thankYouMessage}
              onChange={(e) => handleFieldChange('thankYouMessage', e.target.value)}
              placeholder="شكراً لتعاملكم معنا"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-[#0066CC] focus:outline-none"
            />
          </section>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الإعدادات الافتراضية</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs sm:text-sm font-extrabold shadow-xs transition-colors cursor-pointer"
          >
            حفظ وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
