import type { PropsWithChildren } from "react";

export default function MobileFrame({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[390px] h-[844px] bg-white rounded-[3.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden relative border-[8px] border-black">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-50" />

        <div className="absolute top-3 left-8 right-8 h-6 flex justify-between items-center z-40 text-[13px] font-bold">
          <span>9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4.5 h-2.5 border border-black rounded-[2.5px] relative">
              <div className="absolute inset-[1.5px] bg-black rounded-[1px]" />
            </div>
          </div>
        </div>

        <div className="h-full pt-14 pb-8 overflow-hidden bg-white">{children}</div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-gray-900 rounded-full" />
      </div>
    </div>
  );
}
