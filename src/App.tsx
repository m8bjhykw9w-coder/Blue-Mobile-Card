import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Printer,
  FileImage,
  FileText,
  Settings,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Ruler,
  Eye,
  Archive,
  HelpCircle,
  ClipboardPaste,
  X,
  Sparkles,
  Layers,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { COMPANIES, DEFAULT_SETTINGS, getCompanyById } from './data/companies';
import {
  CompanyCategory,
  CompanyId,
  ReceiptItem,
  ReceiptSettings,
} from './types/receipt';
import { BlueMobileLogo } from './components/BlueMobileLogo';
import { CompanyBrandMark } from './components/CompanyBrandMark';
import { ThermalReceiptView } from './components/ThermalReceiptView';
import { SettingsModal } from './components/SettingsModal';
import { PrinterGuideModal } from './components/PrinterGuideModal';
import {
  exportAllReceiptsAsZip,
  exportAllReceiptsIndividually,
  exportReceiptAsPdf,
  exportReceiptAsPng,
  printReceiptsDirect,
  renderReceiptToCanvas,
  RenderedReceiptResult,
} from './utils/receiptExport';

const SETTINGS_STORAGE_KEY = 'blue_mobile_receipt_settings_v1';
const SESSION_RECEIPTS_STORAGE_KEY = 'blue_mobile_session_receipts_v1';

function formatArabicTime(date: Date): string {
  try {
    return date.toLocaleTimeString('ar-LY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return date.toTimeString().slice(0, 8);
  }
}

export function App() {
  // 1. Settings state persisted in localStorage
  const [settings, setSettings] = useState<ReceiptSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage error
    }
    // Keep CSS print variables synchronized
    document.documentElement.style.setProperty(
      '--print-paper-width',
      `${settings.paperWidthMm}mm`
    );
    document.documentElement.style.setProperty(
      '--print-right-margin',
      `${settings.rightBlankMarginMm}mm`
    );
  }, [settings]);

  // 2. Form state: Selected Company, Denomination, and Exact Card Code
  const [selectedCategory, setSelectedCategory] = useState<'all' | CompanyCategory>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<CompanyId>('libyana');
  const [selectedDenomination, setSelectedDenomination] = useState<number>(10);
  const [cardCode, setCardCode] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // 3. Session Receipts (Multiple independent receipts per session)
  const [receipts, setReceipts] = useState<ReceiptItem[]>(() => {
    try {
      const saved = localStorage.getItem(SESSION_RECEIPTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    // Initial sample receipt matching Section 6 specification example
    const now = new Date();
    return [
      {
        id: 'initial-sample-1',
        sequenceNumber: 1,
        companyId: 'libyana',
        companyNameAr: 'ليبيانا',
        companyNameEn: 'Libyana',
        denomination: 10,
        cardCode: '1234567890123456',
        createdAt: now.toISOString(),
        formattedTime: formatArabicTime(now),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
    } catch {
      // Ignore
    }
  }, [receipts]);

  // Currently focused receipt ID in the preview panel
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(
    () => receipts[0]?.id || null
  );
  const [previewMode, setPreviewMode] = useState<'live-draft' | 'selected-receipt'>('selected-receipt');
  const [showRenderedPngInspector, setShowRenderedPngInspector] = useState<boolean>(false);
  const [renderedPngPreview, setRenderedPngPreview] = useState<RenderedReceiptResult | null>(null);

  // Modals & UI feedback states
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPrinterGuideOpen, setIsPrinterGuideOpen] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const currentCompany = useMemo(
    () => getCompanyById(selectedCompanyId),
    [selectedCompanyId]
  );

  const filteredCompanies = useMemo(() => {
    if (selectedCategory === 'all') return COMPANIES;
    return COMPANIES.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  // Handle selecting a company and ensuring denomination belongs strictly to that company
  const handleSelectCompany = (companyId: CompanyId) => {
    setSelectedCompanyId(companyId);
    const companyObj = getCompanyById(companyId);
    if (!companyObj.denominations.includes(selectedDenomination)) {
      setSelectedDenomination(companyObj.denominations[0]);
    }
    setValidationError(null);
    setPreviewMode('live-draft');
  };

  const handleSelectDenomination = (denom: number) => {
    setSelectedDenomination(denom);
    setValidationError(null);
    setPreviewMode('live-draft');
  };

  // Strictly preserve every character typed or pasted into the card code field
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value; // Never trim leading zeros or alter characters
    setCardCode(rawValue);
    if (validationError) setValidationError(null);
    setPreviewMode('live-draft');
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Strip only newline/carriage return characters while keeping exact digits/letters/zeros intact
        const singleLineExact = text.replace(/[\r\n]+/g, '');
        setCardCode(singleLineExact);
        setValidationError(null);
        setPreviewMode('live-draft');
        showToast('تم لصق كود الكرت كما هو بدون أي تعديل');
      }
    } catch {
      codeInputRef.current?.focus();
    }
  };

  // Draft receipt object reflecting current form inputs
  const draftReceipt: ReceiptItem = useMemo(
    () => ({
      id: 'draft-preview',
      sequenceNumber: receipts.length + 1,
      companyId: currentCompany.id,
      companyNameAr: currentCompany.nameAr,
      companyNameEn: currentCompany.nameEn,
      denomination: selectedDenomination,
      cardCode: cardCode.length > 0 ? cardCode : '1234567890123456',
      createdAt: new Date().toISOString(),
      formattedTime: formatArabicTime(new Date()),
    }),
    [currentCompany, selectedDenomination, cardCode, receipts.length]
  );

  // Active receipt shown in the Thermal Preview Stage
  const displayedReceipt: ReceiptItem = useMemo(() => {
    if (previewMode === 'live-draft') {
      return draftReceipt;
    }
    const found = receipts.find((r) => r.id === activeReceiptId);
    return found || receipts[0] || draftReceipt;
  }, [previewMode, draftReceipt, receipts, activeReceiptId]);

  // Keep high-DPI PNG inspector updated when toggled on
  useEffect(() => {
    let cancelled = false;
    if (showRenderedPngInspector) {
      renderReceiptToCanvas(displayedReceipt, settings).then((res) => {
        if (!cancelled) setRenderedPngPreview(res);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [showRenderedPngInspector, displayedReceipt, settings]);

  // Generate an independent receipt for the entered card
  const handleGenerateReceipt = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedCompanyId) {
      setValidationError('يرجى اختيار الشركة أو المنصة أولاً.');
      return;
    }

    if (!currentCompany.denominations.includes(selectedDenomination)) {
      setValidationError('يرجى اختيار فئة الكرت المتاحة لهذه الشركة.');
      return;
    }

    if (cardCode.length === 0) {
      setValidationError('يرجى إدخال رقم / كود الكرت قبل إنشاء الوصل.');
      codeInputRef.current?.focus();
      return;
    }

    const now = new Date();
    const nextSeq =
      receipts.length > 0
        ? Math.max(...receipts.map((r) => r.sequenceNumber)) + 1
        : 1;

    const newReceipt: ReceiptItem = {
      id: `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sequenceNumber: nextSeq,
      companyId: currentCompany.id,
      companyNameAr: currentCompany.nameAr,
      companyNameEn: currentCompany.nameEn,
      denomination: selectedDenomination,
      cardCode: cardCode, // Exact unaltered string (leading zeros preserved)
      createdAt: now.toISOString(),
      formattedTime: formatArabicTime(now),
    };

    setReceipts((prev) => [newReceipt, ...prev]);
    setActiveReceiptId(newReceipt.id);
    setPreviewMode('selected-receipt');
    setCardCode(''); // Ready for rapid next card entry
    setValidationError(null);
    showToast(`تم إنشاء وصل مستقل (#${String(nextSeq).padStart(2, '0')}) — ${currentCompany.nameAr} ${selectedDenomination} د.ل`);
  };

  // Load the 3 specification example cards (Libyana 10, Almadar 20, LTT 30)
  const handleLoadThreeExampleCards = () => {
    const now = new Date();
    const baseSeq =
      receipts.length > 0
        ? Math.max(...receipts.map((r) => r.sequenceNumber)) + 1
        : 1;

    const sampleBatch: ReceiptItem[] = [
      {
        id: `sample-libyana-${Date.now()}-1`,
        sequenceNumber: baseSeq,
        companyId: 'libyana',
        companyNameAr: 'ليبيانا',
        companyNameEn: 'Libyana',
        denomination: 10,
        cardCode: '0091827364554637',
        createdAt: now.toISOString(),
        formattedTime: formatArabicTime(now),
      },
      {
        id: `sample-almadar-${Date.now()}-2`,
        sequenceNumber: baseSeq + 1,
        companyId: 'almadar',
        companyNameAr: 'المدار',
        companyNameEn: 'Almadar',
        denomination: 20,
        cardCode: '05482910384756',
        createdAt: now.toISOString(),
        formattedTime: formatArabicTime(now),
      },
      {
        id: `sample-ltt-${Date.now()}-3`,
        sequenceNumber: baseSeq + 2,
        companyId: 'ltt',
        companyNameAr: 'التي تي تي',
        companyNameEn: 'LTT',
        denomination: 30,
        cardCode: '7749201839402918',
        createdAt: now.toISOString(),
        formattedTime: formatArabicTime(now),
      },
    ];

    setReceipts((prev) => [...sampleBatch.reverse(), ...prev]);
    setActiveReceiptId(sampleBatch[0].id);
    setPreviewMode('selected-receipt');
    showToast('تمت إضافة 3 وصولات مستقلة (ليبيانا 10 د.ل، المدار 20 د.ل، LTT 30 د.ل)');
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeReceiptId === id) {
        setActiveReceiptId(next[0]?.id || null);
      }
      return next;
    });
    showToast('تم حذف الوصل من الجلسة');
  };

  const handleClearAllReceipts = () => {
    setReceipts([]);
    setActiveReceiptId(null);
    setPreviewMode('live-draft');
    showToast('تم تفريغ قائمة الوصولات الحالية');
  };

  // Single receipt export & print handlers
  const handleDownloadPng = async (target: ReceiptItem) => {
    try {
      setBusyAction(`png-${target.id}`);
      await exportReceiptAsPng(target, settings);
      showToast(`تم تصدير صورة PNG للوصل (${target.companyNameAr} - ${target.denomination} د.ل)`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPdf = async (target: ReceiptItem) => {
    try {
      setBusyAction(`pdf-${target.id}`);
      await exportReceiptAsPdf(target, settings);
      showToast(`تم تصدير ملف PDF بمقاس ${settings.paperWidthMm}mm للوصل`);
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrintSingle = async (target: ReceiptItem) => {
    try {
      setBusyAction(`print-${target.id}`);
      await printReceiptsDirect([target], settings);
    } finally {
      setBusyAction(null);
    }
  };

  // Batch session export & print handlers
  const handleBatchZipExport = async () => {
    if (receipts.length === 0) return;
    try {
      setBusyAction('batch-zip');
      await exportAllReceiptsAsZip(receipts, settings);
      showToast(`تم تصدير ${receipts.length} وصولات مستقلة (PNG + PDF) في ملف ZIP`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleBatchIndividualExport = async (format: 'png' | 'pdf') => {
    if (receipts.length === 0) return;
    try {
      setBusyAction(`batch-${format}`);
      await exportAllReceiptsIndividually(receipts, settings, format);
      showToast(
        `تم تنزيل ${receipts.length} ملفات ${format.toUpperCase()} مستقلة (ملف لكل كرت)`
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrintAllReceipts = async () => {
    if (receipts.length === 0) return;
    try {
      setBusyAction('batch-print');
      await printReceiptsDirect(receipts, settings);
    } finally {
      setBusyAction(null);
    }
  };

  const printableWidthMm = Math.max(25, settings.paperWidthMm - settings.rightBlankMarginMm);
  const isLongCode = cardCode.length > 18;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#0F172A]">
      {/* Top Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/95 text-white text-xs sm:text-sm font-bold shadow-xl border border-slate-700/80 max-w-[92vw]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              <BlueMobileLogo
                variant={settings.logoVariant}
                customLogoDataUrl={settings.customLogoDataUrl}
                monochrome={false}
                size={40}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 truncate">
                  {settings.storeName || 'Blue Mobile'}
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#0066CC]/10 text-[#0066CC]">
                  مولّد وصولات الكروت
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 truncate">
                {settings.storeAddress || 'الخمس - الحارة'}
              </p>
            </div>
          </div>

          {/* Hardware Spec Badge & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Active Paper Width & 15mm Offset Pill */}
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  showCalibrationGuidesOnScreen: !prev.showCalibrationGuidesOnScreen,
                }))
              }
              title="إظهار أو إخفاء مسطرة معايرة الهامش الأيمن الفارغ (15mm) على الشاشة"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                settings.showCalibrationGuidesOnScreen
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-slate-100/80 border-slate-200/90 text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-[#0066CC]" />
              <span>ورق {settings.paperWidthMm}mm</span>
              <span className="text-slate-400">|</span>
              <span className="text-[#0066CC]">طباعة {printableWidthMm}mm</span>
              <span className="text-slate-400">+</span>
              <span className="text-amber-700">هامش أيمن {settings.rightBlankMarginMm}mm</span>
            </button>

            {/* Printer Guide Button */}
            <button
              type="button"
              onClick={() => setIsPrinterGuideOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="دليل الطباعة الحرارية وتوافق iOS والبلوتوث"
            >
              <HelpCircle className="w-4 h-4 text-[#0066CC]" />
              <span className="hidden sm:inline">دليل الطباعة</span>
            </button>

            {/* Settings Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>الإعدادات</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="no-print flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 space-y-7">
        {/* Top Workspace Grid: Form Controls (Right in RTL) + Live Thermal Receipt Stage (Left in RTL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* RIGHT COLUMN IN RTL (7 cols): Step-by-Step Card Receipt Generator */}
          <div className="lg:col-span-7 space-y-5">
            {/* STEP A: Company Selection */}
            <section className="bg-white rounded-2xl border border-slate-200/85 shadow-xs p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0066CC] text-white text-xs font-extrabold flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      اختر الشركة أو المنصة التعليمية
                    </h2>
                    <p className="text-xs text-slate-500">
                      جميع الشركات العشر المعتمدة مع فئاتها المحددة بدقة
                    </p>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                  {[
                    { id: 'all', label: 'الكل (10)' },
                    { id: 'telecom', label: 'اتصالات' },
                    { id: 'internet', label: 'إنترنت' },
                    { id: 'education', label: 'تعليمي' },
                  ].map((tab) => {
                    const active = selectedCategory === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setSelectedCategory(tab.id as 'all' | CompanyCategory)
                        }
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          active
                            ? 'bg-white text-[#0066CC] shadow-2xs font-extrabold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 10 Companies Polished Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {filteredCompanies.map((company) => {
                  const isSelected = company.id === selectedCompanyId;
                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelectCompany(company.id)}
                      className={`group relative rounded-xl p-3 border text-right transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/60 border-[#0066CC] ring-2 ring-[#0066CC]/20 shadow-xs'
                          : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Top-left selection badge */}
                      {isSelected && (
                        <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-[#0066CC] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}

                      <CompanyBrandMark
                        companyId={company.id}
                        color={company.brandColor}
                        size={40}
                      />

                      <div className="text-center">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                          {company.nameAr}
                        </div>
                        <div
                          dir="ltr"
                          className="text-[10px] font-semibold text-slate-400 mt-0.5"
                        >
                          {company.nameEn}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* STEP B: Denomination Selection */}
            <section className="bg-white rounded-2xl border border-slate-200/85 shadow-xs p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0066CC] text-white text-xs font-extrabold flex items-center justify-center">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      اختر فئة الكرت —{' '}
                      <span style={{ color: currentCompany.brandColor }}>
                        {currentCompany.nameAr}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      الفئات الرسمية المتوفرة لشركة {currentCompany.nameAr} فقط
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {currentCompany.denominations.length} فئات متاحة
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {currentCompany.denominations.map((denom) => {
                  const isSelected = selectedDenomination === denom;
                  return (
                    <button
                      key={`${currentCompany.id}-${denom}`}
                      type="button"
                      onClick={() => handleSelectDenomination(denom)}
                      className={`py-3.5 px-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-[#0066CC] text-white border-[#0066CC] shadow-sm scale-[1.01]'
                          : 'bg-slate-50/70 text-slate-800 border-slate-200/90 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg sm:text-xl font-extrabold font-mono-code tracking-tight">
                          {denom}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isSelected ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          د.ل
                        </span>
                      </div>
                      <span
                        dir="ltr"
                        className={`text-[10px] font-mono-code font-semibold mt-0.5 ${
                          isSelected ? 'text-blue-100/90' : 'text-slate-400'
                        }`}
                      >
                        {denom} LYD
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* STEP C & D: Card Code Input + Generate Receipt Button */}
            <form
              onSubmit={handleGenerateReceipt}
              className="bg-white rounded-2xl border border-slate-200/85 shadow-xs p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#0066CC] text-white text-xs font-extrabold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      أدخل رقم / كود الكرت
                    </h2>
                    <p className="text-xs text-slate-500">
                      يُحفظ الكود كما أُدخل تماماً (بدون مسافات أو حذف للأصفار اليسرى)
                    </p>
                  </div>
                </div>

                {/* Integrity Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>مطابق للأصل 100% (LTR)</span>
                </div>
              </div>

              {/* Large LTR Card Code Input */}
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    ref={codeInputRef}
                    type="text"
                     inputMode="text"
                    dir="ltr"
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    value={cardCode}
                    onChange={handleCodeChange}
                    placeholder="0012345678901234"
                    aria-label="رقم الكرت"
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0066CC] px-4 py-3.5 text-left font-mono-code text-lg sm:text-xl font-extrabold tracking-normal text-slate-900 placeholder:text-slate-300 focus:outline-none transition-colors pr-24"
                  />

                  {/* Quick Paste / Clear inside input */}
                  <div className="absolute right-2.5 flex items-center gap-1">
                    {cardCode.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCardCode('');
                          codeInputRef.current?.focus();
                        }}
                        title="مسح الحقل"
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePasteCode}
                      title="لصق الكود من الحافظة"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-[#0066CC]" />
                      <span>لصق</span>
                    </button>
                  </div>
                </div>

                {/* Live Code Metadata & Single-Line Scaling Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 text-slate-500 font-semibold">
                    <span>
                      عدد الخانات:{' '}
                      <strong className="font-mono-code text-slate-800">
                        {cardCode.length}
                      </strong>
                    </span>
                    {cardCode.startsWith('0') && (
                      <span className="text-emerald-700 font-bold">
                        • الأصفار اليسرى محفوظة ({cardCode.match(/^0+/)?.[0].length})
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const randomDigits =
                        '00' +
                        Array.from({ length: 14 }, () =>
                          Math.floor(Math.random() * 10)
                        ).join('');
                      setCardCode(randomDigits);
                      setValidationError(null);
                      setPreviewMode('live-draft');
                    }}
                    className="text-xs font-bold text-[#0066CC] hover:underline cursor-pointer"
                  >
                    تجربة كود عشوائي (مع أصفار يسرى)
                  </button>
                </div>

                {/* Long Code Single-Line Fit Notice */}
                {isLongCode && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      الكود طويل ({cardCode.length} خانة): سيتم تصغير حجم خط الكود تلقائياً داخل الوصل ليبقى في <strong>سطر واحد فقط</strong> دون التفاف أو اقتصاص.
                    </span>
                  </div>
                )}

                {/* Validation Error */}
                {validationError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>

              {/* Prominent "إنشاء الوصل" Button */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-4 px-6 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] active:scale-[0.99] text-white font-extrabold text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>إنشاء الوصل</span>
                  <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                    {currentCompany.nameAr} • {selectedDenomination} د.ل
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* LEFT COLUMN IN RTL (5 cols): Live 58mm/57mm Thermal Receipt Stage & Export Bar */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/85 shadow-xs overflow-hidden">
              {/* Stage Header */}
              <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {previewMode === 'live-draft'
                        ? 'معاينة فورية للوصل قيد الإدخال'
                        : `معاينة الوصل المحدد (#${String(
                            displayedReceipt.sequenceNumber
                          ).padStart(2, '0')})`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      مقاس الورق الفعلي: {settings.paperWidthMm}mm (شامل {settings.rightBlankMarginMm}mm هامش أيمن فارغ)
                    </p>
                  </div>
                </div>

                {/* Screen Calibration & PNG Inspector Toggles */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        showCalibrationGuidesOnScreen:
                          !prev.showCalibrationGuidesOnScreen,
                      }))
                    }
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      settings.showCalibrationGuidesOnScreen
                        ? 'bg-amber-100/80 border-amber-400 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="إظهار مسطرة الـ 15mm الفارغة على الشاشة فقط للتأكد من القياسات"
                  >
                    <Ruler className="w-3 h-3" />
                    <span>مسطرة 15mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRenderedPngInspector((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      showRenderedPngInspector
                        ? 'bg-[#0066CC] border-[#0066CC] text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="عرض الصورة النقطية (PNG) الفعلية التي يتم تصديرها وتضمينها في PDF"
                  >
                    <Eye className="w-3 h-3" />
                    <span>فحص PNG</span>
                  </button>
                </div>
              </div>

              {/* Thermal Paper Preview Studio Stage */}
              <div className="p-5 sm:p-6 bg-[#EEF2F6] flex flex-col items-center justify-center min-h-[340px] relative">
                {showRenderedPngInspector && renderedPngPreview ? (
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="text-[11px] font-mono-code font-bold px-3 py-1 rounded-full bg-slate-900 text-white shadow-xs">
                      PNG Output: {renderedPngPreview.widthMm}mm × {renderedPngPreview.heightMm}mm ({renderedPngPreview.widthPx}×{renderedPngPreview.heightPx}px @ {settings.exportDpi} DPI)
                    </div>
                    <div className="shadow-md border border-slate-300/80 bg-white">
                      <img
                        src={renderedPngPreview.dataUrl}
                        alt="Actual Exported Thermal Receipt PNG"
                        style={{
                          width: `${renderedPngPreview.widthMm}mm`,
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 text-center max-w-xs">
                      هذه هي الصورة الحرارية النهائية (أبيض وأسود خالص مع 15mm فراغ أيمن تام).
                    </span>
                  </div>
                ) : (
                  <div className="shadow-md border border-slate-300/80 bg-white">
                    <ThermalReceiptView
                      receipt={displayedReceipt}
                      settings={settings}
                      showScreenCalibration={settings.showCalibrationGuidesOnScreen}
                    />
                  </div>
                )}

                {/* Physical Dimension Breakdown Bar below the receipt */}
                <div className="mt-4 w-full max-w-xs rounded-xl bg-white/90 border border-slate-200/90 px-3 py-2 text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>عرض الورق: {settings.paperWidthMm}mm</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[#0066CC]">المحتوى: {printableWidthMm}mm</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-700">الفراغ الأيمن: {settings.rightBlankMarginMm}mm</span>
                </div>
              </div>

              {/* Action Buttons for Currently Displayed Receipt */}
              <div className="p-4 bg-white border-t border-slate-100 space-y-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {/* Direct Print */}
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handlePrintSingle(displayedReceipt)}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة</span>
                  </button>

                  {/* PNG Export */}
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleDownloadPng(displayedReceipt)}
                    className="py-2.5 px-3 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <FileImage className="w-4 h-4" />
                    <span>حفظ PNG</span>
                  </button>

                  {/* Custom-Size PDF Export */}
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleDownloadPdf(displayedReceipt)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>حفظ PDF</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  يُصدّر كل وصل كملف مستقل بمقاس {settings.paperWidthMm}mm الفعلي مع الحفاظ على {settings.rightBlankMarginMm}mm فراغ أيمن.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Multiple Card Entry Session Queue (Each card = 1 independent receipt) */}
        <section className="bg-white rounded-2xl border border-slate-200/85 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0066CC]/10 text-[#0066CC] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    وصولات الجلسة المستقلة ({receipts.length})
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066CC]">
                    وصل منفصل لكل كرت
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  يمكنك إدخال عدة كروت خلال الجلسة — كل كرت يُنتج وصلاً وصورة PNG وملف PDF مستقل تماماً
                </p>
              </div>
            </div>

            {/* Batch / Demo Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadThreeExampleCards}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                title="توليد 3 كروت تجريبية منفصلة (ليبيانا 10، المدار 20، LTT 30)"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0066CC]" />
                <span>إضافة 3 كروت تجريبية</span>
              </button>

              {receipts.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={handleBatchZipExport}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-extrabold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>تصدير الكل (ZIP شامل PNG+PDF)</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleBatchIndividualExport('png')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileImage className="w-3.5 h-3.5 text-[#0066CC]" />
                    <span>تنزيل كل PNG</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => handleBatchIndividualExport('pdf')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تنزيل كل PDF</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={handlePrintAllReceipts}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة الكل</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllReceipts}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                    title="مسح جميع وصولات الجلسة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>مسح الكل</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List of Independent Generated Receipts */}
          {receipts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-bold text-slate-500">
                لا توجد وصولات محفوظة في الجلسة حالياً.
              </p>
              <p className="text-xs text-slate-400">
                اختر الشركة والفئة وأدخل رقم الكرت بالأعلى ثم اضغط «إنشاء الوصل»، أو جرب إضافة 3 كروت تجريبية.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {receipts.map((item) => {
                const companyObj = getCompanyById(item.companyId);
                const isSelected =
                  previewMode === 'selected-receipt' && activeReceiptId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveReceiptId(item.id);
                      setPreviewMode('selected-receipt');
                    }}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-[#0066CC] bg-blue-50/30 ring-2 ring-[#0066CC]/15 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Card Top Metadata */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <CompanyBrandMark
                          companyId={companyObj.id}
                          color={companyObj.brandColor}
                          size={36}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-slate-900">
                              {item.companyNameAr}
                            </span>
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                              {item.denomination} د.ل
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            وصل مستقل #{String(item.sequenceNumber).padStart(2, '0')} •{' '}
                            {item.formattedTime}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReceipt(item.id);
                        }}
                        title="حذف هذا الوصل"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Exact Single-Line Card Code Readout */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-2 overflow-x-auto">
                      <div className="text-[10px] font-bold text-slate-400 mb-0.5">
                        رقم الكرت المحفوظ:
                      </div>
                      <div
                        dir="ltr"
                        className="font-mono-code text-sm font-extrabold text-slate-900 whitespace-nowrap text-left"
                      >
                        {item.cardCode}
                      </div>
                    </div>

                    {/* Independent Per-Receipt Export & Print Buttons */}
                    <div
                      className="grid grid-cols-3 gap-1.5 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handlePrintSingle(item)}
                        className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleDownloadPng(item)}
                        className="py-2 px-2 rounded-xl bg-[#0066CC] hover:bg-[#0052A3] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        <span>PNG</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyAction !== null}
                        onClick={() => handleDownloadPdf(item)}
                        className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200/80 bg-white py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-bold text-slate-700">
            {settings.storeName} — {settings.storeAddress}
          </div>
          <div>
            مُصمم خصيصاً لطابعات الإيصالات الحرارية مقاس 58mm و 57mm (مع حجز 15mm هامش أيمن فارغ)
          </div>
        </div>
      </footer>

      {/* Dedicated Native Print Fallback Container (Only visible during @media print) */}
      <div id="thermal-print-mount" aria-hidden="true">
        <div className="thermal-print-page">
          <ThermalReceiptView
            receipt={displayedReceipt}
            settings={settings}
            showScreenCalibration={false}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* Printer & iOS Guide Modal */}
      <PrinterGuideModal
        isOpen={isPrinterGuideOpen}
        onClose={() => setIsPrinterGuideOpen(false)}
        settings={settings}
      />
    </div>
  );
}

export default App;
