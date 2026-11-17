export type CompanyId =
  | 'libyana'
  | 'almadar'
  | 'ltt'
  | 'giga'
  | 'linknet'
  | 'skynet'
  | 'academia'
  | 'edraak'
  | 'wakeb'
  | 'esrahli';

export type CompanyCategory = 'telecom' | 'internet' | 'education';

export interface CompanyInfo {
  id: CompanyId;
  nameAr: string;
  nameEn: string;
  category: CompanyCategory;
  categoryLabelAr: string;
  denominations: number[];
  brandColor: string;
  brandBgLight: string;
  brandBorderColor: string;
  shortTag: string;
}

export interface ReceiptItem {
  id: string;
  sequenceNumber: number;
  companyId: CompanyId;
  companyNameAr: string;
  companyNameEn: string;
  denomination: number;
  cardCode: string; // Strictly preserved string (exact characters, leading zeros intact)
  createdAt: string; // ISO string
  formattedTime: string;
}

export type PaperWidthOption = 58 | 57;

export type ReceiptFontFamily = 'Cairo' | 'Tajawal' | 'IBM Plex Sans Arabic';

export type ReceiptFontSizeScale = 'sm' | 'md' | 'lg';

export type BuiltinLogoVariant = 'signal-card' | 'geometric-b' | 'minimal-badge' | 'custom';

export interface ReceiptSettings {
  storeName: string;
  storeAddress: string;
  logoVariant: BuiltinLogoVariant;
  customLogoDataUrl: string | null;
  showLogo: boolean;
  paperWidthMm: PaperWidthOption;
  rightBlankMarginMm: number; // Default: 18mm
  fontSizeScale: ReceiptFontSizeScale;
  fontFamily: ReceiptFontFamily;
  thankYouMessage: string;
  exportDpi: 203 | 300; // 203 DPI (standard 8 dots/mm thermal) or 300 DPI (high-res thermal)
  showCalibrationGuidesOnScreen: boolean; // Screen-only visual verification guide for the right blank margin
}
