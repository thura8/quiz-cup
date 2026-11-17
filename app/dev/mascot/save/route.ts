import { writeFile } from "node:fs/promises";
import path from "node:path";

import { CHARACTERS, type CharacterId } from "@/components/quiz-cup/arena/mascot/characters";

const GLB_MAGIC = 0x46546c67;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const id = new URL(request.url).searchParams.get("character") ?? "host";
  const spec = CHARACTERS[id as CharacterId];
  if (!spec) return new Response(`Unknown character "${id}"`, { status: 400 });
  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.byteLength < 12 || buffer.readUInt32LE(0) !== GLB_MAGIC) {
    return new Response("Expected a binary glTF", { status: 400 });
  }
  await writeFile(path.join(process.cwd(), "public", spec.glb), buffer);
  return Response.json({ path: spec.glb, bytes: buffer.byteLength });
}
