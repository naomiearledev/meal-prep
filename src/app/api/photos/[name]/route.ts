import { PhotoError, photoContentType, readPhoto } from "@/lib/photos";

type Props = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { name } = await params;
  try {
    const bytes = readPhoto(name);
    if (!bytes) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": photoContentType(name) ?? "application/octet-stream",
        // Names are unique per upload, so a photo never changes under its URL.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof PhotoError) return new Response("Not found", { status: 404 });
    throw error;
  }
}
