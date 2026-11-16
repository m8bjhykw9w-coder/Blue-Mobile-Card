import React from 'react';
import { BuiltinLogoVariant } from '../types/receipt';

interface BlueMobileLogoProps {
  variant?: BuiltinLogoVariant;
  customLogoDataUrl?: string | null;
  monochrome?: boolean;
  size?: number;
  className?: string;
}

/**
 * Original Blue Mobile vector logo inspired by mobile telecommunications
 * and digital recharge cards. Designed for both full-color UI and 1-bit pure
 * black-and-white 58mm thermal printing.
 */
export const BlueMobileLogo: React.FC<BlueMobileLogoProps> = ({
  variant = 'signal-card',
  customLogoDataUrl = null,
  monochrome = false,
  size = 40,
  className = '',
}) => {
  if (variant === 'custom' && customLogoDataUrl) {
    return (
      <img
        src={customLogoDataUrl}
        alt="Store Logo"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: monochrome ? 'grayscale(100%) contrast(250%)' : undefined,
        }}
        className={className}
      />
    );
  }

  const primary = monochrome ? '#000000' : '#0066CC';
  const secondary = monochrome ? '#000000' : '#0EA5E9';
  const bgFill = monochrome ? '#FFFFFF' : '#EFF6FF';

  if (variant === 'geometric-b') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Blue Mobile Logo"
      >
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill={bgFill}
          stroke={primary}
          strokeWidth="4"
        />
        {/* Geometric B + SIM notch + signal arcs */}
        <path
          d="M20 16H33C38.5228 16 43 20.0294 43 25C43 28.2 41.1 30.9 38.2 32.2C41.8 33.5 44.5 36.7 44.5 40.8C44.5 46.1 39.8 50 33.5 50H20V16Z"
          stroke={primary}
          strokeWidth="4.2"
          strokeLinejoin="round"
        />
        <line x1="20" y1="32.5" x2="36" y2="32.5" stroke={primary} strokeWidth="4" />
        <circle cx="27" cy="24" r="2.2" fill={secondary} />
        <circle cx="27" cy="41" r="2.2" fill={secondary} />
      </svg>
    );
  }

  if (variant === 'minimal-badge') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Blue Mobile Logo"
      >
        <circle cx="32" cy="32" r="28" fill={bgFill} stroke={primary} strokeWidth="4" />
        {/* Mobile Handset + Recharge Wave */}
        <rect
          x="22"
          y="15"
          width="20"
          height="34"
          rx="4"
          stroke={primary}
          strokeWidth="3.8"
          fill="#FFFFFF"
        />
        <line x1="28" y1="20" x2="36" y2="20" stroke={primary} strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="32" cy="43" r="2" fill={primary} />
        <path
          d="M27 31L31 35L38 27"
          stroke={secondary}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Default: 'signal-card' (SIM/Recharge Card + Cellular Signal Waves)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Blue Mobile Logo"
    >
      {/* Outer rounded hexagon / badge */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="15"
        fill={bgFill}
        stroke={primary}
        strokeWidth="4"
      />
      {/* Recharge SIM Card silhouette */}
      <path
        d="M17 22C17 19.7909 18.7909 18 21 18H34.5L43 26.5V44C43 46.2091 41.2091 48 39 48H21C18.7909 48 17 46.2091 17 44V22Z"
        fill="#FFFFFF"
        stroke={primary}
        strokeWidth="3.8"
        strokeLinejoin="round"
      />
      {/* Chip contacts inside card */}
      <rect
        x="23"
        y="30"
        width="14"
        height="11"
        rx="2.2"
        stroke={primary}
        strokeWidth="3"
      />
      <line x1="30" y1="30" x2="30" y2="41" stroke={primary} strokeWidth="2.4" />
      <line x1="23" y1="35.5" x2="37" y2="35.5" stroke={primary} strokeWidth="2.4" />
      {/* Telecom Signal Arcs top-right */}
      <path
        d="M41 14C45.5 14 49.5 18 49.5 22.5"
        stroke={secondary}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M41 9C48.5 9 54.5 15 54.5 22.5"
        stroke={primary}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Pure black-and-white vector logo renderer directly onto an HTML5 Canvas 2D context.
 * Guarantees crisp 1-bit style thermal output at any DPI without external SVG taint issues.
 */
export function drawBlueMobileLogoOnCanvas(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  sizePx: number,
  variant: BuiltinLogoVariant,
  customLogoImg: HTMLImageElement | null
) {
  ctx.save();
  const leftX = centerX - sizePx / 2;

  if (variant === 'custom' && customLogoImg) {
    // Draw custom image in high-contrast monochrome
    ctx.drawImage(customLogoImg, leftX, topY, sizePx, sizePx);
    ctx.restore();
    return;
  }

  const scale = sizePx / 64;
  ctx.translate(leftX, topY);
  ctx.scale(scale, scale);

  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  if (variant === 'geometric-b') {
    ctx.lineWidth = 4.2;
    drawRoundedRect(4, 4, 56, 56, 14);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(20, 16);
    ctx.lineTo(33, 16);
    ctx.bezierCurveTo(39, 16, 43, 20, 43, 25);
    ctx.bezierCurveTo(43, 28.5, 41, 31, 38, 32.2);
    ctx.bezierCurveTo(42, 33.5, 44.5, 36.8, 44.5, 41);
    ctx.bezierCurveTo(44.5, 46, 39.8, 50, 33.5, 50);
    ctx.lineTo(20, 50);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(20, 32.5);
    ctx.lineTo(36, 32.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(27, 24, 2.4, 0, Math.PI * 2);
    ctx.arc(27, 41, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (variant === 'minimal-badge') {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3.8;
    drawRoundedRect(22, 15, 20, 34, 4);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, 20);
    ctx.lineTo(36, 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(32, 43, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(27, 31);
    ctx.lineTo(31, 35);
    ctx.lineTo(38, 27);
    ctx.stroke();
  } else {
    // Default: 'signal-card'
    ctx.lineWidth = 4.2;
    drawRoundedRect(4, 4, 56, 56, 15);
    ctx.stroke();

    // SIM card outline with cut corner
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(21, 18);
    ctx.lineTo(34.5, 18);
    ctx.lineTo(43, 26.5);
    ctx.lineTo(43, 44);
    ctx.quadraticCurveTo(43, 48, 39, 48);
    ctx.lineTo(21, 48);
    ctx.quadraticCurveTo(17, 48, 17, 44);
    ctx.lineTo(17, 22);
    ctx.quadraticCurveTo(17, 18, 21, 18);
    ctx.closePath();
    ctx.stroke();

    // Chip rectangle
    ctx.lineWidth = 3;
    drawRoundedRect(23, 30, 14, 11, 2);
    ctx.stroke();

    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(30, 30);
    ctx.lineTo(30, 41);
    ctx.moveTo(23, 35.5);
    ctx.lineTo(37, 35.5);
    ctx.stroke();

    // Signal arcs
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.arc(41, 22.5, 8.5, -Math.PI / 2, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(41, 22.5, 13.5, -Math.PI / 2, 0);
    ctx.stroke();
  }

  ctx.restore();
}
