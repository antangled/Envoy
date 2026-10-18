import { campaignsAllowed, demoOnly, integrationStates, integrations, isAdminEmail } from "@/lib/env";
import { currentUser, handle } from "@/lib/session";
import { getOrg, profileComplete } from "@/lib/pipeline/org";

export const GET = handle(async () => {
  const u = await currentUser();
  const org = u && campaignsAllowed(u) ? await getOrg(u.id) : null;
  return Response.json({
    integrations: integrations(),
    keyStates: integrationStates(),
    user: u
      ? {
          id: u.id,
          email: u.email,
          isDemo: u.isDemo,
          gmailConnected: !!u.googleRefreshTokenEnc,
          dailyCap: u.dailyCap,
          isAdmin: isAdminEmail(u.email),
          beacnMember: u.beacnMember || isAdminEmail(u.email),
          campaigns: campaignsAllowed(u),
        }
      : null,
    demoOnly: demoOnly(),
    profileComplete: profileComplete(org),
  });
});
