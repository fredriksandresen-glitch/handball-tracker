import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRound } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import {
  AUTH_SESSION_CHANGED_EVENT,
  hasAuthenticatedSessionHint,
} from "../utils/followedPlayerStorage";

const AccountMenu = lazy(() => import("./AccountMenu"));

export function AccountControl() {
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    hasAuthenticatedSessionHint,
  );

  useEffect(() => {
    const updateStatus = () =>
      setIsAuthenticated(hasAuthenticatedSessionHint());
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, updateStatus);
    window.addEventListener("storage", updateStatus);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, updateStatus);
      window.removeEventListener("storage", updateStatus);
    };
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/65 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          aria-label={isAuthenticated ? "Åpne konto" : "Logg inn"}
          title={isAuthenticated ? "Konto" : "Logg inn"}
          data-ocid="account-menu"
        >
          <UserRound className="size-4" />
          {isAuthenticated && (
            <span
              className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary ring-2 ring-sidebar"
              aria-hidden="true"
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {open && (
          <Suspense
            fallback={
              <div className="px-2 py-3 text-sm text-muted-foreground">
                Laster konto...
              </div>
            }
          >
            <AccountMenu />
          </Suspense>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
