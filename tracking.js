/* Nirvanam Studio analytics.
   Google Tag Manager (GTM-KRBK5BNP) carries GA4 (G-57QB7CPTT8).
   Nothing from Google loads, and no cookie is set, until the visitor accepts.
   The choice is kept in localStorage under "nv_consent" ("granted" | "denied").
   Pages push events to window.dataLayer; GTM forwards them to GA4. */
/* Clickjacking guard: GitHub Pages cannot send X-Frame-Options, so refuse to run inside another site's frame. */
if (window.top !== window.self) {
  try { if (window.top.location.hostname !== window.location.hostname) window.top.location = window.location.href; }
  catch (e) { window.top.location = window.location.href; }
}

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
    /* the signup bar slides in after load, so keep checking while the banner is up */
    var timer = setInterval(function () { if (banner) place(); else clearInterval(timer); }, 300);
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

  /* The anonymous Google Analytics ID for this browser (from the _ga cookie).
     Empty until the visitor has accepted analytics. The forms send it with a
     signup so the earlier anonymous visits can be joined to that lead. */
  function clientId() {
    var m = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
    return m ? m[1] : "";
  }
  /* Every event parameter the GTM event tag reads. Each push sets all of them
     (undefined when not given) so a value from an earlier event is never carried
     over by the data layer into a later one. */
  var PARAMS = ["variant", "source", "segment", "place", "item_id", "item_name", "country",
    "cta_text", "cta_type", "cta_location", "cta_url", "cta_outbound", "lead_id"];
  function event(name, data) {
    var push = { event: name };
    data = data || {};
    PARAMS.forEach(function (k) { push[k] = data[k] === undefined || data[k] === "" ? undefined : String(data[k]); });
    window.dataLayer.push(push);
  }

  /* A random ID for one form submission. It is sent to Google Analytics with the
     signup event and saved in the sheet with the signup, alongside the anonymous
     GA client ID, so a lead can be joined to its browsing history in BigQuery. */
  function leadId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  window.nvAnalytics = { clientId: clientId, event: event, leadId: leadId, openCookieChoice: showBanner };

  /* Every call to action: one cta_click event per click on a link, button or tab.
     Keys are always set (undefined when not relevant) so a value from an earlier
     event is never carried over by the data layer. */
  function ctaText(el) {
    return (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }
  function ctaLocation(el) {
    if (el.closest(".nvm-drawer")) return "menu";
    if (el.closest(".nvm-hd")) return "header";
    if (el.closest("dialog")) return "dialog";
    if (el.closest("#bar")) return "sticky_bar";
    if (el.closest("footer")) return "footer";
    var signup = el.closest("[data-place]");
    if (signup) return "signup_" + signup.getAttribute("data-place");
    if (el.closest("article.card")) return "product_card";
    var part = el.closest("section[id],[role=tabpanel][id],[role=tablist],main");
    if (part) return part.id || part.getAttribute("role") || "main";
    return "page";
  }
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("a,button,[role=button],[role=tab]");
    if (!el || el.closest(".nv-cookie")) return;
    var url, outbound;
    if (el.tagName === "A" && el.getAttribute("href")) {
      try {
        var u = new URL(el.href, location.href);
        url = u.origin + u.pathname + u.hash;          /* no query string */
        outbound = u.hostname !== location.hostname ? "true" : "false";
      } catch (err) {}
    }
    var card = el.closest("article.card[id]");
    event("cta_click", {
      cta_text: ctaText(el),
      cta_type: el.tagName === "A" ? "link" : (el.getAttribute("role") === "tab" ? "tab" : "button"),
      cta_location: ctaLocation(el),
      cta_url: url,
      cta_outbound: outbound,
      item_id: card ? card.id : undefined
    });
  }, true);

  function ready() {
    addFooterLink();
    if (stored !== "granted" && stored !== "denied") showBanner();
  }

  if (stored === "granted") loadGTM();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
