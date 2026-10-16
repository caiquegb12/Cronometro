(function (root) {
  const DAY = 24 * 60 * 60 * 1000;
  // Centenário do Mercado Central (hora local do aparelho, meia-noite).
  const CENTENARY_DATE = new Date(2029, 8, 7, 0, 0, 0);

  // Cronômetro e cada uma das 3 propagandas duram 20s = ciclo de 80s.
  const DEFAULT_PHASES_MS = [20000, 20000, 20000, 20000];

  function getTimeParts(totalMilliseconds) {
    const totalSeconds = Math.max(0, Math.floor(totalMilliseconds / 1000));
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function getPhaseIndex(elapsedMs, phasesMs) {
    const cycleMs = phasesMs.reduce((sum, duration) => sum + duration, 0);
    let remaining = Math.max(0, elapsedMs) % cycleMs;

    for (let index = 0; index < phasesMs.length; index += 1) {
      if (remaining < phasesMs[index]) return index;
      remaining -= phasesMs[index];
    }
    return 0;
  }

  root.CountdownLib = {
    DAY,
    CENTENARY_DATE,
    DEFAULT_PHASES_MS,
    getTimeParts,
    pad2,
    getPhaseIndex,
  };
})(typeof window !== "undefined" ? window : globalThis);
