import { integrationStates, integrations } from "@/lib/env";
import { currentUser, handle } from "@/lib/session";
import { getOrg, profileComplete } from "@/lib/pipeline/org";

export const GET = handle(async () => {
  const u = await currentUser();
  const org = u ? await getOrg(u.id) : null;
  return Response.json({
    integrations: integrations(),
    keyStates: integrationStates(),
    user: u ? { id: u.id, email: u.email, isDemo: u.isDemo, gmailConnected: !!u.googleRefreshTokenEnc, dailyCap: u.dailyCap } : null,
    profileComplete: profileComplete(org),
  });
});
