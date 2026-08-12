"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HeatmapCalendar, type DayStatus } from "./heatmap-calendar";
import { RecentDaysList } from "./recent-days-list";

export function HistoryViewToggle({
  month,
  statusByDate,
  recentDays,
}: {
  month: Date;
  statusByDate: Record<string, DayStatus>;
  recentDays: { date: string; status: DayStatus | null }[];
}) {
  return (
    <Tabs defaultValue="month">
      <TabsList className="mb-4">
        <TabsTrigger value="month">Month view</TabsTrigger>
        <TabsTrigger value="recent">3-day feed</TabsTrigger>
      </TabsList>
      <TabsContent value="month">
        <HeatmapCalendar month={month} statusByDate={statusByDate} />
        <div className="mt-4 flex flex-wrap items-center gap-3 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            Less
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-100" />
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-700" />
            More
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-destructive" /> Failed day
          </span>
        </div>
      </TabsContent>
      <TabsContent value="recent">
        <RecentDaysList days={recentDays} />
      </TabsContent>
    </Tabs>
  );
}
