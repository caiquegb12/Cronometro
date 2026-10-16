const { getTimeParts, pad2, getPhaseIndex, CENTENARY_DATE, DEFAULT_PHASES_MS } =
  window.CountdownLib;

const targetDate = CENTENARY_DATE;

// ?phaseMs=300 faz todas as telas durarem 300ms (usado pelos testes).
const phaseOverrideMs = Number(new URLSearchParams(location.search).get("phaseMs")) || 0;

const formatDate = (date) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

document.getElementById("endDate").textContent = formatDate(targetDate);

const unitElements = {
  days: document.querySelectorAll('[data-unit="days"]'),
  hours: document.querySelectorAll('[data-unit="hours"]'),
  minutes: document.querySelectorAll('[data-unit="minutes"]'),
  seconds: document.querySelectorAll('[data-unit="seconds"]'),
};

function updateCountdown() {
  const parts = getTimeParts(targetDate.getTime() - Date.now());

  for (const [unit, elements] of Object.entries(unitElements)) {
    elements.forEach((element) => {
      element.textContent = pad2(parts[unit]);
    });
  }
}

setInterval(updateCountdown, 1000);
updateCountdown();

// Ciclo: tela 0 = cronômetro inteiro, demais = propagandas em tela cheia.
const screens = [...document.querySelectorAll(".screen")];
const phasesMs = phaseOverrideMs
  ? screens.map(() => phaseOverrideMs)
  : DEFAULT_PHASES_MS;
const cycleStartedAt = Date.now();
let currentScreen = -1;

// Duração de cada tela para a barra de progresso da propaganda.
screens.forEach((screen, index) => {
  screen.style.setProperty("--phase-ms", `${phasesMs[index]}ms`);
});

// Sem arquivo de vídeo, esconde o <video> e deixa a animação de fundo.
// Com vídeo carregado, a propaganda mostra só o vídeo (classe has-video).
document.querySelectorAll(".ad-video").forEach((video) => {
  const screen = video.closest(".ad-screen");
  const markFailed = () => video.classList.add("failed");
  const markLoaded = () => screen.classList.add("has-video");
  video.addEventListener("error", markFailed);
  video.addEventListener("loadeddata", markLoaded);
  if (video.error) markFailed();
  else if (video.readyState >= 2) markLoaded();
});

function showScreen(index) {
  screens.forEach((screen, screenIndex) => {
    const isActive = screenIndex === index;
    screen.classList.toggle("active", isActive);
    screen.setAttribute("aria-hidden", String(!isActive));

    const video = screen.querySelector(".ad-video");
    if (!video || video.classList.contains("failed")) return;
    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else video.pause();
  });
  document.body.dataset.mode = index === 0 ? "countdown" : "ad";
}

function tickCycle() {
  const index = getPhaseIndex(Date.now() - cycleStartedAt, phasesMs);
  if (index !== currentScreen) {
    currentScreen = index;
    showScreen(index);
  }
}

setInterval(tickCycle, 100);
tickCycle();

// Duplo clique (ou F11) alterna tela cheia, para a TV mostrar sem a barra do navegador.
document.addEventListener("dblclick", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
});
