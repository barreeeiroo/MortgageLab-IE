import { fetchPerksData } from "@/lib/data/fetch";
import type { Perk } from "@/lib/schemas";
import { createDataStore } from "./createDataStore";

const store = createDataStore<Perk>(fetchPerksData);

export const $perks = store.$data;
export const fetchPerks = store.fetch;
export const isPerksFetched = store.isFetched;
export const markPerksFetched = store.markFetched;
