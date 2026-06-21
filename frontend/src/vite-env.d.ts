/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for OSRM routing. Empty/unset = the public OSRM demo. Set to
   *  "/osrm" to use a self-hosted OSRM proxied by nginx. */
  readonly VITE_OSRM_URL?: string;
}
