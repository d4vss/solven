import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

const handler = toNextJsHandler(auth);

function noStore(response: Response) {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  return response;
}

export async function GET(request: Request) {
  return noStore(await handler.GET(request));
}

export async function POST(request: Request) {
  return noStore(await handler.POST(request));
}
