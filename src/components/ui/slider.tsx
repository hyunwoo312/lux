import type { ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        `relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50`,
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-foreground/15 relative h-1.5 w-full grow overflow-hidden rounded-full"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="
          border-primary focus-ring block size-4 shrink-0 cursor-grab rounded-full border-2 bg-white
          shadow-[var(--elev-1)] transition-transform
          hover:scale-110
          active:cursor-grabbing active:scale-105
          disabled:pointer-events-none
        "
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
