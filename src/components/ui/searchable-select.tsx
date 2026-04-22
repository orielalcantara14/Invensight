import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface SearchableSelectOption {
  value: string | number
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string | number
  onValueChange: (value: string | number) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 })

  const selectedOption = options.find((option) => option.value === value)
  
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter(o => 
      o.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const updateCoords = React.useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Since the dropdown is 'fixed', we use viewport coordinates (rect.bottom)
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 300)
      });
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      updateCoords();
      // Update on scroll/resize to keep it attached to the button
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open, updateCoords]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Handle closing on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="w-full relative">
      <Button
        ref={buttonRef}
        variant="outline"
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          "w-full justify-between text-left font-normal bg-card border-border h-9 px-3 hover:bg-muted/50 transition-colors",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[99999] mt-1 bg-popover text-popover-foreground border-2 border-border rounded-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: coords.top + 4,
            left: coords.left,
            width: coords.width,
          }}
        >
          <div className="flex flex-col w-full max-h-[400px] bg-card">
            <div className="flex items-center px-3 py-2 border-b bg-muted/30">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
              <input
                className="flex h-8 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground text-foreground"
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                   if (e.key === 'Enter' && filteredOptions.length > 0) {
                      onValueChange(filteredOptions[0].value);
                      setOpen(false);
                   }
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto py-1 custom-scrollbar min-h-[50px]">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="grid gap-0.5 px-1">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-primary hover:text-white text-left transition-colors",
                        value === option.value && "bg-muted"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        {value === option.value && (
                          <Check className="h-4 w-4" />
                        )}
                      </span>
                      <span className="truncate font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
