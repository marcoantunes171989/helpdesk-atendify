export default function KbIllustration({ className }) {
  return (
    <svg className={className} viewBox="0 0 160 120" aria-hidden="true">
      <defs>
        <radialGradient id="kbGlow" cx="0.55" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#f0abfc" stopOpacity="0.55" />
          <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="kbScreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b2ab8" />
          <stop offset="1" stopColor="#1e1856" />
        </linearGradient>
        <linearGradient id="kbFrame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9d3fb" />
        </linearGradient>
        <linearGradient id="kbBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f3ff" />
          <stop offset="1" stopColor="#c4bcf3" />
        </linearGradient>
        <linearGradient id="kbTile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b6bff" />
          <stop offset="1" stopColor="#5b3df5" />
        </linearGradient>
        <filter id="kbShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1e1065" floodOpacity="0.35" />
        </filter>
      </defs>

      <circle cx="96" cy="48" r="56" fill="url(#kbGlow)" />

      <g filter="url(#kbShadow)">
        <path d="M44 12 L146 6 Q150 6 150 10 L146 76 Q146 79 143 79 L48 83 Q45 83 45 80 L41 16 Q41 12 44 12Z" fill="url(#kbFrame)" />
        <path d="M48 17 L143 11.5 L139.5 73.5 L51 77.5Z" fill="url(#kbScreen)" />
        <path d="M30 84 L148 78 L158 92 Q159 95 155 95.5 L24 101 Q20 101 21 97Z" fill="url(#kbBase)" />
        <path d="M24 101 L155 95.5 L155 98 Q155 100 151 100.3 L27 105.5 Q22 105.6 22 102Z" fill="#a89de8" />
        <path d="M78 89.5 L104 88.2 L105 91.5 L79 92.8Z" fill="#b8aef0" />
      </g>

      <g transform="translate(95 44)">
        <path d="M-1 -14 C-10 -19 -22 -19 -30 -15 L-30 15 C-22 11 -10 11 -1 16Z" fill="#ffffff" />
        <path d="M1 -14 C10 -19 22 -19 30 -15 L30 15 C22 11 10 11 1 16Z" fill="#f1eeff" />
        <path d="M-1 -14 V16" stroke="#7c5cff" strokeWidth="1.4" />
        <g stroke="#8b78f5" strokeWidth="1.4" strokeLinecap="round">
          <path d="M-25 -9 C-19 -11 -12 -11 -6 -8" />
          <path d="M-25 -3 C-19 -5 -12 -5 -6 -2" />
          <path d="M-25 3 C-19 1 -12 1 -6 4" />
          <path d="M6 -8 C12 -11 19 -11 25 -9" />
          <path d="M6 -2 C12 -5 19 -5 25 -3" />
          <path d="M6 4 C12 1 19 1 25 3" />
        </g>
      </g>

      <g filter="url(#kbShadow)">
        <rect x="4" y="38" width="26" height="20" rx="5" fill="url(#kbTile)" />
        <path d="M14 43.5 L22 48 L14 52.5Z" fill="#ffffff" />
      </g>

      <g filter="url(#kbShadow)">
        <rect x="16" y="58" width="38" height="38" rx="8" fill="#ffffff" />
        <g stroke="#6d4cff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M35 66 V82" />
          <path d="M28.5 76 L35 82.5 L41.5 76" />
          <path d="M26 88 H44" />
        </g>
      </g>

      <g fill="#ffffff">
        <circle cx="150" cy="22" r="1.6" opacity="0.8" />
        <circle cx="40" cy="8" r="1.2" opacity="0.6" />
        <circle cx="132" cy="104" r="1.3" opacity="0.5" />
      </g>
    </svg>
  );
}
