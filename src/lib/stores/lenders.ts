import { fetchLendersData } from "@/lib/data/fetch";
import type { Lender } from "@/lib/schemas/lender";
import { createDataStore } from "./common";

const store = createDataStore<Lender>(fetchLendersData);

export const $lenders = store.$data;
export const fetchLenders = store.fetch;
export const isLendersFetched = store.isFetched;
export const markLendersFetched = store.markFetched;
