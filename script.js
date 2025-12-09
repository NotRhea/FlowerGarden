
const DECAY_PER_HOUR = 3;
const WATER_BOOST = 20;
const SUN_BOOST = 8;
const TALK_BOOST = 5;

const FLOWER_COLORS = [
  "#ffbb00",
  "#fc0384",
  "#fc7b03",
  "#3103fc",
  "#82009c"
];

const STORAGE_KEY = "virtual_garden_flowers_v1";
const MAX_ORBIT_FRUITS = 8;
const MAX_GROUND_FRUITS = 10;

const IDLE_MS = 15000; 
let idleTimer = null;

let plants = [];
let gardenMaxed = false;   
let fiveFullShown = false; 
let lastVisit = null;

function now() {
  return Date.now();
}

function saveGarden() {
  const state = {
    plants,
    gardenMaxed,
    fiveFullShown,
    lastVisit: now()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    
  }
}

function loadGarden() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      plants = state.plants || [];
      gardenMaxed = !!state.gardenMaxed;
      fiveFullShown = !!state.fiveFullShown;
      lastVisit = state.lastVisit || now();
    } else {
      plants = [];
      gardenMaxed = false;
      fiveFullShown = false;
      lastVisit = now();
    }
  } catch (e) {
    plants = [];
    gardenMaxed = false;
    fiveFullShown = false;
    lastVisit = now();
  }

  const elapsedHours = (now() - lastVisit) / (1000 * 60 * 60);
  if (elapsedHours > 0.05 && plants.length) {
    applyDecay(elapsedHours, true); 
  } else {
    lastVisit = now();
    saveGarden();
    renderGarden();
  }
}

function pickColor() {
  const i = Math.floor(Math.random() * FLOWER_COLORS.length);
  return FLOWER_COLORS[i];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function log(msg) {
  const box = document.getElementById("logBox");
  const p = document.createElement("p");
  p.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
}

function showDeathPopup() {
  document.getElementById("deathPopup").classList.add("show");
}
function hideDeathPopup() {
  document.getElementById("deathPopup").classList.remove("show");
}

function showMaxPopup() {
  document.getElementById("maxPopup").classList.add("show");
}
function hideMaxPopup() {
  document.getElementById("maxPopup").classList.remove("show");
}

function showFivePopup() {
  document.getElementById("fivePopup").classList.add("show");
}
function hideFivePopup() {
  document.getElementById("fivePopup").classList.remove("show");
}

function showIdlePopup() {
  document.getElementById("idlePopup").classList.add("show");
}
function hideIdlePopup() {
  document.getElementById("idlePopup").classList.remove("show");
  resetIdleTimer(); 
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    showIdlePopup();
  }, IDLE_MS);
}

function checkFiveFull() {
  if (fiveFullShown) return;
  const count = plants.filter(p => !p.isDead && p.health >= 100).length;
  if (count >= 5) {
    fiveFullShown = true;
    log("You fully grew 5 flowers.");
    showFivePopup();
    saveGarden();
  }
}

function addPlant() {
  const plant = {
    id: "p_" + Math.random().toString(16).slice(2),
    name: "Plant " + (plants.length + 1),
    health: 30,
    baseColor: pickColor(),
    isDead: false,
    fruits: 0,
    fallenFruits: 0
  };
  plants.push(plant);
  log("Planted " + plant.name);
  saveGarden();
  renderGarden();

 
  requestAnimationFrame(() => {
    const el = document.querySelector('.plant[data-id="' + plant.id + '"]');
    if (el) {
      el.classList.add("just-planted");
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
      setTimeout(() => el.classList.remove("just-planted"), 700);
    }
  });

  resetIdleTimer();
}

function nameLastFlower() {
  const input = document.getElementById("nameInput");
  const name = input.value.trim();
  if (!name) return;
  if (!plants.length) return;

  const last = plants[plants.length - 1];
  last.name = name;
  log("You named your last flower: " + name);
  saveGarden();
  renderGarden();

  const flowerEl = document.querySelector(
    '.plant[data-id="' + last.id + '"] .flower'
  );
  if (flowerEl) {
    flowerEl.classList.add("shake-once");
    setTimeout(() => flowerEl.classList.remove("shake-once"), 450);
  }
  input.value = "";
}

function triggerWaterAnimation() {
  const overlay = document.getElementById("waterOverlay");
  if (!overlay) return;

  overlay.innerHTML = "";
  overlay.classList.add("show");

  const dropsCount = 20;
  for (let i = 0; i < dropsCount; i++) {
    const d = document.createElement("div");
    d.className = "water-drop";
    const left = Math.random() * 100;
    d.style.left = left + "%";
    d.style.animationDelay = (Math.random() * 0.25).toFixed(2) + "s";
    overlay.appendChild(d);
  }

  setTimeout(() => {
    overlay.classList.remove("show");
    overlay.innerHTML = "";
  }, 1100);
}

function waterAll() {
  if (!plants.length) return;

  triggerWaterAnimation();
  resetIdleTimer();

  const wasGardenMaxed = gardenMaxed;

  plants.forEach((p) => {
    if (!p.isDead) {
      p.health = clamp(p.health + WATER_BOOST, 0, 100);
    }
  });

  const alive = plants.filter((p) => !p.isDead);
  if (alive.length && alive.every((p) => p.health >= 100)) {
    if (!gardenMaxed) {
      gardenMaxed = true;
      log("All your flowers reached maximum height.");
      showMaxPopup();
    }
  }

  if (wasGardenMaxed) {
    alive.forEach((p) => {
      if (p.health >= 100) {
        if (p.fruits == null) p.fruits = 0;
        if (p.fallenFruits == null) p.fallenFruits = 0;

        if (p.fruits < MAX_ORBIT_FRUITS) {
          p.fruits += 1;
        } else if (p.fallenFruits < MAX_GROUND_FRUITS) {
          p.fallenFruits += 1;
        }
      }
    });
    log("You watered fully grown flowers – fruits appeared (or fell).");
  } else {
    log("You watered the plants.");
  }

  checkFiveFull();
  saveGarden();
  renderGarden();
}

function sunAll() {
  if (!plants.length) return;
  plants.forEach((p) => {
    if (!p.isDead) {
      p.health = clamp(p.health + SUN_BOOST, 0, 100);
    }
  });
  log("You gave them sunlight.");
  checkFiveFull();
  saveGarden();
  renderGarden();
  resetIdleTimer();
}

function talkAll() {
  const input = document.getElementById("talkInput");
  const msg = input.value.trim();
  if (!msg) return;
  if (!plants.length) return;

  let anyAlive = plants.some((p) => !p.isDead);
  if (!anyAlive) {
    log('You said "' + msg + '", but only graves are left.');
    input.value = "";
    return;
  }

  plants.forEach((p) => {
    if (!p.isDead) {
      p.health = clamp(p.health + TALK_BOOST, 0, 100);
    }
  });
  log('You said: "' + msg + '". The garden glows a little.');

  checkFiveFull();
  saveGarden();
  renderGarden();

  const flowers = document.querySelectorAll(".flower");
  flowers.forEach((f) => f.classList.add("radiant"));
  setTimeout(() => {
    flowers.forEach((f) => f.classList.remove("radiant"));
  }, 2500);

  input.value = "";
  resetIdleTimer();
}

function applyDecay(hours, fromLoad = false) {
  let killedNow = 0;
  plants.forEach((p) => {
    if (p.isDead) return;
    p.health -= hours * DECAY_PER_HOUR;
    if (p.health <= 0) {
      p.health = 0;
      p.isDead = true;
      killedNow++;
    }
  });
  lastVisit = now();
  saveGarden();
  renderGarden();
  if (killedNow > 0 && !fromLoad) {
    log(killedNow + " flower(s) died.");
    showDeathPopup();
  }
}

function fastForward(hours) {
  applyDecay(hours, false);
  resetIdleTimer();
}

function mixHex(a, b, t) {
  function hexToRgb(hex) {
    hex = hex.replace("#", "");
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const b2 = Math.round(A.b + (B.b - A.b) * t);
  return (
    "#" +
    [r, g, b2]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function renderGarden() {
  const cont = document.getElementById("gardenPlants");
  const empty = document.getElementById("emptyState");
  const summary = document.getElementById("gardenSummary");
  const graveBox = document.getElementById("graveyardBox");

  cont.innerHTML = "";

  if (!plants.length) {
    empty.style.display = "flex";
    summary.textContent = "No plants yet.";
    graveBox.textContent = "No graves yet 👼";
    return;
  } else {
    empty.style.display = "none";
  }

  let aliveCount = 0;
  let deadCount = 0;

  plants.forEach((p) => {
    const plantEl = document.createElement("div");
    plantEl.className = "plant";
    plantEl.dataset.id = p.id;

    if (p.isDead) {
      deadCount++;
      plantEl.classList.add("dead");

      const grave = document.createElement("div");
      grave.className = "grave";
      plantEl.appendChild(grave);

      const label = document.createElement("div");
      label.className = "plant-label";
      label.textContent = p.name;
      plantEl.appendChild(label);

      cont.appendChild(plantEl);
      return;
    } else {
      aliveCount++;
    }

    const inner = document.createElement("div");
    inner.className = "plant-inner";

    const ratio = clamp(p.health, 0, 100) / 100;

    const stem = document.createElement("div");
    stem.className = "stem";
    const minStem = 10;
    const maxStem = 260;
    stem.style.height = minStem + ratio * (maxStem - minStem) + "px";

    const base = p.baseColor;
    const highlight = mixHex(base, "#ffffff", 0.2);

    const minSize = 12;
    const maxSize = 110;
    const size = minSize + ratio * (maxSize - minSize);

    const wrapper = document.createElement("div");
    wrapper.className = "flower-wrapper";
    wrapper.style.width = size + "px";
    wrapper.style.height = size + "px";

    const flower = document.createElement("div");
    flower.className = "flower";
    flower.style.width = size + "px";
    flower.style.height = size + "px";
    flower.style.background =
      "radial-gradient(circle at 30% 30%, " +
      highlight +
      ", " +
      base +
      ")";

    let fruitLayer = null;
    if (p.fruits && p.fruits > 0) {
      fruitLayer = document.createElement("div");
      fruitLayer.className = "fruit-layer";

      const fruitCount = Math.min(p.fruits, MAX_ORBIT_FRUITS);
      const fruitColors = ["#ff7b00", "#ff3b3b"];
      const radius = size / 2 + 6;

      for (let i = 0; i < fruitCount; i++) {
        const fruit = document.createElement("div");
        fruit.className = "fruit";
        const col = fruitColors[i % fruitColors.length];
        fruit.style.background = col;

        const angle =
          (i / fruitCount) * Math.PI * 2 +
          (parseInt(p.id.slice(-2), 16) % 360) * (Math.PI / 180);

        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;

        fruit.style.left = "50%";
        fruit.style.top = "50%";
        fruit.style.transform =
          "translate(" + dx + "px," + dy + "px) translate(-50%, -50%)";

        fruitLayer.appendChild(fruit);
      }
    }

    if (p.health < 30) {
      plantEl.classList.add("critical");
    } else if (p.health < 60) {
      plantEl.classList.add("low-health");
    }

    const fallenCount = p.fallenFruits || 0;
    let groundLayer = null;
    if (fallenCount > 0) {
      groundLayer = document.createElement("div");
      groundLayer.className = "ground-fruit-layer";
      const fruitColors = ["#ff7b00", "#ff3b3b"];
      const maxSpread = 70;

      for (let i = 0; i < fallenCount; i++) {
        const gf = document.createElement("div");
        gf.className = "ground-fruit";
        gf.style.background = fruitColors[i % fruitColors.length];

        const x = 5 + Math.random() * (maxSpread - 10);
        gf.style.left = x + "px";

        groundLayer.appendChild(gf);
      }
    }

    if (fruitLayer) wrapper.appendChild(fruitLayer);
    wrapper.appendChild(flower);

    if (groundLayer) inner.appendChild(groundLayer);
    inner.appendChild(stem);
    inner.appendChild(wrapper);

    plantEl.appendChild(inner);

    const label = document.createElement("div");
    label.className = "plant-label";
    label.textContent = p.name;
    plantEl.appendChild(label);

    cont.appendChild(plantEl);
  });

  summary.textContent = aliveCount + " alive, " + deadCount + " graves";

  const deadPlants = plants.filter((p) => p.isDead);
  if (!deadPlants.length) {
    graveBox.textContent = "No graves yet 👼";
  } else {
    graveBox.innerHTML = "";
    deadPlants.forEach((p) => {
      const row = document.createElement("div");
      row.className = "grave-item";
      row.textContent = "⚰️ " + p.name;
      graveBox.appendChild(row);
    });
  }
}

function init() {
  document
    .getElementById("addPlantBtn")
    .addEventListener("click", addPlant);
  document
    .getElementById("nameBtn")
    .addEventListener("click", nameLastFlower);
  document
    .getElementById("waterBtn")
    .addEventListener("click", waterAll);
  document.getElementById("sunBtn").addEventListener("click", sunAll);
  document.getElementById("talkBtn").addEventListener("click", talkAll);
  document
    .getElementById("ff1Btn")
    .addEventListener("click", function () {
      fastForward(24);
    });
  document
    .getElementById("ff3Btn")
    .addEventListener("click", function () {
      fastForward(72);
    });

  document
    .getElementById("deathPopupClose")
    .addEventListener("click", hideDeathPopup);
  document
    .getElementById("maxPopupClose")
    .addEventListener("click", hideMaxPopup);
  document
    .getElementById("fivePopupClose")
    .addEventListener("click", hideFivePopup);
  document
    .getElementById("idlePopupClose")
    .addEventListener("click", hideIdlePopup);

  loadGarden();
  resetIdleTimer();
}

window.addEventListener("DOMContentLoaded", init);
