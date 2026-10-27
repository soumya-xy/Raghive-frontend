"use client";

import React, { useEffect, useRef } from 'react';

// The main App component that encapsulates the animation
// In React, component names must start with a capital letter to be recognized as components.
// Renamed the function from "component" to "TubesCursor".
export default function TubesCursor({
  className = "",
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
} = {}) {
  // useRef to get a persistent reference to the canvas element
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // useRef to hold the animation instance so we can call its methods
  const appRef = useRef<any>(null);

  /**
   * Generates an array of random hex color strings.
   * @param {number} count - The number of random colors to generate.
   * @returns {string[]} An array of color strings.
   */
  const randomColors = (count: number) => {
    return new Array(count)
      .fill(0)
      .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
  };

  // This effect runs once when the component mounts
  useEffect(() => {
    let isMounted = true;

    // Suppress non-fatal Three.js uninitialized buffer geometry warning during initialization
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args: any[]) => {
      const msg = args[0] ? String(args[0]) : '';
      if (msg.includes('computeBoundingSphere') || msg.includes('Computed radius is NaN')) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const msg = args[0] ? String(args[0]) : '';
      if (msg.includes('computeBoundingSphere') || msg.includes('Computed radius is NaN')) {
        return;
      }
      originalConsoleWarn.apply(console, args);
    };

    const initTimer = setTimeout(() => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Use dynamic import with url string evaluation to avoid SSR/bundler URL resolution issues
      const loadModule = new Function("url", "return import(url)");
      loadModule('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js')
        .then((module: any) => {
          if (!isMounted || !canvasRef.current) return;
          const TubesCursorImpl = module.default;

          // Dispatch synthetic pointermove event before init to supply valid initial coordinates
          const initialX = window.innerWidth / 2;
          const initialY = window.innerHeight / 2;

          window.dispatchEvent(new PointerEvent('pointermove', {
            clientX: initialX,
            clientY: initialY,
            bubbles: true
          }));

          // Initialize the TubesCursor animation
          const app = TubesCursorImpl(canvasRef.current, {
            tubes: {
              colors: ["#f59e0b", "#d97706", "#0f766e"],
              lights: {
                intensity: 200,
                colors: ["#fbbf24", "#38bdf8", "#10b981", "#f43f5e"]
              }
            }
          });

          // Dispatch second event to register initial geometry trail
          window.dispatchEvent(new PointerEvent('pointermove', {
            clientX: initialX + 2,
            clientY: initialY + 2,
            bubbles: true
          }));

          // Store the instance in our ref for later use
          appRef.current = app;
        })
        .catch((err: any) => console.error("Failed to load TubesCursor module:", err));
    }, 150); // 150ms delay to allow for DOM rendering

    // Cleanup function to dispose of the animation and clear the timeout
    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;

      // Check if app was initialized and has a dispose method before calling
      if (appRef.current && typeof appRef.current.dispose === 'function') {
        try {
          appRef.current.dispose();
        } catch (e) {
          // ignore cleanup errors if canvas already removed
        }
      }
    };
  }, []); // The empty dependency array ensures this effect runs only once

  // Handles click events on the main container
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (appRef.current && appRef.current.tubes) {
      const newTubeColors = randomColors(3);
      const newLightColors = randomColors(4);
      
      // Update the colors in the running animation
      if (typeof appRef.current.tubes.setColors === 'function') {
        appRef.current.tubes.setColors(newTubeColors);
      }
      if (typeof appRef.current.tubes.setLightsColors === 'function') {
        appRef.current.tubes.setLightsColors(newLightColors);
      }
    }
  };

  // If children are provided, render as container; otherwise render default full hero
  if (children) {
    return (
      <div
        onClick={handleClick}
        className={`relative overflow-hidden cursor-pointer ${className}`}
        {...props}
      >
        {/* Canvas element for the animation, positioned absolutely behind children */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }

  return (
    // Main container with full-screen styles and click handler
    <div
      onClick={handleClick}
      className={`h-screen w-screen bg-black font-['Montserrat',_sans-serif] overflow-hidden cursor-pointer ${className}`}
      {...props}
    >
      {/* Canvas element for the animation, positioned behind everything else */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />
      
      {/* Hero content displayed over the canvas */}
    </div>
  );
}
