(function () {

  // ═══════════════════════════════════════════════════════
  //  CONFIG
  // ═══════════════════════════════════════════════════════
  var GEAR_ICON_URL  = "/global-icons/gear.png";
  var DROPDOWN_LABEL = "Settings";


  // ═══════════════════════════════════════════════════════
  //  THEME — apply before first paint to avoid flash
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
  //  STYLES
  // ═══════════════════════════════════════════════════════
  function injectStyles() {
    var style = document.createElement("style");
    style.textContent = [
      /* Gear button inside topbar */
      ".settings-btn{",
      "  background:none;border:none;cursor:pointer;",
      "  display:flex;align-items:center;justify-content:center;",
      "  padding:4px;border-radius:6px;margin-left:auto;flex-shrink:0;",
      "  opacity:0.65;transition:opacity 0.2s,transform 0.4s;",
      "}",
      ".settings-btn:hover{opacity:1;}",
      ".settings-btn img{width:20px;height:20px;display:block;}",
      ".settings-btn.open{transform:rotate(60deg);opacity:1;}",

      /* Floating panel — child of <body>, not topbar */
      ".settings-panel{",
      "  position:fixed;",          /* fixed so it escapes every overflow context */
      "  z-index:9999;",
      "  display:none;",
      "  border:1.5px solid var(--dice-border);",
      "  border-radius:12px;padding:12px 14px;",
      "  box-shadow:0 8px 24px rgba(0,0,0,0.22);",
      "  min-width:180px;",
      "  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);",
      "  background:var(--settings-panel-bg,rgba(241,245,249,0.97));",
      "}",
      ".settings-panel.open{display:block;}",

      /* Panel colours per theme */
      "[data-theme='light'] .settings-panel{--settings-panel-bg:rgba(241,245,249,0.97);}",
      "[data-theme='dark']  .settings-panel{--settings-panel-bg:rgba(15,23,42,0.97);}",
      "@media(prefers-color-scheme:dark){",
      "  :root:not([data-theme]) .settings-panel{--settings-panel-bg:rgba(15,23,42,0.97);}",
      "}",

      /* Gear icon invert on dark */
      "[data-theme='dark'] .settings-btn img{filter:invert(1);}",
      "@media(prefers-color-scheme:dark){",
      "  :root:not([data-theme]) .settings-btn img{filter:invert(1);}",
      "}",

      /* Section label */
      ".settings-section-label{",
      "  display:block;font-size:0.7rem;font-weight:700;",
      "  letter-spacing:0.07em;text-transform:uppercase;",
      "  color:var(--muted);margin-bottom:8px;",
      "}",

      /* Theme pill */
      ".theme-toggle{",
      "  display:flex;",
      "  background:var(--card);",
      "  border:1.5px solid var(--dice-border);",
      "  border-radius:999px;padding:3px 4px;",
      "}",
      ".theme-toggle button{",
      "  background:none;border:none;cursor:pointer;",
      "  font-size:0.8rem;padding:3px 9px;",
      "  border-radius:999px;color:var(--muted);",
      "  transition:background 0.2s,color 0.2s;line-height:1;white-space:nowrap;",
      "}",
      ".theme-toggle button.active{background:var(--button-bg);color:var(--button-text);}",
      ".theme-toggle button:hover:not(.active){color:var(--highlight);}",
    ].join("");
    document.head.appendChild(style);
  }


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
  //  SETTINGS GEAR + FLOATING PANEL
  // ═══════════════════════════════════════════════════════
  function buildSettings(bc) {

    // ── Gear button (lives inside topbar for layout) ──
    var btn = document.createElement("button");
    btn.className = "settings-btn";
    btn.setAttribute("aria-label", DROPDOWN_LABEL);
    btn.title = DROPDOWN_LABEL;
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");

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
    bc.appendChild(btn);

    // ── Floating panel (child of <body>) ──
    var panel = document.createElement("div");
    panel.className = "settings-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", DROPDOWN_LABEL);

    // Theme section
    var label = document.createElement("span");
    label.className = "settings-section-label";
    label.textContent = "Theme";

    var MODES = [
      { value: null,    label: "Auto", title: "Use device setting" },
      { value: "light", label: "Light",   title: "Light mode" },
      { value: "dark",  label: "Dark",   title: "Dark mode"  },
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
      b.addEventListener("click", function (e) {
        e.stopPropagation();          // don't bubble to document close handler
        applyTheme(mode.value);
        pill.querySelectorAll("button").forEach(function (x, i) {
          x.classList.toggle("active", MODES[i].value === mode.value);
        });
        // panel stays open — user closes by clicking outside
      });
      pill.appendChild(b);
    });

    panel.appendChild(label);
    panel.appendChild(pill);

    // Append panel to body so it escapes every overflow/clip context
    document.body.appendChild(panel);

    // ── Position panel below the gear button ──
    function positionPanel() {
      var r = btn.getBoundingClientRect();
      panel.style.top  = (r.bottom + 8) + "px";
      panel.style.right = (window.innerWidth - r.right) + "px";
    }

    // ── Toggle open/close ──
    var isOpen = false;

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      isOpen = !isOpen;
      if (isOpen) {
        positionPanel();
        panel.classList.add("open");
        btn.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      } else {
        panel.classList.remove("open");
        btn.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    // Close when clicking outside (not inside the panel)
    document.addEventListener("click", function (e) {
      if (isOpen && !panel.contains(e.target) && e.target !== btn) {
        isOpen = false;
        panel.classList.remove("open");
        btn.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    // Reposition if window resizes while open
    window.addEventListener("resize", function () {
      if (isOpen) positionPanel();
    });
  }


  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════
  function init() {
    injectStyles();
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