import { withApiErrorHandling } from "@/lib/api-response";

// NextAuth は Clerk に移行済みのため使用しない
export const GET = withApiErrorHandling(async () => new Response("Not found", { status: 404 }));
export const POST = withApiErrorHandling(async () => new Response("Not found", { status: 404 }));
