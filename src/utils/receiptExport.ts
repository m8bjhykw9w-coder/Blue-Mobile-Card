import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ReceiptItem, ReceiptSettings } from '../types/receipt';
import { drawBlueMobileLogoOnCanvas } from '../components/BlueMobileLogo';

export interface RenderedReceiptResult {
  dataUrl: string;
  widthMm: number;
  heightMm: number;
  printableWidthMm: number;
  rightBlankMarginMm: number;
  widthPx: number;
  heightPx: number;
  codeFontScaledDown: boolean;
  effectiveCodeFontSizePt: number;
}

/**
 * Helper to load a custom logo Data URL into an HTMLImageElement
 * converted to high-contrast pure black & white for thermal printing.
 */
async function loadMonochromeCustomLogo(dataUrl: string | null): Promise<HTMLImageElement | null> {
  if (!dataUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 160;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tCtx = tempCanvas.getContext('2d');
        if (!tCtx) {
          resolve(img);
          return;
        }
        tCtx.fillStyle = '#FFFFFF';
        tCtx.fillRect(0, 0, size, size);

        // Fit image inside square
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        tCtx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        // Threshold to pure black and white for crisp thermal output
        const imageData = tCtx.getImageData(0, 0, size, size);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 64) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          } else {
            const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const val = luminance < 165 ? 0 : 255;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
            data[i + 3] = 255;
          }
        }
        tCtx.putImageData(imageData, 0, 0);

        const monoImg = new Image();
        monoImg.onload = () => resolve(monoImg);
        monoImg.onerror = () => resolve(img);
        monoImg.src = tempCanvas.toDataURL('image/png');
      } catch {
        resolve(img);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Computes font scale multiplier from user settings.
 */
export function getFontScaleMultiplier(scale: ReceiptSettings['fontSizeScale']): number {
  switch (scale) {
    case 'sm':
      return 0.9;
    case 'lg':
      return 1.12;
    case 'md':
    default:
      return 1.0;
  }
}

/**
 * Renders a single receipt to a high-resolution HTML5 Canvas with exact physical
 * millimeter geometry:
 * - Total width: settings.paperWidthMm (58mm or 57mm)
 * - Right side [paperWidthMm - rightBlankMarginMm, paperWidthMm] (default 15mm):
 *   100% pure white (#FFFFFF), strictly empty and hardware-clipped.
 * - Left side [0, paperWidthMm - rightBlankMarginMm] (43mm or 42mm):
 *   Contains the receipt content in pure black (#000000) on pure white (#FFFFFF).
 */
export async function renderReceiptToCanvas(
  receipt: ReceiptItem,
  settings: ReceiptSettings
): Promise<RenderedReceiptResult> {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness wait error
    }
  }

  const dpi = settings.exportDpi || 300;
  const pxPerMm = dpi / 25.4;

  const paperWidthMm = settings.paperWidthMm; // 58 or 57
  const rightBlankMarginMm = Math.max(0, Math.min(25, settings.rightBlankMarginMm)); // default 15mm
  const printableWidthMm = Math.max(25, paperWidthMm - rightBlankMarginMm); // 43mm for 58mm, 42mm for 57mm

  const innerPadMm = 1.8; // Safety padding inside the 43mm printable area
  const innerContentWidthMm = printableWidthMm - innerPadMm * 2; // ~39.4mm

  const scaleMult = getFontScaleMultiplier(settings.fontSizeScale);
  const arabicFont = `'${settings.fontFamily}', 'Cairo', sans-serif`;
  const monoFont = `'JetBrains Mono', ui-monospace, monospace`;

  // Physical millimeter vertical sizes
  const topPadMm = 3.2;
  const logoSizeMm = settings.showLogo ? 10.5 : 0;
  const afterLogoGapMm = settings.showLogo ? 1.8 : 0;

  const storeNameFontMm = 3.7 * scaleMult;
  const addressFontMm = 2.65 * scaleMult;
  const fieldLabelFontMm = 2.95 * scaleMult;
  const fieldValueFontMm = 3.15 * scaleMult;
  const codeBaseFontMm = 3.55 * scaleMult;
  const thankYouFontMm = 2.65 * scaleMult;

  const customLogoImg =
    settings.showLogo && settings.logoVariant === 'custom'
      ? await loadMonochromeCustomLogo(settings.customLogoDataUrl)
      : null;

  // Measure single-line card code font size so it NEVER wraps or clips
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;
  const maxCodeWidthPx = innerContentWidthMm * pxPerMm - 6;

  let codeFontPx = codeBaseFontMm * pxPerMm;
  const minCodeFontPx = 1.45 * pxPerMm; // Can scale down for very long 24+ char codes
  let codeFontScaledDown = false;

  mCtx.font = `800 ${codeFontPx}px ${monoFont}`;
  let measuredCodeWidth = mCtx.measureText(receipt.cardCode).width;

  while (measuredCodeWidth > maxCodeWidthPx && codeFontPx > minCodeFontPx) {
    codeFontPx -= 0.5;
    codeFontScaledDown = true;
    mCtx.font = `800 ${codeFontPx}px ${monoFont}`;
    measuredCodeWidth = mCtx.measureText(receipt.cardCode).width;
  }

  const codeBoxHeightMm = Math.max(6.8, (codeFontPx / pxPerMm) + 3.2);

  // Calculate exact receipt height in mm
  let cursorYMm = topPadMm;
  if (settings.showLogo) {
    cursorYMm += logoSizeMm + afterLogoGapMm;
  }
  cursorYMm += storeNameFontMm + 1.4; // Store name
  if (settings.storeAddress.trim()) {
    cursorYMm += addressFontMm + 1.6; // Store address
  }
  cursorYMm += 2.6; // Top separator + spacing

  cursorYMm += fieldValueFontMm + 2.3; // Company row: الشركة: ...
  cursorYMm += fieldValueFontMm + 2.5; // Denomination row: قيمة الكرت: ... د.ل
  cursorYMm += fieldLabelFontMm + 1.5; // Card code label: رقم الكرت:
  cursorYMm += codeBoxHeightMm + 2.2; // Single-line card code box

  cursorYMm += 2.6; // Bottom separator + spacing
  if (settings.thankYouMessage.trim()) {
    cursorYMm += thankYouFontMm + 1.4; // Thank you message
  }
  cursorYMm += 3.2; // Bottom padding

  const totalHeightMm = Math.ceil(cursorYMm * 10) / 10;

  const widthPx = Math.round(paperWidthMm * pxPerMm);
  const heightPx = Math.round(totalHeightMm * pxPerMm);
  const printableWidthPx = Math.round(printableWidthMm * pxPerMm);

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d')!;

  // 1. Fill entire 58mm / 57mm receipt with pure white (#FFFFFF)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // 2. Enforce strict hardware clip to the left printable zone [0, printableWidthPx]
  // This guarantees the right 15mm [printableWidthPx, widthPx] remains 100% untouched white!
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, printableWidthPx, heightPx);
  ctx.clip();

  const centerXPx = (printableWidthMm / 2) * pxPerMm;
  const leftEdgePx = innerPadMm * pxPerMm;
  const rightEdgePx = (printableWidthMm - innerPadMm) * pxPerMm;

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.textBaseline = 'top';

  let yMm = topPadMm;

  // Draw Logo centered within the printable zone
  if (settings.showLogo) {
    drawBlueMobileLogoOnCanvas(
      ctx,
      centerXPx,
      yMm * pxPerMm,
      logoSizeMm * pxPerMm,
      settings.logoVariant,
      customLogoImg
    );
    yMm += logoSizeMm + afterLogoGapMm;
  }

  // Draw Store Name (e.g. BLUE MOBILE)
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = `800 ${Math.round(storeNameFontMm * pxPerMm)}px ${arabicFont}`;
  ctx.fillText(settings.storeName || 'Blue Mobile', centerXPx, yMm * pxPerMm);
  ctx.restore();
  yMm += storeNameFontMm + 1.4;

  // Draw Store Address (e.g. الخمس - الحارة)
  if (settings.storeAddress.trim()) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.font = `700 ${Math.round(addressFontMm * pxPerMm)}px ${arabicFont}`;
    ctx.fillText(settings.storeAddress.trim(), centerXPx, yMm * pxPerMm);
    ctx.restore();
    yMm += addressFontMm + 1.6;
  }

  // Draw First Separator Line (strictly within printable zone)
  yMm += 0.8;
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1.5, 0.32 * pxPerMm);
  ctx.beginPath();
  ctx.moveTo(leftEdgePx, yMm * pxPerMm);
  ctx.lineTo(rightEdgePx, yMm * pxPerMm);
  ctx.stroke();
  ctx.restore();
  yMm += 1.8;

  // Draw Company Line: "الشركة: ليبيانا"
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${Math.round(fieldValueFontMm * pxPerMm)}px ${arabicFont}`;
  ctx.fillText(`الشركة: ${receipt.companyNameAr}`, centerXPx, yMm * pxPerMm);
  ctx.restore();
  yMm += fieldValueFontMm + 2.3;

  // Draw Denomination Line: "قيمة الكرت: 10 د.ل"
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${Math.round(fieldValueFontMm * pxPerMm)}px ${arabicFont}`;
  ctx.fillText(`قيمة الكرت: ${receipt.denomination} د.ل`, centerXPx, yMm * pxPerMm);
  ctx.restore();
  yMm += fieldValueFontMm + 2.5;

  // Draw Card Number Label: "رقم الكرت:"
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.font = `700 ${Math.round(fieldLabelFontMm * pxPerMm)}px ${arabicFont}`;
  ctx.fillText('رقم الكرت:', centerXPx, yMm * pxPerMm);
  ctx.restore();
  yMm += fieldLabelFontMm + 1.5;

  // Draw Card Number Box & Single-Line Exact Code
  const boxTopPx = yMm * pxPerMm;
  const boxHeightPx = codeBoxHeightMm * pxPerMm;
  const boxWidthPx = rightEdgePx - leftEdgePx;

  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1.5, 0.28 * pxPerMm);
  ctx.strokeRect(leftEdgePx, boxTopPx, boxWidthPx, boxHeightPx);

  // Draw exact card code in LTR centered inside the box on a single line
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000000';
  ctx.font = `800 ${codeFontPx}px ${monoFont}`;
  ctx.fillText(receipt.cardCode, centerXPx, boxTopPx + boxHeightPx / 2 + 0.5);
  ctx.restore();

  yMm += codeBoxHeightMm + 2.2;

  // Draw Second Separator Line
  yMm += 0.6;
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1.5, 0.32 * pxPerMm);
  ctx.beginPath();
  ctx.moveTo(leftEdgePx, yMm * pxPerMm);
  ctx.lineTo(rightEdgePx, yMm * pxPerMm);
  ctx.stroke();
  ctx.restore();
  yMm += 2.0;

  // Draw Thank You Message: "شكراً لتعاملكم معنا"
  if (settings.thankYouMessage.trim()) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.font = `700 ${Math.round(thankYouFontMm * pxPerMm)}px ${arabicFont}`;
    ctx.fillText(settings.thankYouMessage.trim(), centerXPx, yMm * pxPerMm);
    ctx.restore();
  }

  ctx.restore(); // End hardware clip

  const dataUrl = canvas.toDataURL('image/png');
  const effectiveCodeFontSizePt = Math.round(((codeFontPx / pxPerMm) * 2.83465) * 10) / 10;

  return {
    dataUrl,
    widthMm: paperWidthMm,
    heightMm: totalHeightMm,
    printableWidthMm,
    rightBlankMarginMm,
    widthPx,
    heightPx,
    codeFontScaledDown,
    effectiveCodeFontSizePt,
  };
}

/**
 * Builds a clean filename for a single receipt export.
 */
export function buildReceiptFilename(
  receipt: ReceiptItem,
  settings: ReceiptSettings,
  ext: 'png' | 'pdf'
): string {
  const safeCompany = receipt.companyNameEn.replace(/\s+/g, '');
  const seq = String(receipt.sequenceNumber).padStart(2, '0');
  return `BlueMobile_${safeCompany}_${receipt.denomination}LYD_${settings.paperWidthMm}mm_#${seq}.${ext}`;
}

/**
 * Exports a single receipt as a high-resolution PNG image with exact physical dimensions
 * and the mandatory 15mm right-side blank area.
 */
export async function exportReceiptAsPng(
  receipt: ReceiptItem,
  settings: ReceiptSettings
): Promise<void> {
  const rendered = await renderReceiptToCanvas(receipt, settings);
  const link = document.createElement('a');
  link.download = buildReceiptFilename(receipt, settings, 'png');
  link.href = rendered.dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a custom-sized PDF Blob and jsPDF instance for a single receipt.
 * Page width is strictly 57mm or 58mm, height matches receipt content, and
 * the 15mm right-side blank margin is identically preserved.
 */
export async function createReceiptPdfInstance(
  receipt: ReceiptItem,
  settings: ReceiptSettings
): Promise<{ pdf: jsPDF; rendered: RenderedReceiptResult }> {
  const rendered = await renderReceiptToCanvas(receipt, settings);
  const wMm = rendered.widthMm;
  const hMm = rendered.heightMm;

  const orientation = wMm > hMm ? 'l' : 'p';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [wMm, hMm],
    compress: true,
  });

  // Ensure pdf page size is explicitly wMm x hMm (width x height)
  pdf.addImage(rendered.dataUrl, 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
  return { pdf, rendered };
}

/**
 * Exports a single receipt as an individual custom-dimension PDF file (58mm or 57mm wide).
 */
export async function exportReceiptAsPdf(
  receipt: ReceiptItem,
  settings: ReceiptSettings
): Promise<void> {
  const { pdf } = await createReceiptPdfInstance(receipt, settings);
  pdf.save(buildReceiptFilename(receipt, settings, 'pdf'));
}

/**
 * Exports all receipts in the current session as a ZIP archive containing
 * each receipt's individual PNG and individual PDF file.
 */
export async function exportAllReceiptsAsZip(
  receipts: ReceiptItem[],
  settings: ReceiptSettings
): Promise<void> {
  if (receipts.length === 0) return;
  const zip = new JSZip();
  const pngFolder = zip.folder('PNG_Images');
  const pdfFolder = zip.folder('PDF_Receipts');

  for (const receipt of receipts) {
    const { pdf, rendered } = await createReceiptPdfInstance(receipt, settings);
    const pngBase64 = rendered.dataUrl.split(',')[1];
    const pngName = buildReceiptFilename(receipt, settings, 'png');
    const pdfName = buildReceiptFilename(receipt, settings, 'pdf');

    if (pngFolder && pngBase64) {
      pngFolder.file(pngName, pngBase64, { base64: true });
    }
    if (pdfFolder) {
      const pdfArrayBuffer = pdf.output('arraybuffer');
      pdfFolder.file(pdfName, pdfArrayBuffer);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `BlueMobile_Receipts_${settings.paperWidthMm}mm_${dateStr}.zip`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Downloads all receipts sequentially as individual PNG or PDF files.
 */
export async function exportAllReceiptsIndividually(
  receipts: ReceiptItem[],
  settings: ReceiptSettings,
  format: 'png' | 'pdf'
): Promise<void> {
  for (let i = 0; i < receipts.length; i++) {
    const item = receipts[i];
    if (format === 'png') {
      await exportReceiptAsPng(item, settings);
    } else {
      await exportReceiptAsPdf(item, settings);
    }
    // Small pause so mobile/desktop browsers allow multiple sequential file downloads
    if (i < receipts.length - 1) {
      await new Promise((r) => setTimeout(r, 260));
    }
  }
}

/**
 * Prints one or more independent receipts using a dedicated hidden iframe with
 * strict @page { size: 58mm auto; margin: 0mm !important; } styling.
 * Falls back gracefully to window.print() on iOS Safari if needed.
 */
export async function printReceiptsDirect(
  receiptsToPrint: ReceiptItem[],
  settings: ReceiptSettings
): Promise<void> {
  if (receiptsToPrint.length === 0) return;

  // Update root CSS custom properties for native @media print fallback
  document.documentElement.style.setProperty(
    '--print-paper-width',
    `${settings.paperWidthMm}mm`
  );
  document.documentElement.style.setProperty(
    '--print-right-margin',
    `${settings.rightBlankMarginMm}mm`
  );

  // Pre-render each receipt to a high-DPI PNG with baked-in 15mm right margin
  const renderedList: RenderedReceiptResult[] = [];
  for (const r of receiptsToPrint) {
    const res = await renderReceiptToCanvas(r, settings);
    renderedList.push(res);
  }

  // Create a dedicated print iframe so browser headers/margins are isolated
  const existingIframe = document.getElementById('blue-mobile-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'blue-mobile-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const paperW = settings.paperWidthMm;
  const pagesHtml = renderedList
    .map(
      (res, idx) => `
      <div class="receipt-page" style="width:${paperW}mm; height:${res.heightMm}mm; page-break-after:${
        idx < renderedList.length - 1 ? 'always' : 'auto'
      }; break-after:${idx < renderedList.length - 1 ? 'page' : 'auto'};">
        <img src="${res.dataUrl}" alt="Receipt ${idx + 1}" style="width:${paperW}mm; height:${res.heightMm}mm; display:block; margin:0; padding:0;" />
      </div>
    `
    )
    .join('');

  const htmlContent = `<!doctype html>
<html lang="ar" dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>Blue Mobile Thermal Print (${paperW}mm)</title>
  <style>
    @page {
      size: ${paperW}mm auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: ${paperW}mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #FFFFFF !important;
    }
    .receipt-page {
      margin: 0 !important;
      padding: 0 !important;
      background: #FFFFFF !important;
      overflow: hidden;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    window.print();
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  // Wait for images inside the iframe to finish decoding before triggering print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
  }, 250);
}
