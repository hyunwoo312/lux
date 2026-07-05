import { useFrostImage } from "@/lib/frost-image";

export function FauxGlassBackdrop() {
  const frostUrl = useFrostImage();

  if (!frostUrl) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 bg-cover bg-fixed bg-center"
      style={{ backgroundImage: `url("${frostUrl}")` }}
    />
  );
}
