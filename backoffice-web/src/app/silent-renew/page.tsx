"use client";

import { useEffect } from "react";
import {
  getKeycloakManager,
  isKeycloakBackofficeEnabled,
} from "../../lib/keycloak";

export default function SilentRenewPage() {
  useEffect(() => {
    if (isKeycloakBackofficeEnabled()) {
      void getKeycloakManager().signinSilentCallback();
    }
  }, []);

  return (
    <main aria-live="polite" className="sr-only">
      Renouvellement de session sécurisé.
    </main>
  );
}
