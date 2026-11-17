/* Nirvanam Studio analytics.
   Google Tag Manager (GTM-KRBK5BNP) carries GA4 (G-57QB7CPTT8).
   Nothing from Google loads, and no cookie is set, until the visitor accepts.
   The choice is kept in localStorage under "nv_consent" ("granted" | "denied").
   Pages push events to window.dataLayer; GTM forwards them to GA4. */
(function () {
  var GTM_ID = "GTM-KRBK5BNP";
  var KEY = "nv_consent";

  window.dataLayer = window.dataLayer || [];
  /* Consent Mode commands must be pushed as an arguments object */
  function consent() { window.dataLayer.push(arguments); }

  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}

  consent("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: stored === "granted" ? "granted" : "denied"
  });

  var loaded = false;
  function loadGTM() {
    if (loaded) return;
    loaded = true;
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
    document.head.appendChild(s);
  }

  var banner = null;
  function hideBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
  }

  function decide(value) {
    var before = stored;
    stored = value;
    try { localStorage.setItem(KEY, value); } catch (e) {}
    hideBanner();
    if (value === "granted") {
      consent("consent", "update", { analytics_storage: "granted" });
      loadGTM();
    } else if (before === "granted") {
      /* consent withdrawn: stop measuring and clear the Analytics cookies */
      consent("consent", "update", { analytics_storage: "denied" });
      document.cookie.split(";").forEach(function (c) {
        var name = c.split("=")[0].trim();
        if (name.indexOf("_ga") === 0) {
          document.cookie = name + "=; Max-Age=0; path=/";
          document.cookie = name + "=; Max-Age=0; path=/; domain=." + location.hostname.replace(/^www\./, "");
        }
      });
      location.reload();
    }
  }

  function showBanner() {
    if (banner || !document.body) return;
    if (!document.getElementById("nv-cookie-css")) {
      var css = document.createElement("style");
      css.id = "nv-cookie-css";
      css.textContent =
        ".nv-cookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;max-width:560px;margin:0 auto;" +
        "background:#fff;color:#2B1F18;border:1px solid #BBC9A0;border-radius:6px;padding:16px 18px;" +
        "box-shadow:0 8px 28px rgba(43,31,24,.16);font:inherit;font-size:15px;line-height:1.5;transition:bottom .2s}" +
        ".nv-cookie p{margin:0 0 12px}" +
        ".nv-cookie a{color:inherit}" +
        ".nv-cookie-btns{display:flex;gap:10px;flex-wrap:wrap}" +
        ".nv-cookie button{flex:1 1 140px;min-height:44px;padding:8px 16px;border-radius:4px;cursor:pointer;" +
        "font:inherit;font-size:15px;border:1px solid #2B1F18;background:#fff;color:#2B1F18}" +
        ".nv-cookie button[data-v=granted]{background:#2B1F18;color:#fff}";
      document.head.appendChild(css);
    }
    banner = document.createElement("div");
    banner.className = "nv-cookie";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookies");
    banner.innerHTML =
      "<p>We'd like to use Google Analytics cookies to see how this site is used. " +
      "Nothing is set unless you accept. <a href=\"privacy.html\">Privacy</a></p>" +
      "<div class=\"nv-cookie-btns\">" +
      "<button type=\"button\" data-v=\"denied\">Decline</button>" +
      "<button type=\"button\" data-v=\"granted\">Accept</button></div>";
    banner.addEventListener("click", function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute("data-v");
      if (v) decide(v);
    });
    document.body.appendChild(banner);
    place();
  }

  /* sit above the sticky signup bar on the home page instead of covering it */
  function place() {
    if (!banner) return;
    var bar = document.getElementById("bar");
    var lift = 0;
    if (bar) {
      var r = bar.getBoundingClientRect();
      if (r.height && r.top < window.innerHeight) lift = Math.max(0, window.innerHeight - r.top);
    }
    banner.style.bottom = (lift + 16) + "px";
  }
  window.addEventListener("scroll", place, { passive: true });
  window.addEventListener("resize", place);

  /* lets a visitor change their mind: a "Cookies" link beside Privacy in the footer */
  function addFooterLink() {
    var privacy = document.querySelector("footer a[href='privacy.html']");
    if (!privacy || document.getElementById("nv-cookie-link")) return;
    var a = document.createElement("a");
    a.id = "nv-cookie-link";
    a.href = "#cookies";
    a.textContent = "Cookies";
    a.addEventListener("click", function (e) { e.preventDefault(); showBanner(); });
    privacy.parentNode.insertBefore(document.createTextNode(" · "), privacy.nextSibling);
    privacy.parentNode.insertBefore(a, privacy.nextSibling.nextSibling);
  }

  function ready() {
    addFooterLink();
    if (stored !== "granted" && stored !== "denied") showBanner();
  }

  if (stored === "granted") loadGTM();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
