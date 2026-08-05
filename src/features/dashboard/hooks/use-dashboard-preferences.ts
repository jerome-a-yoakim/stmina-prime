import { useState, useEffect } from "react";
import { SK, readLocalPref, writeLocalPref } from "../utils/local-storage-prefs";

export function useDashboardPreferences() {
  const [dark, setDark] = useState<boolean>(() => readLocalPref(SK.darkMode, false));

  useEffect(() => {
    writeLocalPref(SK.darkMode, dark);
  }, [dark]);

  return { dark, setDark };
}
