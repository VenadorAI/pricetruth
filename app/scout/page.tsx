import { Suspense } from "react";
import { ScoutView } from "@/components/scout";

export const metadata = { title: "Become a price scout — PriceTruth" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScoutView />
    </Suspense>
  );
}
