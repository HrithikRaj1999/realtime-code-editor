import React, { useEffect, useState } from "react";

export default function useGetWindowSize() {
  const [availableHeight, setAvailableHeight] = useState(window.innerHeight);
  const [availableWidth, setAvailableWidth] = useState(window.innerWidth);
  // Effect to update available height and width on window resize
  useEffect(() => {
    const handleResize = () => {
      setAvailableHeight(window.innerHeight);
      setAvailableWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    // Clean up the event listener on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return [availableWidth,availableHeight];
}
