import { UserManager, WebStorageStateStore } from "oidc-client-ts";

const enabled = process.env.NEXT_PUBLIC_KEYCLOAK_BACKOFFICE_ENABLED === "true";
let manager: UserManager | undefined;

export const isKeycloakBackofficeEnabled = (): boolean => enabled;

export const isLegacyBackofficeAuthAllowed = (): boolean =>
  !enabled && process.env.NODE_ENV !== "production";

export const getKeycloakManager = (): UserManager => {
  if (!enabled)
    throw new Error("Keycloak backoffice authentication is disabled");
  if (manager) return manager;
  if (typeof window === "undefined")
    throw new Error(
      "Keycloak browser manager is unavailable during server rendering",
    );

  const authority = process.env.NEXT_PUBLIC_KEYCLOAK_AUTHORITY?.replace(
    /\/$/,
    "",
  );
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  if (!authority || !clientId)
    throw new Error(
      "NEXT_PUBLIC_KEYCLOAK_AUTHORITY and NEXT_PUBLIC_KEYCLOAK_CLIENT_ID are required",
    );

  manager = new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: `${window.location.origin}/`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    silent_redirect_uri: `${window.location.origin}/silent-renew`,
    response_type: "code",
    scope: "openid profile email roles",
    automaticSilentRenew: true,
    monitorSession: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });
  return manager;
};
