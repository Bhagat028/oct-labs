import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/Server";

export async function POST(req: NextRequest) {
  try {
    const { schema } = await req.json();

    if (!schema) {
      return NextResponse.json({ error: "Missing schema" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // ✅ simple auth

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const edgeConfigId = process.env.EDGE_CONFIG_ID;
    const token = process.env.VERCEL_API_TOKEN;

    if (!edgeConfigId || !token) {
      return NextResponse.json({ error: "Missing Edge Config credentials" }, { status: 500 });
    }

    const safeKey = `schema_${user.id}`; // use authenticated user's ID

    const response = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            operation: "upsert",
            key: safeKey,
            value: schema,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Edge Config save error:", err);
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Edge Config save failed:", err);
    return NextResponse.json({ error: "Edge Config error" }, { status: 500 });
  }
}

