import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Extract the authenticated user from a request's Authorization header.
 * Returns the DB user row, or null if not authenticated.
 */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return null;

    const dbUser = await prisma.user.findUnique({
      where: { supabaseAuthId: user.id },
    });

    return dbUser;
  } catch {
    return null;
  }
}
