import React from 'react';
import { CompanyId } from '../types/receipt';

interface CompanyBrandMarkProps {
  companyId: CompanyId;
  color: string;
  size?: number;
}

export const CompanyBrandMark: React.FC<CompanyBrandMarkProps> = ({
  companyId,
  color,
  size = 38,
}) => {
  switch (companyId) {
    case 'libyana':
      // Libyana: Distinctive purple telecom signal + wave emblem
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <circle cx="22" cy="26" r="3.2" fill={color} />
          <path
            d="M15.5 21.5C17.2 19.5 19.5 18.3 22 18.3C24.5 18.3 26.8 19.5 28.5 21.5"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M11.5 17C14.2 13.8 17.9 12 22 12C26.1 12 29.8 13.8 32.5 17"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M17 32H27"
            stroke={color}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'almadar':
      // Almadar: Emerald orbital rings (المدار = Orbit)
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <ellipse
            cx="22"
            cy="22"
            rx="12"
            ry="6.5"
            transform="rotate(-28 22 22)"
            stroke={color}
            strokeWidth="2.6"
          />
          <ellipse
            cx="22"
            cy="22"
            rx="12"
            ry="6.5"
            transform="rotate(32 22 22)"
            stroke={color}
            strokeWidth="2.2"
            strokeDasharray="3 2"
          />
          <circle cx="22" cy="22" r="3.6" fill={color} />
        </svg>
      );

    case 'ltt':
      // LTT: Libya Telecom & Technology globe & broadband arcs
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <circle cx="22" cy="22" r="10.5" stroke={color} strokeWidth="2.5" />
          <ellipse cx="22" cy="22" rx="5" ry="10.5" stroke={color} strokeWidth="2.2" />
          <line x1="12" y1="22" x2="32" y2="22" stroke={color} strokeWidth="2.2" />
        </svg>
      );

    case 'giga':
      // Giga: High-speed fiber lightning + G hex
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <path
            d="M24.5 11L14.5 23.5H22L19.5 33L29.5 20.5H22L24.5 11Z"
            stroke={color}
            strokeWidth="2.6"
            strokeLinejoin="round"
            fill={color}
            fillOpacity="0.18"
          />
        </svg>
      );

    case 'linknet':
      // Link Net: Interconnected network nodes / chain link
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <path
            d="M18.5 25.5L25.5 18.5"
            stroke={color}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M16 20L13.8 22.2C11.7 24.3 11.7 27.7 13.8 29.8C15.9 31.9 19.3 31.9 21.4 29.8L23.5 27.7"
            stroke={color}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M28 24L30.2 21.8C32.3 19.7 32.3 16.3 30.2 14.2C28.1 12.1 24.7 12.1 22.6 14.2L20.5 16.3"
            stroke={color}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'skynet':
      // Sky Net: Cloud + satellite broadband wave
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <path
            d="M15.5 28.5H28.5C31.3 28.5 33.5 26.4 33.5 23.7C33.5 21.2 31.6 19.1 29.1 18.9C28.2 15.5 25.1 13 21.5 13C17.2 13 13.8 16.4 13.8 20.7C11.9 21.3 10.5 23 10.5 25.1C10.5 27 12.7 28.5 15.5 28.5Z"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M18 32.5H26"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'academia':
      // Academia: Graduation cap + digital play emblem
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <path
            d="M22 13L10.5 18.5L22 24L33.5 18.5L22 13Z"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M15 21.2V27.5C15 29.5 18.1 31.2 22 31.2C25.9 31.2 29 29.5 29 27.5V21.2"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line x1="33.5" y1="18.8" x2="33.5" y2="26.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'edraak':
      // Edraak: Open knowledge book + geometric star
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <path
            d="M22 17C19.8 15.3 16.5 14.5 12.5 14.5V28.5C16.5 28.5 19.8 29.3 22 31C24.2 29.3 27.5 28.5 31.5 28.5V14.5C27.5 14.5 24.2 15.3 22 17Z"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <line x1="22" y1="17" x2="22" y2="31" stroke={color} strokeWidth="2.4" />
        </svg>
      );

    case 'wakeb':
      // Wakeb: Forward momentum chevron / digital rocket compass
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <circle cx="22" cy="22" r="10.5" stroke={color} strokeWidth="2.5" />
          <path
            d="M19.5 17L26.5 17L26.5 24"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.5 26.5L26.2 17.8"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'esrahli':
      // Esrahli: Interactive video lesson / lightbulb explanation badge
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect width="44" height="44" rx="12" fill={color} fillOpacity="0.12" />
          <rect
            x="11.5"
            y="13.5"
            width="21"
            height="15"
            rx="3.5"
            stroke={color}
            strokeWidth="2.5"
          />
          <path
            d="M20 18.2L25.5 21L20 23.8V18.2Z"
            fill={color}
          />
          <path
            d="M17 32H27"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};
