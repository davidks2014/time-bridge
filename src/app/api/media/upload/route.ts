// src/app/api/media/upload/route.ts

export const dynamic = "force-dynamic";

/**
 * This endpoint is retired.
 *
 * Old flow:
 * Browser -> /api/media/upload -> Cloudinary
 *
 * New flow:
 * Browser -> /api/media/sign -> Browser uploads directly to Cloudinary
 *
 * We keep this route temporarily to block accidental old usage
 * and return a clear message instead of silently allowing it.
 */

function retiredResponse() {
  return Response.json(
    {
      error: "This upload endpoint is retired. Please use signed direct upload via /api/media/sign.",
      retired: true,
      useInstead: "/api/media/sign",
    },
    { status: 410 }
  );
}

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}

export async function PUT() {
  return retiredResponse();
}

export async function PATCH() {
  return retiredResponse();
}

export async function DELETE() {
  return retiredResponse();
}