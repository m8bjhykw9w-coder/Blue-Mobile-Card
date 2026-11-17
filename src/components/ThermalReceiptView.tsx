import React from 'react';
import { ReceiptItem, ReceiptSettings } from '../types/receipt';
import { BlueMobileLogo } from './BlueMobileLogo';

interface ThermalReceiptViewProps {
  receipt: ReceiptItem;
  settings: ReceiptSettings;
  showScreenCalibration?: boolean;
  scalePreview?: number;
}

// Fit an exact, unbroken string to the physical content width, without truncation.
function fitCode(text: string, maxWidthMm: number, maxSizeMm: number): number {
  if (!text || typeof document === 'undefined') return maxSizeMm;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return maxSizeMm;
  const mmToPx = 96 / 25.4;
  ctx.font = `800 ${maxSizeMm * mmToPx}px monospace`;
  const width = ctx.measureText(text).width;
  return width ? Math.min(maxSizeMm, maxSizeMm * maxWidthMm * mmToPx / width * 0.96) : maxSizeMm;
}

export function rechargeInstruction(receipt: ReceiptItem): string {
  const prefix = receipt.companyId === 'libyana' ? '120' : receipt.companyId === 'almadar' ? '112' : null;
  return prefix ? `*${prefix}*${receipt.cardCode}#` : receipt.cardCode;
}

export const ThermalReceiptView: React.FC<ThermalReceiptViewProps> = ({ receipt, settings, showScreenCalibration = false, scalePreview = 1 }) => {
  const paper = settings.paperWidthMm;
  const blank = Math.max(0, Math.min(25, settings.rightBlankMarginMm));
  const width = paper - blank;
  const scale = settings.fontSizeScale === 'sm' ? 0.9 : settings.fontSizeScale === 'lg' ? 1.12 : 1;
  const content = width - 5.8;
  const codeSize = fitCode(receipt.cardCode, content - 2, 5.6 * scale);
  const instruction = receipt.cardCode ? rechargeInstruction(receipt) : '—';
  const prefix = receipt.companyId === 'libyana' ? '120' : receipt.companyId === 'almadar' ? '112' : null;
  const instructionSize = fitCode(instruction, content - 2, 2.9 * scale);
  const font = `'${settings.fontFamily}', 'Cairo', sans-serif`;
  const separator: React.CSSProperties = {borderTop: '0.25mm dashed #000', margin: '3mm 0'};
  const small: React.CSSProperties = {fontSize: `${2.65 * scale}mm`, lineHeight: 1.9};
  return <div style={{display:'inline-block', transform: scalePreview !== 1 ? `scale(${scalePreview})` : undefined, transformOrigin:'top center'}}>
    {showScreenCalibration && <div dir="ltr" className="no-print" style={{width:`${paper}mm`,display:'grid',gridTemplateColumns:`${width}mm ${blank}mm`,font:'bold 10px monospace',textAlign:'center'}}><div>{width}mm (Print)</div><div>{blank}mm (Blank)</div></div>}
    <div dir="ltr" style={{width:`${paper}mm`,display:'grid',gridTemplateColumns:`${width}mm ${blank}mm`,background:'#fff',color:'#000',fontFamily:font}}>
      <div dir="rtl" style={{boxSizing:'border-box',width:`${width}mm`,padding:'1mm',background:'#fff',color:'#000'}}>
        <div style={{border:'0.35mm solid #000',borderRadius:'2.3mm',padding:'1mm',textAlign:'center',boxSizing:'border-box'}}>
          <div style={{border:'0.2mm dashed #000',borderRadius:'1.6mm',padding:'2mm 1.5mm',boxSizing:'border-box'}}>
            {settings.showLogo && <div style={{display:'flex',justifyContent:'center',marginBottom:'0.8mm'}}><BlueMobileLogo variant={settings.logoVariant} customLogoDataUrl={settings.customLogoDataUrl} monochrome size={28}/></div>}
            <div dir="auto" style={{fontSize:`${3.5*scale}mm`,fontWeight:900,lineHeight:1.6,overflowWrap:'anywhere'}}>{receipt.companyNameAr} <span style={{fontSize:'0.7em'}}>| {receipt.companyNameEn.toUpperCase()}</span></div>
            <div style={{fontSize:`${2.9*scale}mm`,fontWeight:800,lineHeight:1.8,marginTop:'1mm'}}>بطاقة إعادة شحن الرصيد</div>
            <div style={separator}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-around',gap:'1mm'}}>
              <span style={{fontSize:`${2.65*scale}mm`,fontWeight:800}}>قيمة الرصيد</span>
              <span dir="ltr" style={{fontSize:`${5.1*scale}mm`,fontWeight:900,lineHeight:1.2,whiteSpace:'nowrap'}}>{Number(receipt.denomination).toFixed(2)} <span dir="rtl" style={{fontSize:'0.5em'}}>د.ل</span></span>
            </div>
            <div style={separator}/>
            <div style={{fontSize:`${2.9*scale}mm`,fontWeight:800,lineHeight:1.8,marginBottom:'1.5mm'}}>رقم بطاقة التعبئة</div>
            <div dir="ltr" style={{border:'0.3mm dashed #000',borderRadius:'2mm',padding:'2mm 0.5mm',textAlign:'center',fontFamily:'monospace',fontSize:`${codeSize}mm`,fontWeight:900,lineHeight:1.25,whiteSpace:'pre',boxSizing:'border-box'}}>{receipt.cardCode}</div>
            <div style={{fontSize:`${3*scale}mm`,fontWeight:900,lineHeight:1.8,margin:'2.2mm 0 0.8mm'}}>طريقة إعادة التعبئة</div>
            <div style={small}>{receipt.companyId === 'libyana' || receipt.companyId === 'almadar' ? 'لإعادة شحن رصيدك، أدخل الرمز التالي من هاتفك:' : 'استخدم رقم بطاقة التعبئة التالي:'}</div>
            {prefix && <div dir="ltr" style={{...small,fontWeight:800}}>‎*{prefix}*<span dir="rtl">رقم الكرت</span>#</div>}
            <div dir="ltr" style={{border:'0.3mm solid #000',borderRadius:'1.6mm',padding:'1.5mm 0.5mm',marginTop:'1mm',fontFamily:'monospace',fontWeight:800,fontSize:`${instructionSize}mm`,whiteSpace:'pre',lineHeight:1.3}}>{instruction}</div>
            <div style={separator}/>
            {(settings.storeName || settings.storeAddress || settings.thankYouMessage) && <div style={{...small,borderTop:'0.2mm dashed #000',marginTop:'1mm',paddingTop:'1mm'}}><div dir="auto">{settings.storeName}</div><div>{settings.storeAddress}</div><div>{settings.thankYouMessage}</div></div>}
          </div>
        </div>
      </div>
      <div aria-hidden="true" style={{width:`${blank}mm`,background:'#fff',position:'relative'}}>{showScreenCalibration && blank > 0 && <div className="no-print" style={{position:'absolute',inset:0,borderLeft:'1px dashed #000',fontSize:'8px'}}>هامش فارغ</div>}</div>
    </div>
  </div>;
};
