const registeredTests = [];

function test(name, fn) {
  registeredTests.push({ name, fn });
}

function assertEqual(actual, expected, label = "valor") {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`);
  }
}

function assertTrue(condition, label = "condição") {
  if (!condition) throw new Error(`${label}: esperado verdadeiro`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAll() {
  const logElement = document.getElementById("log");
  const summaryElement = document.getElementById("summary");
  logElement.textContent = "";
  summaryElement.textContent = "";

  const lines = [];
  let passed = 0;
  let failed = 0;

  const emit = (text, cssClass) => {
    lines.push(text);
    const row = document.createElement("div");
    row.textContent = text;
    if (cssClass) row.className = cssClass;
    logElement.appendChild(row);
  };

  emit(`Iniciando ${registeredTests.length} testes`);

  for (const { name, fn } of registeredTests) {
    const startedAt = performance.now();
    try {
      await fn();
      passed += 1;
      emit(`[PASS] ${name} (${Math.round(performance.now() - startedAt)}ms)`, "pass");
    } catch (error) {
      failed += 1;
      emit(`[FAIL] ${name} -> ${error.message}`, "fail");
    }
  }

  const summary = `Resultado: ${passed} passaram, ${failed} falharam`;
  emit(summary, failed ? "fail" : "pass");
  summaryElement.textContent = summary;

  try {
    await fetch("/__log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, failed }),
    });
  } catch {
    // Sem servidor (ex.: file://): o resultado fica apenas na tela.
  }
}
