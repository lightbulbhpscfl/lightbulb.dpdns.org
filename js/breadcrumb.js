(function () {

  // ═══════════════════════════════════════════════════════
  //  CONFIG — change these without touching anything else
  // ═══════════════════════════════════════════════════════
  var GEAR_ICON_URL = "/global-icons/gear.svg";   // path to gear SVG
  var DROPDOWN_LABEL = "Settings";                 // tooltip / aria-label


  // ═══════════════════════════════════════════════════════
  //  THEME — apply saved value immediately (before paint)
  // ═══════════════════════════════════════════════════════
  (function applyThemeEarly() {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  })();


  // ═══════════════════════════════════════════════════════
  //  BREADCRUMB
  // ═══════════════════════════════════════════════════════
  function buildBreadcrumb(bc) {
    var homeLink = document.createElement("a");
    homeLink.href = "/";

    var logo = document.createElement("img");
    logo.src = "/logo-mid-res.png";
    logo.alt = "lightbulb.dpdns.org";
    logo.className = "topbar-logo";
    logo.onerror = function () {
      homeLink.textContent = "lightbulb.dpdns.org";
      if (logo.parentNode) homeLink.removeChild(logo);
    };
    homeLink.appendChild(logo);
    bc.appendChild(homeLink);

    var segments = window.location.pathname.split("/").filter(Boolean);
    var builtPath = "";
    var acronyms = new Set(["HPS","MH","LPS","CMH","MV","CFL","PL","HID","PSMH"]);

    function formatName(seg) {
      return decodeURIComponent(seg)
        .replace(/--/g, " - ")
        .replace(/[-_]/g, " ")
        .replace(/\.\w+$/, "")
        .split(/\s+/)
        .map(function (word) {
          var upper = word.toUpperCase();
          return acronyms.has(upper)
            ? upper
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
    }

    segments.forEach(function (seg) {
      builtPath += "/" + seg;
      var sep = document.createElement("span");
      sep.className = "topbar-sep";
      sep.textContent = "→";
      bc.appendChild(sep);

      var link = document.createElement("a");
      link.href = builtPath;
      link.textContent = formatName(seg);
      bc.appendChild(link);
    });
  }


  // ═══════════════════════════════════════════════════════
  //  SETTINGS DROPDOWN
  // ═══════════════════════════════════════════════════════
  function buildSettings(bc) {

    // ── Inline styles (keeps everything self-contained) ──
    var style = document.createElement("style");
    style.textContent = [
      ".settings-wrap{position:relative;margin-left:auto;flex-shrink:0;}",

      /* Gear button */
      ".settings-btn{",
      "  background:none;border:none;cursor:pointer;",
      "  display:flex;align-items:center;justify-content:center;",
      "  padding:4px;border-radius:6px;",
      "  opacity:0.65;transition:opacity 0.2s,transform 0.4s;",
      "}",
      ".settings-btn:hover{opacity:1;}",
      ".settings-btn img{width:20px;height:20px;display:block;}",
      /* Rotate gear when open */
      ".settings-btn.open{transform:rotate(60deg);opacity:1;}",

      /* Dropdown panel */
      ".settings-panel{",
      "  display:none;position:absolute;right:0;top:calc(100% + 8px);",
      "  background:var(--settings-panel-bg,#fff);",
      "  border:1.5px solid var(--dice-border);",
      "  border-radius:12px;padding:12px 14px;",
      "  box-shadow:0 8px 24px rgba(0,0,0,0.18);",
      "  min-width:180px;z-index:2000;",
      "  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);",
      "}",
      ".settings-panel.open{display:block;}",

      /* Panel background auto-colours */
      ":root:not([data-theme]) .settings-panel,",
      "[data-theme='light'] .settings-panel{--settings-panel-bg:rgba(241,245,249,0.95);}",
      "[data-theme='dark']  .settings-panel{--settings-panel-bg:rgba(15,23,42,0.95);}",
      "@media(prefers-color-scheme:dark){",
      "  :root:not([data-theme]) .settings-panel{--settings-panel-bg:rgba(15,23,42,0.95);}",
      "}",

      /* Gear icon invert on dark */
      "[data-theme='dark'] .settings-btn img{filter:invert(1);}",
      "@media(prefers-color-scheme:dark){",
      "  :root:not([data-theme]) .settings-btn img{filter:invert(1);}",
      "}",

      /* Section label inside panel */
      ".settings-label{",
      "  font-size:0.7rem;font-weight:700;letter-spacing:0.07em;",
      "  text-transform:uppercase;color:var(--muted);",
      "  margin-bottom:8px;display:block;",
      "}",

      /* Theme pill */
      ".theme-toggle{",
      "  display:flex;gap:0;",
      "  background:var(--card);",
      "  border:1.5px solid var(--dice-border);",
      "  border-radius:999px;padding:3px 4px;",
      "}",
      ".theme-toggle button{",
      "  background:none;border:none;cursor:pointer;",
      "  font-size:0.8rem;padding:3px 9px;",
      "  border-radius:999px;color:var(--muted);",
      "  transition:background 0.2s,color 0.2s;line-height:1;",
      "  white-space:nowrap;",
      "}",
      ".theme-toggle button.active{",
      "  background:var(--button-bg);color:var(--button-text);",
      "}",
      ".theme-toggle button:hover:not(.active){color:var(--highlight);}",
    ].join("");
    document.head.appendChild(style);

    // ── Wrapper ──
    var wrap = document.createElement("div");
    wrap.className = "settings-wrap";

    // ── Gear button ──
    var btn = document.createElement("button");
    btn.className = "settings-btn";
    btn.setAttribute("aria-label", DROPDOWN_LABEL);
    btn.title = DROPDOWN_LABEL;

    var gearImg = document.createElement("img");
    gearImg.src = GEAR_ICON_URL;
    gearImg.alt = "";
    gearImg.setAttribute("aria-hidden", "true");
    gearImg.onerror = function () {
      btn.removeChild(gearImg);
      btn.textContent = "⚙️";
      btn.style.fontSize = "18px";
      btn.style.lineHeight = "1";
    };
    btn.appendChild(gearImg);

    // ── Dropdown panel ──
    var panel = document.createElement("div");
    panel.className = "settings-panel";

    // Theme section
    var themeLabel = document.createElement("span");
    themeLabel.className = "settings-label";
    themeLabel.textContent = "Theme";

    var MODES = [
      { value: null,    label: "Auto", title: "Use device setting" },
      { value: "light", label: "☀️",   title: "Light mode" },
      { value: "dark",  label: "🌙",   title: "Dark mode"  },
    ];

    var pill = document.createElement("div");
    pill.className = "theme-toggle";

    function getCurrent() { return localStorage.getItem("theme"); }

    function applyTheme(value) {
      if (value === "light" || value === "dark") {
        document.documentElement.setAttribute("data-theme", value);
        localStorage.setItem("theme", value);
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.removeItem("theme");
      }
    }

    MODES.forEach(function (mode) {
      var b = document.createElement("button");
      b.textContent = mode.label;
      b.title = mode.title;
      if (getCurrent() === mode.value) b.classList.add("active");
      b.addEventListener("click", function () {
        applyTheme(mode.value);
        pill.querySelectorAll("button").forEach(function (x, i) {
          x.classList.toggle("active", MODES[i].value === mode.value);
        });
      });
      pill.appendChild(b);
    });

    panel.appendChild(themeLabel);
    panel.appendChild(pill);

    // ── Toggle open/close ──
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = panel.classList.toggle("open");
      btn.classList.toggle("open", isOpen);
    });

    // Close when clicking outside
    document.addEventListener("click", function () {
      panel.classList.remove("open");
      btn.classList.remove("open");
    });

    wrap.appendChild(btn);
    wrap.appendChild(panel);
    bc.appendChild(wrap);
  }


  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════
  function init() {
    var bc = document.getElementById("breadcrumb");
    if (!bc) return;
    buildBreadcrumb(bc);
    buildSettings(bc);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();