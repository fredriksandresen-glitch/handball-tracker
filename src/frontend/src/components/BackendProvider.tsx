import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import type { ReactNode } from "react";
import { FavoriteSync } from "./FavoriteSync";

export default function BackendProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <InternetIdentityProvider>
      <FavoriteSync />
      {children}
    </InternetIdentityProvider>
  );
}
