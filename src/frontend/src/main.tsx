import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient();

const savedTheme = window.localStorage.getItem("handball-tracker-theme");
const initialTheme =
  savedTheme === "light" || savedTheme === "dark"
    ? savedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

document.documentElement.classList.toggle("dark", initialTheme === "dark");
document.documentElement.style.colorScheme = initialTheme;

function PlayerImageLightbox() {
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    function openImage(event: MouseEvent) {
      const target = event.target as Element | null;
      const img = target?.closest?.(
        "img.size-28.object-top[alt]",
      ) as HTMLImageElement | null;

      if (!img?.src) return;
      event.preventDefault();
      setImage({ src: img.src, alt: img.alt });
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setImage(null);
    }

    document.addEventListener("click", openImage);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("click", openImage);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Spillerbilde"
      onClick={() => setImage(null)}
    >
      <button
        type="button"
        onClick={() => setImage(null)}
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-border bg-card/85 text-foreground transition-colors hover:border-primary/50 hover:text-primary"
        aria-label="Lukk bilde"
      >
        <X className="size-5" />
      </button>
      <img
        src={image.src}
        alt={image.alt}
        className="max-h-[92vh] max-w-[92vw] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <PlayerImageLightbox />
  </QueryClientProvider>,
);
