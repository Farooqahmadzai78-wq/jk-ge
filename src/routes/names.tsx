import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { NAMES_OF_ALLAH } from "@/lib/nur-data";
import { useI18n } from "@/lib/i18n";
import { PageTutorialModal, usePageTutorial } from "@/components/PageTutorialModal";
import { PageTutorialButton } from "@/components/PageTutorialButton";

export const Route = createFileRoute("/names")({
  head: () => ({
    meta: [
      { title: "Les noms d'Allah — Islam-Noor" },
      {
        name: "description",
        content: "Les plus beaux noms d'Allah en arabe, translittérés et traduits en français.",
      },
      { property: "og:title", content: "Les noms d'Allah — Islam-Noor" },
      { property: "og:description", content: "Arabe, translittération et traduction française." },
    ],
  }),
  component: NamesPage,
});

function NamesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    isOpen: isTutorialOpen,
    openTutorial: handleOpenTutorial,
    closeTutorial: handleCloseTutorial,
  } = usePageTutorial("names");

  return (
    <div className="space-y-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
      {/* En-tête collant avec flèche retour vers l'accueil */}
      <div className="sticky top-[max(0.5rem,env(safe-area-inset-top))] z-30 glass p-3 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/" });
              }
            }}
            aria-label={t.back || "Retour"}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background/70 text-foreground hover:bg-secondary transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-foreground truncate">{t.names}</h1>
            <p className="text-xs text-muted-foreground truncate">{t.namesSub}</p>
          </div>
        </div>
        <PageTutorialButton onClick={handleOpenTutorial} variant="pill" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {NAMES_OF_ALLAH.map((n, i) => (
          <div key={`${n.translit}-${i}`} className="widget-glass p-3 text-center">
            <span className="widget-badge mx-auto size-6 text-[10px] font-bold">{i + 1}</span>
            <p className="font-[var(--font-arabic)] text-2xl">{n.arabic}</p>
            <p className="text-xs font-bold">{n.translit}</p>
            <p className="text-[10px] opacity-85">{t.namesMeanings?.[i] ?? n.fr}</p>
          </div>
        ))}
      </div>

      {/* Interactive Page Tutorial Modal */}
      <PageTutorialModal
        pageId="names"
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}
