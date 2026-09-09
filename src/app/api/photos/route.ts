import { NextResponse } from "next/server";
import { PhotoError, savePhoto } from "@/lib/photos";

export async function POST(request: Request) {
  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "No photo in the upload" }, { status: 400 });
  }

  try {
    const name = savePhoto(new Uint8Array(await photo.arrayBuffer()), photo.type);
    return NextResponse.json({ url: `/api/photos/${name}` });
  } catch (error) {
    if (error instanceof PhotoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
