import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  initialValue?: string;
}

export function SearchBar({
  onSearch,
  loading,
  initialValue = "",
}: SearchBarProps) {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Skip firing a search on mount when the box starts empty — the page's
  // own default (unfiltered) load already covers that case. Any later
  // change, including clearing a previously-typed value back to empty,
  // should fire — that's the "clear search" case.
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (!value.trim()) return;
    }
    timerRef.current = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timerRef.current);
  }, [value, onSearch]);

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search by phone number, device name, or user ID..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 text-lg pr-12"
      />
      {loading ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      ) : (
        value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Clear search"
          >
            <X className="size-5" />
          </button>
        )
      )}
    </div>
  );
}
