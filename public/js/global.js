(function () {

  // ═══════════════════════════════════════════════════════
  //  CONFIG
  // ═══════════════════════════════════════════════════════
  var GEAR_ICON_URL       = "/global-icons/gear.png";  // change to .svg if needed
  var FULLSCREEN_ICON_URL = "/global-icons/fullscreen.svg";
  var DROPDOWN_LABEL      = "Settings";
  var FULLSCREEN_LABEL    = "Fullscreen";
  var FULLSCREEN_BTN_GAP  = 8; // px between the fullscreen button and the gear
  var CONFIG_URL          = "/config.json"; // site settings (footer text/links live here)


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
  //  PINNED TOPBAR
  //  - Puts the topbar in the browser's "top layer" (popover API). That layer
  //    sits above EVERYTHING on the page regardless of z-index, and (unlike a
  //    modal dialog) it does not block clicks on the rest of the page.
  //  - Publishes the bar's real height as the CSS variable --topbar-h (0 while
  //    hidden) so your CSS can reserve room for it, e.g.
  //    padding-top: calc(var(--topbar-h, 50px) + 24px). Or set
  //    <html data-topbar-reserve="true"> to have the script add that padding.
  //  - Optional: <html data-topbar-fit="true"> is for NON-scrolling pages. It
  //    shrinks the page content (CSS zoom) so everything fits below the bar.
  //  - It still hides on purpose while the fullscreen button is active.
  // ═══════════════════════════════════════════════════════
  var topbarEl = null;        // set in setupTopbar()
  var settingsPanelEl = null; // set in buildSettings()
  var spaceUpdatePending = false;

  function findTopbar() {
    var inner = document.querySelector(".topbar-inner");
    if (!inner) return null;
    return (
      inner.closest(".topbar") ||
      (inner.parentElement && inner.parentElement !== document.body
        ? inner.parentElement
        : inner)
    );
  }

  function injectTopbarStyle() {
    if (document.getElementById("topbar-pin-style")) return;

    var style = document.createElement("style");
    style.id = "topbar-pin-style";
    style.textContent =
      // --topbar-h always holds the bar's real height (0 while hidden).
      // Page padding is applied only on request, because many sites already
      // reserve room in their own CSS:
      //   <html data-topbar-reserve="true">  adds padding-top = bar height
      //   <html data-topbar-fit="true">      same, plus scales the page to fit
      "html{scroll-padding-top:var(--topbar-h,0px)}" +
      "html[data-topbar-reserve=\"true\"],html[data-topbar-fit=\"true\"]" +
      "{box-sizing:border-box;padding-top:var(--topbar-h,0px)}" +
      // Position must beat any sticky/relative rule in your own CSS
      "[data-topbar-pinned]{position:fixed!important;top:0!important;" +
      "left:0!important;right:0!important;bottom:auto!important;" +
      "box-sizing:border-box}" +
      // Undo the popover's built-in look (centered box, border, padding...).
      // :where() has zero specificity, so anything in your own CSS still wins.
      ":where([data-topbar-pinned][popover]){width:100%;max-width:none;" +
      "height:auto;max-height:none;margin:0;border:0;padding:0;" +
      "overflow:visible;color:inherit;background-color:Canvas}";

    // First in <head> so your own stylesheet can override the non-!important parts
    document.head.insertBefore(style, document.head.firstChild);
  }

  // Measure the bar, reserve room for it, and (fit mode) scale the page.
  function updateTopbarSpace() {
    var root = document.documentElement;
    var body = document.body;
    var hidden = !topbarEl || topbarEl.style.display === "none";
    var fit =
      root.getAttribute("data-topbar-fit") === "true" && "zoom" in body.style;

    // Measure at normal scale so an earlier zoom can't skew the result
    if (fit || body.style.zoom) {
      body.style.zoom = "";
      if (topbarEl) topbarEl.style.zoom = "";
      if (settingsPanelEl) settingsPanelEl.style.zoom = "";
    }

    var h = hidden ? 0 : Math.ceil(topbarEl.getBoundingClientRect().height);
    root.style.setProperty("--topbar-h", h + "px");

    if (fit && h > 0) {
      var vh = window.innerHeight;
      var s = Math.max(0.6, (vh - h) / vh);

      body.style.zoom = String(s);
      // Undo the zoom for the bar (and settings panel) so they stay full size
      topbarEl.style.zoom = String(1 / s);
      if (settingsPanelEl) settingsPanelEl.style.zoom = String(1 / s);
    }
  }

  // Coalesce bursts of changes into one update per frame
  function refreshTopbarSpace() {
    if (spaceUpdatePending) return;
    spaceUpdatePending = true;
    requestAnimationFrame(function () {
      spaceUpdatePending = false;
      updateTopbarSpace();
    });
  }

  // Used by the fullscreen button
  function setTopbarHidden(hidden) {
    if (!topbarEl) return;
    topbarEl.style.display = hidden ? "none" : "";
    updateTopbarSpace();
  }

  function setupTopbar() {
    topbarEl = findTopbar();
    if (!topbarEl) return;

    injectTopbarStyle();
    topbarEl.setAttribute("data-topbar-pinned", "");

    if (typeof topbarEl.showPopover === "function") {
      // "manual" = not closed by Esc or by clicking elsewhere
      topbarEl.setAttribute("popover", "manual");
      try { topbarEl.showPopover(); } catch (e) { /* ignore */ }

      // If anything closes it, put it straight back
      topbarEl.addEventListener("toggle", function (e) {
        if (e.newState === "closed") {
          setTimeout(function () {
            try { topbarEl.showPopover(); } catch (err) { /* ignore */ }
          }, 0);
        }
      });
    } else {
      // Older browsers without the popover API: best effort
      topbarEl.style.zIndex = "2147483647";
    }

    if ("ResizeObserver" in window) {
      new ResizeObserver(refreshTopbarSpace).observe(topbarEl);
    }
    window.addEventListener("resize", refreshTopbarSpace);
    window.addEventListener("load", refreshTopbarSpace);

    updateTopbarSpace();
  }


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
  //  FULLSCREEN BUTTON
  //  Only shown when <html data-fullscreen="true">.
  //  Sits immediately to the left of the gear button.
  //  Clicking it hides the topbar and requests browser fullscreen.
  //  When fullscreen ends (Esc, swipe, etc.) the topbar comes back.
  // ═══════════════════════════════════════════════════════
  function buildFullscreenButton(topbarInner, gearBtn, closePanel) {

    if (document.documentElement.getAttribute("data-fullscreen") !== "true") {
      return;
    }

    var root = document.documentElement;

    // Cross-browser (incl. older Safari) fullscreen helpers
    var canFullscreen = !!(root.requestFullscreen || root.webkitRequestFullscreen);
    if (!canFullscreen) return; // e.g. iPhone Safari — nothing sensible to do

    function requestFs() {
      var fn = root.requestFullscreen || root.webkitRequestFullscreen;
      try {
        var result = fn.call(root);
        if (result && typeof result.catch === "function") {
          result.catch(function () { /* user/browser denied; ignore */ });
        }
      } catch (e) { /* ignore */ }
    }

    function isOurFullscreen() {
      var el = document.fullscreenElement || document.webkitFullscreenElement;
      return el === root;
    }

    // ── Button ──
    var fsBtn = document.createElement("button");
    fsBtn.className = "settings-btn fullscreen-btn"; // reuses gear button styling
    fsBtn.setAttribute("aria-label", FULLSCREEN_LABEL);
    fsBtn.title = FULLSCREEN_LABEL;

    var fsImg = document.createElement("img");
    fsImg.src = FULLSCREEN_ICON_URL;
    fsImg.alt = "";
    fsImg.setAttribute("aria-hidden", "true");
    fsImg.onerror = function () {
      if (fsImg.parentNode) fsBtn.removeChild(fsImg);
      fsBtn.textContent = "⛶";
      fsBtn.style.fontSize = "18px";
      fsBtn.style.lineHeight = "1";
    };
    fsBtn.appendChild(fsImg);

    // Insert before the gear so it's to its left even if the layout is in-flow
    topbarInner.insertBefore(fsBtn, gearBtn);

    // If the gear is absolutely positioned (as in the stylesheet), shift the
    // fullscreen button left by the gear's offset + width + gap.
    function positionFsBtn() {
      var gearStyle = window.getComputedStyle(gearBtn);
      if (gearStyle.position !== "absolute") return; // in-flow: DOM order handles it

      var gearRight = parseFloat(gearStyle.right);
      if (isNaN(gearRight)) return;

      fsBtn.style.right =
        (gearRight + gearBtn.offsetWidth + FULLSCREEN_BTN_GAP) + "px";
    }

    positionFsBtn();
    window.addEventListener("resize", positionFsBtn);
    window.addEventListener("load", positionFsBtn);
    if (gearBtn.firstElementChild) {
      gearBtn.firstElementChild.addEventListener("load", positionFsBtn);
    }

    // ── Behaviour ──
    fsBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closePanel();
      requestFs();
      // Topbar is hidden by the fullscreenchange handler below, so that
      // it only disappears if the browser actually entered fullscreen.
    });

    // Single source of truth: topbar hidden ⇔ we're in fullscreen.
    function syncTopbar() {
      setTopbarHidden(isOurFullscreen());
    }

    document.addEventListener("fullscreenchange", syncTopbar);
    document.addEventListener("webkitfullscreenchange", syncTopbar);
    syncTopbar();
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
    settingsPanelEl = panel;

    // Position panel flush below the gear button
    function positionPanel() {
      var r = btn.getBoundingClientRect();

      panel.style.top = (r.bottom + 8) + "px";
      panel.style.right = (window.innerWidth - r.right) + "px";
    }

    var isOpen = false;

    function closePanel() {
      isOpen = false;
      panel.classList.remove("open");
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();

      isOpen = !isOpen;

      if (isOpen) {
        positionPanel();
        panel.classList.add("open");
        btn.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      } else {
        closePanel();
      }
    });

    // Close only when clicking outside both button and panel
    document.addEventListener("click", function (e) {
      if (
        isOpen &&
        !panel.contains(e.target) &&
        e.target !== btn
      ) {
        closePanel();
      }
    });

    window.addEventListener("resize", function () {
      if (isOpen) positionPanel();
    });

    // Fullscreen button (only if <html data-fullscreen="true">)
    buildFullscreenButton(topbarInner, btn, closePanel);
  }


  // ═══════════════════════════════════════════════════════
  //  FOOTER — fills in <footer id="site-footer"> using the "footer"
  //  section of /config.json. Pages with no <footer> tag are left alone;
  //  this never creates one. If a <footer> has no id yet, "site-footer"
  //  is added automatically so you don't have to type it everywhere.
  // ═══════════════════════════════════════════════════════
  async function buildFooter() {
    var footer =
      document.getElementById("site-footer") || document.querySelector("footer");
    if (!footer) return; // page opted out by not including a <footer> tag

    footer.id = "site-footer";
    footer.classList.add("site-footer");

    var config;

    try {
      var response = await fetch(CONFIG_URL, { cache: "no-cache" });
      if (!response.ok) return;
      config = await response.json();
    } catch (e) {
      console.warn(
        "Could not read " + CONFIG_URL + ". If the file exists, check that it " +
        "is valid JSON (matching brackets, commas between items, double quotes).",
        e
      );
      return;
    }

    var data = config && config.footer;
    if (!data) return;

    var links = Array.isArray(data.links) ? data.links : [];
    if (!data.text && !links.length) return;

    footer.textContent = ""; // clear any placeholder content

    // Text (supports {year} → current year)
    if (data.text) {
      var p = document.createElement("p");
      p.className = "site-footer-text";
      p.textContent = String(data.text).replace(
        /\{year\}/g,
        String(new Date().getFullYear())
      );
      footer.appendChild(p);
    }

    // Links
    if (links.length) {
      var nav = document.createElement("nav");
      nav.className = "site-footer-links";

      links.forEach(function (item) {
        if (!item || !item.url) return;

        var a = document.createElement("a");
        a.href = item.url;
        a.textContent = item.label || item.url;

        // Links to other websites open in a new tab
        try {
          var target = new URL(item.url, window.location.href);
          if (
            (target.protocol === "http:" || target.protocol === "https:") &&
            target.origin !== window.location.origin
          ) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          }
        } catch (e) { /* leave as a normal link */ }

        nav.appendChild(a);
      });

      if (nav.children.length) footer.appendChild(nav);
    }
  }


  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════
  async function init() {
    setupTopbar(); // pin the bar right away to avoid a visible jump
    buildFooter(); // runs in parallel; handles its own errors

    var bc = document.getElementById("breadcrumb");

    if (bc) {
      await buildBreadcrumb(bc);
    }

    buildSettings();
    refreshTopbarSpace(); // bar height may have changed (breadcrumb, gear)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
