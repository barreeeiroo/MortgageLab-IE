/**
 * Self-build template data fetching utilities.
 */

import {
    type SelfBuildTemplate,
    SelfBuildTemplatesFileSchema,
} from "@/lib/schemas/self-build-template";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch self-build templates data from the JSON file.
 * @returns Array of self-build templates, or empty array on error
 */
export async function fetchSelfBuildTemplatesData(): Promise<
    SelfBuildTemplate[]
> {
    try {
        const res = await fetch(getPath("data/self-build-templates.json"));
        if (!res.ok) return [];
        const json = await res.json();
        return SelfBuildTemplatesFileSchema.parse(json);
    } catch {
        return [];
    }
}
