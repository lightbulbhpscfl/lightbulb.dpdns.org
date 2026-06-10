(function () {
  var bc = document.getElementById("breadcrumb");
  if (!bc) return;

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

  const acronyms = new Set([
    "HPS",
    "MH",
    "LPS",
    "CMH",
    "MV",
    "CFL",
    "PL",
    "HID",
    "PSMH"
  ]);

  function formatName(seg) {
    return decodeURIComponent(seg)
      .replace(/--/g, " - ")
      .replace(/[-_]/g, " ")
      .replace(/\.\w+$/, "")
      .split(/\s+/)
      .map(word => {
        const upper = word.toUpperCase();

        if (acronyms.has(upper)) {
          return upper;
        }

        return word.charAt(0).toUpperCase() +
               word.slice(1).toLowerCase();
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
})();