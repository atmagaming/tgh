import { env } from "env";
import type { SearchOptions } from "./search-options";
import { SearchResult } from "./search-result";

const freshnessMap = { past_day: "pd", past_week: "pw", past_month: "pm", past_year: "py" } as const;

export async function braveSearch(
  query: string,
  { count = 5, freshness, country, searchLang }: SearchOptions = {},
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: String(count),
    extra_snippets: "true",
    text_decorations: "false",
  });

  if (freshness) params.set("freshness", freshnessMap[freshness]);
  if (country) params.set("country", country);
  if (searchLang) params.set("search_lang", searchLang);

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave Search API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    web?: { results: { title: string; url: string; description: string; extra_snippets?: string[]; age?: string }[] };
  };
  return data.web?.results?.map((r) => new SearchResult(r.title, r.url, r.description, r.extra_snippets, r.age)) ?? [];
}
