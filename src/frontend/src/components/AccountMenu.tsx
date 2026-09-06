import {
  InternetIdentityProvider,
  useInternetIdentity,
} from "@caffeineai/core-infrastructure";
import { Check, Copy, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { setAuthenticatedSessionHint } from "../utils/followedPlayerStorage";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

async function copyToClipboard(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Utklippstavle kan vaere blokkert (usikker kontekst, avslaatt tillatelse).
    // Da faller vi tilbake paa at brukeren merker teksten selv.
  }
  return false;
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
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
        <div className="px-2 pb-2">
          <div className="mb-1 text-[11px] text-muted-foreground">
            Din ID (principal)
          </div>
          <div className="select-all break-all font-mono text-xs leading-5 text-foreground">
            {principal.toText()}
          </div>
          <button
            type="button"
            data-testid="principal-copy-button"
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={async (event) => {
              event.preventDefault();
              const ok = await copyToClipboard(principal.toText());
              setCopyState(ok ? "copied" : "failed");
              window.setTimeout(() => setCopyState("idle"), 2500);
            }}
          >
            {copyState === "copied" ? (
              <>
                <Check className="size-3.5" />
                Kopiert
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Kopier principal
              </>
            )}
          </button>
          {copyState === "failed" && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              Kunne ikke kopiere automatisk — merk teksten over og kopier
              manuelt.
            </div>
          )}
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
