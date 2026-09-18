import { uniqueId } from '../../utils/id-generator';

/** e.g. uniqueGroupGuid('qa-group-created') -> "qa-group-created-mtn21x4k9f2a" — the qa- prefix convention is relied on elsewhere (e.g. safe to bulk-identify test-created groups). */
export function uniqueGroupGuid(prefix: string): string {
  return uniqueId(prefix);
}
