import { Suspense } from "react";
import Landing from "@/components/marketing/Landing";

export default function Page() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
