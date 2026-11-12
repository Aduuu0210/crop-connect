"use client";

import { cn } from "@/lib/utils";
import { Loader2, Star, X, type LucideIcon } from "lucide-react";
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* --------------------------------- Button ---------------------------------- */

type ButtonVariant = "harvest" | "forest" | "outline" | "outlineLight" | "ghost" | "danger";

export function Button({
  variant = "forest",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-3.5 py-2 text-xs",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-base",
        variant === "harvest" &&
          "bg-harvest text-forest-950 shadow-[0_8px_24px_-8px_rgba(232,163,23,0.55)] hover:-translate-y-0.5 hover:bg-harvest-600 hover:shadow-[0_14px_30px_-8px_rgba(232,163,23,0.65)]",
        variant === "forest" &&
          "bg-forest-700 text-cream shadow-[0_12px_28px_-12px_rgba(27,107,53,0.55)] hover:-translate-y-0.5 hover:bg-moss",
        variant === "outline" &&
          "border border-forest-700/18 bg-white/45 text-forest-700 hover:border-forest-700 hover:bg-forest-700 hover:text-cream",
        variant === "outlineLight" &&
          "border border-cream/35 bg-cream/8 text-cream hover:border-cream hover:bg-cream hover:text-forest-950",
        variant === "ghost" && "text-forest-700/75 hover:bg-forest-700/6 hover:text-forest-700",
        variant === "danger" && "bg-clay/12 text-clay hover:bg-clay hover:text-cream",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------------------------- Fields --------------------------------- */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold tracking-[0.14em] text-ink/60 uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-2xl border border-forest-700/12 bg-parchment/55 px-4 py-3 text-sm text-ink placeholder:text-ink/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-all duration-200 focus:border-harvest focus:bg-white/90 focus:ring-4 focus:ring-harvest/12 focus:outline-none";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-24 resize-none", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "cursor-pointer appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

const badgeTones: Record<string, string> = {
  forest: "bg-forest-700/8 text-forest-700 border-forest-700/18",
  harvest: "bg-harvest/15 text-harvest-600 border-harvest/30",
  leaf: "bg-leaf/15 text-moss border-leaf/25",
  clay: "bg-clay/10 text-clay border-clay/24",
  cream: "bg-cream/10 text-cream border-cream/25",
};

export function Badge({
  tone = "forest",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------- Modal ---------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-forest-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fade-up relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-cream shadow-2xl sm:rounded-[28px]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-cream/90 px-6 py-4 backdrop-blur">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-ink/15 text-ink/60 transition hover:border-ink hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------- Stars ---------------------------------- */

export function Stars({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          className={cn("transition-transform", onChange && "cursor-pointer hover:scale-125")}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
        >
          <Star
            size={size}
            className={cn(
              "transition-colors",
              i <= active ? "fill-harvest text-harvest" : "fill-ink/10 text-ink/20"
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* -------------------------------- Empty state ------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="fade-up flex flex-col items-center rounded-3xl border border-dashed border-ink/20 px-8 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest-900/5">
        <Icon className="h-6 w-6 text-forest-800" />
      </div>
      <h3 className="font-display mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink/60">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ----------------------------------- Logo ---------------------------------- */

export function LogoMark({
  dark,
  size = "md",
  compact = false,
}: {
  dark?: boolean;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}) {
  const wrap = size === "sm" ? "px-2.5 py-2 rounded-2xl" : size === "lg" ? "px-5 py-3.5 rounded-[28px]" : "px-5 py-3 rounded-[24px]";
  const icon = size === "sm" ? "h-12" : size === "lg" ? "h-20" : compact ? "h-12" : "h-14";
  const word = size === "sm" ? "text-[18px]" : size === "lg" ? "text-[26px]" : compact ? "text-[18px]" : "text-[22px]";
  const tag = size === "lg" ? "text-[10px]" : "text-[8.5px]";
  return (
    <span className={cn("inline-flex items-center gap-3 border border-forest-700/15 bg-white shadow-[0_20px_40px_-20px_rgba(26,68,37,0.4)]", wrap)}>
      <img src="/logo.png" alt="Crop Connect Logo" className={cn(icon, "w-auto shrink-0 object-contain")} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-sans font-extrabold tracking-[-0.04em]", word)}>
          <span className="text-[#1b6b35]">Crop</span> <span className="text-[#6d4c41]">Connect</span>
        </span>
        {!compact && (
          <span className={cn("mt-2 font-sans font-semibold tracking-[0.24em] uppercase text-[#3d5a40]/75", tag)}>
            Farmers Connect • Better Tomorrows
          </span>
        )}
      </span>
    </span>
  );
}
