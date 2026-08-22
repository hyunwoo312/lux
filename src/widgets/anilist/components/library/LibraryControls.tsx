import { useMemo } from "react";
import { ConfigSegmented } from "@/components/config/WidgetConfig";
import { FilterMenu } from "@/widgets/anilist/components/FilterMenu";
import {
  MEDIA_FILTER_OPTIONS,
  availableSorts,
  resolveSort,
  sortLabel,
  statusFilterOptions,
} from "@/widgets/anilist/components/library/filters";
import { listFilterLabel } from "@/widgets/anilist/lib/list-status";
import { useAnilist, useAnilistStore } from "@/widgets/anilist/useAnilistStore";
import { useWidgetInstanceId } from "@/widgets/core/useWidgetInstance";

export function LibraryControls() {
  const instanceId = useWidgetInstanceId();
  const filter = useAnilist((d) => d.mediaFilter);
  const setFilter = useAnilistStore((s) => s.setMediaFilter);
  const sort = useAnilist((d) => d.currentSort);
  const setSort = useAnilistStore((s) => s.setCurrentSort);
  const listFilter = useAnilist((d) => d.listFilter);
  const setListFilter = useAnilistStore((s) => s.setListFilter);

  const sortOptions = useMemo(() => availableSorts(listFilter), [listFilter]);
  const statusOptions = useMemo(() => statusFilterOptions(filter), [filter]);
  const effectiveSort = resolveSort(sort, listFilter);

  return (
    <div className="flex min-w-0 items-center gap-1.5 px-1">
      <ConfigSegmented
        label="Media filter"
        value={filter}
        options={MEDIA_FILTER_OPTIONS}
        onChange={(value) => setFilter(instanceId, value)}
      />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <FilterMenu
          value={listFilter}
          options={statusOptions}
          onChange={(value) => setListFilter(instanceId, value)}
          ariaLabel="Change status filter"
          tooltip={listFilterLabel(listFilter, filter)}
        />
        <FilterMenu
          value={effectiveSort}
          options={sortOptions}
          onChange={(value) => setSort(instanceId, value)}
          ariaLabel="Change sort order"
          tooltip={`Sorted by ${sortLabel(effectiveSort).toLowerCase()}`}
        />
      </div>
    </div>
  );
}
