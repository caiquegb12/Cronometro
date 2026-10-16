const { getTimeParts, pad2, getPhaseIndex, CENTENARY_DATE, DEFAULT_PHASES_MS, DAY } = window.CountdownLib;

const FRAME_WIDTH = 1200;
const FRAME_HEIGHT = 800;

function loadApp(query = "", width = FRAME_WIDTH, height = FRAME_HEIGHT) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.style.cssText = `position:absolute;left:-9999px;width:${width}px;height:${height}px`;
    frame.onload = () => resolve(frame);
    frame.onerror = () => reject(new Error("falha ao carregar index.html"));
    frame.src = `../index.html${query}`;
    document.body.appendChild(frame);
  });
}

const activeIndex = (doc) =>
  [...doc.querySelectorAll(".screen")].findIndex((screen) => screen.classList.contains("active"));

// Espera até `ms` após o início do ciclo da página carregada no iframe.
async function waitUntilElapsed(frame, ms) {
  const startedAt = frame.contentWindow.eval("cycleStartedAt");
  const wait = startedAt + ms - Date.now();
  if (wait > 0) await sleep(wait);
}

// Espera cada <video> carregar ou falhar (arquivos em videos/ são opcionais).
async function waitForVideos(doc, timeoutMs = 3000) {
  const videos = [...doc.querySelectorAll(".ad-video")];
  const endAt = performance.now() + timeoutMs;
  while (performance.now() < endAt && videos.some((video) => video.readyState < 2 && !video.error)) {
    await sleep(100);
  }
  return videos;
}

// --- Lógica do cronômetro ---

test("getTimeParts: 1000 dias exatos", () => {
  const parts = getTimeParts(1000 * DAY);
  assertEqual(parts.days, 1000, "dias");
  assertEqual(parts.hours + parts.minutes + parts.seconds, 0, "h+m+s");
});

test("getTimeParts: 23h59m59s não vira 1 dia", () => {
  const parts = getTimeParts(86399999);
  assertEqual(parts.days, 0, "dias");
  assertEqual(parts.hours, 23, "horas");
  assertEqual(parts.minutes, 59, "minutos");
  assertEqual(parts.seconds, 59, "segundos");
});

test("getTimeParts: tempo negativo retorna zeros", () => {
  const parts = getTimeParts(-5000);
  assertEqual(parts.days + parts.hours + parts.minutes + parts.seconds, 0, "soma");
});

test("pad2: completa com zero à esquerda", () => {
  assertEqual(pad2(5), "05");
  assertEqual(pad2(999), "999");
});

test("data fixa: centenário em 07/09/2029 à meia-noite", () => {
  assertEqual(CENTENARY_DATE.getFullYear(), 2029, "ano");
  assertEqual(CENTENARY_DATE.getMonth(), 8, "mês (setembro)");
  assertEqual(CENTENARY_DATE.getDate(), 7, "dia");
  assertEqual(CENTENARY_DATE.getHours() + CENTENARY_DATE.getMinutes(), 0, "hora");
});

// --- Ciclo cronômetro -> propagandas ---

test("getPhaseIndex: durações diferentes por tela e volta ao início", () => {
  const phases = [40, 30, 30, 30];
  const at = (ms) => getPhaseIndex(ms, phases);
  assertEqual(at(0), 0, "início");
  assertEqual(at(39), 0, "fim do cronômetro");
  assertEqual(at(40), 1, "1ª propaganda");
  assertEqual(at(69), 1, "fim da 1ª propaganda");
  assertEqual(at(70), 2, "2ª propaganda");
  assertEqual(at(100), 3, "3ª propaganda");
  assertEqual(at(129), 3, "fim da 3ª propaganda");
  assertEqual(at(130), 0, "novo ciclo");
});

test("ciclo padrão: cronômetro 40s + 3 propagandas de 30s = 130s", () => {
  assertEqual(DEFAULT_PHASES_MS[0], 40000, "cronômetro");
  assertEqual(DEFAULT_PHASES_MS.slice(1).join(","), "30000,30000,30000", "propagandas");
  assertEqual(DEFAULT_PHASES_MS.reduce((sum, ms) => sum + ms, 0), 130000, "ciclo");
});

// --- Página real (index.html em iframe) ---

test("página: 1 tela de cronômetro + 3 propagandas, iniciando no cronômetro", async () => {
  const frame = await loadApp();
  const doc = frame.contentDocument;
  assertEqual(doc.querySelectorAll(".countdown-screen").length, 1, "telas de cronômetro");
  assertEqual(doc.querySelectorAll(".ad-screen").length, 3, "propagandas");
  assertEqual(activeIndex(doc), 0, "tela ativa");
  assertEqual(doc.body.dataset.mode, "countdown", "modo");
  frame.remove();
});

test("página: propagandas ocupam a tela toda", async () => {
  const frame = await loadApp();
  const doc = frame.contentDocument;
  for (const ad of doc.querySelectorAll(".ad-screen")) {
    const rect = ad.getBoundingClientRect();
    assertEqual(Math.round(rect.width), FRAME_WIDTH, "largura");
    assertEqual(Math.round(rect.height), FRAME_HEIGHT, "altura");
  }
  frame.remove();
});

test("página: mini cronômetro fica no canto superior direito", async () => {
  const frame = await loadApp();
  const rect = frame.contentDocument.querySelector(".mini-countdown").getBoundingClientRect();
  assertTrue(rect.top < 60, `topo (${Math.round(rect.top)}px) < 60`);
  assertTrue(FRAME_WIDTH - rect.right < 60, `direita (${Math.round(FRAME_WIDTH - rect.right)}px) < 60`);
  assertTrue(rect.height < 80, `altura (${Math.round(rect.height)}px) < 80`);
  frame.remove();
});

test("página: mini cronômetro escondido durante o cronômetro grande", async () => {
  const frame = await loadApp();
  const mini = frame.contentDocument.querySelector(".mini-countdown");
  assertEqual(frame.contentWindow.getComputedStyle(mini).opacity, "0", "opacidade");
  frame.remove();
});

test("página: ciclo avança 0 -> 1 -> 2 -> 3 -> 0 em ordem, com modo correto", async () => {
  const frame = await loadApp("?phaseMs=300");
  const doc = frame.contentDocument;
  const seen = [];
  const modes = {};
  const endAt = performance.now() + 2200;

  // O ciclo começa antes do evento load; por isso não exige começar na tela 0, só a ordem.
  while (performance.now() < endAt) {
    const index = activeIndex(doc);
    if (seen[seen.length - 1] !== index) seen.push(index);
    modes[index] = doc.body.dataset.mode;
    await sleep(30);
  }

  assertTrue(seen.length >= 6, `viu ao menos 6 trocas (${seen.join(",")})`);
  for (let i = 1; i < seen.length; i += 1) {
    assertEqual(seen[i], (seen[i - 1] + 1) % 4, `ordem das telas (${seen.join(",")})`);
  }
  assertEqual(modes[0], "countdown", "modo da tela 0");
  assertTrue([1, 2, 3].every((index) => modes[index] === "ad"), "modo 'ad' nas propagandas");
  frame.remove();
});

test("propagandas: cada uma é um anúncio fictício com vídeo, animação e barra de progresso", async () => {
  const frame = await loadApp("?phaseMs=300");
  const doc = frame.contentDocument;
  const ads = [...doc.querySelectorAll(".ad-screen")];
  assertEqual(ads.length, 3, "propagandas");

  const names = ads.map((ad) => ad.querySelector("h2").textContent);
  assertEqual(new Set(names).size, 3, "anunciantes diferentes");

  for (const ad of ads) {
    const video = ad.querySelector("video.ad-video");
    assertTrue(video && video.muted && video.loop && video.playsInline, "vídeo mudo, em loop e inline");
    assertTrue(/videos\/propaganda-\d\.mp4$/.test(video.getAttribute("src")), "slot de vídeo");
    assertTrue(ad.querySelectorAll(".ad-fx span").length >= 3, "animação de fundo");
    assertTrue(ad.querySelector(".ad-progress"), "barra de progresso");
    assertTrue(ad.querySelector(".promo-tag").textContent.includes("fictício"), "selo fictício");
  }
  for (const ad of ads) {
    assertEqual(ad.style.getPropertyValue("--phase-ms"), "300ms", "--phase-ms da propaganda");
  }
  frame.remove();
});

test("página: durações padrão aplicadas (cronômetro 40s, propagandas 30s)", async () => {
  const frame = await loadApp();
  const screens = [...frame.contentDocument.querySelectorAll(".screen")];
  const durations = screens.map((screen) => screen.style.getPropertyValue("--phase-ms"));
  assertEqual(durations.join(","), "40000ms,30000ms,30000ms,30000ms", "durações");
  frame.remove();
});

test("propagandas: vídeo ausente é escondido; vídeo carregado vira a propaganda inteira", async () => {
  const frame = await loadApp();
  for (const video of await waitForVideos(frame.contentDocument)) {
    const ad = video.closest(".ad-screen");
    assertEqual(video.classList.contains("failed"), video.error !== null, "vídeo ausente escondido");
    assertEqual(ad.classList.contains("has-video"), video.readyState >= 2, "vídeo carregado em destaque");
  }
  frame.remove();
});

test("vídeo: toca quando a propaganda aparece e reinicia do começo a cada ciclo", async () => {
  const frame = await loadApp("?phaseMs=1500");
  const doc = frame.contentDocument;
  await sleep(250);
  const screens = [...doc.querySelectorAll(".screen")];
  const k = screens.findIndex((screen) => screen.classList.contains("has-video"));
  if (k === -1) {
    frame.remove();
    return; // nenhum vídeo em videos/: nada a testar
  }
  const video = screens[k].querySelector(".ad-video");

  await waitUntilElapsed(frame, k * 1500 + 700);
  assertTrue(video.currentTime > 0.2, `tocando na 1ª exibição (${video.currentTime.toFixed(2)}s)`);

  await waitUntilElapsed(frame, k * 1500 + 6000 + 300);
  assertTrue(video.currentTime < 0.8, `reiniciou na 2ª exibição (${video.currentTime.toFixed(2)}s)`);
  frame.remove();
});

test("servidor: aceita Range em vídeos (necessário para reiniciar o vídeo)", async () => {
  const response = await fetch("../videos/propaganda-1.mp4", { headers: { Range: "bytes=0-99" } });
  if (response.status === 404) return; // sem vídeo de teste
  assertEqual(response.status, 206, "status");
  assertEqual((await response.arrayBuffer()).byteLength, 100, "bytes recebidos");
  assertTrue(/^bytes 0-99\/\d+$/.test(response.headers.get("Content-Range")), "Content-Range");
});

test("propagandas: texto do anúncio aparece quando a tela fica ativa", async () => {
  const frame = await loadApp("?phaseMs=2000");
  const doc = frame.contentDocument;
  await sleep(300);
  const screens = [...doc.querySelectorAll(".screen")];
  const k = screens.findIndex((screen, index) => index > 0 && !screen.classList.contains("has-video"));
  if (k === -1) {
    frame.remove();
    return; // todas as propagandas têm vídeo: sem texto para testar
  }
  const title = screens[k].querySelector("h2");
  const opacity = () => Number(frame.contentWindow.getComputedStyle(title).opacity);

  await waitUntilElapsed(frame, k * 2000 + 150);
  assertEqual(activeIndex(doc), k, "tela ativa");
  assertTrue(opacity() < 1, `título ainda entrando (${opacity()})`);
  await waitUntilElapsed(frame, k * 2000 + 1500);
  assertEqual(activeIndex(doc), k, "tela ainda ativa");
  assertEqual(opacity(), 1, "opacidade do título");
  frame.remove();
});

const readRemainingSeconds = (doc) => {
  const read = (unit) => Number(doc.querySelector(`.countdown-screen [data-unit="${unit}"]`).textContent);
  return read("days") * 86400 + read("hours") * 3600 + read("minutes") * 60 + read("seconds");
};

test("página: cronômetro mostra o tempo real até 07/09/2029 (grande e mini iguais)", async () => {
  const frame = await loadApp();
  const doc = frame.contentDocument;
  const days = doc.querySelectorAll('[data-unit="days"]');
  assertEqual(days.length, 2, "elementos de dias");
  assertEqual(days[0].textContent, days[1].textContent, "grande == mini");

  const expected = Math.floor((CENTENARY_DATE.getTime() - Date.now()) / 1000);
  const shown = readRemainingSeconds(doc);
  assertTrue(Math.abs(shown - expected) <= 2, `restante (${shown}s) ≈ esperado (${expected}s)`);
  frame.remove();
});

test("página: recarregar não reinicia a contagem", async () => {
  const first = await loadApp();
  const before = readRemainingSeconds(first.contentDocument);
  first.remove();

  await sleep(2100);

  const second = await loadApp();
  const after = readRemainingSeconds(second.contentDocument);
  second.remove();

  const elapsed = before - after;
  assertTrue(elapsed >= 1 && elapsed <= 5, `contagem seguiu (diferença ${elapsed}s, não voltou ao início)`);
});

test("página: segundos avançam após ~1,2s", async () => {
  const frame = await loadApp();
  const seconds = frame.contentDocument.querySelector('.countdown-screen [data-unit="seconds"]');
  const before = seconds.textContent;
  await sleep(1200);
  assertTrue(seconds.textContent !== before, `segundos mudaram (${before} -> ${seconds.textContent})`);
  frame.remove();
});

test("página: data do centenário exibida (07/09/2029)", async () => {
  const frame = await loadApp();
  const doc = frame.contentDocument;
  assertEqual(doc.getElementById("endDate").textContent, "07/09/2029", "data exibida");
  frame.remove();
});

// --- Identidade visual do Mercado Central ---

test("visual: paleta verde, branco e vermelho definida", async () => {
  const frame = await loadApp();
  const styles = frame.contentWindow.getComputedStyle(frame.contentDocument.documentElement);
  const color = (name) => styles.getPropertyValue(name).trim().toLowerCase();
  assertEqual(color("--white"), "#ffffff", "branco");
  assertTrue(/^#[0-9a-f]{6}$/.test(color("--red")) && color("--red") !== color("--green"), "vermelho");
  assertTrue(/^#[0-9a-f]{6}$/.test(color("--green")), "verde");
  frame.remove();
});

test("visual: logo do mercado carrega na tela do cronômetro e no selo das propagandas", async () => {
  const frame = await loadApp();
  const doc = frame.contentDocument;
  const logos = [...doc.querySelectorAll(".logo-main img, .logo-badge img")];
  assertEqual(logos.length, 2, "imagens da logo");
  for (const logo of logos) {
    assertTrue(logo.complete && logo.naturalWidth > 0, `logo carregada (${logo.getAttribute("src")})`);
    assertTrue(/Arquivos\/logo_mercado-central/.test(logo.getAttribute("src")), "arquivo da logo");
  }
  frame.remove();
});

// --- TV grande: escala e nada cortado ---

const TV_SIZES = [[1280, 720], [1920, 1080], [3840, 2160], [2560, 1080], [1024, 768]];

const fitsInside = (rect, width, height) =>
  rect.left >= -1 && rect.top >= -1 && rect.right <= width + 1 && rect.bottom <= height + 1;

const describeRect = (rect) =>
  `[${Math.round(rect.left)},${Math.round(rect.top)} -> ${Math.round(rect.right)},${Math.round(rect.bottom)}]`;

test("TV: a interface escala com a tela (1rem = 16px em 1080p e 32px em 4K)", async () => {
  const rootSizes = {};
  for (const [width, height] of [[1920, 1080], [3840, 2160]]) {
    const frame = await loadApp("", width, height);
    const root = frame.contentDocument.documentElement;
    rootSizes[width] = parseFloat(frame.contentWindow.getComputedStyle(root).fontSize);
    frame.remove();
  }
  assertEqual(rootSizes[1920], 16, "1rem em 1080p");
  assertEqual(rootSizes[3840], 32, "1rem em 4K");
});

test("TV: cronômetro cabe inteiro na tela em várias resoluções (nada cortado)", async () => {
  for (const [width, height] of TV_SIZES) {
    const frame = await loadApp("", width, height);
    const doc = frame.contentDocument;
    for (const selector of [".logo-main", ".eyebrow", "h1", ".timer", ".date-range", ".tricolor"]) {
      const rect = doc.querySelector(`.countdown-screen ${selector}`).getBoundingClientRect();
      assertTrue(fitsInside(rect, width, height), `${selector} em ${width}x${height} ${describeRect(rect)}`);
    }
    frame.remove();
  }
});

test("TV: textos das propagandas, logo e mini cronômetro cabem na tela em várias resoluções", async () => {
  for (const [width, height] of TV_SIZES) {
    const frame = await loadApp("", width, height);
    const doc = frame.contentDocument;
    const selectors = [".ad-content > *", ".logo-badge", ".mini-countdown"];
    for (const rect of selectors.flatMap((selector) => [...doc.querySelectorAll(selector)].map((el) => el.getBoundingClientRect()))) {
      assertTrue(fitsInside(rect, width, height), `elemento em ${width}x${height} ${describeRect(rect)}`);
    }
    for (const screen of doc.querySelectorAll(".screen")) {
      const rect = screen.getBoundingClientRect();
      assertTrue(Math.round(rect.width) === width && Math.round(rect.height) === height, `tela cheia em ${width}x${height}`);
    }
    frame.remove();
  }
});

test("TV: vídeo ocupa a tela toda sem cortar (object-fit: contain)", async () => {
  for (const [width, height] of [[1920, 1080], [3840, 2160]]) {
    const frame = await loadApp("", width, height);
    for (const video of await waitForVideos(frame.contentDocument)) {
      assertEqual(frame.contentWindow.getComputedStyle(video).objectFit, "contain", "object-fit");
      if (video.readyState < 2) continue; // sem arquivo de vídeo nesta propaganda
      const rect = video.getBoundingClientRect();
      assertTrue(
        Math.round(rect.width) === width && Math.round(rect.height) === height,
        `vídeo em ${width}x${height} ${describeRect(rect)}`
      );
    }
    frame.remove();
  }
});

test("visual: sem toldo listrado no topo da tela", async () => {
  const frame = await loadApp();
  const doc = frame.contentDocument;
  assertEqual(doc.querySelector(".awning"), null, "elemento do toldo");
  const topElement = doc.elementFromPoint(FRAME_WIDTH / 2, 4);
  assertTrue(topElement && topElement.closest(".countdown-screen"), "topo da tela pertence ao cronômetro, sem faixa por cima");
  frame.remove();
});

test("visual: faixa tricolor no rodapé do cronômetro e barra tricolor nas propagandas", async () => {
  const frame = await loadApp();
  const doc = frame.contentDocument;
  assertTrue(doc.querySelector(".countdown-screen .tricolor"), "faixa tricolor");
  assertEqual(doc.querySelectorAll(".ad-progress").length, 3, "barras de progresso");
  assertTrue(/linear-gradient/.test(frame.contentWindow.getComputedStyle(doc.querySelector(".ad-progress")).backgroundImage), "gradiente");
  frame.remove();
});

test("visual: logo pequena só aparece durante as propagandas", async () => {
  const frame = await loadApp("?phaseMs=4000");
  const doc = frame.contentDocument;
  const badge = doc.querySelector(".logo-badge");
  const opacity = () => Number(frame.contentWindow.getComputedStyle(badge).opacity);
  assertEqual(opacity(), 0, "opacidade no cronômetro");
  await waitUntilElapsed(frame, 4000 + 1500);
  assertEqual(doc.body.dataset.mode, "ad", "modo");
  assertEqual(opacity(), 1, "opacidade na propaganda");
  frame.remove();
});
