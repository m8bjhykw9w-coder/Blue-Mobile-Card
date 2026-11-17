import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ReceiptItem, ReceiptSettings } from '../types/receipt';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import html2canvas from 'html2canvas';
import { ThermalReceiptView } from '../components/ThermalReceiptView';

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

/** Render the same real HTML voucher used by the live preview for PNG and PDF. */
export async function renderReceiptToCanvas(receipt: ReceiptItem, settings: ReceiptSettings): Promise<RenderedReceiptResult> {
  await document.fonts.ready;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:-1000;pointer-events:none;background:white;';
  host.innerHTML = renderToStaticMarkup(React.createElement(ThermalReceiptView, { receipt, settings }));
  document.body.appendChild(host);
  try {
    const target = host.firstElementChild as HTMLElement;
    const images = Array.from(target.querySelectorAll('img'));
    await Promise.all(images.map(img => img.decode().catch(() => {})));
    // html2canvas does not implement CSS filters. Threshold user logos explicitly.
    for (const img of images) {
      if (img.src.startsWith('data:') && img.naturalWidth && img.naturalHeight) {
        const mono = document.createElement('canvas');
        mono.width = img.naturalWidth; mono.height = img.naturalHeight;
        const ctx = mono.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, mono.width, mono.height);
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(0, 0, mono.width, mono.height);
          for (let i = 0; i < pixels.data.length; i += 4) {
            const v = 0.299 * pixels.data[i] + 0.587 * pixels.data[i+1] + 0.114 * pixels.data[i+2] < 165 ? 0 : 255;
            pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = v;
          }
          ctx.putImageData(pixels, 0, 0);
          img.src = mono.toDataURL('image/png'); img.style.filter = 'none';
          await img.decode().catch(() => {});
        }
      }
    }
    const canvas = await html2canvas(target, { scale: (settings.exportDpi || 300) / 96, backgroundColor: '#ffffff', logging: false, useCORS: true });
    const widthMm = settings.paperWidthMm;
    const heightMm = canvas.height / canvas.width * widthMm;
    const rightBlankMarginMm = Math.max(0, Math.min(25, settings.rightBlankMarginMm));
    const codeEl = target.querySelector('[dir="ltr"][style*="dashed"]') as HTMLElement | null;
    const sizePx = codeEl ? parseFloat(getComputedStyle(codeEl).fontSize) : 0;
    return { dataUrl: canvas.toDataURL('image/png'), widthMm, heightMm, printableWidthMm: widthMm - rightBlankMarginMm, rightBlankMarginMm, widthPx: canvas.width, heightPx: canvas.height, codeFontScaledDown: sizePx < 19, effectiveCodeFontSizePt: Math.round(sizePx * 0.75 * 10) / 10 };
  } finally { host.remove(); }
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
export async function printReceiptsDirect(receiptsToPrint: ReceiptItem[], settings: ReceiptSettings): Promise<void> {
  if (!receiptsToPrint.length) return;
  await document.fonts.ready;
  document.getElementById('blue-mobile-print-iframe')?.remove();
  const iframe = document.createElement('iframe');
  iframe.id = 'blue-mobile-print-iframe';
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) { window.print(); return; }
  const pages = receiptsToPrint.map(r => `<div class="receipt-page">${renderToStaticMarkup(React.createElement(ThermalReceiptView, {receipt:r, settings}))}</div>`).join('');
  // Copy font faces so the isolated print document matches the preview.
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(el => el.outerHTML).join('');
  doc.open();
  doc.write(`<!doctype html><html lang="ar"><head><meta charset="utf-8">${styles}<style>@page{size:${settings.paperWidthMm}mm auto;margin:0}html,body{margin:0!important;padding:0!important;background:white!important}.receipt-page{width:${settings.paperWidthMm}mm;break-after:page;page-break-after:always}.receipt-page:last-child{break-after:auto;page-break-after:auto}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body>${pages}</body></html>`);
  doc.close();
  await doc.fonts.ready;
  await Promise.all(Array.from(doc.images).map(img => img.decode().catch(() => {})));
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
}
