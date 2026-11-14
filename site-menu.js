/*
  NIRVANAM STUDIO: SHARED HEADER AND BURGER MENU
  ==============================================
  One menu for every page. To use it on a page, put these two lines where the header should be:

    <div id="site-menu"></div>
    <script src="site-menu.js"></script>

  To add, remove or reorder menu items, edit the MENU list below and commit.
  Links to a part of a page use #, for example "index.html#about"
  (that section on the home page needs id="about").
*/
(function () {
  "use strict";

  var BRAND = "Nirvanam Studio";

  var MENU = [
    { label: "Home", href: "index.html" },
    { label: "The Chettinad Collection", href: "shop.html" },
    { label: "Every piece plants trees", href: "shop.html#regeneration" },
    { label: "How first refusal works", href: "index.html#join" },
    // Add your own pages or home page sections here, for example:
    // { label: "About", href: "index.html#about" },
    // { label: "Contact", href: "index.html#contact" },
  ];

  var TAGLINE = "Chettinad, Tamil Nadu and Ceredigion, Wales";

  var SOCIAL = [
    { label: "Instagram", href: "https://www.instagram.com/nirvanam_studio/" },
    { label: "Pinterest", href: "https://pin.it/3PfJGmDCC" },
    { label: "Films", href: "https://youtube.com/@nirvanam_quests" }
  ];

  /* ---------- nothing below needs editing ---------- */

  var SERIF = "'Libre Caslon Text',Georgia,'Times New Roman',serif";
  var DISPLAY = "'Libre Caslon Display','Libre Caslon Text',Georgia,serif";
  var LOGO = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="6" fill="#B48A1E"/><circle cx="51" cy="49" r="15" fill="none" stroke="#B48A1E" stroke-width="5"/><circle cx="49" cy="51" r="26" fill="none" stroke="#8A5A3B" stroke-width="3.5"/><circle cx="51" cy="50" r="36" fill="none" stroke="#8A5A3B" stroke-width="5"/><circle cx="50" cy="50" r="45" fill="none" stroke="#8A5A3B" stroke-width="2.5"/></svg>';
  var css =
    ".nvm-hd{position:relative;z-index:30;font-family:" + SERIF + ";color:#2B1F18}" +
    ".nvm-hd-in{max-width:1080px;margin:0 auto;padding:22px 28px;display:flex;align-items:center;justify-content:space-between;gap:16px}" +
    ".nvm-brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:#2B1F18}" +
    ".nvm-brand svg{width:32px;height:32px;flex:none}" +
    ".nvm-brand b{font-family:" + DISPLAY + ";font-weight:400;font-size:27px;line-height:1}" +
    ".nvm-right{display:flex;align-items:center;gap:20px}" +
    ".nvm-where{font-style:italic;font-size:15px;color:#685C51}" +
    ".nvm-burger{display:inline-flex;align-items:center;gap:9px;font-family:" + SERIF + ";font-size:16px;color:#1F4B3D;background:transparent;border:1.5px solid #1F4B3D;border-radius:22px;min-height:44px;padding:6px 16px;cursor:pointer}" +
    ".nvm-burger:hover{background:#1F4B3D;color:#fff}" +
    ".nvm-bars{width:18px;height:12px;position:relative;display:inline-block}" +
    ".nvm-bars i{position:absolute;left:0;right:0;height:2px;background:currentColor;border-radius:2px;transition:transform .2s,opacity .2s}" +
    ".nvm-bars i:nth-child(1){top:0}.nvm-bars i:nth-child(2){top:5px}.nvm-bars i:nth-child(3){top:10px}" +
    ".nvm-veil{position:fixed;inset:0;background:rgba(43,31,24,.45);opacity:0;pointer-events:none;transition:opacity .2s;z-index:40}" +
    ".nvm-open .nvm-veil{opacity:1;pointer-events:auto}" +
    ".nvm-drawer{position:fixed;top:0;right:0;bottom:0;width:min(360px,88vw);background:#fff;z-index:50;transform:translateX(100%);transition:transform .25s ease;display:flex;flex-direction:column;padding:22px 26px 28px;box-shadow:-8px 0 24px rgba(43,31,24,.16);overflow-y:auto;border-left:2px solid #B48A1E}" +
    ".nvm-open .nvm-drawer{transform:none}" +
    ".nvm-drawer-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}" +
    ".nvm-close{font-family:" + SERIF + ";font-size:30px;line-height:1;background:none;border:0;color:#2B1F18;cursor:pointer;padding:4px 8px;min-width:44px;min-height:44px}" +
    ".nvm-links{list-style:none;margin:0;padding:0;border-top:2px solid #B48A1E}" +
    ".nvm-links a{display:block;padding:16px 0;border-bottom:1px solid #BBC9A0;color:#2B1F18;text-decoration:none;font-family:" + DISPLAY + ";font-size:26px;line-height:1.15}" +
    ".nvm-links a:hover{color:#1F4B3D}" +
    ".nvm-links a[aria-current=page]{color:#1F4B3D}" +
    ".nvm-links a[aria-current=page]::after{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#B48A1E;margin-left:10px;vertical-align:middle}" +
    ".nvm-social{margin-top:auto;padding-top:26px;display:flex;flex-wrap:wrap;gap:8px 20px;font-size:15px}" +
    ".nvm-social a{color:#685C51}" +
    ".nvm-lock{overflow:hidden}" +
    "@media (max-width:760px){.nvm-where{display:none}}" +
    "@media (max-width:560px){.nvm-hd-in{padding:16px 20px}.nvm-brand b{font-size:24px}}" +
    "@media (prefers-reduced-motion:reduce){.nvm-drawer,.nvm-veil,.nvm-bars i{transition:none}}";

  var mount = document.getElementById("site-menu");
  if (!mount) return;

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function file(path) { var f = path.split("/").pop(); return f === "" ? "index.html" : f; }
  function samePage(u) { return file(u.pathname) === file(location.pathname); }
  function isCurrent(href) {
    var u = new URL(href, location.href);
    if (!samePage(u)) return false;
    if (u.hash) return u.hash === location.hash;
    // A plain page link is current unless another menu item names this page's current #section.
    return !MENU.some(function (m) {
      var v = new URL(m.href, location.href);
      return v.hash && samePage(v) && v.hash === location.hash;
    });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var links = MENU.map(function (m) {
    return '<li><a href="' + esc(m.href) + '">' + esc(m.label) + "</a></li>";
  }).join("");
  var social = SOCIAL.map(function (s) {
    return '<a href="' + esc(s.href) + '" target="_blank" rel="noopener">' + esc(s.label) + "</a>";
  }).join("");

  mount.outerHTML =
    '<header class="nvm-hd" id="nvm">' +
      '<div class="nvm-hd-in">' +
        '<a class="nvm-brand" href="index.html" aria-label="' + esc(BRAND) + ' home">' + LOGO + "<b>" + esc(BRAND) + "</b></a>" +
        '<div class="nvm-right"><span class="nvm-where">' + esc(TAGLINE) + "</span>" +
        '<button type="button" class="nvm-burger" aria-expanded="false" aria-controls="nvm-drawer"><span class="nvm-bars" aria-hidden="true"><i></i><i></i><i></i></span>Menu</button></div>' +
      "</div>" +
      '<div class="nvm-veil" data-nvm-close></div>' +
      '<nav class="nvm-drawer" id="nvm-drawer" aria-label="Main" hidden>' +
        '<div class="nvm-drawer-top"><span class="nvm-brand">' + LOGO + "<b>" + esc(BRAND) + '</b></span><button type="button" class="nvm-close" aria-label="Close menu" data-nvm-close>&times;</button></div>' +
        '<ul class="nvm-links">' + links + "</ul>" +
        '<div class="nvm-social">' + social + "</div>" +
      "</nav>" +
    "</header>";

  var root = document.getElementById("nvm");
  var burger = root.querySelector(".nvm-burger");
  var drawer = root.querySelector(".nvm-drawer");

  function markCurrent() {
    root.querySelectorAll(".nvm-links a").forEach(function (a) {
      if (isCurrent(a.getAttribute("href"))) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }
  function open() {
    markCurrent();
    drawer.hidden = false;
    requestAnimationFrame(function () { root.classList.add("nvm-open"); });
    burger.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("nvm-lock");
    var first = drawer.querySelector(".nvm-links a");
    if (first) first.focus();
  }
  function close(returnFocus) {
    root.classList.remove("nvm-open");
    burger.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("nvm-lock");
    setTimeout(function () { if (!root.classList.contains("nvm-open")) drawer.hidden = true; }, 260);
    if (returnFocus) burger.focus();
  }

  burger.addEventListener("click", function () { root.classList.contains("nvm-open") ? close(true) : open(); });
  root.querySelectorAll("[data-nvm-close]").forEach(function (b) { b.addEventListener("click", function () { close(true); }); });
  root.querySelectorAll(".nvm-links a").forEach(function (a) { a.addEventListener("click", function () { close(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("nvm-open")) close(true); });
  window.addEventListener("hashchange", markCurrent);
  markCurrent();
})();
