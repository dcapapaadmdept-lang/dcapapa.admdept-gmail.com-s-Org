import React from 'react';

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  withText?: boolean;
  textColor?: string; // e.g. "text-slate-900" or "text-white" or custom color
}

export default function Logo({
  className = '',
  width = 80,
  height = 80,
  withText = false,
  textColor = 'currentColor'
}: LogoProps) {
  // Brand blue color from Dominion City Apapa logo
  const brandBlue = '#0038A8';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={{ display: 'inline-flex' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width={width}
        height={height}
        className="select-none"
        id="dominion-city-apapa-logo"
      >
        <defs>
          {/* Clip path of the heart to make sure any inner rendering is perfectly bounded */}
          <clipPath id="heart-clip">
            <path d="M50,90 C50,90 90,57.5 90,32 C90,17 78,8 65,8 C57,8 52,13 50,16 C48,13 43,8 35,8 C22,8 10,17 10,32 C10,57.5 50,90 50,90 Z" />
          </clipPath>
        </defs>

        {/* Main Blue Heart */}
        <path
          d="M50,90 C50,90 90,57.5 90,32 C90,17 78,8 65,8 C57,8 52,13 50,16 C48,13 43,8 35,8 C22,8 10,17 10,32 C10,57.5 50,90 50,90 Z"
          fill={brandBlue}
        />

        {/* Skyline Group (Clipped to Heart) */}
        <g clipPath="url(#heart-clip)">
          {/* 
            Skyline of white building silhouettes
            We start from the base line around y=65 and draw each building 
          */}
          <path
            d="
              M 31.5 65 
              L 31.5 57 
              L 36.5 57 
              L 36.5 65 
              
              M 37.5 65 
              L 37.5 43 
              L 41.5 43 
              L 41.5 65 
              
              M 42.5 65 
              L 42.5 28 
              L 46.5 28 
              L 46.5 65 
              
              M 47.5 65 
              L 47.5 50 
              L 51.5 50 
              L 51.5 65 
              
              M 52.5 65 
              L 52.5 35 
              L 58.5 35 
              L 58.5 65 
              
              M 59.5 65 
              L 59.5 46 
              L 64.5 37 
              L 64.5 65 
              
              M 65.5 65 
              L 65.5 48 
              L 69.5 48 
              L 69.5 65
            "
            fill="#FFFFFF"
          />
        </g>
      </svg>
      
      {withText && (
        <div className="text-center mt-3 font-sans">
          <div 
            className="font-black tracking-wider text-sm sm:text-base leading-tight uppercase"
            style={{ color: textColor === 'currentColor' ? undefined : textColor }}
          >
            DOMINION CITY
          </div>
          <div 
            className="font-black tracking-widest text-xs sm:text-sm mt-0.5 uppercase"
            style={{ color: textColor === 'currentColor' ? undefined : textColor }}
          >
            APAPA
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable vector rendering function for PDF report exports
export function drawPdfLogo(doc: any, cx: number, cy: number) {
  // Save current fill color
  const prevFill = doc.getFillColor();

  // Draw Heart shape (Dominion Blue)
  doc.setFillColor(0, 56, 168); // #0038A8
  
  // Left lobe circle
  doc.circle(cx - 3, cy - 3, 3, 'F');
  // Right lobe circle
  doc.circle(cx + 3, cy - 3, 3, 'F');
  // Lower triangle (joins bottom point perfectly at cy + 7)
  doc.triangle(cx - 6, cy - 3, cx + 6, cy - 3, cx, cy + 7, 'F');

  // Draw White buildings inside the heart
  doc.setFillColor(255, 255, 255);
  
  const baseLine = cy + 3.5;
  // Building 1
  doc.rect(cx - 4.2, cy - 1.0, 0.8, baseLine - (cy - 1.0), 'F');
  // Building 2
  doc.rect(cx - 3.2, cy - 3.0, 0.6, baseLine - (cy - 3.0), 'F');
  // Building 3
  doc.rect(cx - 2.4, cy - 5.5, 0.6, baseLine - (cy - 5.5), 'F');
  // Building 4
  doc.rect(cx - 1.6, cy - 2.0, 0.6, baseLine - (cy - 2.0), 'F');
  // Building 5
  doc.rect(cx - 0.8, cy - 4.5, 1.0, baseLine - (cy - 4.5), 'F');
  // Building 6
  doc.rect(cx + 0.4, cy - 3.0, 0.8, baseLine - (cy - 3.0), 'F');
  // Building 7
  doc.rect(cx + 1.4, cy - 2.5, 0.6, baseLine - (cy - 2.5), 'F');

  // Restore previous fill color
  doc.setFillColor(prevFill);
}
