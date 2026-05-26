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
          bg-primary block size-3.5 shrink-0 rounded-full shadow-sm transition-[box-shadow]
          hover:ring-primary/30 hover:ring-4
          focus-visible:ring-primary/40 focus-visible:ring-4 focus-visible:outline-none
          disabled:pointer-events-none
        "
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
