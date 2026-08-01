import { INK_60, INK_100 } from "@/lib/palette/v2";

/** Section rule from the approved explorer — letter, title, optional caveat. */
export function SectionHeading({
  letter,
  title,
  subtitle,
}: {
  letter: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 mt-10 first:mt-0" style={{ borderLeft: `4px solid ${INK_100}` }}>
      <h2 className="pl-3 text-[13px] font-bold uppercase tracking-[0.12em]">
        <span style={{ color: INK_60 }}>{letter}</span> · {title}
      </h2>
      {subtitle && (
        <p className="pl-3 pt-1 text-[11px]" style={{ color: INK_60 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
