import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // Example breakpoint for mobile devices (adjust as needed)

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array ensures this effect runs only once on mount and cleanup on unmount

  return isMobile;
} 