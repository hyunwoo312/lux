import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { WeatherCard } from "@/widgets/weather/components/WeatherCard";
import { WEATHER_EASE } from "@/widgets/weather/lib/motion";
import { useWeatherStore } from "@/widgets/weather/useWeatherStore";
import type { WeatherLocation, WeatherUnits } from "@/widgets/weather/types";

const ROW_TRANSITION = { duration: 0.2, ease: "easeOut" } as const;

function SortableCityRow({ location, units }: { location: WeatherLocation; units: WeatherUnits }) {
  const reduced = useReducedMotion();
  const selectCity = useWeatherStore((s) => s.selectCity);
  const removeLocation = useWeatherStore((s) => s.removeLocation);
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: location.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      {...listeners}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      transition={ROW_TRANSITION}
      className={cn("touch-none", isDragging ? "cursor-grabbing opacity-60" : "cursor-grab")}
    >
      <WeatherCard
        location={location}
        units={units}
        mode="compact"
        onSelect={() => selectCity(location.id)}
        onRemove={() => removeLocation(location.id)}
      />
    </motion.li>
  );
}

export function WeatherWidget() {
  const reduced = useReducedMotion();
  const locations = useWeatherStore((s) => s.locations);
  const units = useWeatherStore((s) => s.units);
  const selectedId = useWeatherStore((s) => s.selectedId);
  const removeLocation = useWeatherStore((s) => s.removeLocation);
  const reorderLocations = useWeatherStore((s) => s.reorderLocations);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selected = selectedId ? (locations.find((entry) => entry.id === selectedId) ?? null) : null;
  const detail = locations.length === 1 ? (locations[0] ?? null) : selected;

  const transition = { duration: reduced ? 0 : 0.3, ease: WEATHER_EASE };
  const offset = reduced ? 0 : "4%";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderLocations(String(active.id), String(over.id));
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {locations.length === 0 ? (
        <div className="
          text-muted-foreground flex h-full items-center justify-center px-2 text-center text-sm
        ">
          Search above to add a city.
        </div>
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {detail ? (
            <motion.div
              key="detail"
              className="absolute inset-0"
              initial={{ opacity: 0, y: reduced ? 0 : "-4%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : "-4%" }}
              transition={transition}
            >
              <WeatherCard
                location={detail}
                units={units}
                mode="detailed"
                onRemove={() => removeLocation(detail.id)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              className="absolute inset-0 overflow-x-hidden overflow-y-auto"
              initial={{ opacity: 0, y: offset }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: offset }}
              transition={transition}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={locations.map((location) => location.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-0.5">
                    <AnimatePresence initial={false} mode="popLayout">
                      {locations.map((location) => (
                        <SortableCityRow key={location.id} location={location} units={units} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </SortableContext>
              </DndContext>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
