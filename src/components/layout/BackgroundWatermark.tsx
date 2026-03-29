/** Large centered logo art; image lives in /public (source: Biztomate - AI Business Automation.jpeg). */
export function BackgroundWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <img
        src="/biztomate-ai-business-automation.jpeg"
        alt=""
        className="h-[min(92vh,56rem)] w-[min(96vw,80rem)] max-w-none shrink-0 object-contain opacity-[0.12] select-none sm:h-[min(94vh,60rem)]"
        draggable={false}
      />
    </div>
  );
}
