import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTaskEntityOptions, useTaskEntityLabel, type EntityOption } from "@/hooks/useTaskEntityOptions";
import type { TaskRelatedType } from "@/hooks/useTasks";

type Props = {
  relatedType: TaskRelatedType | null;
  value: string | null;
  onChange: (id: string | null, label: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function EntityCombobox({ relatedType, value, onChange, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: options = [], isFetching } = useTaskEntityOptions(relatedType, search);
  const { data: selected } = useTaskEntityLabel(relatedType, value);

  const displayed = useMemo<EntityOption[]>(() => options, [options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-9"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selected?.label ?? (value ? "Loading…" : placeholder ?? "Select record")}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[280px]" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 pl-7"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null, null); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              Clear selection
            </button>
          )}
          {isFetching && displayed.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">Searching…</div>
          )}
          {!isFetching && displayed.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {relatedType ? "No matches" : "Pick a relationship type first"}
            </div>
          )}
          {displayed.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onChange(opt.id, opt.label); setOpen(false); }}
              className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <Check className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", value === opt.id ? "opacity-100" : "opacity-0")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{opt.label}</span>
                {opt.sublabel && (
                  <span className="block text-xs text-muted-foreground truncate">{opt.sublabel}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
