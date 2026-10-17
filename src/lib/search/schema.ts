import * as z from "zod";
import { SEARCH_QUERY_MAX } from "@/lib/search/types";

// The palette's query: trimmed and cut to SEARCH_QUERY_MAX characters (a long paste still searches
// its start instead of failing). Anything absurdly long or not a string is rejected. An empty
// result means "nothing typed": the recent surveys
export const searchQuerySchema = z
  .string()
  .max(10 * SEARCH_QUERY_MAX)
  .transform((value) => Array.from(value.trim()).slice(0, SEARCH_QUERY_MAX).join("").trim());
