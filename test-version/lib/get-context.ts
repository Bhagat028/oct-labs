import { get } from "@vercel/edge-config";
import { createClient } from "@/utils/supabase/Server";

// Get schema for the currently authenticated Supabase user
export async function getSchemaFromEdgeConfig() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("User not authenticated");
    return null;
  }

  const key = `schema_${user.id}`;
  const schema = await get(key);
  return schema;
}
