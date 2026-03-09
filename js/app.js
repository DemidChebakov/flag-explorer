import { continents, getAllCountries } from "./countries.js";
import {
  initI18n,
  setLanguage,
  t,
  getLang,
  onLanguageChange,
  SUPPORTED_LANGS,
  LANG_NAMES,
} from "./i18n.js";
import { loadFacts, getCountryFacts } from "./facts.js";

const MIN_SLOTS = 2;
const MAX_SLOTS = 4;

// Load saved slots or default to Romania vs Chad
let slots = JSON.parse(localStorage.getItem("fc-slots")) || ["ro", "td"];
let openDropdownIdx = null;

function saveSlots() {
  localStorage.setItem("fc-slots", JSON.stringify(slots));
}

// Theme: 'system' | 'light' | 'dark'
function getTheme() {
  return localStorage.getItem("fc-theme") || "system";
}

function applyTheme(theme) {
  localStorage.setItem("fc-theme", theme);
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function getEffectiveTheme() {
  const theme = getTheme();
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function cycleTheme() {
  const next = getEffectiveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  renderApp();
}

// Apply saved theme on load
applyTheme(getTheme());

function getFlagUrl(code, size = "w640") {
  return `https://flagcdn.com/${size}/${code}.png`;
}

function getFlagThumb(code) {
  return `https://flagcdn.com/24x18/${code}.png`;
}

function getCountryName(country) {
  return country.name[getLang()] || country.name.en;
}

function renderApp() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderHeader());
  app.appendChild(renderGrid());
}

function renderHeader() {
  const header = document.createElement("div");
  header.className = "header";

  header.innerHTML = `
    <h1>${t("appTitle")}</h1>
    <div class="header-actions">
      <button class="btn btn-primary" id="btn-random">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line>
          <polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line>
          <line x1="4" y1="4" x2="9" y2="9"></line>
        </svg>
        <span class="btn-text">${t("randomize")}</span>
      </button>
      ${
        slots.length < MAX_SLOTS
          ? `
        <button class="btn btn-secondary" id="btn-add">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span class="btn-text">${t("addPosition")}</span>
        </button>
      `
          : ""
      }
      <button class="btn btn-icon btn-secondary" id="btn-theme" title="Theme">
        ${
          getEffectiveTheme() === "dark"
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        }
      </button>
      <div class="lang-select" id="lang-select">
        <button class="lang-btn" id="lang-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span class="lang-name">${LANG_NAMES[getLang()]}</span>
        </button>
        <div class="lang-dropdown" id="lang-dropdown">
          ${SUPPORTED_LANGS.map(
            (l) => `
            <button class="lang-option ${l === getLang() ? "active" : ""}" data-lang="${l}">${LANG_NAMES[l]}</button>
          `,
          ).join("")}
        </div>
      </div>
    </div>
  `;

  header.querySelector("#btn-random")?.addEventListener("click", randomize);
  header.querySelector("#btn-add")?.addEventListener("click", addSlot);
  header.querySelector("#btn-theme")?.addEventListener("click", cycleTheme);

  const langBtn = header.querySelector("#lang-btn");
  const langDropdown = header.querySelector("#lang-dropdown");
  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle("open");
  });

  langDropdown.querySelectorAll(".lang-option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await setLanguage(btn.dataset.lang);
    });
  });

  return header;
}

function renderGrid() {
  const grid = document.createElement("div");
  grid.className = `flags-grid${slots.length === 3 ? " cols-3" : slots.length === 4 ? " cols-4" : ""}`;

  slots.forEach((code, idx) => {
    grid.appendChild(renderCard(code, idx));
  });

  return grid;
}

function renderCard(code, idx) {
  const card = document.createElement("div");
  card.className = "flag-card";

  const country = code ? getAllCountries().find((c) => c.code === code) : null;

  card.innerHTML = `
    <div class="flag-image-wrap">
      ${
        country
          ? `<img src="${getFlagUrl(code)}" alt="${getCountryName(country)}" loading="lazy">`
          : `<div class="flag-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            ${t("selectCountry")}
          </div>`
      }
    </div>
    <div class="card-body">
      <div class="country-selector" data-idx="${idx}"></div>
    </div>
    <div class="card-footer">
      ${
        country
          ? `
        <button class="btn-info" data-info="${idx}" title="${t("viewOnMap")}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </button>
      `
          : "<span></span>"
      }
      ${
        slots.length > MIN_SLOTS
          ? `
        <button class="btn-remove" data-remove="${idx}">${t("removePosition")}</button>
      `
          : ""
      }
    </div>
  `;

  const selectorContainer = card.querySelector(".country-selector");
  selectorContainer.appendChild(createSelector(idx, code));

  card
    .querySelector("[data-remove]")
    ?.addEventListener("click", () => removeSlot(idx));

  const infoBtn = card.querySelector("[data-info]");
  if (infoBtn && country) {
    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleInfoPopup(infoBtn, country);
    });
  }

  return card;
}

function createSelector(idx, selectedCode) {
  const wrapper = document.createElement("div");
  const lang = getLang();

  const trigger = document.createElement("button");
  trigger.className = "selector-trigger";
  const selectedCountry = selectedCode
    ? getAllCountries().find((c) => c.code === selectedCode)
    : null;
  trigger.innerHTML = `
    <span class="selected-name">${selectedCountry ? getCountryName(selectedCountry) : t("selectCountry")}</span>
    <span class="arrow">&#9660;</span>
  `;

  const dropdown = document.createElement("div");
  dropdown.className = "selector-dropdown";

  const searchWrap = document.createElement("div");
  searchWrap.className = "selector-search";
  searchWrap.innerHTML = `<input type="text" placeholder="${t("searchPlaceholder")}" autocomplete="off" spellcheck="false">`;

  const list = document.createElement("div");
  list.className = "selector-list";

  dropdown.appendChild(searchWrap);
  dropdown.appendChild(list);
  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);

  let highlighted = -1;
  let flatItems = [];

  function populateList(filter = "") {
    list.innerHTML = "";
    flatItems = [];
    highlighted = -1;
    const lower = filter.toLowerCase();

    continents.forEach((cont) => {
      const filtered = cont.countries.filter((c) => {
        const name = getCountryName(c);
        return name.toLowerCase().includes(lower);
      });
      if (filtered.length === 0) return;

      const groupLabel = document.createElement("div");
      groupLabel.className = "selector-group-label";
      groupLabel.textContent = t(cont.id);
      list.appendChild(groupLabel);

      filtered.forEach((c) => {
        const item = document.createElement("button");
        item.className = `selector-item${c.code === selectedCode ? " selected" : ""}`;
        item.innerHTML = `<img src="${getFlagThumb(c.code)}" alt="" loading="lazy"> ${getCountryName(c)}`;
        item.addEventListener("click", () => {
          selectCountry(idx, c.code);
        });
        list.appendChild(item);
        flatItems.push(item);
      });
    });

    if (flatItems.length === 0) {
      list.innerHTML = `<div class="selector-empty">${t("noResults")}</div>`;
    }
  }

  function updateHighlight(newIdx) {
    if (flatItems[highlighted])
      flatItems[highlighted].classList.remove("highlighted");
    highlighted = newIdx;
    if (flatItems[highlighted]) {
      flatItems[highlighted].classList.add("highlighted");
      flatItems[highlighted].scrollIntoView({ block: "nearest" });
    }
  }

  function openSelector() {
    if (openDropdownIdx !== null && openDropdownIdx !== idx) {
      closeAllDropdowns();
    }
    openDropdownIdx = idx;
    dropdown.classList.add("open");
    trigger.classList.add("open");
    populateList();
    const input = searchWrap.querySelector("input");
    input.value = "";
    setTimeout(() => input.focus(), 10);
  }

  function closeSelector() {
    dropdown.classList.remove("open");
    trigger.classList.remove("open");
    if (openDropdownIdx === idx) openDropdownIdx = null;
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.classList.contains("open")) {
      closeSelector();
    } else {
      openSelector();
    }
  });

  dropdown.addEventListener("click", (e) => e.stopPropagation());

  searchWrap.querySelector("input").addEventListener("input", (e) => {
    populateList(e.target.value);
  });

  searchWrap.querySelector("input").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      updateHighlight(Math.min(highlighted + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateHighlight(Math.max(highlighted - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      flatItems[highlighted]?.click();
    } else if (e.key === "Escape") {
      closeSelector();
    }
  });

  return wrapper;
}

function closeAllDropdowns() {
  document
    .querySelectorAll(".selector-dropdown.open")
    .forEach((d) => d.classList.remove("open"));
  document
    .querySelectorAll(".selector-trigger.open")
    .forEach((t) => t.classList.remove("open"));
  openDropdownIdx = null;
}

function closeAllInfoPopups() {
  document.querySelectorAll(".info-popup").forEach((p) => p.remove());
}

function toggleInfoPopup(anchorEl, country) {
  const existing = anchorEl.parentElement.querySelector(".info-popup");
  if (existing) {
    existing.remove();
    return;
  }
  closeAllInfoPopups();

  const name = getCountryName(country);
  const facts = getCountryFacts(country.code);
  const mapsUrl = `https://www.google.com/maps/place/${encodeURIComponent(name)}`;

  const popup = document.createElement("div");
  popup.className = "info-popup";
  popup.innerHTML = `
    <div class="info-popup-header">
      <span class="info-popup-title">${t("quickFacts")}</span>
      <button class="info-popup-close">&times;</button>
    </div>
    ${
      facts
        ? `
      <div class="info-popup-body">
        <p class="info-popup-fact">${facts.fact}</p>
        <div class="info-popup-stats">
          <div class="info-stat">
            <span class="info-stat-label">${t("capital")}</span>
            <span class="info-stat-value">${facts.capital}</span>
          </div>
          <div class="info-stat">
            <span class="info-stat-label">${t("population")}</span>
            <span class="info-stat-value">${facts.population}</span>
          </div>
          <div class="info-stat">
            <span class="info-stat-label">${t("area")}</span>
            <span class="info-stat-value">${facts.area}</span>
          </div>
        </div>
      </div>
    `
        : ""
    }
    <a class="info-popup-link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ${t("viewOnMap")}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  `;
  popup.addEventListener("click", (e) => e.stopPropagation());
  popup
    .querySelector(".info-popup-close")
    .addEventListener("click", () => popup.remove());

  anchorEl.parentElement.style.position = "relative";
  anchorEl.parentElement.appendChild(popup);
}

function selectCountry(idx, code) {
  slots[idx] = code;
  saveSlots();
  closeAllDropdowns();
  renderApp();
}

function addSlot() {
  if (slots.length >= MAX_SLOTS) return;
  slots.push(null);
  saveSlots();
  renderApp();
}

function removeSlot(idx) {
  if (slots.length <= MIN_SLOTS) return;
  slots.splice(idx, 1);
  saveSlots();
  renderApp();
}

function randomize() {
  const all = getAllCountries();
  const used = new Set();
  slots = slots.map(() => {
    let c;
    do {
      c = all[Math.floor(Math.random() * all.length)];
    } while (used.has(c.code));
    used.add(c.code);
    return c.code;
  });
  saveSlots();
  renderApp();
}

// Close dropdowns and popups on outside click
document.addEventListener("click", () => {
  closeAllDropdowns();
  closeAllInfoPopups();
});

// Init
(async () => {
  await initI18n();
  await loadFacts(getLang());
  renderApp();
  onLanguageChange(async (lang) => {
    await loadFacts(lang);
    renderApp();
  });
})();
