import { DEFAULT_DISCOVERY_RELAYS } from "askexperts/client";
import { Filter, SimplePool } from "nostr-tools";
import { Expert } from "askexperts/common";
import { parseExpertProfile } from "askexperts/experts";

export const globalPool = new SimplePool();
export const SEARCH_RELAYS = ['wss://relay.nostr.band/all'];

export async function waitNewExpert(pubkey: string, relays?: string[]) {
  const filter: Filter = {
    kinds: [10174],
    authors: [pubkey],
    since: Math.floor(Date.now() / 1000) - 10,
  };

  relays = relays || DEFAULT_DISCOVERY_RELAYS;

  let got = false;
  do {
    const events = await globalPool.querySync(relays, filter, { maxWait: 1000 });
    got = events.length > 0;
  } while (!got);
}

/**
 * Search for experts using a query string
 * @param query The search query
 * @returns Promise resolving to an array of Expert objects
 */
export async function searchExperts(query: string): Promise<Expert[]> {
  if (!query.trim()) {
    return [];
  }

  const filter: Filter = {
    kinds: [10174],
    search: `${query} include:spam`,
    since: Math.floor(Date.now() / 1000) - 24 * 3600, // Updated recently
  };

  try {
    const events = await globalPool.querySync(SEARCH_RELAYS, filter, { maxWait: 5000 });
    
    // Parse events into Expert objects
    const experts = events.map(event => parseExpertProfile(event));
    
    // Filter out any null results (in case parsing failed)
    return experts.filter(expert => expert !== null) as Expert[];
  } catch (error) {
    console.error("Error searching for experts:", error);
    throw new Error("Failed to search for experts. Please try again.");
  }
}