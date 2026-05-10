"use client";

import {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

function GooeyFilter({
  filterId,
  blur,
}: {
  filterId: string;
  blur: number;
}) {
  return (
    <svg className="absolute hidden h-0 w-0" aria-hidden>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

function SearchIcon({ layoutId }: { layoutId: string }) {
  return (
    <motion.svg
      layoutId={layoutId}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      className="size-4 shrink-0 leading-none"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </motion.svg>
  );
}

/** Non-animated glyph for leading icon inside expanded pill (no detached bubble). */
function SearchGlyphStatic({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      width={16}
      height={16}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

const transition = {
  duration: 0.4,
  type: "spring" as const,
  bounce: 0.25,
};

const iconBubbleVariants = {
  collapsed: { scale: 0, opacity: 0 },
  expanded: { scale: 1, opacity: 1 },
};

export interface GooeyInputClassNames {
  root?: string;
  filterWrap?: string;
  buttonRow?: string;
  trigger?: string;
  input?: string;
  bubble?: string;
  bubbleSurface?: string;
}

export interface GooeyInputProps {
  placeholder?: string;
  className?: string;
  classNames?: GooeyInputClassNames;
  /** Collapsed control width in px */
  collapsedWidth?: number;
  /** Expanded control width in px */
  expandedWidth?: number;
  /** Horizontal offset when expanded (px), aligns detached bubble */
  expandedOffset?: number;
  /** Gaussian blur amount for the gooey SVG filter */
  gooeyBlur?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  onInputKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** When true, hides the detached bubble and draws the search icon inside the pill (left, over input padding). */
  inlineLeadingIcon?: boolean;
  disabled?: boolean;
}

export function GooeyInput({
  placeholder = "Type to search...",
  className,
  classNames,
  collapsedWidth = 115,
  expandedWidth = 200,
  expandedOffset = 50,
  gooeyBlur = 5,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onOpenChange,
  onInputKeyDown,
  inlineLeadingIcon = false,
  disabled = false,
}: GooeyInputProps) {
  const reactId = useId();
  const safeId = reactId.replace(/:/g, "");
  const filterId = `gooey-filter-${safeId}`;
  const iconLayoutId = `gooey-input-icon-${safeId}`;
  const inputLayoutId = `gooey-input-field-${safeId}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const prevExpandedRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const isControlled = valueProp !== undefined;
  const searchText = isControlled ? valueProp : uncontrolledValue;

  const setSearchText = useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const setExpanded = useCallback(
    (next: boolean) => {
      setIsExpanded(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    } else if (prevExpandedRef.current) {
      setSearchText("");
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, setSearchText]);

  const buttonVariants = useMemo(
    () => ({
      collapsed: { width: collapsedWidth, marginLeft: 0 },
      expanded: {
        width: expandedWidth,
        marginLeft: inlineLeadingIcon ? 0 : expandedOffset,
      },
    }),
    [collapsedWidth, expandedWidth, expandedOffset, inlineLeadingIcon],
  );

  const handleExpand = useCallback(() => {
    if (!disabled) setExpanded(true);
  }, [disabled, setExpanded]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
    },
    [setSearchText],
  );

  const handleBlur = useCallback(() => {
    if (!searchText) setExpanded(false);
  }, [searchText, setExpanded]);

  const surfaceClass =
    "bg-foreground text-background shadow-sm ring-1 ring-border/60";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        className,
        classNames?.root,
      )}
    >
      <GooeyFilter filterId={filterId} blur={gooeyBlur} />

      <div
        className={cn(
          "relative flex h-10 items-center justify-center",
          classNames?.filterWrap,
        )}
        style={{ filter: `url(#${filterId})` }}
      >
        <motion.div
          className={cn("flex h-10 items-center justify-center", classNames?.buttonRow)}
          variants={buttonVariants}
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          transition={transition}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={handleExpand}
            className={cn(
              "flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium outline-none transition-[color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
              isExpanded && inlineLeadingIcon && "relative",
              surfaceClass,
              classNames?.trigger,
            )}
          >
            {!isExpanded ? (
              <SearchIcon layoutId={iconLayoutId} />
            ) : null}
            {isExpanded && inlineLeadingIcon ? (
              <span
                className="pointer-events-none absolute left-[14px] top-1/2 z-[2] -translate-y-1/2 text-[#7a8aae]"
                aria-hidden
              >
                <SearchGlyphStatic />
              </span>
            ) : null}
            <motion.input
              layoutId={inputLayoutId}
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={searchText}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={onInputKeyDown}
              disabled={disabled || !isExpanded}
              placeholder={placeholder}
              className={cn(
                "h-full min-h-0 min-w-0 flex-1 bg-transparent py-0 text-sm leading-[2.5rem] text-background outline-none",
                isExpanded && inlineLeadingIcon && "pl-10",
                isExpanded
                  ? "placeholder:text-background/50 dark:placeholder:text-background/45"
                  : "pointer-events-none placeholder:text-background/80 dark:placeholder:text-background/70",
                classNames?.input,
              )}
            />
          </button>
        </motion.div>

        {!inlineLeadingIcon ? (
          <motion.div
            className={cn(
              "absolute top-1/2 left-0 flex size-10 -translate-y-1/2 items-center justify-center",
              classNames?.bubble,
            )}
            variants={iconBubbleVariants}
            initial="collapsed"
            animate={isExpanded ? "expanded" : "collapsed"}
            transition={transition}
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                surfaceClass,
                classNames?.bubbleSurface,
              )}
            >
              <SearchIcon layoutId={iconLayoutId} />
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
