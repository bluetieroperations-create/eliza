import type {
  LifeOpsCalendarEvent,
  LifeOpsCalendarFeed,
  LifeOpsCalendarSummary,
} from "@elizaos/shared";

export type AggregatedCalendarFeedSource = {
  calendar: Pick<
    LifeOpsCalendarSummary,
    "accountEmail" | "calendarId" | "grantId" | "summary"
  >;
  feed: LifeOpsCalendarFeed;
};

/**
 * Merge per-calendar feeds into one event list: dedupe by event id (first wins),
 * backfill `grantId` / `accountEmail` / `calendarSummary` from the owning
 * calendar, and sort ascending by start time. Pure — kept out of
 * `CalendarService` so tests can import it without the service graph.
 */
export function mergeAggregatedCalendarFeedEvents(
  sources: readonly AggregatedCalendarFeedSource[],
): LifeOpsCalendarEvent[] {
  const dedupedEvents = new Map<string, LifeOpsCalendarEvent>();
  for (const source of sources) {
    for (const event of source.feed.events) {
      if (dedupedEvents.has(event.id)) {
        continue;
      }
      dedupedEvents.set(event.id, {
        ...event,
        grantId: event.grantId ?? source.calendar.grantId,
        accountEmail:
          event.accountEmail ?? source.calendar.accountEmail ?? undefined,
        calendarSummary: event.calendarSummary ?? source.calendar.summary,
      });
    }
  }
  return [...dedupedEvents.values()].sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );
}
