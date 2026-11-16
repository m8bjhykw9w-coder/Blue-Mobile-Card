import React, { useMemo } from 'react';
import { ReceiptItem, ReceiptSettings } from '../types/receipt';
import { BlueMobileLogo } from './BlueMobileLogo';
import { getFontScaleMultiplier } from '../utils/receiptExport';

interface ThermalReceiptViewProps {
  receipt: ReceiptItem;
  settings: ReceiptSettings;
  showScreenCalibration?: boolean;
  scalePreview?: number;
}

/**
 * Physical 58mm / 57mm Thermal Receipt Component.
 * Uses explicit LTR physical coordinate columns on the outer container:
 * - Left column: (paperWidthMm - rightBlankMarginMm) e.g. 43mm printable area (with RTL Arabic inside)
 * - Right column: rightBlankMarginMm e.g. 15mm strictly empty white space
 */
export const ThermalReceiptView: React.FC<ThermalReceiptViewProps> = ({
  receipt,
  settings,
  showScreenCalibration = false,
  scalePreview = 1,
}) => {
  const paperWidthMm = settings.paperWidthMm; // 58 or 57
  const rightBlankMarginMm = Math.max(0, Math.min(25, settings.rightBlankMarginMm)); // 15
  const printableWidthMm = Math.max(25, paperWidthMm - rightBlankMarginMm); // 43 or 42

  const scaleMult = getFontScaleMultiplier(settings.fontSizeScale);

  // Dynamically calculate single-line font size in mm for the card code
  // so long codes NEVER wrap or clip inside the 43mm printable column.
  const codeFontSizeMm = useMemo(() => {
    const baseMm = 3.45 * scaleMult;
    const len = Math.max(1, receipt.cardCode.length);
    const availableWidthMm = printableWidthMm - 4.4; // minus inner padding & border
    // Approx width per monospace char is ~0.62 * fontSizeMm
    const estimatedWidthMm = len * (baseMm * 0.62);
    if (estimatedWidthMm <= availableWidthMm) {
      return baseMm;
    }
    const scaled = availableWidthMm / (len * 0.62);
    return Math.max(1.45, Math.min(baseMm, scaled));
  }, [receipt.cardCode, printableWidthMm, scaleMult]);

  const fontFamilyStyle = `'${settings.fontFamily}', 'Cairo', sans-serif`;

  return (
    <div
      className="inline-block select-none"
      style={{
        transform: scalePreview !== 1 ? `scale(${scalePreview})` : undefined,
        transformOrigin: 'top center',
      }}
    >
      {/* Screen-only millimeter ruler header when calibration is active */}
      {showScreenCalibration && (
        <div
          dir="ltr"
          className="no-print mb-1.5 grid text-[10px] font-mono-code font-bold tracking-tight"
          style={{
            width: `${paperWidthMm}mm`,
            gridTemplateColumns: `${printableWidthMm}mm ${rightBlankMarginMm}mm`,
          }}
        >
          <div className="bg-[#0066CC]/10 text-[#0066CC] border-b-2 border-[#0066CC] py-0.5 text-center">
            {printableWidthMm}mm (Print)
          </div>
          <div className="bg-amber-500/15 text-amber-800 border-b-2 border-amber-500 py-0.5 text-center">
            {rightBlankMarginMm}mm (Blank)
          </div>
        </div>
      )}

      {/* Physical Thermal Paper Sheet (dir="ltr" so Left = Printable 43mm, Right = Blank 15mm) */}
      <div
        dir="ltr"
        style={{
          width: `${paperWidthMm}mm`,
          gridTemplateColumns: `${printableWidthMm}mm ${rightBlankMarginMm}mm`,
          backgroundColor: '#FFFFFF',
          color: '#000000',
          fontFamily: fontFamilyStyle,
        }}
        className="grid relative bg-white text-black overflow-hidden"
      >
        {/* LEFT COLUMN: Printable Content Zone (43mm for 58mm paper, 42mm for 57mm paper) */}
        <div
          dir="rtl"
          style={{
            width: `${printableWidthMm}mm`,
            maxWidth: `${printableWidthMm}mm`,
            paddingLeft: '1.8mm',
            paddingRight: '1.8mm',
            paddingTop: '3.2mm',
            paddingBottom: '3.2mm',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
            color: '#000000',
          }}
          className="overflow-hidden flex flex-col items-stretch"
        >
          {/* 1. Blue Mobile Custom Monochrome Logo */}
          {settings.showLogo && (
            <div className="flex justify-center mb-[1.6mm]">
              <BlueMobileLogo
                variant={settings.logoVariant}
                customLogoDataUrl={settings.customLogoDataUrl}
                monochrome={true}
                size={38}
              />
            </div>
          )}

          {/* 2. Store Name */}
          <div
            dir="ltr"
            className="text-center font-extrabold leading-tight tracking-tight text-black break-words"
            style={{
              fontSize: `${3.65 * scaleMult}mm`,
              marginBottom: '1.1mm',
            }}
          >
            {settings.storeName || 'Blue Mobile'}
          </div>

          {/* 3. Store Address */}
          {settings.storeAddress.trim() && (
            <div
              dir="rtl"
              className="text-center font-bold leading-snug text-black"
              style={{
                fontSize: `${2.65 * scaleMult}mm`,
                marginBottom: '1.4mm',
              }}
            >
              {settings.storeAddress}
            </div>
          )}

          {/* Top Separator (strictly inside 43mm printable zone) */}
          <div
            style={{
              height: '0.35mm',
              backgroundColor: '#000000',
              width: '100%',
              marginTop: '0.7mm',
              marginBottom: '1.8mm',
            }}
          />

          {/* 4. Company / Provider Name */}
          <div
            dir="rtl"
            className="text-right font-bold leading-snug text-black"
            style={{
              fontSize: `${3.1 * scaleMult}mm`,
              marginBottom: '1.7mm',
            }}
          >
            <span>الشركة: </span>
            <span className="font-extrabold">{receipt.companyNameAr}</span>
          </div>

          {/* 5 & 7. Card Denomination + Currency (د.ل) */}
          <div
            dir="rtl"
            className="text-right font-bold leading-snug text-black"
            style={{
              fontSize: `${3.1 * scaleMult}mm`,
              marginBottom: '1.9mm',
            }}
          >
            <span>قيمة الكرت: </span>
            <span className="font-extrabold">{receipt.denomination} د.ل</span>
          </div>

          {/* 6. Card Number / Code Label */}
          <div
            dir="rtl"
            className="text-right font-bold leading-snug text-black"
            style={{
              fontSize: `${2.95 * scaleMult}mm`,
              marginBottom: '1.2mm',
            }}
          >
            رقم الكرت:
          </div>

          {/* 6. Card Number / Code Single-Line Box (LTR, never wraps, exact characters preserved) */}
          <div
            dir="ltr"
            style={{
              border: '0.3mm solid #000000',
              paddingTop: '1.2mm',
              paddingBottom: '1.2mm',
              paddingLeft: '1mm',
              paddingRight: '1mm',
              marginBottom: '2.0mm',
              backgroundColor: '#FFFFFF',
            }}
            className="w-full flex items-center justify-center overflow-hidden"
          >
            <span
              dir="ltr"
              className="font-mono-code font-extrabold text-black whitespace-nowrap leading-none text-center block"
              style={{
                fontSize: `${codeFontSizeMm}mm`,
                letterSpacing: '0px',
              }}
            >
              {receipt.cardCode}
            </span>
          </div>

          {/* 8. Clean Bottom Separator */}
          <div
            style={{
              height: '0.35mm',
              backgroundColor: '#000000',
              width: '100%',
              marginTop: '0.4mm',
              marginBottom: '1.8mm',
            }}
          />

          {/* 9. Short Thank-You Message */}
          {settings.thankYouMessage.trim() && (
            <div
              dir="rtl"
              className="text-center font-bold leading-snug text-black"
              style={{
                fontSize: `${2.65 * scaleMult}mm`,
              }}
            >
              {settings.thankYouMessage}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Mandatory 15mm Blank Space (100% empty in export/print) */}
        <div
          style={{
            width: `${rightBlankMarginMm}mm`,
            minWidth: `${rightBlankMarginMm}mm`,
            maxWidth: `${rightBlankMarginMm}mm`,
            backgroundColor: '#FFFFFF',
          }}
          className="relative"
          aria-hidden="true"
        >
          {/* Screen-only visual calibration overlay (NEVER present in PNG, PDF, or Print) */}
          {showScreenCalibration && rightBlankMarginMm > 0 && (
            <div
              className="no-print absolute inset-0 border-l border-dashed border-amber-500/70 bg-amber-50/40 flex items-center justify-center pointer-events-none"
              title="منطقة الهامش الأيمن الفارغ المخصصة لمعايرة الطابعة الحرارية (لا يظهر هذا التظليل عند الطباعة أو التصدير)"
            >
              <span className="-rotate-90 whitespace-nowrap text-[9px] font-bold text-amber-800/80 tracking-wide">
                هامش أيمن فارغ ({rightBlankMarginMm}mm)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
