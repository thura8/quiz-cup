import type { CharacterSpec } from "../mascot-spec";
import { HOST } from "./host";
import { STUDENT } from "./student";

export { HOST, STUDENT };

export const CHARACTERS = { host: HOST, student: STUDENT } as const satisfies Record<string, CharacterSpec>;

export type CharacterId = keyof typeof CHARACTERS;

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export function characterById(id: string | null | undefined): CharacterSpec {
  return CHARACTERS[(id ?? "") as CharacterId] ?? HOST;
}
