import React from 'react';
import { X, Printer, Smartphone, CheckCircle2, AlertTriangle, FileImage } from 'lucide-react';
import { ReceiptSettings } from '../types/receipt';

interface PrinterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReceiptSettings;
}

export const PrinterGuideModal: React.FC<PrinterGuideModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const printableW = settings.paperWidthMm - settings.rightBlankMarginMm;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0066CC]/10 text-[#0066CC] flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                دليل الطباعة الحرارية ({settings.paperWidthMm}mm) وتوافق الأجهزة
              </h2>
              <p className="text-xs text-slate-500">
                إرشادات ضبط الطابعات المحمولة على iOS و Android والكمبيوتر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700">
          {/* 1. Why the 15mm right blank offset exists */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-[#0066CC] font-extrabold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>معايرة الهامش الأيمن الفارغ ({settings.rightBlankMarginMm}mm) مفعّلة تلقائياً</span>
            </div>
            <p className="text-xs text-slate-600">
              يتم حجز <strong>{settings.rightBlankMarginMm}mm</strong> فارغ تماماً على يمين الوصل (وتخصيص{' '}
              <strong>{printableW}mm</strong> للمحتوى) داخل ملفات <strong>PNG</strong> و{' '}
              <strong>PDF</strong> والطباعة المباشرة، وذلك لتعويض الإزاحة الميكانيكية لليمين في الطابعات الحرارية المحمولة مقاس 58mm و 57mm دون اقتصاص أي حرف.
            </p>
          </div>

          {/* 2. iOS & Bluetooth Printer Limitations */}
          <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>ملاحظة هامة لمستخدمي iPhone / iPad (iOS) وطابعات البلوتوث</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700">
              <li>
                نافذة الطباعة المباشرة في متصفح iOS تعتمد على بروتوكول <strong>AirPrint</strong>. معظم الطابعات الحرارية المحمولة الرخيصة التي تعمل عبر البلوتوث (ESC/POS Bluetooth) لا تدعم AirPrint مباشرةً من المتصفح.
              </li>
              <li>
                <strong>الحل الأسرع والأدق للطابعات الحرارية عبر البلوتوث (iOS & Android):</strong> اضغط على زر <strong>«حفظ PNG»</strong> أو <strong>«حفظ PDF»</strong> ثم افتح الصورة أو الملف مباشرة داخل تطبيق الطابعة المرفق بها (مثل <em>RawBT</em> أو <em>Thermer</em> أو <em>WalkPrint</em> أو <em>FunPrint</em>) واطبع بنسبة 100% دون تغيير الحجم.
              </li>
            </ul>
          </div>

          {/* 3. Desktop & Direct Print Settings */}
          <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold">
              <Smartphone className="w-4 h-4 text-[#0066CC]" />
              <span>إعدادات الطباعة المباشرة الموصى بها من المتصفح</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
              <li>
                اختر مقاس الورق في تعريف الطابعة: <strong dir="ltr">{settings.paperWidthMm}mm Roll</strong>.
              </li>
              <li>
                اجعل الهوامش (Margins): <strong>بلا هوامش (None / 0mm)</strong>.
              </li>
              <li>
                أوقف خيار <strong>الملاءمة التلقائية (Fit to page)</strong> واستخدم الحجم الفعلي <strong>100% (Actual Size)</strong> حتى لا يقوم المتصفح بتوسيط الوصل أو تقليص الهامش الأيمن.
              </li>
              <li>
                ألغِ تفعيل <strong>الرؤوس والتذييلات (Headers and Footers)</strong>.
              </li>
            </ul>
          </div>

          {/* 4. PNG vs PDF */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-start gap-3">
            <FileImage className="w-5 h-5 text-[#0066CC] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-extrabold text-slate-900">تطابق 100% بين PNG و PDF</p>
              <p>
                يتم توليد ملف الـ PDF بمقاس مخصص تماماً (<span dir="ltr">{settings.paperWidthMm}mm</span> عرضاً) وليس على ورقة A4، مع تضمين الهامش الأيمن الفارغ (<span dir="ltr">{settings.rightBlankMarginMm}mm</span>) بدقة مليمترية متطابقة مع صورة الـ PNG.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-extrabold transition-colors cursor-pointer"
          >
            فهمت، إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
