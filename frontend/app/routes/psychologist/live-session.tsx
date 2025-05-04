import { useEffect, useState, lazy, Suspense } from 'react';
import "@excalidraw/excalidraw/index.css";

const Excalidraw = lazy(() => import('@excalidraw/excalidraw').then(module => ({ default: module.Excalidraw })));

export default function LiveSession() {
  const [time, setTime] = useState<string>('00:00');
  const [excalidrawAPI] = useState<any>(null);

  useEffect(() => {
    // Start the timer
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      setTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Live Session</h1>
        <div className="text-xl font-mono">{time}</div>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      }>
        <div className='w-full h-full border border-gray-300'>
          <Excalidraw
            excalidrawAPI={excalidrawAPI}
            theme="light"
            zenModeEnabled={true}
            gridModeEnabled={true}
            onChange={(elements: readonly any[], appState: any, files: any) => {
              // TODO: Implement sync logic here
              // console.log('Drawing changed:', elements, appState);
            }}
            UIOptions={{
              canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
                export: false,
                toggleTheme: false,
                clearCanvas: false,
              },
              
            }}
          />
        </div>
      </Suspense>
    </div>
  );
} 