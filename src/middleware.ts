import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ALLOWED_IPS = ["173.32.253.65", "::1"];

export async function middleware(request: NextRequest) {
  console.log("x-forwarded-for", request.headers.get("x-forwarded-for"));
  console.log("x-real-ip", request.headers.get("x-real-ip"));
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip");

  if (!ALLOWED_IPS.includes(ip ?? "")) {
    return new NextResponse("Access denied", { status: 403 });
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
