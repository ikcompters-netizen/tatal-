import React from 'react';

interface BrandLogoProps {
  brandName: string;
  dark?: boolean;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ brandName, dark = false, subtitle }) => {
  return (
    <div className="inline-flex min-w-0 items-center gap-2 sm:gap-2.5">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        fill="none"
        className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
        aria-hidden="true"
      >
        <rect
          width="64"
          height="64"
          rx="18"
          fill={dark ? '#2D231E' : '#1F1815'}
        />
        <rect
          x="3"
          y="3"
          width="58"
          height="58"
          rx="15"
          stroke="#D89B7E"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <path
          d="M32 13C24.5 18 20.5 25.5 20.5 33.5C20.5 41.2 25.6 47 32 47C38.4 47 43.5 41.2 43.5 33.5C43.5 25.5 39.5 18 32 13Z"
          stroke="#D89B7E"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M32 16V46" stroke="#D89B7E" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M32 28C27.8 26.2 25 23.5 23.8 21.5" stroke="#FAF7F2" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M32 35.5C36.2 33.7 39 31 40.2 29" stroke="#FAF7F2" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="32" cy="51.5" r="2" fill="#D89B7E" />
      </svg>

      <div className="min-w-0 leading-none">
        <span
          className={`block truncate font-serif-editorial text-xl font-bold tracking-tight sm:text-2xl ${
            dark ? 'text-[#FAF7F2]' : 'text-[#1F1815]'
          }`}
        >
          {brandName}
        </span>
        {subtitle && (
          <p
            className={`mt-0.5 hidden truncate text-[9px] font-semibold uppercase tracking-[0.2em] sm:block ${
              dark ? 'text-[#D89B7E]' : 'text-[#8E4A34]'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
