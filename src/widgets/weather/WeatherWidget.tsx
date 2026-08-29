import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MapPin } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import type { DragEndEvent } from "@dnd-kit/core";
import { closestCenter, DndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortableSensors, VERTICAL_LIST_MODIFIERS } from "@/lib/dnd";
import { SortableRow } from "@/widgets/core/SortableRow";
import { WeatherDetail } from "@/widgets/weather/components/WeatherDetail";
import { WeatherRow } from "@/widgets/weather/components/WeatherRow";
import { viewSwap } from "@/lib/motion";
import { detailLocation, useWeather, useWeatherStore } from "@/widgets/weather/useWeatherStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function WeatherWidget() {
  const reduced = useReducedMotion();
  const instanceId = useWidgetInstanceId();
  const locations = useWeather((d) => d.locations);
  const units = useWeather((d) => d.units);
  const windUnit = useWeather((d) => d.windUnit);
  const selectedId = useWeather((d) => d.selectedId);
  const selectCity = useWeatherStore((s) => s.selectCity);
  const removeLocation = useWeatherStore((s) => s.removeLocation);
  const reorderLocations = useWeatherStore((s) => s.reorderLocations);

  const sensors = useSortableSensors();

  const detail = detailLocation(locations, selectedId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderLocations(instanceId, String(active.id), String(over.id));
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {locations.length === 0 ? (
        <StateMessage icon={MapPin} message="Search above to add a city." />
      ) : (
        <AnimatePresence initial={false} mode="popLayout">
          {detail ? (
            <motion.div key="detail" className="absolute inset-0" {...viewSwap(reduced, "-4%")}>
              <WeatherDetail
                location={detail}
                units={units}
                windUnit={windUnit}
                onRemove={() => removeLocation(instanceId, detail.id)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              className="absolute inset-0 overflow-x-hidden scroll-fade overflow-y-auto"
              {...viewSwap(reduced, "4%")}
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
                          <WeatherRow
                            location={location}
                            units={units}
                            windUnit={windUnit}
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
