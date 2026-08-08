const CACHE_NAME = "pokedex-secret-link-v38";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./admin.css",
  "./admin.js",
  "./admin.js?v=mission2-button1",
  "./style.css",
  "./script.js",
  "./script.js?v=mission2-button1",
  "./config.json",
  "./missions.json",
  "./flow.json",
  "./achievements.json",
  "./content/project.json",
  "./content/screens.json",
  "./content/texts.json",
  "./content/images.json",
  "./content/audio.json",
  "./content/effects.json",
  "./content/codes.json",
  "./manifest.json",
  "./timelines/oak_intro.json",
  "./timelines/oak_after_pikachu.json",
  "./images/icon.svg",
  "./images/icon-maskable.svg",
  "./images/logo.svg",
  "./images/boot.svg",
  "./images/incoming.svg",
  "./images/professor-oak.png",
  "./images/victory.svg",
  "./images/badge01.svg",
  "./images/badge02.svg",
  "./images/badge03.svg",
  "./images/message01.svg",
  "./images/message02.svg",
  "./images/message03.svg",
  "./images/message04.svg",
  "./images/message05.svg",
  "./images/mission01.svg",
  "./images/mission02.svg",
  "./images/mission03.svg",
  "./images/mission04.svg",
  "./images/mission05.svg",
  "./images/mission06.svg",
  "./images/mission07.svg",
  "./images/mission08.svg",
  "./audio/power.wav",
  "./audio/boot.wav",
  "./audio/button.wav",
  "./audio/incoming.wav",
  "./audio/oak_message.wav",
  "./audio/oak01.mp3",
  "./audio/oak02.mp3",
  "./audio/oak03.mp3",
  "./audio/oak04.mp3",
  "./audio/oak05.mp3",
  "./audio/oak06.mp3",
  "./audio/oak07.mp3",
  "./audio/oak08.mp3",
  "./audio/oak09.mp3",
  "./audio/oak10.mp3",
  "./audio/oak11.mp3",
  "./audio/oak12.mp3",
  "./audio/scan.wav",
  "./audio/connect.wav",
  "./audio/data.wav",
  "./audio/ambient_hum.wav",
  "./audio/mission01.wav",
  "./audio/mission02.wav",
  "./audio/mission03.wav",
  "./audio/mission04.wav",
  "./audio/mission05.wav",
  "./audio/mission06.wav",
  "./audio/mission07.wav",
  "./audio/mission08.wav",
  "./audio/mission_success.wav",
  "./audio/mission_failed.wav",
  "./audio/victory.wav"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => (
      Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset)))
    ))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => (
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const networkFirst = event.request.mode === "navigate" || /\.(html|css|js|json|webmanifest)$/i.test(url.pathname);

  event.respondWith(
    networkFirst ? fromNetworkThenCache(event.request) : fromCacheThenNetwork(event.request)
  );
});

function fromNetworkThenCache(request) {
  return fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return response;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")));
}

function fromCacheThenNetwork(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;

    return fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match("./index.html"));
  });
}
