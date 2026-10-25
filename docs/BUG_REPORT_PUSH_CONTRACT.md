# Contrat d'intégration — notification push « le développeur vous a répondu »

## Objectif

Prévenir l'utilisateur d'Islam-Noor **sur son téléphone**, même application fermée,
quand le développeur modifie le statut d'un de ses signalements ou y ajoute une
réponse.

## Ce qui est DÉJÀ implémenté dans ce dépôt

L'implémentation de référence est **`src/lib/bug-tracker-client.ts`** (elle est
utilisée par les cartes produit halal, la page Paramètres et
`initBugTrackerPushService()` dans `src/routes/__root.tsx`). Le module
`bug-report-push.ts` créé lors d'une tâche précédente a été **supprimé** : il
faisait doublon avec l'implémentation existante.

| Brique | Où | État |
|---|---|---|
| Identifiant utilisateur stable et anonyme | `getOrCreateUserToken()` → localStorage `islam_noor_user_token_v1` (`usr_<uuid>`) | ✅ |
| Enregistrement de l'utilisateur côté serveur | `registerOrGetUser()` → `POST /api/users/register-or-get` (en-tête `x-user-token`) | ✅ |
| Enregistrement du jeton push | `registerPushToken()` → `POST /api/push/register` `{ pushToken, platform }` (en-tête `x-user-token`) | ✅ |
| Suppression du jeton | `unregisterPushToken()` → `DELETE /api/push/unregister` | ✅ |
| Anti-doublon de synchronisation du jeton | localStorage `islam_noor_bug_fcm_push_token_synced_v1` | ✅ |
| Réception du push (avant-plan) | `pushNotificationReceived` → `handleBugTrackerPushPayload()` | ✅ |
| Ouverture du signalement au clic | `pushNotificationActionPerformed` → `openBugReportInExternalBrowser(reportId)` | ✅ |
| Repli hors-ligne | `triggerBugNotificationCheck()` (sonde les notifications du backend) | ✅ |
| Canal Android dédié | `bug_tracker_notifications` (importance 5, visible sur l'écran verrouillé) | ✅ |

**Confidentialité** : le destinataire est identifié par le seul `user_token`
aléatoire (`usr_<uuid>`), jamais par une adresse e-mail ni une donnée
personnelle. Le `user_token` est le même identifiant que celui utilisé pour
lister « mes signalements ».

## Ce qui manque encore (configuration externe)

| Élément | Où | État |
|---|---|---|
| **`android/app/google-services.json`** | Projet Firebase (Android) | ❌ **Absent** — aucune clé n'est inventée ici |
| Envoi FCM côté serveur | Dépôt du site de signalement (`islam-noor-bug-tracker.ai.studio`) | ❌ **Hors de ce dépôt** |
| Plugin natif FCM dans l'APK | `capacitor.config.ts` → `includePlugins` | ✅ **Ajouté** (`@capacitor/push-notifications`) |

### Pourquoi la notification n'aboutit pas encore

Sans `google-services.json`, le plugin FCM ne peut pas s'initialiser : il émet
une erreur `registrationError` (journalisée), **aucun jeton n'est produit**, donc
`registerPushToken()` n'est jamais appelé et le serveur n'a rien à cibler.
L'application reste pleinement fonctionnelle (aucune erreur bloquante).

### Étapes restantes

1. **Firebase** : créer/obtenir le projet Android, déposer
   `google-services.json` dans `android/app/`, puis reconstruire l'APK.
   Le plugin est déjà déclaré dans `includePlugins` et l'écoute du jeton est
   déjà en place : l'enregistrement devient automatique.
2. **Serveur du site de signalement** : sur changement de `status` ou ajout de
   `developer_response`, envoyer un message FCM **au seul device** du
   `user_token` concerné (Firebase Admin SDK, clé côté serveur uniquement).

### Payload push attendu

```json
{
  "notification": {
    "title": "Islam-Noor",
    "body": "Le développeur vous a répondu. Consultez vos signalements dans les paramètres."
  },
  "data": {
    "report_id": "<id du signalement>",
    "public_id": "<id public>",
    "type": "developer_reply"
  }
}
```

- `data.report_id` / `data.public_id` permettent d'ouvrir **le bon signalement**
  au clic (`openBugReportInExternalBrowser(reportId)`) ;
- `data.type` vaut `developer_reply`, `status_change` ou `system` ;
- l'envoi doit viser un token précis (jamais un topic) ;
- aucun secret (clé serveur Firebase, clé admin) ne doit figurer dans l'APK.

## Vérifications à faire sur un appareil réel (non faites ici)

- réception du push **application fermée** (et non une notification locale
  créée au moment de l'ouverture) ;
- autorisation `POST_NOTIFICATIONS` (Android 13+) ;
- ouverture du bon signalement au clic ;
- absence de double notification quand le statut change plusieurs fois.

## Limites assumées

- Aucun test de bout en bout n'a pu être réalisé : ni `google-services.json`, ni
  accès au dépôt du site de signalement ne sont disponibles dans cet
  environnement. Le code applicatif est prêt et vérifié par relecture et
  tests ; l'envoi réel reste à valider une fois la configuration Firebase
  fournie.
- Aucune migration Supabase n'a été lancée et aucun service distant n'a été
  modifié : le stockage du jeton et des notifications se fait sur le backend du
  site de signalement, pas dans les tables de ce projet.
