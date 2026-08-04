/** Soft brand wash behind the app chrome. */
export function BackgroundWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
      <div className="absolute -right-20 top-24 h-96 w-96 rounded-full bg-brand-secondary/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-success/15 blur-3xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/biztomate-ai-business-automation.jpeg"
          alt=""
          className="h-[min(92vh,56rem)] w-[min(96vw,80rem)] max-w-none shrink-0 object-contain opacity-[0.07] select-none sm:h-[min(94vh,60rem)]"
          draggable={false}
        />
      </div>
    </div>
  );
}
