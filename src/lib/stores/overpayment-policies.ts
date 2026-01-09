import { fetchOverpaymentPoliciesData } from "@/lib/data/fetch";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import { createDataStore } from "./common";

const store = createDataStore<OverpaymentPolicy>(fetchOverpaymentPoliciesData);

export const $overpaymentPolicies = store.$data;
export const fetchOverpaymentPolicies = store.fetch;
export const isOverpaymentPoliciesFetched = store.isFetched;
export const markOverpaymentPoliciesFetched = store.markFetched;
