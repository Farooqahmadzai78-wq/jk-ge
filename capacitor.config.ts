import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.islamnoor.app',
  appName: 'Islam Noor',
  webDir: '.output/public',
  includePlugins: [
    '@capacitor/local-notifications',
    // Push (FCM) utilise par le client de signalement (src/lib/bug-tracker-client.ts)
    // pour prevenir l'utilisateur d'une reponse du developpeur. Le plugin est
    // embarque ; l'enregistrement du jeton reste inactif tant que
    // android/app/google-services.json n'est pas fourni (aucune cle n'est
    // inventee ici).
    '@capacitor/push-notifications',
    // Publicites (AdMob) et abonnement Premium (RevenueCat) desactives pour
    // la version de lancement : les SDK ne sont pas embarques dans l'APK.
    // Les dependances restent installees (node_modules) et le code web
    // (src/lib/ad-*.ts, src/lib/billing.ts) est conserve, sous le controle
    // des drapeaux ADS_ENABLED / PREMIUM_ENABLED (src/lib/premium.tsx).
  ],
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#0F766E',
    },
  },
};

export default config;

