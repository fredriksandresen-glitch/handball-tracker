import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import type { ReactNode } from "react";

export default function BackendProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <InternetIdentityProvider>{children}</InternetIdentityProvider>;
}
