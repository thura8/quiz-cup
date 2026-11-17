import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT = path.join(process.cwd(), "public/quiz-cup/arena/host.glb");
const GLB_MAGIC = 0x46546c67;

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.byteLength < 12 || buffer.readUInt32LE(0) !== GLB_MAGIC) {
    return new Response("Expected a binary glTF", { status: 400 });
  }
  await writeFile(OUTPUT, buffer);
  return Response.json({ path: "/quiz-cup/arena/host.glb", bytes: buffer.byteLength });
}
