"use client";

import { uk } from "@/locales/uk";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MuseumWizard } from "@/components/MuseumWizard";

export default function Home() {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return <MuseumWizard />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50">
            {uk.title}
          </h1>
          
          <div className="mt-8">
            <Button 
              onClick={() => setShowWizard(true)}
              className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 text-lg"
            >
              Почати створення туру
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
