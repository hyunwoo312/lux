import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { SortableRow } from "@/widgets/core/SortableRow";
import { WeatherCard } from "@/widgets/weather/components/WeatherCard";
import { EASE_OUT_QUINT } from "@/lib/motion";
import { useWeather, useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function WeatherWidget() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const locations = useWeather((d) => d.locations);
  const units = useWeather((d) => d.units);
  const selectedId = useWeather((d) => d.selectedId);
  const selectCity = useWeatherStore((s) => s.selectCity);
  const removeLocation = useWeatherStore((s) => s.removeLocation);
  const reorderLocations = useWeatherStore((s) => s.reorderLocations);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selected = selectedId ? (locations.find((entry) => entry.id === selectedId) ?? null) : null;
  const detail = locations.length === 1 ? (locations[0] ?? null) : selected;

  const transition = { duration: reduced ? 0 : 0.3, ease: EASE_OUT_QUINT };
  const offset = reduced ? 0 : "4%";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderLocations(instanceId, String(active.id), String(over.id));
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {locations.length === 0 ? (
        <div
          className="
            text-muted-foreground flex h-full items-center justify-center px-2 text-center text-sm
          "
        >
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
                onRemove={() => removeLocation(instanceId, detail.id)}
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
                modifiers={VERTICAL_LIST_MODIFIERS}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={locations.map((location) => location.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="flex flex-col gap-0.5">
                    <AnimatePresence initial={false} mode="popLayout">
                      {locations.map((location) => (
                        <SortableRow key={location.id} id={location.id}>
                          <WeatherCard
                            location={location}
                            units={units}
                            mode="compact"
                            onSelect={() => selectCity(instanceId, location.id)}
                            onRemove={() => removeLocation(instanceId, location.id)}
                          />
                        </SortableRow>
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
