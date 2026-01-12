import { fetchSelfBuildTemplatesData } from "@/lib/data/fetch";
import type { SelfBuildTemplate } from "@/lib/schemas/self-build-template";
import { createDataStore } from "./common";

const store = createDataStore<SelfBuildTemplate>(fetchSelfBuildTemplatesData);

export const $selfBuildTemplates = store.$data;
export const fetchSelfBuildTemplates = store.fetch;
export const isSelfBuildTemplatesFetched = store.isFetched;
export const markSelfBuildTemplatesFetched = store.markFetched;
