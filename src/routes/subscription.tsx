import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Crown, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium, PREMIUM_ENABLED } from "@/lib/premium";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  canInitializeBilling,
} from "@/lib/billing";
import type {
  PurchasesOffering,
  PurchasesPackage,
} from "@revenuecat/purchases-capacitor";

import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/subscription")({
  head: () => ({
    meta: [{ title: "Islam-Noor" }],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { t } = useI18n();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Abonnement desactive pour la version de lancement : l'ecran n'est pas
  // accessible (aucune offre n'est proposee), on renvoie vers les reglages
  // plutot que d'afficher un message d'indisponibilite.
  useEffect(() => {
    if (!PREMIUM_ENABLED) {
      navigate({ to: "/settings" });
    }
  }, [navigate]);

  useEffect(() => {
    if (!PREMIUM_ENABLED) return;
    let alive = true;
    (async () => {
      const offerings = await getOfferings();
      if (!alive) return;
      setOffering(offerings?.current ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handlePurchase(pkg: PurchasesPackage) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const ok = await purchasePackage(pkg);
    setMessage(
      ok
        ? t.purchaseSuccess || "Achat effectué. Merci de votre soutien !"
        : t.purchaseFailed || "L'achat n'a pas été finalisé.",
    );
    setBusy(false);
  }

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const ok = await restorePurchases();
    setMessage(
      ok
        ? t.purchasesRestored || "Vos achats ont été restaurés."
        : t.noPurchasesToRestore || "Aucun achat à restaurer.",
    );
    setBusy(false);
  }

  const packages = offering?.availablePackages ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 space-y-6">
      {/* Top Navigation */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/60 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-3 py-1.5 rounded-xl border border-border/60"
          >
            <ArrowLeft className="size-4 text-amber-500" />
            <span>{t.nav_settings || "Paramètres"}</span>
          </Link>
          <div className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t.subscriptionTitle || "Abonnement"}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Titre + avantage */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-card to-emerald-500/10 border border-amber-500/30 p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 grid place-items-center">
              <Crown className="size-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-black">{t.premiumSubscription || "Abonnement premium"}</h1>
              <p className="text-xs text-muted-foreground">{t.supportIslamNoor || "Soutenez Islam-Noor"}</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            <li className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
              {t.adFree || "Sans publicité"}
            </li>
          </ul>

          {isPremium && (
            <p className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {t.subscribedThankYou || "Vous êtes abonné. Merci !"}
            </p>
          )}
        </div>

        {/* Offres */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-black">{t.choosePlan || "Choisissez une formule"}</h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t.loadingPlans || "Chargement des offres…"}</p>
          ) : packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.noPlansAvailable || "Les offres ne sont pas disponibles pour le moment."}
            </p>
          ) : (
            <div className="space-y-2">
              {packages.map((pkg) => (
                <button
                  key={`${pkg.offeringIdentifier}-${pkg.identifier}`}
                  type="button"
                  disabled={busy}
                  onClick={() => handlePurchase(pkg)}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-background hover:bg-muted/60 transition active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="text-sm font-bold text-left">
                    {pkg.identifier}
                  </span>
                  {/* Prix fourni par le magasin (jamais codé en dur) */}
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                    {pkg.product.priceString}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Restauration */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy || !canInitializeBilling()}
            onClick={handleRestore}
          >
            <RefreshCw className="size-4 mr-2" />
            {t.restorePurchasesBtn || "Restaurer mes achats"}
          </Button>

          {message && (
            <p className="text-xs text-muted-foreground text-center">{message}</p>
          )}
        </div>

        <Link
          to="/settings"
          className="flex items-center gap-3 p-4 text-sm font-bold rounded-2xl border border-border bg-white dark:bg-slate-900 transition active:scale-[0.99]"
        >
          <ChevronRight className="size-4 text-muted-foreground rotate-180" />
          <span className="flex-1">{t.backToSettings || "Retour aux paramètres"}</span>
        </Link>
      </div>
    </div>
  );
}
