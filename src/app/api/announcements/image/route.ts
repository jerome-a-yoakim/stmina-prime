import { NextResponse } from "next/server";
import { isAuthorizationError } from "@/features/access-control/data/authorization-service";
import { uploadAnnouncementImage } from "@/features/announcements/data/announcement-service";

export async function POST(request: Request) {
  try {
    const file = (await request.formData()).get("image");
    if (!(file instanceof File)) return NextResponse.json({ error: "الصورة مطلوبة." }, { status: 400 });
    return NextResponse.json(await uploadAnnouncementImage(file), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر رفع الصورة." },
      { status: isAuthorizationError(error) ? error.status : 400 });
  }
}
