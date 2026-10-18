import { handle } from "@/lib/session";
import { budget, requireMember } from "@/lib/beacn/access";
import { apolloAvailable } from "@/lib/providers/apollo";
import { qstashAvailable } from "@/lib/beacn/send";

export const GET = handle(async () => {
  const u = await requireMember();
  const b = await budget(u);
  return Response.json({ ...b, leftWeek: Number.isFinite(b.leftWeek) ? b.leftWeek : null, apollo: apolloAvailable(), scheduler: qstashAvailable(), gmail: !!u.googleRefreshTokenEnc });
});
