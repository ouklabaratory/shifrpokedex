"use strict";

const STORAGE_KEYS = {
  config: "pokedex.config.override",
  missions: "pokedex.missions.override",
  project: "pokedex.project.override"
};

let config = null;
let missionData = null;
let flowData = null;
let achievementsData = null;
let projectIndex = null;
let fixedCodes = [];
let autoSaveTimer = null;
let isRendering = false;

const fields = {
  deviceName: document.querySelector("#deviceName"),
  professorName: document.querySelector("#professorName"),
  effectsVolume: document.querySelector("#effectsVolume"),
  slideIntervalMs: document.querySelector("#slideIntervalMs"),
  enableAmbientSound: document.querySelector("#enableAmbientSound"),
  enableVibration: document.querySelector("#enableVibration"),
  finalTitle: document.querySelector("#finalTitle"),
  masterTitle: document.querySelector("#masterTitle"),
  sealText: document.querySelector("#sealText"),
  partyMode: document.querySelector("#partyMode"),
  enableDebugPanel: document.querySelector("#enableDebugPanel"),
  defaultTeamEditor: document.querySelector("#defaultTeamEditor"),
  missionsEditor: document.querySelector("#missionsEditor"),
  scenarioEditor: document.querySelector("#scenarioEditor"),
  importProjectFile: document.querySelector("#importProjectFile"),
  adminStatus: document.querySelector("#adminStatus")
};

document.querySelector("#addMission").addEventListener("click", addMission);
document.querySelector("#addFlowStep").addEventListener("click", addFlowStep);
document.querySelector("#addDefaultMember").addEventListener("click", addDefaultMember);
document.querySelector("#saveLocal").addEventListener("click", saveLocal);
document.querySelector("#saveProjectFiles").addEventListener("click", saveProjectFiles);
document.querySelector("#exportProject").addEventListener("click", () => downloadJson("pokedex-project.json", collectProject()));
document.querySelector("#exportConfig").addEventListener("click", () => downloadJson("config.json", collectConfig()));
document.querySelector("#exportMissions").addEventListener("click", () => downloadJson("missions.json", collectMissions()));
document.querySelector("#resetLocal").addEventListener("click", resetLocal);
fields.importProjectFile.addEventListener("change", importProject);
document.addEventListener("input", scheduleAutoSave);
document.addEventListener("change", scheduleAutoSave);

init();

let draggedScenarioIndex = null;

async function init() {
  const [baseConfig, baseMissions, baseFlow, baseAchievements, baseProject, baseCodes] = await Promise.all([
    loadJson("config.json"),
    loadJson("missions.json"),
    loadJson("flow.json"),
    loadJson("achievements.json"),
    loadJson("content/project.json").catch(() => ({ schemaVersion: 1, files: {} })),
    loadJson("content/codes.json").catch(() => ({ mainCipher: { missionCodes: [] } }))
  ]);
  fixedCodes = baseCodes.mainCipher?.missionCodes || [];
  const lockedBook = Boolean(baseCodes.mainCipher?.locked);
  const projectOverride = readOverride(STORAGE_KEYS.project);
  projectIndex = projectOverride?.index || baseProject;
  config = deepMerge(baseConfig, projectOverride?.config || readOverride(STORAGE_KEYS.config));
  missionData = applyAuthoritativeCodes(lockedBook ? baseMissions : (projectOverride?.missions || readOverride(STORAGE_KEYS.missions) || baseMissions));
  flowData = lockedBook ? baseFlow : (projectOverride?.flow || baseFlow);
  achievementsData = lockedBook ? baseAchievements : (projectOverride?.achievements || baseAchievements);
  renderConfig();
  normalizeDefaultTeam();
  renderDefaultTeam();
  renderMissions();
  renderScenario();
}

async function loadJson(source) {
  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) throw new Error(`${source} ${response.status}`);
  return response.json();
}

function readOverride(key) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return base;
  if (Array.isArray(base) || Array.isArray(override)) return override;
  const result = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    const baseValue = result[key];
    result[key] = baseValue && typeof baseValue === "object" && !Array.isArray(baseValue)
      ? deepMerge(baseValue, value)
      : value;
  });
  return result;
}

function renderConfig() {
  isRendering = true;
  fields.deviceName.value = config.app.deviceName;
  fields.professorName.value = config.app.professorName;
  fields.effectsVolume.value = config.settings.effectsVolume;
  fields.slideIntervalMs.value = config.settings.slideIntervalMs;
  fields.enableAmbientSound.value = String(config.settings.enableAmbientSound);
  fields.enableVibration.value = String(config.settings.enableVibration);
  fields.partyMode.value = String(config.settings.partyMode);
  fields.enableDebugPanel.value = String(config.settings.enableDebugPanel);
  fields.finalTitle.value = config.final.title;
  fields.masterTitle.value = config.final.masterTitle;
  fields.sealText.value = config.final.sealText;
  isRendering = false;
}

function normalizeDefaultTeam() {
  config.defaultTeam = (config.defaultTeam || []).map((member) => (
    typeof member === "string" ? { name: member, active: true } : { name: member.name || "", active: member.active !== false }
  ));
}

function renderDefaultTeam() {
  isRendering = true;
  fields.defaultTeamEditor.innerHTML = "";
  config.defaultTeam.forEach((member, index) => {
    const row = document.createElement("div");
    row.className = "team-row";
    row.innerHTML = `
      <label class="team-check"><input type="checkbox" data-member-active ${member.active ? "checked" : ""}> Участвует</label>
      <input data-member-name value="${escapeHtml(member.name)}">
      <button class="secondary" data-member-delete>Удалить</button>
    `;
    row.querySelector("[data-member-active]").addEventListener("change", (event) => {
      member.active = event.target.checked;
    });
    row.querySelector("[data-member-name]").addEventListener("input", (event) => {
      member.name = event.target.value;
    });
    row.querySelector("[data-member-delete]").addEventListener("click", () => {
      config.defaultTeam.splice(index, 1);
      renderDefaultTeam();
    });
    fields.defaultTeamEditor.appendChild(row);
  });
  isRendering = false;
}

function renderMissions() {
  isRendering = true;
  fields.missionsEditor.innerHTML = "";
  missionData.missions.forEach((mission, index) => {
    const card = document.createElement("article");
    card.className = "mission-card";
    card.innerHTML = `
      <h3>Миссия ${index + 1}</h3>
      <div class="grid">
        <label>Включена <select data-field="enabled"><option value="true">Да</option><option value="false">Нет</option></select></label>
        <label>ID <input data-field="id" type="number"></label>
        <label>Название <input data-field="title"></label>
        <label>Покемон / герой <input data-field="pokemon"></label>
        <label>Тип миссии <input data-field="missionType"></label>
        <label>Код <input data-field="code"></label>
        <label>Код карточки <input data-field="cardCode"></label>
        <label>Фрагмент <input data-field="fragmentIndex" type="number" min="1"></label>
        <label>Изображение <input data-field="image"></label>
        <label>Фон <input data-field="background"></label>
        <label>Иконка <input data-field="icon"></label>
        <label>Аудио миссии <input data-field="audio"></label>
        <label>Аудио до миссии <input data-field="audio_before"></label>
        <label>Аудио после миссии <input data-field="audio_after"></label>
        <label>Аудио успеха <input data-field="successAudio"></label>
        <label>Фоновая музыка <input data-field="backgroundMusic"></label>
        <label>Описание <textarea data-field="description" rows="3"></textarea></label>
        <label>Описание для сценария <textarea data-field="missionDescription" rows="3"></textarea></label>
        <label>Текст успеха <textarea data-field="successText" rows="3"></textarea></label>
        <label>Слайды через запятую <textarea data-field="slides" rows="3"></textarea></label>
      </div>
      <div class="mission-tools">
        <input type="file" accept="image/*" data-upload="image">
        <input type="file" accept="audio/*" data-upload="audio">
        <button class="secondary" data-action="up">Выше</button>
        <button class="secondary" data-action="down">Ниже</button>
        <button class="secondary" data-action="delete">Удалить</button>
      </div>
    `;
    bindMissionCard(card, mission, index);
    fields.missionsEditor.appendChild(card);
  });
  isRendering = false;
}

function bindMissionCard(card, mission, index) {
  card.querySelectorAll("[data-field]").forEach((input) => {
    const field = input.dataset.field;
    input.value = field === "slides" ? (mission.slides || []).join(", ") : String(mission[field] ?? "");
    const handleMissionInput = () => {
      if (field === "code") card.querySelector('[data-field="cardCode"]').value = input.value;
      if (field === "cardCode") card.querySelector('[data-field="code"]').value = input.value;
      updateMissionFromCard(card, mission);
    };
    input.addEventListener("input", handleMissionInput);
    input.addEventListener("change", handleMissionInput);
  });
  card.querySelector('[data-field="enabled"]').value = String(mission.enabled !== false);
  card.querySelectorAll("[data-upload]").forEach((input) => {
    input.addEventListener("change", () => handleUpload(input, mission, input.dataset.upload));
  });
  card.querySelector('[data-action="up"]').addEventListener("click", () => moveMission(index, -1));
  card.querySelector('[data-action="down"]').addEventListener("click", () => moveMission(index, 1));
  card.querySelector('[data-action="delete"]').addEventListener("click", () => {
    missionData.missions.splice(index, 1);
    renderMissions();
  });
}

function updateMissionFromCard(card, mission) {
  card.querySelectorAll("[data-field]").forEach((input) => {
    const field = input.dataset.field;
    if (field === "id" || field === "fragmentIndex") mission[field] = Number(input.value) || null;
    else if (field === "enabled") mission[field] = input.value === "true";
    else if (field === "slides") mission[field] = input.value.split(",").map((item) => item.trim()).filter(Boolean);
    else mission[field] = input.value;
  });
  if (mission.cardCode && mission.code !== mission.cardCode) mission.code = mission.cardCode;
  if (!mission.cardCode && mission.code) mission.cardCode = mission.code;
  mission.type = mission.missionType || mission.type || "team";
  mission.missionType = mission.missionType || mission.type;
  mission.missionDescription = mission.missionDescription || mission.description;
  mission.audio_before = mission.audio_before || mission.audio;
  mission.audio_after = mission.audio_after || mission.successAudio;
  mission.cardCode = mission.cardCode || mission.code;
  mission.pokemonCard = {
    ...(mission.pokemonCard || {}),
    name: mission.pokemon || mission.title,
    image: mission.image,
    code: mission.cardCode || mission.code,
    description: mission.successText,
    voice: mission.audio_after || mission.successAudio,
    successEffect: mission.successScreen?.effect || "success"
  };
}

function handleUpload(input, mission, type) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (type === "image") mission.image = reader.result;
    if (type === "audio") mission.audio = reader.result;
    renderMissions();
    scheduleAutoSave();
  };
  reader.readAsDataURL(file);
}

function addMission() {
  const nextId = Math.max(0, ...missionData.missions.map((mission) => Number(mission.id) || 0)) + 1;
  missionData.missions.push({
    id: nextId,
    title: "Новая миссия",
    description: "Описание задания",
    image: `images/mission${String(nextId).padStart(2, "0")}.png`,
    audio: "",
    audio_before: "",
    audio_after: "audio/mission_success.wav",
    slides: [],
    code: "CODE",
    cardCode: "CODE",
    pokemon: "Новый герой",
    background: "",
    icon: "",
    missionType: "team",
    missionDescription: "Описание задания",
    successScreen: {
      title: "МИССИЯ ВЫПОЛНЕНА",
      text: "Миссия выполнена.",
      effect: "success"
    },
    fragmentIndex: nextId,
    nextMission: null,
    pokemonCard: {
      name: "Новый герой",
      image: `images/mission${String(nextId).padStart(2, "0")}.png`,
      code: "CODE",
      description: "Миссия выполнена.",
      voice: "audio/mission_success.wav",
      successEffect: "success"
    },
    successText: "Миссия выполнена.",
    successAudio: "audio/mission_success.wav",
    backgroundMusic: "",
    enabled: true
  });
  renderMissions();
}

function applyAuthoritativeCodes(data) {
  if (!fixedCodes.length) return data;
  const byId = new Map(fixedCodes.map((item) => [Number(item.missionId), item]));
  return {
    ...data,
    missions: (data.missions || []).map((mission) => {
      const fixed = byId.get(Number(mission.id));
      if (!fixed?.code) return mission;
      return syncMissionCode(mission, fixed.code, fixed.fragmentIndex);
    })
  };
}

function moveMission(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= missionData.missions.length) return;
  const [mission] = missionData.missions.splice(index, 1);
  missionData.missions.splice(nextIndex, 0, mission);
  renderMissions();
}

function collectConfig() {
  collectDefaultTeam();
  config.app.deviceName = fields.deviceName.value;
  config.app.professorName = fields.professorName.value;
  config.settings.effectsVolume = Number(fields.effectsVolume.value);
  config.settings.slideIntervalMs = Number(fields.slideIntervalMs.value);
  config.settings.enableAmbientSound = fields.enableAmbientSound.value === "true";
  config.settings.enableVibration = fields.enableVibration.value === "true";
  config.settings.partyMode = fields.partyMode.value === "true";
  config.settings.enableDebugPanel = fields.enableDebugPanel.value === "true";
  config.final.title = fields.finalTitle.value;
  config.final.masterTitle = fields.masterTitle.value;
  config.final.sealText = fields.sealText.value;
  return config;
}

function collectDefaultTeam() {
  config.defaultTeam = [...fields.defaultTeamEditor.querySelectorAll(".team-row")]
    .map((row) => ({
      name: row.querySelector("[data-member-name]").value.trim(),
      active: row.querySelector("[data-member-active]").checked
    }))
    .filter((member) => member.name);
}

function addDefaultMember() {
  collectDefaultTeam();
  config.defaultTeam.push({ name: "Новый участник", active: true });
  renderDefaultTeam();
}

function collectMissions() {
  document.querySelectorAll(".mission-card").forEach((card, index) => {
    updateMissionFromCard(card, missionData.missions[index]);
  });
  missionData = applyAuthoritativeCodes(missionData);
  return missionData;
}

function renderScenario() {
  isRendering = true;
  fields.scenarioEditor.innerHTML = "";
  (flowData.steps || []).forEach((step, index) => {
    const row = document.createElement("article");
    row.className = "scenario-row";
    row.draggable = true;
    row.innerHTML = `
      <div class="scenario-handle" aria-hidden="true">::</div>
      <label class="scenario-enabled"><input type="checkbox" data-flow-field="enabled" ${step.enabled === false ? "" : "checked"}> Вкл.</label>
      <label>ID <input data-flow-field="id" value="${escapeHtml(step.id || "")}"></label>
      <label>Тип <select data-flow-field="type">
        ${["boot", "teamCreate", "teamRegistered", "incoming", "audio", "mission", "victory"].map((type) => (
          `<option value="${type}">${type}</option>`
        )).join("")}
      </select></label>
      <label>Миссия <input data-flow-field="missionId" type="number" min="1" value="${step.missionId ?? ""}"></label>
      <label>Аудио <input data-flow-field="audio" value="${escapeHtml(step.audio || "")}"></label>
      <label>Таймлайн <input data-flow-field="timeline" value="${escapeHtml(step.timeline || "")}"></label>
      <label>Следующий <input data-flow-field="next" value="${escapeHtml(step.next || "")}"></label>
      <div class="scenario-actions">
        <button class="secondary" data-flow-action="up">Выше</button>
        <button class="secondary" data-flow-action="down">Ниже</button>
        <button class="secondary" data-flow-action="delete">Удалить</button>
      </div>
    `;
    row.querySelector('[data-flow-field="type"]').value = step.type || "mission";
    row.querySelectorAll("[data-flow-field]").forEach((input) => {
      input.addEventListener("input", () => updateFlowStepFromRow(row, step));
      input.addEventListener("change", () => updateFlowStepFromRow(row, step));
    });
    row.querySelector('[data-flow-action="up"]').addEventListener("click", () => moveFlowStep(index, -1));
    row.querySelector('[data-flow-action="down"]').addEventListener("click", () => moveFlowStep(index, 1));
    row.querySelector('[data-flow-action="delete"]').addEventListener("click", () => {
      flowData.steps.splice(index, 1);
      relinkFlow();
      renderScenario();
    });
    row.addEventListener("dragstart", () => {
      draggedScenarioIndex = index;
      row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => {
      draggedScenarioIndex = null;
      row.classList.remove("dragging");
    });
    row.addEventListener("dragover", (event) => event.preventDefault());
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      if (draggedScenarioIndex === null || draggedScenarioIndex === index) return;
      const [stepToMove] = flowData.steps.splice(draggedScenarioIndex, 1);
      flowData.steps.splice(index, 0, stepToMove);
      relinkFlow();
      renderScenario();
    });
    fields.scenarioEditor.appendChild(row);
  });
  isRendering = false;
}

function updateFlowStepFromRow(row, step) {
  row.querySelectorAll("[data-flow-field]").forEach((input) => {
    const field = input.dataset.flowField;
    if (field === "enabled") step.enabled = input.checked;
    else if (field === "missionId") {
      if (input.value) step.missionId = Number(input.value);
      else delete step.missionId;
    } else if (input.value) step[field] = input.value;
    else delete step[field];
  });
}

function collectFlow() {
  fields.scenarioEditor.querySelectorAll(".scenario-row").forEach((row, index) => {
    updateFlowStepFromRow(row, flowData.steps[index]);
  });
  const activeSteps = (flowData.steps || [])
    .filter((step) => step.enabled !== false)
    .map(({ enabled, ...step }) => ({ ...step }));
  activeSteps.forEach((step, index) => {
    const nextStep = activeSteps[index + 1];
    if (nextStep) step.next = nextStep.id;
    else delete step.next;
  });
  return {
    start: activeSteps[0]?.id || "",
    steps: activeSteps
  };
}

function addFlowStep() {
  const nextNumber = (flowData.steps || []).length + 1;
  flowData.steps.push({
    id: `step_${nextNumber}`,
    type: "mission",
    missionId: missionData.missions[0]?.id || 1,
    enabled: true
  });
  relinkFlow();
  renderScenario();
}

function moveFlowStep(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= flowData.steps.length) return;
  const [step] = flowData.steps.splice(index, 1);
  flowData.steps.splice(nextIndex, 0, step);
  relinkFlow();
  renderScenario();
}

function relinkFlow() {
  (flowData.steps || []).forEach((step, index, steps) => {
    const nextStep = steps.slice(index + 1).find((candidate) => candidate.enabled !== false);
    if (nextStep) step.next = nextStep.id;
    else delete step.next;
  });
  flowData.start = (flowData.steps || []).find((step) => step.enabled !== false)?.id || "";
}

function collectProject() {
  return {
    schemaVersion: projectIndex?.schemaVersion || 1,
    exportedAt: new Date().toISOString(),
    index: projectIndex || { schemaVersion: 1, files: {} },
    config: collectConfig(),
    missions: collectMissions(),
    flow: collectFlow(),
    achievements: achievementsData || { achievements: [] }
  };
}

function saveLocal() {
  persistProject();
  setAdminStatus("Сохранено. Покедекс сразу использует новый проект на этом устройстве.");
}

async function saveProjectFiles() {
  if (!("showDirectoryPicker" in window)) {
    setAdminStatus("Браузер не умеет записывать файлы проекта. Используйте Chrome или скачайте JSON-файлы.");
    return;
  }
  try {
    const project = persistProject();
    const directory = await window.showDirectoryPicker({ mode: "readwrite" });
    await writeProjectFile(directory, "config.json", project.config);
    await writeProjectFile(directory, "missions.json", project.missions);
    await writeProjectFile(directory, "flow.json", project.flow);
    await writeProjectFile(directory, "achievements.json", project.achievements);
    await writeNestedProjectFile(directory, ["content", "project.json"], project.index);
    setAdminStatus("Файлы проекта обновлены. Обновите вкладку Покедекса.");
  } catch (error) {
    if (error.name === "AbortError") {
      setAdminStatus("Сохранение в файлы отменено.");
      return;
    }
    console.error(error);
    setAdminStatus("Не удалось записать файлы проекта. Проверьте доступ к папке.");
  }
}

async function writeProjectFile(directory, filename, data) {
  const handle = await directory.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function writeNestedProjectFile(directory, pathParts, data) {
  let current = directory;
  for (const part of pathParts.slice(0, -1)) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  await writeProjectFile(current, pathParts.at(-1), data);
}

function persistProject() {
  const project = collectProject();
  project.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEYS.project, JSON.stringify(project));
  localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(project.config));
  localStorage.setItem(STORAGE_KEYS.missions, JSON.stringify(project.missions));
  return project;
}

function scheduleAutoSave(event) {
  if (isRendering) return;
  if (event?.target?.id === "importProjectFile") return;
  if (event?.target?.type === "file") return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    try {
      persistProject();
      setAdminStatus("Автосохранено. Открытая вкладка Покедекса обновит данные.");
    } catch (error) {
      console.error(error);
      setAdminStatus("Автосохранение не удалось. Проверьте поля проекта.");
    }
  }, 700);
}

function resetLocal() {
  localStorage.removeItem(STORAGE_KEYS.project);
  localStorage.removeItem(STORAGE_KEYS.config);
  localStorage.removeItem(STORAGE_KEYS.missions);
  location.reload();
}

function importProject(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const nextConfig = imported.config || (imported.app && imported.settings ? imported : null);
      const nextMissions = imported.missions?.missions
        ? imported.missions
        : (Array.isArray(imported.missions) ? imported : null);
      const nextFlow = imported.flow?.steps ? imported.flow : (imported.start && imported.steps ? imported : null);
      const nextAchievements = imported.achievements?.achievements
        ? imported.achievements
        : (Array.isArray(imported.achievements) ? imported : null);
      projectIndex = imported.index || imported.projectIndex || projectIndex;
      config = nextConfig || config;
      missionData = applyAuthoritativeCodes(nextMissions || missionData);
      flowData = nextFlow || flowData;
      achievementsData = nextAchievements || achievementsData;
      normalizeDefaultTeam();
      renderConfig();
      renderDefaultTeam();
      renderMissions();
      renderScenario();
      persistProject();
      setAdminStatus("Проект импортирован и сохранён на этом устройстве.");
    } catch (error) {
      console.error(error);
      setAdminStatus("Не удалось импортировать JSON. Проверьте файл проекта.");
    } finally {
      fields.importProjectFile.value = "";
    }
  };
  reader.readAsText(file);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function setAdminStatus(message) {
  fields.adminStatus.textContent = message;
  fields.adminStatus.classList.remove("visible");
  void fields.adminStatus.offsetWidth;
  fields.adminStatus.classList.add("visible");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function syncMissionCode(mission, code, fragmentIndex) {
  return {
    ...mission,
    code,
    cardCode: code,
    fragmentIndex: fragmentIndex ?? mission.fragmentIndex,
    pokemonCard: {
      ...(mission.pokemonCard || {}),
      code
    }
  };
}
