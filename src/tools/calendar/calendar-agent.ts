import { models } from "models";
import { google } from "services/google-api";
import { StreamingAgent } from "streaming-agent";
import { createEventTool, deleteEventTool, listEventsTool, updateEventTool } from "./tools";

export const calendarAgent = new StreamingAgent({
  name: "CalendarAgent",
  model: models.nano,
  instructions: async () => {
    const timezone = await google.calendar.getTimezone();
    return `You manage Google Calendar events.

Current timezone: ${timezone}
Current date/time: ${new Date().toLocaleString("en-US", { timeZone: timezone })}

Notes:
- Never ask clarifying questions — use sensible defaults and act immediately
- Default calendar is "primary"
- Use ${timezone} for all date/time calculations
- Include all-day events, label them as "All day"
- Format times naturally: "tomorrow at 14:00", "14:00, 12 Sep 2024"
- Use parallel tool calls when handling multiple lookups
- Output results concisely with all relevant details (times, attendees, locations)
`;
  },
  tools: [listEventsTool, createEventTool, updateEventTool, deleteEventTool],
});
