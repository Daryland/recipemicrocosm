import { NextResponse } from "next/server";
import { getBrowsePage, parseBrowseQuery } from "@/lib/browse";

// GET /api/recipes/browse?<same params as /recipes>&offset=24
// The next batch of recipes as the browse page scrolls.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const offset = Math.max(0, Math.floor(Number(params.get("offset")) || 0));
  const page = await getBrowsePage(parseBrowseQuery(params), offset);
  return NextResponse.json(page);
}
