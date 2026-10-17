import { Suspense } from "react";
import { io } from "next/cache";
import HomeClient from "@/components/HomeClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EditionPage />
    </Suspense>
  );
}

async function EditionPage() {
  await io();
  const editionNow = new Date().toISOString();

  return <HomeClient editionNow={editionNow} />;
}
