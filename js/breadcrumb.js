(function () {

  // ═══════════════════════════════════════════════════════
  //  CONFIG
  // ═══════════════════════════════════════════════════════
  var GEAR_ICON_URL  = "/global-icons/gear.png";  // change to .svg if needed
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
  //  BREADCRUMB
  // ═══════════════════════════════════════════════════════
  async function buildBreadcrumb(bc) {
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

    var acronyms = new Set([
      "HPS", "MH", "LPS", "CMH", "MV", "CFL", "PL", "HID", "PSMH"
    ]);

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

    // Check whether this folder contains a breadcrumb-name file.
    // If it does, return its contents exactly as-is.
    async function getBreadcrumbName(folderPath, fallbackSegment) {
      try {
        var response = await fetch(
          folderPath.replace(/\/$/, "") + "/breadcrumb-name",
          {
            cache: "no-store"
          }
        );

        if (response.ok) {
          return await response.text();
        }
      } catch (e) {
        // Ignore fetch errors and use the normal formatted name.
      }

      return formatName(fallbackSegment);
    }

    // Fetch all breadcrumb names in parallel.
    var names = [];
    builtPath = "";

    var namePromises = segments.map(function (seg) {
      builtPath += "/" + seg;
      return getBreadcrumbName(builtPath, seg);
    });

    names = await Promise.all(namePromises);

    // Build the breadcrumb using the resolved names.
    builtPath = "";

    segments.forEach(function (seg, index) {
      builtPath += "/" + seg;

      var sep = document.createElement("span");
      sep.className = "topbar-sep";
      sep.textContent = "→";
      bc.appendChild(sep);

      var link = document.createElement("a");
      link.href = builtPath;

      // If breadcrumb-name exists, this is its contents verbatim.
      // Otherwise, formatName() was used as the fallback.
      link.textContent = names[index];

      bc.appendChild(link);
    });
  }


  // ═══════════════════════════════════════════════════════
  //  SETTINGS GEAR + FLOATING PANEL
  // ═══════════════════════════════════════════════════════
  function buildSettings() {

    // Gear button goes into .topbar-inner which is position:relative,
    // so absolute positioning anchors to it without affecting scroll width
    var topbarInner = document.querySelector(".topbar-inner");
    if (!topbarInner) return;

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
    topbarInner.appendChild(btn);

    // Panel is a child of <body> so it escapes all overflow contexts
    var panel = document.createElement("div");
    panel.className = "settings-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", DROPDOWN_LABEL);

    var sectionLabel = document.createElement("span");
    sectionLabel.className = "settings-section-label";
    sectionLabel.textContent = "Theme";

    var MODES = [
      { value: null,    label: "Auto",  title: "Use device setting" },
      { value: "light", label: "Light", title: "Light mode" },
      { value: "dark",  label: "Dark",  title: "Dark mode"  },
    ];

    var pill = document.createElement("div");
    pill.className = "theme-toggle";

    function getCurrent() {
      return localStorage.getItem("theme");
    }

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

      if (getCurrent() === mode.value) {
        b.classList.add("active");
      }

      b.addEventListener("click", function (e) {
        e.stopPropagation();

        applyTheme(mode.value);

        pill.querySelectorAll("button").forEach(function (x, i) {
          x.classList.toggle(
            "active",
            MODES[i].value === mode.value
          );
        });

        // panel stays open on item click
      });

      pill.appendChild(b);
    });

    panel.appendChild(sectionLabel);
    panel.appendChild(pill);
    document.body.appendChild(panel);

    // Position panel flush below the gear button
    function positionPanel() {
      var r = btn.getBoundingClientRect();

      panel.style.top = (r.bottom + 8) + "px";
      panel.style.right = (window.innerWidth - r.right) + "px";
    }

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

    // Close only when clicking outside both button and panel
    document.addEventListener("click", function (e) {
      if (
        isOpen &&
        !panel.contains(e.target) &&
        e.target !== btn
      ) {
        isOpen = false;
        panel.classList.remove("open");
        btn.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    window.addEventListener("resize", function () {
      if (isOpen) positionPanel();
    });
  }


  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════
  async function init() {
    var bc = document.getElementById("breadcrumb");

    if (bc) {
      await buildBreadcrumb(bc);
    }

    buildSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
