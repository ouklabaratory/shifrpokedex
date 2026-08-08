"use strict";

const STORAGE_KEYS = {
  config: "pokedex.config.override",
  missions: "pokedex.missions.override",
  project: "pokedex.project.override",
  progress: "quest.progress.v1"
};

const selectors = {
  screen: "#screen",
  powerLed: "#powerLed",
  hud: "#hud",
  radar: "#radar",
  clock: "#clock",
  squadHud: "#squadHud",
  savedLabel: "#savedLabel",
  savedCounter: "#savedCounter",
  progressBar: "#progressBar",
  brandMark: "#brandMark",
  bootTitle: "#bootTitle",
  bootStatus: "#bootStatus",
  bootLoader: "#bootLoader",
  bootLogo: ".boot-logo",
  teamCreateTitle: "#teamCreateTitle",
  teamCreateText: "#teamCreateText",
  teamNameLabel: "#teamNameLabel",
  teamNameInput: "#teamNameInput",
  registerTeam: "#registerTeam",
  teamNameError: "#teamNameError",
  teamRegisteredHeader: "#teamRegisteredHeader",
  teamRegisteredTitle: "#teamRegisteredTitle",
  registeredTeamLabel: "#registeredTeamLabel",
  registeredTeamName: "#registeredTeamName",
  registeredSquadLabel: "#registeredSquadLabel",
  registeredSquadNumber: "#registeredSquadNumber",
  registeredStatusLabel: "#registeredStatusLabel",
  registeredStatus: "#registeredStatus",
  registrationPhase: "#registrationPhase",
  registrationProcedure: "#registrationProcedure",
  scanList: "#scanList",
  registeredWaiting: "#registeredWaiting",
  incomingTitle: "#incomingTitle",
  priorityLabel: "#priorityLabel",
  priorityValue: "#priorityValue",
  senderLabel: "#senderLabel",
  senderValue: "#senderValue",
  incomingPanel: "#incomingPanel",
  acceptMessage: "#acceptMessage",
  playbackPanel: "#playbackPanel",
  playbackActions: "#playbackActions",
  replayAudio: "#replayAudio",
  continueAudio: "#continueAudio",
  messageFrame: "#messageFrame",
  messageImage: "#messageImage",
  messageFallback: "#messageFallback",
  secureChannel: "#secureChannel",
  transmissionStatus: "#transmissionStatus",
  coordsPanel: "#coordsPanel",
  coordsReceived: "#coordsReceived",
  coordsStatus: "#coordsStatus",
  startMission: "#startMission",
  missionView: "#missionView",
  missionNumber: "#missionNumber",
  teamRank: "#teamRank",
  missionFrame: "#missionFrame",
  missionImage: "#missionImage",
  missionFallback: "#missionFallback",
  missionTitle: "#missionTitle",
  missionDescription: "#missionDescription",
  codeLabel: "#codeLabel",
  secretCode: "#secretCode",
  checkCode: "#checkCode",
  missionSecondaryAction: "#missionSecondaryAction",
  missionFeedback: "#missionFeedback",
  flash: "#flash",
  transition: "#transition",
  diagnostics: "#diagnostics",
  finalEyebrow: "#finalEyebrow",
  finalTitle: "#finalTitle",
  finalTeamLabel: "#finalTeamLabel",
  finalTeamName: "#finalTeamName",
  finalSquadNumber: "#finalSquadNumber",
  finalBecomes: "#finalBecomes",
  finalMasterTitle: "#finalMasterTitle",
  finalTeamMessage: "#finalTeamMessage",
  finalMembers: "#finalMembers",
  certificate: "#certificate",
  finalSeal: "#finalSeal",
  confetti: "#confetti",
  resumeModal: "#resumeModal",
  resumeRun: "#resumeRun",
  restartRun: "#restartRun",
  testPanel: "#testPanel",
  closeTestPanel: "#closeTestPanel",
  testStepSelect: "#testStepSelect",
  testGoStep: "#testGoStep",
  testMissionSelect: "#testMissionSelect",
  testGoMission: "#testGoMission",
  testAudioSelect: "#testAudioSelect",
  testPlayAudio: "#testPlayAudio",
  testFlash: "#testFlash",
  testResetProgress: "#testResetProgress",
  testClearStorage: "#testClearStorage",
  testState: "#testState",
  debugPanel: "#debugPanel",
  debugState: "#debugState",
  debugMission: "#debugMission",
  debugJson: "#debugJson",
  debugFps: "#debugFps",
  debugResources: "#debugResources"
};

const el = Object.fromEntries(
  Object.entries(selectors).map(([key, selector]) => [key, document.querySelector(selector)])
);
el.views = document.querySelectorAll(".view");

class ResourceManager {
  constructor() {
    this.json = new Map();
    this.images = new Map();
    this.audio = new Map();
    this.status = { total: 0, loaded: 0, failed: 0 };
  }

  async boot() {
    const contentIndex = await this.loadJson("content/project.json").catch(() => null);
    const files = contentIndex?.files || {};
    const [baseConfig, baseMissions, flow, achievementsData, screens, texts, images, audio, effects, codes] = await Promise.all([
      this.loadJson(files.config || "config.json"),
      this.loadJson(files.missions || "missions.json"),
      this.loadJson(files.flow || "flow.json"),
      this.loadJson(files.achievements || "achievements.json"),
      files.screens ? this.loadJson(files.screens) : Promise.resolve({}),
      files.texts ? this.loadJson(files.texts) : Promise.resolve({}),
      files.images ? this.loadJson(files.images) : Promise.resolve({}),
      files.audio ? this.loadJson(files.audio) : Promise.resolve({}),
      files.effects ? this.loadJson(files.effects) : Promise.resolve({}),
      files.codes ? this.loadJson(files.codes) : Promise.resolve({})
    ]);
    const overrideProject = this.readOverride(STORAGE_KEYS.project);
    const overrideConfig = this.readOverride(STORAGE_KEYS.config);
    const overrideMissions = this.readOverride(STORAGE_KEYS.missions);
    const lockedBook = Boolean(codes?.mainCipher?.locked);
    const config = deepMerge(baseConfig, overrideProject?.config || overrideConfig);
    const missionData = this.applyAuthoritativeCodes(lockedBook ? baseMissions : (overrideProject?.missions || overrideMissions || baseMissions), codes);
    const projectFlow = lockedBook ? flow : (overrideProject?.flow || flow);
    const projectAchievements = lockedBook ? achievementsData : (overrideProject?.achievements || achievementsData);
    const content = {
      index: contentIndex,
      screens,
      texts,
      images,
      audio,
      effects,
      codes,
      source: {
        project: "content/project.json",
        config: overrideProject?.config ? "localStorage:pokedex.project.override/config" : overrideConfig ? "localStorage:pokedex.config.override" : (files.config || "config.json"),
        missions: lockedBook ? (files.missions || "missions.json") : overrideProject?.missions ? "localStorage:pokedex.project.override/missions" : overrideMissions ? "localStorage:pokedex.missions.override" : (files.missions || "missions.json"),
        flow: lockedBook ? (files.flow || "flow.json") : overrideProject?.flow ? "localStorage:pokedex.project.override/flow" : (files.flow || "flow.json")
      }
    };
    const missions = missionData.missions.filter((mission) => mission.enabled !== false);
    const timelines = await this.loadFlowTimelines(projectFlow);
    const achievements = projectAchievements.achievements || [];
    this.validateContent({ config, missionData, missions, flow: projectFlow, achievements, content, timelines });
    await this.preloadAll(config, missions, projectFlow, timelines, achievements, content);
    return { config, missions, flow: projectFlow, timelines, achievements, content };
  }

  async loadJson(source) {
    if (this.json.has(source)) return this.json.get(source);
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) throw new Error(`${source} ${response.status}`);
    const data = await response.json();
    this.json.set(source, data);
    return data;
  }

  readOverride(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Cannot read ${key}`, error);
      return null;
    }
  }

  applyAuthoritativeCodes(missionData, codes) {
    const missionCodes = codes?.mainCipher?.missionCodes || [];
    if (!missionCodes.length) return missionData;
    const byId = new Map(missionCodes.map((item) => [Number(item.missionId), item]));
    return {
      ...missionData,
      missions: (missionData.missions || []).map((mission) => {
        const fixed = byId.get(Number(mission.id));
        if (!fixed?.code) return mission;
        return syncMissionCode(mission, fixed.code, fixed.fragmentIndex);
      })
    };
  }

  async loadFlowTimelines(flow) {
    const timelineSources = flow.steps.map((step) => step.timeline).filter(Boolean);
    const entries = await Promise.all(timelineSources.map(async (source) => [source, await this.loadJson(source)]));
    return new Map(entries);
  }

  async preloadAll(config, missions, flow, timelines, achievements = [], content = {}) {
    const media = new Set();
    const audio = new Set();
    Object.values(config.audio || {}).forEach((source) => audio.add(source));
    [config.app.logo, config.app.bootImage, config.app.incomingImage, config.app.victoryImage].filter(Boolean).forEach((source) => media.add(source));
    (config.app.icons || []).forEach((source) => media.add(source));
    (config.message.slides || []).forEach((source) => media.add(source));
    if (config.message.audio) audio.add(config.message.audio);
    Object.values(config.scenes || {}).forEach((scene) => this.collectSceneAssets(scene, media, audio));
    Object.values(content.images?.images || {}).flat().filter(Boolean).forEach((source) => media.add(source));
    Object.values(content.audio?.audio || {}).filter(Boolean).forEach((source) => audio.add(source));
    flow.steps.forEach((step) => {
      if (step.audio) audio.add(step.audio);
      if (step.media?.src) media.add(step.media.src);
    });
    missions.forEach((mission) => {
      const data = missionRuntimeData(mission);
      [data.image, data.background, ...(data.slides || [])].filter(Boolean).forEach((source) => media.add(source));
      [data.audio, data.successAudio, data.backgroundMusic].filter(Boolean).forEach((source) => audio.add(source));
    });
    timelines.forEach((timeline) => {
      timeline.events.forEach((event) => {
        if (event.media?.src) media.add(event.media.src);
        if (event.audio) audio.add(event.audio);
      });
    });
    achievements.map((achievement) => achievement.icon).filter(Boolean).forEach((source) => media.add(source));
    this.status.total = media.size + audio.size + this.json.size;
    await Promise.allSettled([...media].map((source) => this.preloadMedia(source)));
    [...audio].forEach((source) => this.prepareAudio(source, config));
  }

  validateContent({ config, missionData, missions, flow, achievements, content }) {
    const issues = [];
    const stepIds = new Set();
    (flow.steps || []).forEach((step) => {
      if (!step.id) issues.push("У шага сценария отсутствует id.");
      if (stepIds.has(step.id)) issues.push(`Дублируется шаг сценария: ${step.id}`);
      stepIds.add(step.id);
      if (!step.type) issues.push(`У шага ${step.id || "-"} отсутствует type.`);
      if (step.next && !stepIds.has(step.next) && !(flow.steps || []).some((item) => item.id === step.next)) {
        issues.push(`Шаг ${step.id} ведёт к отсутствующему шагу ${step.next}.`);
      }
    });
    if (!stepIds.has(flow.start)) issues.push(`Стартовый шаг ${flow.start} отсутствует.`);
    const missionIds = new Set((missionData.missions || []).map((mission) => Number(mission.id)));
    (flow.steps || [])
      .filter((step) => step.type === "mission")
      .forEach((step) => {
        if (!missionIds.has(Number(step.missionId))) issues.push(`Шаг ${step.id} ссылается на отсутствующую миссию ${step.missionId}.`);
      });
    missions.forEach((mission) => {
      const data = missionRuntimeData(mission);
      if (!data.title) issues.push(`Миссия ${mission.id} без заголовка.`);
      if (!data.description) issues.push(`Миссия ${mission.id} без описания.`);
      if (!mission.code && !mission.cardCode && !mission.pokemonCard?.code) issues.push(`Миссия ${mission.id} без кода.`);
      if (!mission.image && !mission.background && !mission.pokemonCard?.image) issues.push(`Миссия ${mission.id} без изображения.`);
    });
    achievements.forEach((achievement) => {
      if (achievement.missionId && !missionIds.has(Number(achievement.missionId))) {
        issues.push(`Достижение ${achievement.id} ссылается на отсутствующую миссию ${achievement.missionId}.`);
      }
    });
    const reachable = new Set();
    let cursor = flow.start;
    while (cursor && !reachable.has(cursor)) {
      reachable.add(cursor);
      const step = (flow.steps || []).find((item) => item.id === cursor);
      cursor = step?.next || null;
    }
    if (cursor) issues.push(`В сценарии найден цикл около шага ${cursor}.`);
    if (!config?.teamScreens || !config?.quest || !config?.final) issues.push("В config.json отсутствуют обязательные текстовые разделы.");
    if (!content?.index?.files) issues.push("content/project.json не содержит список файлов проекта.");
    if (issues.length) {
      throw new Error(`Проверка проекта не пройдена:\n${issues.join("\n")}`);
    }
  }

  collectSceneAssets(scene, media, audio) {
    [scene.background, scene.portrait, scene.illustration, scene.video, ...(scene.slides || [])]
      .filter(Boolean)
      .forEach((source) => media.add(source));
    [scene.voice, scene.music, ...(scene.effects || [])]
      .filter(Boolean)
      .forEach((source) => audio.add(source));
  }

  preloadMedia(source) {
    return new Promise((resolve) => {
      const isVideo = /\.(mp4|webm|mov)$/i.test(source);
      if (isVideo) {
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.onloadeddata = () => this.markLoaded(resolve);
        video.onerror = () => this.markFailed(resolve);
        video.src = source;
        this.images.set(source, video);
        return;
      }
      const image = new Image();
      image.onload = () => this.markLoaded(resolve);
      image.onerror = () => this.markFailed(resolve);
      image.src = source;
      this.images.set(source, image);
    });
  }

  prepareAudio(source, config) {
    const audio = new Audio(source);
    audio.preload = "auto";
    audio.volume = config.settings.effectsVolume;
    audio.addEventListener("canplaythrough", () => {
      this.status.loaded += 1;
    }, { once: true });
    audio.addEventListener("error", () => {
      this.status.failed += 1;
      this.audio.set(source, null);
    }, { once: true });
    this.audio.set(source, audio);
  }

  markLoaded(resolve) {
    this.status.loaded += 1;
    resolve();
  }

  markFailed(resolve) {
    this.status.failed += 1;
    resolve();
  }
}

class AudioManager {
  constructor(resources, config) {
    this.resources = resources;
    this.config = config;
    this.context = null;
    this.ambient = null;
    this.ambientTrack = null;
    this.unlocked = false;
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.getContext();
    if (this.context?.state === "suspended") this.context.resume();
    this.tone(1, 0.001, "sine", 0.001);
    this.startAmbient();
  }

  play(source, category = "effects", fallback = "button", options = {}) {
    if (!source) return this.pattern(fallback);
    const audio = this.resources.audio.get(source);
    if (!audio) return this.pattern(fallback);
    audio.currentTime = 0;
    audio.loop = Boolean(options.loop);
    audio.volume = this.volumeFor(category);
    const result = audio.play();
    if (result?.catch) result.catch(() => this.pattern(fallback));
    return audio;
  }

  fadeOut(audio, duration = 500) {
    if (!audio) return;
    const start = audio.volume;
    const started = performance.now();
    const tick = () => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      audio.volume = start * (1 - progress);
      if (progress < 1) requestAnimationFrame(tick);
      else audio.pause();
    };
    tick();
  }

  volumeFor(category) {
    if (category === "voice") return this.config.settings.voiceVolume;
    if (category === "music") return this.config.settings.musicVolume;
    if (category === "ambient") return this.config.settings.ambientVolume * 4;
    return this.config.settings.effectsVolume;
  }

  startAmbient() {
    if (!this.config.settings.enableAmbientSound || this.ambient) return;
    const ambientSource = this.config.audio?.ambient;
    const ambientAudio = ambientSource ? this.resources.audio.get(ambientSource) : null;
    if (ambientAudio) {
      this.ambientTrack = this.play(ambientSource, "ambient", "button", { loop: true });
    }
    const context = this.getContext();
    if (!context) return;
    const hum = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    hum.type = "sawtooth";
    hum.frequency.value = 58;
    filter.type = "lowpass";
    filter.frequency.value = 180;
    gain.gain.value = this.config.settings.ambientVolume;
    hum.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    hum.start();
    this.ambient = { hum, gain };
    this.scheduleClick();
  }

  scheduleClick() {
    if (!this.ambient) return;
    setTimeout(() => {
      this.tone(300 + Math.random() * 520, 0.018, "square", 0.01);
      this.scheduleClick();
    }, 2200 + Math.random() * 4800);
  }

  pattern(name) {
    const patterns = {
      power: [[90, 0.035], [40, 0.05]],
      boot: [[160, 0.08], [260, 0.08], [520, 0.16]],
      button: [[720, 0.045]],
      incoming: [[880, 0.08], [520, 0.08], [880, 0.12]],
      message: [[220, 0.14], [300, 0.14], [380, 0.14], [460, 0.14]],
      data: [[900, 0.026], [760, 0.026], [980, 0.026], [620, 0.026]],
      scan: [[420, 0.045], [760, 0.035], [980, 0.035]],
      connect: [[260, 0.07], [520, 0.08], [780, 0.11]],
      success: [[520, 0.08], [720, 0.1], [920, 0.13]],
      failed: [[170, 0.11], [110, 0.16]],
      victory: [[420, 0.12], [560, 0.12], [700, 0.12], [980, 0.32]]
    };
    let delay = 0;
    (patterns[name] || patterns.button).forEach(([frequency, duration]) => {
      setTimeout(() => this.tone(frequency, duration, "square", 0.035), delay);
      delay += duration * 1000 + 45;
    });
    return null;
  }

  tone(frequency, duration, type, volume) {
    const context = this.getContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  getContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    this.context = this.context || new AudioContext();
    return this.context;
  }
}

class AnimationManager {
  flash(type) {
    el.flash.className = "flash";
    void el.flash.offsetWidth;
    el.flash.classList.add(type);
  }

  transition(type) {
    el.transition.className = `transition ${type}`;
    void el.transition.offsetWidth;
    el.transition.classList.add("run");
  }

  screen(className, duration = 1500) {
    el.screen.classList.add(className);
    setTimeout(() => el.screen.classList.remove(className), duration);
  }

  confetti() {
    el.confetti.innerHTML = "";
    const colors = ["#f6ce57", "#51ff89", "#ff334f", "#66d7ff", "#ffffff"];
    for (let index = 0; index < 42; index += 1) {
      const piece = document.createElement("i");
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = `${Math.random() * 2.4}s`;
      piece.style.animationDuration = `${2 + Math.random() * 1.8}s`;
      el.confetti.appendChild(piece);
    }
  }
}

class EventManager {
  constructor(app) {
    this.app = app;
    this.queue = Promise.resolve();
  }

  emit(event) {
    this.queue = this.queue.then(() => this.run(event));
    return this.queue;
  }

  run(event) {
    const handlers = {
      sound: () => this.app.audio.play(event.source, event.category, event.fallback, event.options),
      media: () => this.app.renderMedia(event.target, event.media),
      text: () => {
        event.target.textContent = event.value;
      },
      flash: () => this.app.animations.flash(event.color),
      transition: () => this.app.animations.transition(event.name),
      vibrate: () => this.app.vibrate(event.pattern),
      state: () => this.app.stateMachine.go(event.stepId),
      class: () => event.target.classList.toggle(event.name, event.enabled)
    };
    return handlers[event.type]?.();
  }
}

class ProgressStore {
  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.progress));
    } catch {
      return null;
    }
  }

  save(progress) {
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  }

  clear() {
    localStorage.removeItem(STORAGE_KEYS.progress);
  }
}

class StateMachine {
  constructor(app) {
    this.app = app;
    this.current = "Idle";
    this.step = null;
    this.handlers = {
      boot: (step) => this.app.enterBoot(step),
      teamCreate: (step) => this.app.enterTeamCreate(step),
      teamRegistered: (step) => this.app.enterTeamRegistered(step),
      incoming: (step) => this.app.enterIncoming(step),
      audio: (step) => this.app.enterAudio(step),
      challenge: (step) => this.app.enterChallenge(step),
      energyCheck: (step) => this.app.enterEnergyCheck(step),
      mission: (step) => this.app.enterMission(step),
      victory: (step) => this.app.enterVictory(step)
    };
  }

  go(stepId) {
    const step = this.app.flow.steps.find((item) => item.id === stepId);
    if (!step) throw new Error(`Unknown flow step: ${stepId}`);
    this.step = step;
    this.current = this.stateName(step.type);
    this.app.debug.update();
    this.app.progress.save(this.app.snapshot());
    return this.handlers[step.type](step);
  }

  next() {
    if (this.step?.next) return this.go(this.step.next);
    return null;
  }

  stateName(type) {
    return {
      boot: "Boot",
      teamCreate: "TeamCreate",
      teamRegistered: "TeamRegistered",
      incoming: "IncomingTransmission",
      audio: "AudioPlayback",
      challenge: "Challenge",
      energyCheck: "EnergyCheck",
      mission: "Mission",
      victory: "Victory"
    }[type] || "Unknown";
  }
}

class DebugPanel {
  constructor(app) {
    this.app = app;
    this.frames = 0;
    this.last = performance.now();
  }

  start() {
    if (this.app.config.settings.partyMode) return;
    if (!this.app.config.settings.enableDebugPanel && !new URLSearchParams(location.search).has("debug")) return;
    el.debugPanel.hidden = false;
    const tick = () => {
      this.frames += 1;
      const now = performance.now();
      if (now - this.last > 1000) {
        el.debugFps.textContent = `fps: ${this.frames}`;
        this.frames = 0;
        this.last = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setInterval(() => this.update(), 500);
  }

  update() {
    if (el.debugPanel.hidden) return;
    const mission = this.app.activeMission;
    const missionData = mission ? missionRuntimeData(mission) : null;
    el.debugState.textContent = `State: ${this.app.stateMachine?.current || "-"}`;
    el.debugMission.textContent = `Mission ID: ${mission?.id || "-"}`;
    el.debugJson.textContent = `Source: ${this.app.content?.source?.project || "content/project.json"} | Missions: ${this.app.content?.source?.missions || "-"}`;
    const status = this.app.resources.status;
    el.debugFps.textContent = missionData
      ? `Pokemon: ${missionData.pokemon || "-"}`
      : `fps: ${this.frames}`;
    el.debugResources.textContent = missionData
      ? `Card code: ${missionData.code || "-"} | Fragment: ${missionData.fragmentIndex || "-"} | Image: ${missionData.image || "-"}`
      : `resources: ${status.loaded}/${status.total} fail ${status.failed}`;
  }

  toggleOverlay() {
    el.debugPanel.hidden = !el.debugPanel.hidden;
    if (!el.debugPanel.hidden) this.update();
  }
}

class QuestApp {
  constructor() {
    this.resources = new ResourceManager();
    this.animations = new AnimationManager();
    this.progress = new ProgressStore();
    this.activeMission = null;
    this.activeMissionData = null;
    this.timelineTimers = [];
    this.config = null;
    this.missions = [];
    this.flow = null;
    this.timelines = new Map();
    this.achievements = [];
    this.content = {};
    this.team = null;
    this.saved = 0;
    this.completedMissionIds = [];
    this.enteredCodes = {};
    this.liveTimers = [];
    this.missionTimers = [];
    this.currentAudioStep = null;
  }

  async init() {
    const project = await this.resources.boot();
    this.config = project.config;
    this.missions = project.missions;
    this.flow = project.flow;
    this.timelines = project.timelines;
    this.achievements = project.achievements;
    this.content = project.content;
    this.audio = new AudioManager(this.resources, this.config);
    this.events = new EventManager(this);
    this.stateMachine = new StateMachine(this);
    this.debug = new DebugPanel(this);
    this.applyConfigText();
    this.bindUi();
    this.registerServiceWorker();
    this.updateProgress();
    this.debug.start();
    this.maybeResume();
  }

  applyConfigText() {
    document.title = this.config.app.title;
    el.savedLabel.textContent = this.config.quest.savedLabel;
    el.brandMark.textContent = this.config.app.deviceName;
    el.incomingTitle.textContent = this.config.message.title;
    el.priorityLabel.textContent = this.config.message.priorityLabel;
    el.priorityValue.textContent = this.config.message.priorityValue;
    el.senderLabel.textContent = this.config.message.senderLabel;
    el.senderValue.textContent = this.config.app.professorName;
    el.acceptMessage.textContent = this.config.message.acceptButton;
    el.secureChannel.textContent = this.config.message.secureChannelText;
    el.transmissionStatus.textContent = this.config.message.receivingText;
    el.teamCreateTitle.textContent = this.config.teamScreens.createTitle;
    el.teamCreateText.textContent = this.config.teamScreens.createText;
    el.teamNameLabel.textContent = this.config.teamScreens.nameLabel;
    el.registerTeam.textContent = this.config.teamScreens.registerButton;
    el.teamRegisteredHeader.textContent = this.config.teamScreens.registeredHeader;
    el.teamRegisteredTitle.textContent = this.config.teamScreens.registeredTitle;
    el.registeredTeamLabel.textContent = this.config.teamScreens.teamLabel;
    el.registeredSquadLabel.textContent = this.config.teamScreens.squadLabel;
    el.registeredStatusLabel.textContent = this.config.teamScreens.statusLabel;
    el.registeredWaiting.textContent = this.config.teamScreens.waitingText;
  }

  bindUi() {
    document.addEventListener("pointerdown", () => this.audio.unlock(), { once: true });
    document.querySelectorAll("button").forEach((button) => {
      button.addEventListener("pointerdown", () => this.react("input"));
    });
    document.querySelectorAll("input").forEach((input) => {
      input.addEventListener("focus", () => this.react("scan"));
      input.addEventListener("input", () => this.react("data", { quiet: true }));
    });
    el.acceptMessage.addEventListener("click", () => {
      this.audio.unlock();
      this.events.emit({ type: "sound", source: this.config.audio.button, fallback: "button" });
      this.events.emit({ type: "vibrate", pattern: 35 });
      this.stateMachine.next();
    });
    el.startMission.addEventListener("click", () => this.stateMachine.next());
    el.replayAudio.addEventListener("click", () => this.replayAudioStep());
    el.continueAudio.addEventListener("click", () => this.continueAudioStep());
    el.checkCode.addEventListener("click", () => this.checkMissionCode());
    el.missionSecondaryAction.addEventListener("click", () => this.handleMissionSecondaryAction());
    el.registerTeam.addEventListener("click", () => this.registerTeam());
    el.teamNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.registerTeam();
    });
    el.secretCode.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.checkMissionCode();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        if (el.testPanel.hidden) this.openTestPanel();
        else el.testPanel.hidden = true;
      }
    });
    el.resumeRun.addEventListener("click", () => this.resumeSaved());
    el.restartRun.addEventListener("click", () => {
      this.progress.clear();
      el.resumeModal.hidden = true;
      this.stateMachine.go(this.flow.start);
    });
    window.addEventListener("storage", (event) => {
      if ([STORAGE_KEYS.project, STORAGE_KEYS.config, STORAGE_KEYS.missions].includes(event.key)) {
        location.reload();
      }
    });
    this.bindTestMode();
  }

  bindTestMode() {
    let holdTimer = null;
    el.brandMark.addEventListener("pointerdown", () => {
      holdTimer = setTimeout(() => this.openTestPanel(), 1800);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
      el.brandMark.addEventListener(eventName, () => clearTimeout(holdTimer));
    });
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("#closeTestPanel")) el.testPanel.hidden = true;
      if (target.closest("#testGoStep")) this.stateMachine.go(el.testStepSelect.value);
      if (target.closest("#testGoMission")) this.enterMission({ type: "mission", missionId: Number(el.testMissionSelect.value) });
      if (target.closest("#testPlayAudio")) this.audio.play(el.testAudioSelect.value, "voice", "message");
      if (target.closest("#testFlash")) this.animations.flash("green");
      if (target.closest("#testResetProgress")) {
        this.progress.clear();
        this.updateTestState();
      }
      if (target.closest("#testClearStorage")) {
        localStorage.clear();
        this.updateTestState();
      }
    });
  }

  openTestPanel() {
    el.testPanel.hidden = false;
    el.testStepSelect.innerHTML = this.flow.steps.map((step) => `<option value="${step.id}">${step.id} (${step.type})</option>`).join("");
    el.testMissionSelect.innerHTML = this.missions.map((mission) => `<option value="${mission.id}">${mission.id}: ${mission.title}</option>`).join("");
    const audioSources = [...this.resources.audio.keys()].filter(Boolean);
    el.testAudioSelect.innerHTML = audioSources.map((source) => `<option value="${source}">${source}</option>`).join("");
    this.updateTestState();
  }

  updateTestState() {
    el.testState.textContent = JSON.stringify(this.snapshot(), null, 2);
  }

  maybeResume() {
    const params = new URLSearchParams(location.search);
    const jumpStep = params.get("jump") || params.get("step");
    if (jumpStep) {
      el.resumeModal.hidden = true;
      this.stateMachine.go(jumpStep);
      if (params.has("debug")) {
        el.debugPanel.hidden = false;
        this.debug.update();
      }
      return;
    }
    const saved = this.progress.load();
    if (saved?.stepId && !saved.complete) {
      el.resumeModal.hidden = false;
      return;
    }
    this.stateMachine.go(this.flow.start);
  }

  resumeSaved() {
    const saved = this.progress.load();
    el.resumeModal.hidden = true;
    this.restoreSnapshot(saved);
    this.stateMachine.go(saved.stepId);
  }

  snapshot() {
    return {
      stepId: this.stateMachine?.step?.id || this.flow?.start,
      state: this.stateMachine?.current || "Idle",
      missionId: this.activeMission?.id || null,
      team: this.team,
      saved: this.saved || 0,
      completedMissionIds: this.completedMissionIds || [],
      enteredCodes: this.enteredCodes || {},
      complete: this.stateMachine?.current === "Victory"
    };
  }

  restoreSnapshot(saved) {
    this.saved = saved.saved || 0;
    this.completedMissionIds = saved.completedMissionIds || [];
    this.enteredCodes = saved.enteredCodes || {};
    this.team = saved.team || null;
    this.updateProgress();
  }

  registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("service-worker.js").catch((error) => console.warn("Service worker failed", error));
  }

  async enterBoot() {
    this.showView("bootView");
    await wait(900);
    await this.events.emit({ type: "sound", source: this.config.audio.power, fallback: "power" });
    await wait(180);
    el.powerLed.classList.add("active");
    await this.events.emit({ type: "sound", source: this.config.audio.boot, fallback: "boot" });
    el.screen.classList.add("awake");
    this.animations.transition("wake");
    await wait(1050);
    el.bootLogo.classList.add("visible");
    await wait(420);
    this.typeLine(el.bootTitle, this.config.boot.systemTitle, 34);
    await wait(850);
    this.typeLine(el.bootStatus, this.config.boot.initializingText, 34);
    await wait(780);
    el.bootLoader.hidden = false;
    el.bootLoader.classList.add("running");
    await wait(3300);
    el.bootStatus.textContent = this.config.boot.readyText;
    await wait(700);
    el.bootTitle.textContent = this.config.boot.connectedText;
    this.startLiveSystems();
    await wait(this.config.settings.incomingDelayMs);
    this.stateMachine.next();
  }

  enterTeamCreate() {
    if (this.team?.name && this.team.confirmed) {
      this.stateMachine.next();
      return;
    }
    this.showView("teamCreateView");
    el.teamNameInput.value = this.team?.name || "";
    el.teamNameError.textContent = "";
    setTimeout(() => el.teamNameInput.focus({ preventScroll: true }), 250);
  }

  registerTeam() {
    const name = sanitizeTeamName(el.teamNameInput.value);
    if (!this.isTeamNameValid(name)) {
      el.teamNameError.textContent = this.config.teamScreens.nameError;
      this.react("error");
      return;
    }
    this.team = {
      name,
      squadNumber: this.generateSquadNumber(),
      members: [],
      status: this.config.team.defaultStatus,
      achievements: this.team?.achievements || [],
      registeredAt: new Date().toISOString(),
      confirmed: false
    };
    this.progress.save(this.snapshot());
    this.react("success");
    this.stateMachine.next();
  }

  isTeamNameValid(name) {
    return name.length >= this.config.team.minNameLength && name.length <= this.config.team.maxNameLength;
  }

  generateSquadNumber(name) {
    const min = this.config.team.squadMin;
    const max = this.config.team.squadMax;
    const number = min + Math.floor(Math.random() * (max - min + 1));
    return String(number).padStart(3, "0");
  }

  async enterTeamRegistered() {
    this.showView("teamRegisteredView");
    el.teamRegisteredTitle.textContent = "";
    el.registeredTeamName.textContent = `"${this.team.name}"`;
    el.registeredSquadNumber.textContent = `№${this.team.squadNumber}`;
    this.team.status = this.config.team.readyStatus;
    el.registeredStatus.textContent = this.team.status;
    el.registrationPhase.textContent = this.config.teamScreens.phaseRegistration;
    el.registrationProcedure.textContent = "";
    el.scanList.textContent = "";
    el.scanList.hidden = true;
    el.registeredWaiting.textContent = "";
    this.updateTeamHud();
    this.animations.flash("green");
    this.animations.transition("scan");
    this.audio.pattern("success");
    for (const step of this.registrationSequence()) {
      await this.appendProcedureStep(step);
    }
    el.registeredWaiting.textContent = this.registrationConfirmation();
    this.react("success");
    await wait(700);
    await this.scanConfiguredTeam();
    await this.autoConfirmTeamRegistration();
  }

  registrationSequence() {
    const sequence = this.config.teamScreens.registrationSequence || [];
    return sequence.map((step) => ({
      ...step,
      text: this.fillTeamTemplate(step.text)
    }));
  }

  registrationConfirmation() {
    const source = this.team?.name
      ? this.config.teamScreens.professorConfirmation
      : this.config.teamScreens.neutralConfirmation;
    return this.fillTeamTemplate(source);
  }

  fillTeamTemplate(value = "", tokens = {}) {
    return String(value)
      .replaceAll("{{teamName}}", this.team?.name || "")
      .replaceAll("{{squadNumber}}", this.team?.squadNumber || "---")
      .replaceAll("{{professorName}}", this.config.app.professorName || "")
      .replaceAll("{{count}}", tokens.count ?? "");
  }

  async appendProcedureStep(step) {
    const item = document.createElement("p");
    item.className = `procedure-line ${step.type || "line"}`;
    item.textContent = step.text;
    el.registrationProcedure.appendChild(item);
    el.registrationProcedure.scrollTop = el.registrationProcedure.scrollHeight;
    if (step.transition) this.animations.transition(step.transition);
    if (step.flash) this.animations.flash(step.flash);
    this.audio.pattern(step.sound || (step.type === "success" ? "success" : "data"));
    await wait(step.delayMs || (step.type === "success" ? 650 : 850));
  }

  scanTiming() {
    return {
      nameDelay: this.config.teamScreens.scanNameDelayMs || 820,
      finalPause: this.config.teamScreens.scanFinalPauseMs || 2600,
      printMs: this.config.teamScreens.scanTextPrintMs || 360,
      flashMs: this.config.teamScreens.scanFlashMs || 720
    };
  }

  activeConfiguredMembers() {
    return (this.config.defaultTeam || [])
      .map((member) => (typeof member === "string" ? { name: member, active: true } : member))
      .filter((member) => member?.active !== false && member.name)
      .map((member) => sanitizePersonName(member.name))
      .filter(Boolean)
      .slice(0, this.config.team.maxMembers);
  }

  async scanConfiguredTeam() {
    el.registrationPhase.textContent = this.config.teamScreens.phaseScan;
    el.scanList.textContent = "";
    el.scanList.hidden = false;
    this.team.members = [];
    for (const line of this.config.teamScreens.scanIntro || []) {
      await this.appendProcedureStep({ type: "line", text: line, sound: "scan", transition: "scan", delayMs: 700 });
    }
    const members = this.activeConfiguredMembers();
    const timing = this.scanTiming();
    if (!members.length) {
      await this.appendProcedureStep({ type: "line", text: this.config.teamScreens.noMembersText, sound: "data", delayMs: timing.nameDelay });
    }
    for (const member of members) {
      await wait(timing.nameDelay);
      const item = document.createElement("p");
      item.className = "scan-hit";
      item.style.setProperty("--scan-print-ms", `${timing.printMs}ms`);
      item.textContent = `✔ ${member}`;
      el.scanList.appendChild(item);
      el.scanList.scrollTop = el.scanList.scrollHeight;
      this.team.members.push(member);
      this.audio.pattern("connect");
      this.animations.flash("green");
      this.animations.screen("scan-pulse", timing.flashMs);
    }
    this.progress.save(this.snapshot());
  }

  async autoConfirmTeamRegistration() {
    this.team.confirmed = true;
    this.progress.save(this.snapshot());
    const timing = this.scanTiming();
    await this.appendProcedureStep({
      type: "success",
      text: this.fillTeamTemplate(this.config.teamScreens.scanCompleteText, { count: this.team.members.length }),
      sound: "success",
      flash: "green",
      delayMs: 650
    });
    await this.appendProcedureStep({
      type: "success",
      text: this.config.teamScreens.autoConfirmText,
      sound: "connect",
      flash: "green",
      delayMs: 650
    });
    await wait(timing.finalPause);
    el.scanList.hidden = true;
    el.registeredWaiting.textContent = this.config.teamScreens.continueText;
    await wait(this.config.teamScreens.autoContinueDelayMs || 1400);
    el.registeredWaiting.textContent = "";
    el.registrationPhase.textContent = this.config.teamScreens.phaseConnection;
    this.progress.save(this.snapshot());
    this.updateTeamHud();
    for (const step of this.connectionSequence()) {
      await this.appendProcedureStep(step);
    }
    this.react("success");
    await wait(650);
    this.stateMachine.next();
  }

  connectionSequence() {
    return (this.config.teamScreens.connectionSequence || []).map((step) => ({
      ...step,
      text: this.fillTeamTemplate(step.text)
    }));
  }

  startLiveSystems() {
    el.hud.hidden = false;
    el.radar.hidden = false;
    el.diagnostics.hidden = false;
    el.powerLed.classList.add("live");
    this.updateClock();
    this.updateDiagnostics();
    this.liveTimers.push(setInterval(() => this.updateClock(), 1000));
    this.scheduleDiagnosticsPulse();
    this.audio.startAmbient();
  }

  updateClock() {
    const now = new Date();
    el.clock.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  updateDiagnostics() {
    const lines = this.config.diagnostics;
    el.diagnostics.textContent = pick(lines);
    el.diagnostics.classList.remove("diagnostics-burst");
    void el.diagnostics.offsetWidth;
    el.diagnostics.classList.add("diagnostics-burst");
  }

  scheduleDiagnosticsPulse() {
    const min = this.config.settings.diagnosticsMinDelayMs || 30000;
    const max = this.config.settings.diagnosticsMaxDelayMs || 60000;
    const delay = min + Math.random() * Math.max(0, max - min);
    const timer = setTimeout(() => {
      this.updateDiagnostics();
      this.audio.pattern("data");
      this.scheduleDiagnosticsPulse();
    }, delay);
    this.liveTimers.push(timer);
  }

  enterIncoming() {
    this.showView("messageView");
    this.updateTeamHud();
    this.animations.screen("unstable-link", 1500);
    el.incomingPanel.hidden = false;
    el.playbackPanel.hidden = true;
    el.coordsPanel.hidden = true;
    this.events.emit({ type: "flash", color: "green" });
    this.events.emit({ type: "transition", name: "scan" });
    this.events.emit({ type: "sound", source: this.config.audio.incoming, fallback: "incoming" });
    this.audio.pattern("data");
    this.events.emit({ type: "vibrate", pattern: [40, 30, 40] });
  }

  enterAudio(step) {
    this.currentAudioStep = step;
    this.showView("messageView");
    this.audioStepFinished = false;
    el.incomingPanel.hidden = true;
    el.playbackPanel.hidden = false;
    el.playbackActions.hidden = true;
    el.coordsPanel.hidden = true;
    el.screen.classList.add("transmitting");
    this.runTimeline(step.timeline);
    const audio = this.audio.play(step.audio || this.config.message.audio, "voice", "message");
    const finish = () => this.finishAudioStep();
    if (audio) {
      audio.onended = finish;
      this.timelineTimers.push(setTimeout(finish, this.config.settings.voiceSafetyTimeoutMs || 600000));
    } else {
      this.timelineTimers.push(setTimeout(finish, this.config.settings.voiceFallbackDurationMs || 2000));
    }
  }

  async finishAudioStep() {
    if (this.audioStepFinished) return;
    this.audioStepFinished = true;
    this.clearTimeline();
    el.screen.classList.remove("transmitting");
    el.coordsPanel.hidden = true;
    el.startMission.hidden = true;
    this.animations.transition("scan");
    this.events.emit({ type: "sound", source: this.config.audio.success, fallback: "success" });
    el.playbackActions.hidden = false;
  }

  replayAudioStep() {
    if (!this.currentAudioStep) return;
    this.audioStepFinished = false;
    el.playbackActions.hidden = true;
    el.screen.classList.add("transmitting");
    this.runTimeline(this.currentAudioStep.timeline);
    const audio = this.audio.play(this.currentAudioStep.audio || this.config.message.audio, "voice", "message");
    const finish = () => this.finishAudioStep();
    if (audio) {
      audio.onended = finish;
      this.timelineTimers.push(setTimeout(finish, this.config.settings.voiceSafetyTimeoutMs || 600000));
    } else {
      this.timelineTimers.push(setTimeout(finish, this.config.settings.voiceFallbackDurationMs || 2000));
    }
  }

  continueAudioStep() {
    el.playbackActions.hidden = true;
    el.playbackPanel.hidden = true;
    this.animations.transition("scan");
    this.stateMachine.next();
  }

  runTimeline(source) {
    this.clearTimeline();
    const timeline = this.timelines.get(source);
    if (!timeline) {
      this.renderMedia("message", { type: "image", src: this.config.message.slides[0], alt: this.config.message.fallbackLabel });
      return;
    }
    timeline.events.forEach((event) => {
      const timer = setTimeout(() => this.events.emit(event), event.time);
      this.timelineTimers.push(timer);
    });
  }

  clearTimeline() {
    this.timelineTimers.forEach((timer) => clearTimeout(timer));
    this.timelineTimers = [];
  }

  enterChallenge(step) {
    this.activeMission = null;
    this.activeMissionData = null;
    this.currentChallengeStep = step;
    this.clearMissionTimers();
    this.updateTeamHud();
    this.showView("missionView");
    el.missionFrame.hidden = true;
    el.missionView?.classList?.add("briefing-mode");
    el.missionView?.classList?.remove("signal-mode");
    el.missionNumber.textContent = step.eyebrow || "ИСПЫТАНИЕ";
    el.teamRank.textContent = "";
    el.missionTitle.textContent = step.title || "";
    el.missionDescription.textContent = step.description || "";
    el.codeLabel.hidden = true;
    el.secretCode.hidden = true;
    el.checkCode.hidden = false;
    el.missionSecondaryAction.hidden = true;
    el.checkCode.disabled = false;
    el.secretCode.disabled = false;
    el.checkCode.textContent = step.buttonLabel || "ДАЛЬШЕ";
    el.missionFeedback.textContent = "";
    el.missionFeedback.className = "mission-feedback";
    this.animations.transition("scan");
    this.audio.pattern("data");
    this.debug.update();
  }

  enterEnergyCheck(step) {
    this.activeMission = null;
    this.activeMissionData = null;
    this.currentEnergyStep = step;
    this.clearMissionTimers();
    this.updateTeamHud();
    this.showView("missionView");
    el.missionFrame.hidden = true;
    el.missionView?.classList?.add("briefing-mode");
    el.missionView?.classList?.remove("signal-mode");
    el.missionNumber.textContent = step.eyebrow || "ПРОВЕРКА";
    el.teamRank.textContent = "";
    el.missionTitle.textContent = step.title || "";
    el.missionDescription.textContent = step.question || "";
    el.codeLabel.hidden = true;
    el.secretCode.hidden = true;
    el.checkCode.hidden = false;
    el.checkCode.disabled = false;
    el.checkCode.textContent = step.yesLabel || "ДА";
    el.missionSecondaryAction.hidden = false;
    el.missionSecondaryAction.disabled = false;
    el.missionSecondaryAction.textContent = step.noLabel || "НЕТ";
    el.missionFeedback.textContent = "";
    el.missionFeedback.className = "mission-feedback";
    this.animations.transition("scan");
    this.audio.pattern("data");
    this.debug.update();
  }

  async runEnergySequence() {
    const step = this.currentEnergyStep || {};
    el.checkCode.disabled = true;
    el.missionSecondaryAction.disabled = true;
    el.checkCode.hidden = true;
    el.missionSecondaryAction.hidden = true;
    el.missionTitle.textContent = step.transferTitle || "ПЕРЕДАЧА ЭНЕРГИИ";
    const values = step.progressValues || [10, 31, 57, 84, 100];
    for (const value of values) {
      el.missionDescription.textContent = `${step.transferTitle || "ПЕРЕДАЧА ЭНЕРГИИ"}\n\n${this.progressBarText(value)}\n${value}%`;
      this.audio.pattern("data");
      await wait(step.progressDelayMs || 650);
    }
    this.animations.flash("yellow");
    this.audio.pattern("scan");
    await wait(step.flashDelayMs || 900);
    const screens = step.screens || [
      "⚡ ПИКАЧУ СПАСЁН\nЭнергия восстановлена.",
      "Спасено покемонов\n\n1 / 6",
      "Получен\nпервый фрагмент\nглавного шифра.\n\n■ □ □ □ □ □",
      "Поиск нового сигнала..."
    ];
    for (const text of screens) {
      el.missionTitle.textContent = "";
      el.missionDescription.textContent = text;
      this.audio.pattern("success");
      await wait(step.screenDelayMs || 1900);
    }
    await wait(step.finalPauseMs || 2500);
    this.animations.transition("scan");
    this.stateMachine.next();
  }

  progressBarText(value) {
    const blocks = 10;
    const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * blocks);
    return `${"█".repeat(filled)}${"░".repeat(blocks - filled)}`;
  }

  enterMission(step) {
    const mission = this.missions.find((item) => Number(item.id) === Number(step.missionId));
    if (!mission) throw new Error(`Mission not found: ${step.missionId}`);
    this.activeMission = mission;
    this.activeMissionData = missionRuntimeData(mission);
    this.clearMissionTimers();
    this.missionPhase = this.activeMissionData.signalText ? "signal" : this.activeMissionData.briefingText ? "briefing" : "card";
    this.updateTeamHud();
    this.showView("missionView");
    el.missionFrame.hidden = Boolean(this.activeMissionData.briefingText);
    el.missionView?.classList?.toggle("briefing-mode", Boolean(this.activeMissionData.briefingText));
    el.missionView?.classList?.toggle("signal-mode", this.missionPhase === "signal");
    el.missionNumber.textContent = `${this.config.quest.missionLabel} ${String(this.missions.indexOf(mission) + 1).padStart(2, "0")} / ${String(this.missions.length).padStart(2, "0")}`;
    el.missionTitle.textContent = this.activeMissionData.title;
    if (this.missionPhase === "signal") {
      this.renderMissionSignal(0);
    } else {
      el.missionDescription.textContent = this.activeMissionData.briefingText || this.activeMissionData.description;
    }
    el.codeLabel.textContent = this.config.quest.inputLabel;
    el.codeLabel.hidden = true;
    el.secretCode.hidden = true;
    el.missionSecondaryAction.hidden = true;
    el.checkCode.hidden = this.missionPhase === "signal";
    el.checkCode.disabled = false;
    el.secretCode.disabled = false;
    el.missionSecondaryAction.disabled = false;
    el.checkCode.textContent = this.activeMissionData.actionButtonLabel || this.config.quest.checkButton;
    el.secretCode.value = this.enteredCodes?.[mission.id] || "";
    el.missionFeedback.textContent = "";
    el.missionFeedback.className = "mission-feedback";
    this.renderMedia("mission", mediaFromMission(mission));
    if (this.activeMissionData.audio) this.audio.play(this.activeMissionData.audio, "voice", "message");
    if (this.activeMissionData.backgroundMusic) this.audio.play(this.activeMissionData.backgroundMusic, "music", "message", { loop: true });
    this.updateProgress();
    this.debug.update();
    if (this.missionPhase === "signal") {
      this.startMissionSignalProgress();
    }
  }

  checkMissionCode() {
    if (this.stateMachine.current === "Challenge") {
      this.stateMachine.next();
      return;
    }
    if (this.stateMachine.current === "EnergyCheck") {
      this.runEnergySequence();
      return;
    }
    if (this.missionPhase === "briefing") {
      this.showMissionCardPrompt();
      return;
    }
    if (this.missionPhase === "card") {
      this.beginMissionCodeEntry();
      return;
    }
    const entered = normalizeCode(el.secretCode.value);
    if (entered === normalizeCode(this.config.settings.testModeCode)) {
      this.openTestPanel();
      return;
    }
    this.enteredCodes = this.enteredCodes || {};
    this.enteredCodes[this.activeMission.id] = el.secretCode.value;
    this.progress.save(this.snapshot());
    const expectedCode = this.activeMissionData?.code || missionRuntimeData(this.activeMission).code;
    if (entered !== normalizeCode(expectedCode)) {
      this.enterMissionFailed();
      return;
    }
    this.enterMissionSuccess();
  }

  showMissionBriefing() {
    if (this.missionPhase !== "signal") return;
    this.missionPhase = "briefing";
    this.clearMissionTimers();
    el.missionView?.classList?.remove("signal-mode");
    el.missionDescription.textContent = this.activeMissionData.briefingText || this.activeMissionData.description;
    el.checkCode.hidden = false;
    el.missionSecondaryAction.hidden = true;
    el.checkCode.textContent = this.activeMissionData.actionButtonLabel || this.config.quest.checkButton;
    this.animations.transition("scan");
    this.audio.pattern("data");
  }

  startMissionSignalProgress() {
    const duration = this.activeMissionData.signalProgressDurationMs || this.activeMissionData.signalDelayMs || 3000;
    const started = performance.now();
    this.renderMissionSignal(0);
    const timer = setInterval(() => {
      const progress = Math.min(100, Math.round(((performance.now() - started) / duration) * 100));
      this.renderMissionSignal(progress);
      if (progress >= 100) {
        this.clearMissionTimers();
        this.missionTimers.push(setTimeout(() => this.showMissionBriefing(), this.activeMissionData.signalHoldMs || 700));
      }
    }, 120);
    this.missionTimers.push(timer);
  }

  renderMissionSignal(progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0));
    const blocks = 10;
    const filled = Math.round((value / 100) * blocks);
    const bar = `${"█".repeat(filled)}${"░".repeat(blocks - filled)}`;
    const base = this.activeMissionData.signalText || "";
    el.missionDescription.textContent = `${base}\n\n${bar}\n${value}%`;
  }

  showMissionCardPrompt() {
    this.missionPhase = "card";
    el.missionFrame.hidden = false;
    el.missionView?.classList?.remove("briefing-mode");
    el.missionView?.classList?.remove("signal-mode");
    el.missionDescription.textContent = this.activeMissionData.codePromptText;
    el.codeLabel.hidden = true;
    el.secretCode.hidden = true;
    el.missionSecondaryAction.hidden = true;
    el.checkCode.textContent = this.activeMissionData.enterCodeButtonLabel || "ВВЕСТИ КОД";
    el.missionFeedback.textContent = "";
    el.missionFeedback.className = "mission-feedback";
    this.animations.transition("scan");
    this.audio.pattern("data");
  }

  clearMissionTimers() {
    this.missionTimers.forEach((timer) => clearTimeout(timer));
    this.missionTimers = [];
  }

  beginMissionCodeEntry() {
    this.missionPhase = "code";
    el.missionFrame.hidden = false;
    el.missionView?.classList?.remove("briefing-mode");
    el.missionView?.classList?.remove("signal-mode");
    el.missionDescription.textContent = this.activeMissionData.codeEntryText || this.codeEntryText();
    el.codeLabel.hidden = false;
    el.secretCode.hidden = false;
    el.missionSecondaryAction.hidden = true;
    el.checkCode.textContent = this.config.quest.checkButton;
    el.missionFeedback.textContent = "";
    el.missionFeedback.className = "mission-feedback";
    this.animations.transition("scan");
    this.audio.pattern("data");
    setTimeout(() => el.secretCode.focus({ preventScroll: true }), 250);
  }

  codeEntryText() {
    const length = String(this.activeMissionData.code || "").length || 4;
    return `${this.config.quest.inputLabel}\n\n${Array.from({ length }, () => "□").join(" ")}`;
  }

  enterMissionFailed() {
    this.events.emit({ type: "sound", source: this.config.audio.failed, fallback: "failed" });
    this.events.emit({ type: "vibrate", pattern: [45, 35, 45] });
    this.animations.flash("red");
    el.screen.classList.remove("error");
    void el.screen.offsetWidth;
    el.screen.classList.add("error");
    el.missionFeedback.textContent = this.config.quest.failureText;
    el.missionFeedback.className = "mission-feedback error";
    this.stateMachine.current = "MissionFailed";
    this.debug.update();
  }

  handleMissionSecondaryAction() {
    if (this.stateMachine.current !== "EnergyCheck") return;
    this.animations.flash("red");
    this.audio.pattern("failed");
    el.missionFeedback.textContent = "Сначала завершите испытание всей командой.";
    el.missionFeedback.className = "mission-feedback error";
  }

  async enterMissionSuccess() {
    this.stateMachine.current = "MissionSuccess";
    el.checkCode.disabled = true;
    el.secretCode.disabled = true;
    if (this.activeMission.countsAsRescue !== false) {
      this.completedMissionIds = [...new Set([...(this.completedMissionIds || []), this.activeMission.id])];
    }
    this.unlockAchievements(this.activeMission.id);
    this.saved = this.completedMissionIds.length;
    const missionData = this.activeMissionData || missionRuntimeData(this.activeMission);
    this.audio.play(missionData.successAudio || this.config.audio.success, "effects", "success");
    this.events.emit({ type: "vibrate", pattern: [30, 30, 70] });
    this.animations.flash("green");
    this.animations.transition("scan");
    this.updateProgress();
    el.missionFeedback.textContent = "ПРОВЕРКА...\n...";
    el.missionFeedback.className = "mission-feedback success";
    await wait(this.config.settings.verificationDelayMs || 1600);
    const postSuccessText = missionData.postSuccessText ?? "\n\nВосстанавливаю связь...";
    el.missionFeedback.textContent = `${missionData.successText}${postSuccessText}`;
    this.progress.save(this.snapshot());
    await wait(this.config.settings.nextMissionDelayMs);
    el.checkCode.disabled = false;
    el.secretCode.disabled = false;
    this.stateMachine.next();
  }

  enterVictory() {
    this.showView("finalView");
    if (this.team) this.team.status = this.config.team.finalStatus;
    el.finalEyebrow.textContent = this.config.final.eyebrow;
    el.finalTitle.textContent = this.config.final.title;
    el.finalTeamLabel.textContent = this.config.final.teamLabel;
    el.finalTeamName.textContent = this.team?.name ? `"${this.team.name}"` : "ОЖИДАНИЕ РЕГИСТРАЦИИ КОМАНДЫ";
    el.finalSquadNumber.textContent = `ОТРЯД №${this.team?.squadNumber || "---"}`;
    el.finalBecomes.textContent = this.config.final.becomesText;
    el.finalMasterTitle.textContent = this.config.team.finalStatus;
    el.finalTeamMessage.textContent = this.config.final.teamMessage;
    this.renderFinalMembers();
    this.renderCertificate();
    el.finalSeal.innerHTML = this.config.final.sealText.replace(/\n/g, "<br>");
    this.audio.play(this.config.audio.victory, "effects", "victory");
    this.vibrate([70, 35, 70, 35, 120]);
    this.animations.confetti();
    this.progress.save(this.snapshot());
  }

  renderFinalMembers() {
    el.finalMembers.textContent = "";
    const title = document.createElement("strong");
    title.textContent = this.config.final.membersTitle;
    el.finalMembers.appendChild(title);
    (this.team?.members || []).forEach((member) => {
      const row = document.createElement("div");
      row.textContent = member;
      el.finalMembers.appendChild(row);
    });
  }

  renderCertificate() {
    el.certificate.textContent = "";
    const date = new Date().toLocaleDateString("ru-RU");
    const lines = [
      this.config.final.certificateTitle,
      `Команда: "${this.team?.name || "-"}"`,
      `Отряд №${this.team?.squadNumber || "---"}`,
      this.config.final.certificateText,
      this.config.team.finalStatus,
      date
    ];
    lines.forEach((line, index) => {
      const node = document.createElement(index === 0 || index === 4 ? "strong" : "div");
      node.textContent = line;
      el.certificate.appendChild(node);
    });
  }

  unlockAchievements(missionId) {
    if (!this.team) return;
    const current = new Set(this.team.achievements || []);
    this.achievements
      .filter((achievement) => achievement.missionId === missionId)
      .forEach((achievement) => current.add(achievement.id));
    this.team.achievements = [...current];
  }

  renderMedia(target, media) {
    const frame = target === "mission" ? el.missionFrame : el.messageFrame;
    const fallback = target === "mission" ? el.missionFallback : el.messageFallback;
    const currentImage = target === "mission" ? el.missionImage : el.messageImage;
    const normalized = normalizeMedia(media);
    frame.querySelectorAll("video,.lottie-placeholder").forEach((node) => node.remove());
    currentImage.classList.remove("loaded");
    currentImage.hidden = true;
    fallback.dataset.label = normalized.alt || normalized.src || "MEDIA";
    if (normalized.type === "video") {
      const video = document.createElement("video");
      video.src = normalized.src;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      frame.appendChild(video);
      return;
    }
    if (normalized.type === "lottie") {
      const box = document.createElement("div");
      box.className = "lottie-placeholder";
      box.textContent = `LOTTIE: ${normalized.src}`;
      frame.appendChild(box);
      return;
    }
    currentImage.hidden = false;
    currentImage.alt = normalized.alt || "";
    currentImage.onload = () => currentImage.classList.add("loaded");
    currentImage.onerror = () => currentImage.classList.remove("loaded");
    currentImage.src = normalized.src;
  }

  updateProgress() {
    const rescueMissions = this.missions.filter((mission) => mission.countsAsRescue !== false);
    const total = rescueMissions.length || 1;
    this.saved = this.completedMissionIds?.length || this.saved || 0;
    el.savedCounter.textContent = `${this.saved} / ${rescueMissions.length}`;
    el.progressBar.style.width = `${(this.saved / total) * 100}%`;
    const rankIndex = Math.min((this.config.ranks || []).length - 1, Math.floor((this.saved / total) * (this.config.ranks || []).length));
    el.teamRank.textContent = this.config.ranks[rankIndex] || "";
    this.updateTeamHud();
  }

  updateTeamHud() {
    el.squadHud.textContent = this.team?.squadNumber ? `ОТРЯД №${this.team.squadNumber}` : "ОТРЯД ---";
  }

  showView(id) {
    this.animations.transition("refresh");
    el.views.forEach((view) => view.classList.toggle("active", view.id === id));
  }

  react(type, options = {}) {
    const reactions = {
      input: { sound: "button" },
      scan: { sound: "scan", transition: "scan" },
      data: { sound: "data" },
      success: { sound: "success", flash: "green", transition: "scan", vibrate: [30, 30, 70] },
      error: { sound: "failed", flash: "red", screen: "error", vibrate: [45, 35, 45] }
    };
    const reaction = reactions[type] || reactions.input;
    if (reaction.flash) this.animations.flash(reaction.flash);
    if (reaction.transition && !options.quiet) this.animations.transition(reaction.transition);
    if (reaction.screen) this.animations.screen(reaction.screen, 420);
    if (reaction.sound && !options.quiet) this.audio.pattern(reaction.sound);
    if (reaction.vibrate) this.vibrate(reaction.vibrate);
  }

  vibrate(pattern) {
    if (this.config.settings.enableVibration && "vibrate" in navigator) navigator.vibrate(pattern);
  }

  typeLine(target, text, speed) {
    target.textContent = "";
    [...text].forEach((character, index) => {
      setTimeout(() => {
        target.textContent += character;
        if (index % 4 === 0) this.audio.tone(620 + index * 7, 0.018, "square", 0.018);
      }, index * speed);
    });
  }
}

function normalizeMedia(media) {
  if (typeof media === "string") return { type: typeFromSource(media), src: media };
  return { type: media.type || typeFromSource(media.src), ...media };
}

function mediaFromMission(mission) {
  const data = missionRuntimeData(mission);
  const source = data.slides?.[0] || data.image || data.background;
  return { type: typeFromSource(source), src: source, alt: data.title };
}

function missionRuntimeData(mission = {}) {
  const card = mission.pokemonCard || {};
  const successScreen = mission.successScreen || {};
  return {
    id: mission.id,
    title: mission.title || card.name || "",
    description: mission.missionDescription || mission.description || card.description || "",
    pokemon: mission.pokemon || card.name || mission.title || "",
    image: mission.image || card.image || mission.background || "",
    background: mission.background || "",
    icon: mission.icon || "",
    slides: mission.slides || [],
    audio: mission.audio_before || mission.audio || "",
    successAudio: mission.audio_after || card.voice || mission.successAudio || "",
    backgroundMusic: mission.backgroundMusic || "",
    code: mission.cardCode || card.code || mission.code || "",
    fragmentIndex: mission.fragmentIndex || "",
    missionType: mission.missionType || mission.type || "team",
    briefingText: mission.briefingText || "",
    signalText: mission.signalText || "",
    signalDelayMs: mission.signalDelayMs || 0,
    signalProgressDurationMs: mission.signalProgressDurationMs || 0,
    signalHoldMs: mission.signalHoldMs || 0,
    actionButtonLabel: mission.actionButtonLabel || "",
    codePromptText: mission.codePromptText || "",
    enterCodeButtonLabel: mission.enterCodeButtonLabel || "",
    codeEntryText: mission.codeEntryText || "",
    postSuccessText: mission.postSuccessText,
    successText: successScreen.text || mission.successText || card.description || "",
    successEffect: successScreen.effect || card.successEffect || "success"
  };
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

function typeFromSource(source = "") {
  if (/\.(mp4|webm|mov)$/i.test(source)) return "video";
  if (/\.json$/i.test(source)) return "lottie";
  return "image";
}

function normalizeCode(value) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

function sanitizeTeamName(value) {
  return String(value || "")
    .replace(/[<>`{}[\]\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

function sanitizePersonName(value) {
  return String(value || "")
    .replace(/[<>`{}[\]\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const app = new QuestApp();
window.app = app;
app.init().catch((error) => {
  console.error(error);
  el.bootLogo.classList.add("visible");
  el.bootTitle.textContent = "ENGINE ERROR";
  el.bootStatus.textContent = "Проверьте JSON-файлы и консоль браузера.";
});
