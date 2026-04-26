import { NextResponse } from "next/server";
import { listObjectKeysUnderPrefix, userStoragePrefix } from "@/lib/storage";
import { requireAuthenticatedUserId } from "@/lib/auth/request-user";

export async function GET(request: Request) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    const url = new URL(request.url);
    const relative = (url.searchParams.get("prefix") ?? "").replace(/^\//, "");
    const base = userStoragePrefix(userId);
    const full = relative ? `${base}${relative}` : base;
    const keys = await listObjectKeysUnderPrefix(full);
    return NextResponse.json({ keys, prefix: full });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }
}
