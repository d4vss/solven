import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: "Checkout is disabled in this POC deployment." },
    { status: 403 },
  );
}
