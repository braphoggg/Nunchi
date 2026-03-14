"use client";

import { useCallback, useState } from "react";
import type { useSoundEngine } from "./useSoundEngine";

/**
 * Manages open/close/toggle state for overlay panels (stats, help, settings).
 * Cross-panel coordination: opening one panel closes the others.
 */
export function useOverlayState(
  sound: ReturnType<typeof useSoundEngine>,
  closePanel: () => void,
) {
  // Stats panel
  const [statsOpen, setStatsOpen] = useState(false);
  const toggleStats = useCallback(() => {
    setStatsOpen((o) => {
      sound.playPanelTransition(!o ? "open" : "close");
      if (!o) closePanel();
      return !o;
    });
  }, [closePanel, sound]);
  const closeStats = useCallback(() => setStatsOpen(false), []);

  // Help modal
  const [helpOpen, setHelpOpen] = useState(false);
  const toggleHelp = useCallback(() => {
    setHelpOpen((o) => {
      sound.playPanelTransition(!o ? "open" : "close");
      if (!o) {
        closePanel();
        closeStats();
      }
      return !o;
    });
  }, [closePanel, closeStats, sound]);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);
  const toggleSettings = useCallback(() => {
    setSettingsOpen((o) => {
      sound.playPanelTransition(!o ? "open" : "close");
      if (!o) { closePanel(); closeStats(); closeHelp(); }
      return !o;
    });
  }, [closePanel, closeStats, closeHelp, sound]);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  return {
    statsOpen,
    toggleStats,
    closeStats,
    helpOpen,
    toggleHelp,
    closeHelp,
    settingsOpen,
    toggleSettings,
    closeSettings,
  };
}
