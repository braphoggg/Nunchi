import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { supabaseAuthId: user.id },
    });

    if (existing) {
      return NextResponse.json({ id: existing.id });
    }

    // Create new user
    const { email } = await req.json();
    const dbUser = await prisma.user.create({
      data: {
        email: email || user.email || "",
        supabaseAuthId: user.id,
      },
    });

    return NextResponse.json({ id: dbUser.id }, { status: 201 });
  } catch (err) {
    console.error("Auth register error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
