import { INK_40, INK_60, INK_100 } from "@/lib/palette/v2";

export function ClassificationPill({
  classification,
}: {
  classification: string;
}) {
  const hot = classification === "HOT";
  const cool = classification === "COOL" || classification === "NO_DATA";

  return (
    <span
      className="inline-block border px-2 py-0.5 text-[10px] uppercase tracking-widest"
      style={{
        borderColor: hot ? INK_100 : INK_40,
        color: hot ? INK_100 : cool ? INK_40 : INK_60,
      }}
    >
      {classification.replace("_", " ")}
    </span>
  );
}
