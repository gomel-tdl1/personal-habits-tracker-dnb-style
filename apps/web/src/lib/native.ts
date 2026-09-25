import { Capacitor } from "@capacitor/core";

/** Running inside the iOS app rather than a browser. */
export const isNative = Capacitor.isNativePlatform();
