import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CalendarRange } from "lucide-react";
import { defaultPeriod, periodLabel, type PeriodMode, type PeriodValue } from "@/lib/period";

const MODES: { value: PeriodMode; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
  { value: "custom", label: "Personalizado" },
];

export function PeriodFilter({ value, onChange }: { value: PeriodValue; onChange: (v: PeriodValue) => void }) {
  return (
    <Card className="no-print flex flex-wrap items-center gap-3 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarRange className="h-4 w-4 text-primary" />
        Período
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <Button
            key={m.value}
            size="sm"
            variant={value.mode === m.value ? "default" : "outline"}
            onClick={() => onChange(m.value === "custom" ? { ...value, mode: "custom" } : defaultPeriod(m.value))}
          >
            {m.label}
          </Button>
        ))}
      </div>
      {value.mode === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="h-9 w-40"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            className="h-9 w-40"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
          />
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">{periodLabel(value)}</div>
      )}
    </Card>
  );
}
