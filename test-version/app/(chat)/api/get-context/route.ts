import { NextResponse } from "next/server";
import { getSchemaFromEdgeConfig } from "@/lib/get-context"; // your existing schema function

export async function GET() {
  const schema = await getSchemaFromEdgeConfig();

  if (!schema) {
    return NextResponse.json({ error: "Schema not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, schema });
}
