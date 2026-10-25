import { useState } from "react";
import {
  Check,
  Copy,
  Globe,
  QrCode,
  Share2,
  Smartphone,
  Sparkles,
  X,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/app-toast";
import { useI18n } from "@/lib/i18n";

// Public URL accessible on all devices (mobile, tablet, desktop) without AI Studio login
export const PUBLIC_APP_URL =
  "https://ais-pre-ttc24gczzpgmlyzzysvhkp-753545513838.europe-west2.run.app";

export function ShareAppModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl =
    typeof window !== "undefined" && window.location.href.includes("ais-pre-")
      ? window.location.origin
      : PUBLIC_APP_URL;

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = currentUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
        } finally {
          if (textArea.parentNode) {
            textArea.parentNode.removeChild(textArea);
          }
        }
      }
      setCopied(true);
      appToast.success("Lien public copié dans le presse-papier !");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      appToast.error("Impossible de copier le lien automatiquement");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Islam-Noor — Application Islamique Complète",
          text: "Découvrez Islam-Noor : Prières précises, Coran audio, Qibla, Invocations et Scanner Halal.",
          url: currentUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      void handleCopyLink();
    }
  };

  // QR code image URL generated via quick public QR API for instant camera scan
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    currentUrl
  )}&margin=10`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t.shareModalTitle || "Ouvrir sur Téléphone & Partager"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t.shareModalSub || "Accès public sans compte ni connexion requise"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition"
            aria-label={t.close || "Fermer"}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Explanation Alert for Dev vs Public Link */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
              <Globe className="size-4 shrink-0" />
              <span>{t.shareWhyPublicTitle || "Pourquoi utiliser ce lien public ?"}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t.shareDevNotice || "Le lien de développement est réservé à l'éditeur. Pour ouvrir l'application sur n'importe quel téléphone, utilisez le lien public partagé ci-dessous."}
            </p>
          </div>

          {/* QR Code section */}
          <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-2.5 bg-white rounded-2xl shadow-md border border-slate-200">
              <img
                src={qrApiUrl}
                alt={t.scanWithPhoneCamera || "Scanner pour ouvrir sur mobile"}
                className="size-44 object-contain rounded-lg"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                <QrCode className="size-3.5 text-amber-500" />
                {t.scanWithPhoneCamera || "Scannez avec l'appareil photo de votre téléphone"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t.worksOnIosAndAndroid || "Fonctionne sur iPhone (iOS) et Android"}
              </p>
            </div>
          </div>

          {/* Direct URL Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>{t.directPublicLink || "Lien public direct :"}</span>
              <span className="text-[10px] text-emerald-500 font-bold">{t.hundredPercentPublic || "100% Public"}</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs font-mono text-muted-foreground truncate select-all">
                {currentUrl}
              </div>
              <Button
                size="sm"
                onClick={handleCopyLink}
                className="gap-1.5 rounded-xl font-bold text-xs shrink-0"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copied ? (t.copied || "Copié !") : (t.copy || "Copier")}</span>
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              onClick={handleNativeShare}
              className="w-full gap-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
            >
              <Share2 className="size-4" />
              <span>{t.shareLink || "Partager le lien"}</span>
            </Button>

            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold border border-border bg-background hover:bg-muted py-2.5 px-4 text-foreground transition"
            >
              <ExternalLink className="size-3.5" />
              <span>{t.openInNewTab || "Ouvrir dans un nouvel onglet"}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
