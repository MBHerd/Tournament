import { NextResponse } from "next/server";
import { buildInteropCsv, type ExportKind } from "@/src/lib/interop-exports";
import { isSupabaseConfigured } from "@/src/lib/env";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type ExportRouteProps = {
  params: Promise<{ kind: string }>;
};

export async function GET(_request: Request, { params }: ExportRouteProps) {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return new NextResponse("Sign in required.", { status: 401 });
  }

  const { kind } = await params;
  const exportFile = await buildInteropCsv(kind as ExportKind);
  if (!exportFile) return new NextResponse("Unknown export.", { status: 404 });

  return new NextResponse(exportFile.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFile.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
