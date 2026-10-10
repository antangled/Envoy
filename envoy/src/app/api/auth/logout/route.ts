import { destroySession, handle } from "@/lib/session";

export const POST = handle(async () => {
  await destroySession();
  return Response.json({ ok: true });
});
