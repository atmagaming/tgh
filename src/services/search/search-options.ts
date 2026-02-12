export const searchCountries = [
  "AR",
  "AU",
  "AT",
  "BE",
  "BR",
  "CA",
  "CL",
  "CN",
  "DK",
  "FI",
  "FR",
  "DE",
  "GR",
  "HK",
  "IN",
  "ID",
  "IT",
  "JP",
  "KR",
  "MY",
  "MX",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "PH",
  "RU",
  "SA",
  "ZA",
  "ES",
  "SE",
  "CH",
  "TW",
  "TR",
  "GB",
  "US",
  "ALL",
] as const;

export type SearchCountry = (typeof searchCountries)[number];

export interface SearchOptions {
  count?: number;
  freshness?: "past_day" | "past_week" | "past_month" | "past_year";
  country?: SearchCountry;
  searchLang?: string;
}
