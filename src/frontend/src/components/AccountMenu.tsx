import {
  InternetIdentityProvider,
  useInternetIdentity,
} from "@caffeineai/core-infrastructure";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { setAuthenticatedSessionHint } from "../utils/followedPlayerStorage";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

function shortenPrincipal(principal: string) {
  if (principal.length <= 18) return principal;
  return `${principal.slice(0, 9)}...${principal.slice(-7)}`;
}

function AccountMenuContent() {
  const {
    identity,
    login,
    clear,
    loginStatus,
    isInitializing,
    isLoggingIn,
    isLoginSuccess,
    isLoginError,
    loginError,
  } = useInternetIdentity();
  const [logoutRequested, setLogoutRequested] = useState(false);
  const principal = identity?.getPrincipal();
  const isAuthenticated = Boolean(principal && !principal.isAnonymous());

  useEffect(() => {
    if (!isLoginSuccess || !isAuthenticated) return;
    setAuthenticatedSessionHint(true);
    window.location.reload();
  }, [isAuthenticated, isLoginSuccess]);

  useEffect(() => {
    if (!logoutRequested || identity || loginStatus !== "idle") return;
    setAuthenticatedSessionHint(false);
    window.location.reload();
  }, [identity, loginStatus, logoutRequested]);

  if (isInitializing) {
    return (
      <div className="px-2 py-3 text-sm text-muted-foreground">
        Henter kontostatus...
      </div>
    );
  }

  if (isAuthenticated && principal) {
    return (
      <>
        <DropdownMenuLabel className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          Innlogget
        </DropdownMenuLabel>
        <div className="px-2 pb-2 font-mono text-xs text-muted-foreground">
          {shortenPrincipal(principal.toText())}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logoutRequested}
          onSelect={(event) => {
            event.preventDefault();
            setLogoutRequested(true);
            clear();
          }}
        >
          <LogOut />
          {logoutRequested ? "Logger ut..." : "Logg ut"}
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <>
      <DropdownMenuLabel>Ikke innlogget</DropdownMenuLabel>
      <div className="px-2 pb-2 text-xs leading-5 text-muted-foreground">
        Favorittene dine er lagret på denne enheten.
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled={isLoggingIn}
        onSelect={(event) => {
          event.preventDefault();
          login();
        }}
      >
        <LogIn />
        {isLoggingIn ? "Åpner innlogging..." : "Logg inn"}
      </DropdownMenuItem>
      {isLoginError && (
        <div className="px-2 py-2 text-xs text-destructive" role="alert">
          {loginError?.message ?? "Innloggingen mislyktes. Prøv igjen."}
        </div>
      )}
    </>
  );
}

export default function AccountMenu() {
  return (
    <InternetIdentityProvider>
      <AccountMenuContent />
    </InternetIdentityProvider>
  );
}
