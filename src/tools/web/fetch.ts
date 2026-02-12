import { convert } from "html-to-text";
import { models } from "models";
import OpenAI from "openai";
import { defineTool } from "streaming-agent";
import { z } from "zod";

const openai = new OpenAI();

export const webFetchTool = defineTool(
  "WebFetch",
  "Fetch a web page and extract/summarize specific information from it. Use this when you need to read the content of a specific URL and extract relevant details.",
  z.object({
    url: z.string().describe("The URL to fetch"),
    query: z.string().describe("What information to extract or summarize from the page"),
  }),
  async ({ url, query }) => {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TGHBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);

    const html = await response.text();
    const text = convert(html, { wordwrap: false, selectors: [{ selector: "img", format: "skip" }] });

    // Truncate to avoid excessive token usage
    const maxChars = 50_000;
    const truncated = text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[Content truncated...]` : text;

    const completion = await openai.chat.completions.create({
      model: models.nano,
      messages: [
        {
          role: "system",
          content:
            "You extract and summarize information from web page content. Be concise and focus on the user's query. Return the relevant information in a well-structured markdown format.",
        },
        { role: "user", content: `Page URL: ${url}\n\nQuery: ${query}\n\nPage content:\n${truncated}` },
      ],
    });

    return completion.choices[0]?.message?.content ?? "Failed to extract information from the page.";
  },
);
