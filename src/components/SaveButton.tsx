"use client";

import { useState, useTransition } from "react";
import { useSession, signIn } from "next-auth/react";

export function SaveButton({ recipeId, initialSaved }: { recipeId: string; initialSaved: boolean }) {
  const { status } = useSession();
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (status !== "authenticated") {
      signIn();
      return;
    }
    startTransition(async () => {
      const method = saved ? "DELETE" : "POST";
      const res = await fetch(`/api/recipes/${recipeId}/save`, { method });
      if (res.ok) setSaved(!saved);
    });
  }

  return (
    <button onClick={toggle} disabled={isPending} className={saved ? "btn-secondary" : "btn-primary"}>
      {saved ? "Saved to library ✓" : "Save to my library"}
    </button>
  );
}
