import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateRangePickerProps {
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;   // "YYYY-MM-DD"
  onDateChange: (from: string, to: string) => void;
  className?: string;
  placeholder?: string;
  allowFutureDates?: boolean;
  maxDate?: string; // ISO string "YYYY-MM-DD"
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatToISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplayDate(str: string): string {
  const d = parseISODate(str);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onDateChange,
  className,
  placeholder = "Select date range",
  allowFutureDates = false,
  maxDate: propMaxDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayIso = formatToISODate(today);
  const effectiveMaxDate = allowFutureDates ? null : (propMaxDate || todayIso);

  // Month navigation view
  const initialDate = parseISODate(dateTo) || parseISODate(dateFrom) || today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const maxYear = allowFutureDates ? today.getFullYear() + 5 : (propMaxDate ? (parseISODate(propMaxDate)?.getFullYear() || today.getFullYear()) : today.getFullYear());
  const minYear = 2020;
  const yearsList = Array.from({ length: Math.max(1, maxYear - minYear + 1) }, (_, i) => minYear + i);

  // Interactive selection state
  const [tempFrom, setTempFrom] = useState<string>(dateFrom);
  const [tempTo, setTempTo] = useState<string>(dateTo);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Synchronize internal state when prop changes
  useEffect(() => {
    setTempFrom(dateFrom);
    setTempTo(dateTo);
  }, [dateFrom, dateTo]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const isCurrentOrFutureMonth =
    !allowFutureDates &&
    (viewYear > today.getFullYear() ||
      (viewYear === today.getFullYear() && viewMonth >= today.getMonth()));

  const handleNextMonth = () => {
    if (isCurrentOrFutureMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Presets definition
  const applyPreset = (preset: "today" | "yesterday" | "this_week" | "last_7_days" | "this_month" | "last_month" | "last_30_days" | "this_year" | "all_time") => {
    let from = "";
    let to = "";

    if (preset === "today") {
      from = formatToISODate(today);
      to = formatToISODate(today);
    } else if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      from = formatToISODate(y);
      to = formatToISODate(y);
    } else if (preset === "this_week") {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      from = formatToISODate(monday);
      to = formatToISODate(today);
    } else if (preset === "last_7_days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      from = formatToISODate(d);
      to = formatToISODate(today);
    } else if (preset === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      from = formatToISODate(firstDay);
      to = formatToISODate(today);
    } else if (preset === "last_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      from = formatToISODate(firstDay);
      to = formatToISODate(lastDay);
    } else if (preset === "last_30_days") {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      from = formatToISODate(d);
      to = formatToISODate(today);
    } else if (preset === "this_year") {
      const firstDay = new Date(today.getFullYear(), 0, 1);
      from = formatToISODate(firstDay);
      to = formatToISODate(today);
    } else if (preset === "all_time") {
      from = "";
      to = "";
    }

    setTempFrom(from);
    setTempTo(to);
    onDateChange(from, to);
    setIsOpen(false);
  };

  // Calendar Day Click Logic
  const handleDateClick = (isoStr: string) => {
    if (effectiveMaxDate && isoStr > effectiveMaxDate) {
      return;
    }

    if (!tempFrom || (tempFrom && tempTo)) {
      // First click: start new range
      setTempFrom(isoStr);
      setTempTo("");
    } else {
      // Second click: finish range
      if (isoStr >= tempFrom) {
        setTempTo(isoStr);
        onDateChange(tempFrom, isoStr);
        setIsOpen(false);
      } else {
        // Clicked a date before tempFrom -> treat as new start date
        setTempFrom(isoStr);
        setTempTo("");
      }
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTempFrom("");
    setTempTo("");
    onDateChange("", "");
    setIsOpen(false);
  };

  const handleApply = () => {
    if (tempFrom && !tempTo) {
      // If user selected only one date, treat both as that date
      onDateChange(tempFrom, tempFrom);
    } else {
      onDateChange(tempFrom, tempTo);
    }
    setIsOpen(false);
  };

  // Build calendar matrix for currently viewed month
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{
    dayNumber: number;
    isoDate: string;
    isCurrentMonth: boolean;
    isToday: boolean;
    isDisabled: boolean;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonthDate = new Date(viewYear, viewMonth - 1, d);
    const iso = formatToISODate(prevMonthDate);
    calendarDays.push({
      dayNumber: d,
      isoDate: iso,
      isCurrentMonth: false,
      isToday: iso === todayIso,
      isDisabled: Boolean(effectiveMaxDate && iso > effectiveMaxDate),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(viewYear, viewMonth, d);
    const iso = formatToISODate(curDate);
    calendarDays.push({
      dayNumber: d,
      isoDate: iso,
      isCurrentMonth: true,
      isToday: iso === todayIso,
      isDisabled: Boolean(effectiveMaxDate && iso > effectiveMaxDate),
    });
  }

  // Next month leading days to complete grid (42 cells = 6 weeks)
  const remainingCells = 42 - calendarDays.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(viewYear, viewMonth + 1, d);
    const iso = formatToISODate(nextDate);
    calendarDays.push({
      dayNumber: d,
      isoDate: iso,
      isCurrentMonth: false,
      isToday: iso === todayIso,
      isDisabled: Boolean(effectiveMaxDate && iso > effectiveMaxDate),
    });
  }

  // Label for trigger button
  const getButtonLabel = () => {
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) {
        return formatDisplayDate(dateFrom);
      }
      return `${formatDisplayDate(dateFrom)} – ${formatDisplayDate(dateTo)}`;
    }
    if (dateFrom) return `From ${formatDisplayDate(dateFrom)}`;
    if (dateTo) return `Until ${formatDisplayDate(dateTo)}`;
    return placeholder;
  };

  const hasFilter = Boolean(dateFrom || dateTo);

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            const focusDate = parseISODate(dateTo) || parseISODate(dateFrom) || today;
            // Never open in a future month if future dates not allowed
            if (!allowFutureDates && (focusDate.getFullYear() > today.getFullYear() || (focusDate.getFullYear() === today.getFullYear() && focusDate.getMonth() > today.getMonth()))) {
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
            } else {
              setViewYear(focusDate.getFullYear());
              setViewMonth(focusDate.getMonth());
            }
          }
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shadow-xs cursor-pointer select-none",
          hasFilter
            ? "bg-primary/10 border-primary/40 text-primary hover:bg-primary/15"
            : "bg-zinc-50/70 dark:bg-zinc-900/70 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
        )}
      >
        <CalendarIcon className="w-3.5 h-3.5 shrink-0 text-primary" />
        <span className="font-mono text-xs truncate max-w-[200px]">{getButtonLabel()}</span>
        {hasFilter && (
          <span
            onClick={handleClear}
            title="Clear date filter"
            className="p-0.5 ml-1 rounded-full hover:bg-primary/20 text-primary transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border/80 rounded-2xl shadow-2xl p-4 w-[340px] sm:w-[480px] text-foreground animate-in fade-in-50 zoom-in-95">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Left Column: Quick Presets */}
            <div className="sm:w-36 border-b sm:border-b-0 sm:border-r border-border/60 pb-3 sm:pb-0 sm:pr-3 flex flex-col gap-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                Quick Presets
              </div>
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset("yesterday")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => applyPreset("this_week")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last_7_days")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset("this_month")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last_month")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last_30_days")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset("this_year")}
                className="text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                This Year
              </button>
              <div className="border-t border-border/50 my-1"></div>
              <button
                type="button"
                onClick={() => applyPreset("all_time")}
                className="text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors"
              >
                All Time (Clear)
              </button>
            </div>

            {/* Right Column: Interactive Calendar */}
            <div className="flex-1 flex flex-col">
              {/* Month / Year Navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <select
                    value={viewMonth}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value);
                      if (!allowFutureDates && viewYear === today.getFullYear() && newMonth > today.getMonth()) {
                        return;
                      }
                      setViewMonth(newMonth);
                    }}
                    className="text-xs font-bold text-foreground bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                  >
                    {MONTH_NAMES.map((name, idx) => {
                      const isFuture = !allowFutureDates && viewYear === today.getFullYear() && idx > today.getMonth();
                      return (
                        <option key={name} value={idx} disabled={isFuture}>
                          {name}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={viewYear}
                    onChange={(e) => {
                      const newYear = Number(e.target.value);
                      setViewYear(newYear);
                      if (!allowFutureDates && newYear === today.getFullYear() && viewMonth > today.getMonth()) {
                        setViewMonth(today.getMonth());
                      }
                    }}
                    className="text-xs font-bold font-mono text-foreground bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                  >
                    {yearsList.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    disabled={isCurrentOrFutureMonth}
                    title={isCurrentOrFutureMonth ? "Future months are disabled" : "Next month"}
                    className={cn(
                      "p-1 rounded-lg border border-border/70 transition-colors",
                      isCurrentOrFutureMonth
                        ? "opacity-30 cursor-not-allowed text-muted-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAYS_SHORT.map((day) => (
                  <div key={day} className="text-[10px] font-bold text-muted-foreground py-0.5 uppercase">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((cell, idx) => {
                  const isStart = cell.isoDate === tempFrom;
                  const isEnd = cell.isoDate === tempTo;
                  const isInRange =
                    tempFrom && tempTo && cell.isoDate > tempFrom && cell.isoDate < tempTo;

                  // Hover range preview
                  const isHoverInRange =
                    tempFrom &&
                    !tempTo &&
                    hoverDate &&
                    hoverDate > tempFrom &&
                    cell.isoDate > tempFrom &&
                    cell.isoDate <= hoverDate &&
                    !cell.isDisabled;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={cell.isDisabled}
                      onClick={() => !cell.isDisabled && handleDateClick(cell.isoDate)}
                      onMouseEnter={() => !cell.isDisabled && setHoverDate(cell.isoDate)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={cn(
                        "h-7 w-full text-xs font-mono rounded-md flex items-center justify-center transition-all relative",
                        cell.isDisabled
                          ? "opacity-25 cursor-not-allowed text-muted-foreground pointer-events-none select-none"
                          : "cursor-pointer",
                        !cell.isCurrentMonth && !cell.isDisabled && "text-muted-foreground/30",
                        cell.isCurrentMonth && !cell.isDisabled && "text-foreground",
                        cell.isToday && !isStart && !isEnd && "border border-primary/50 font-bold",
                        (isStart || isEnd) &&
                          "bg-primary text-primary-foreground font-bold shadow-xs",
                        isInRange && "bg-primary/20 text-primary font-semibold rounded-none",
                        isHoverInRange && "bg-primary/15 text-primary rounded-none",
                        isStart && tempTo && "rounded-r-none",
                        isEnd && tempFrom && "rounded-l-none"
                      )}
                    >
                      {cell.dayNumber}
                    </button>
                  );
                })}
              </div>

              {/* Range Information & Direct Actions */}
              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <div className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                  {tempFrom ? (
                    <span>
                      {formatDisplayDate(tempFrom)}
                      {tempTo ? ` → ${formatDisplayDate(tempTo)}` : " (Select end)"}
                    </span>
                  ) : (
                    "No range selected"
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
