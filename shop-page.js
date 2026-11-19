/* Page script for shop.html. Kept out of the HTML so the Content Security Policy can block inline scripts. */
(function () {
  "use strict";

  /* ============ CONFIG: the only two lines you need to edit here ============ */
  var SHEET_ENDPOINT = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";   // ends in /exec
  var CONTACT_EMAIL  = "hello@nirvanamstudio.com";                  // shown if the form cannot send
  /* ========================================================================== */

  var STATUS = { sourcing: "Just found", restoring: "Being prepared", ready: "Ready to ship", reserved: "Reserved" };
  var CURRENCY = [
    { key: "gbp", sym: "£", where: "to the UK" },
    { key: "eur", sym: "€", where: "to the EU" },
    { key: "usd", sym: "$", where: "to the USA" }
  ];

  var items = Array.isArray(window.NIRVANAM_ITEMS) ? window.NIRVANAM_ITEMS : [];
  var impact = window.NIRVANAM_IMPACT || {};
  var $ = function (id) { return document.getElementById(id); };
  var grid = $("grid"), filters = $("filters"), countEl = $("count"), emptyEl = $("empty");
  var dlg = $("dlg"), form = $("form"), errEl = $("err"), doneEl = $("done"), submitBtn = $("submit");
  var current = null, activeCat = "All";

  $("yr").textContent = new Date().getFullYear();

  /* Remember where the visitor came from so each lead is attributed in the Sheet. */
  var utm = (function () {
    var out = {}, keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
    var q = new URLSearchParams(location.search);
    keys.forEach(function (k) { if (q.get(k)) out[k] = q.get(k).slice(0, 80); });
    try {
      if (Object.keys(out).length) sessionStorage.setItem("nv_utm", JSON.stringify(out));
      else out = JSON.parse(sessionStorage.getItem("nv_utm") || "{}");
    } catch (e) {}
    return out;
  })();

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function num(v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
  function fmt(n) { return Math.round(n).toLocaleString("en-GB"); }

  /* ---------------- Tabs ---------------- */
  var tabs = { collection: $("tab-collection"), regeneration: $("tab-regeneration") };
  var panels = { collection: $("panel-collection"), regeneration: $("panel-regeneration") };
  function showTab(name, opts) {
    opts = opts || {};
    Object.keys(tabs).forEach(function (k) {
      var on = k === name;
      tabs[k].setAttribute("aria-selected", on ? "true" : "false");
      tabs[k].tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    if (opts.updateUrl) {
      var h = name === "regeneration" ? "#regeneration" : "";
      history.replaceState(null, "", location.pathname + location.search + h);
    }
    if (opts.scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    if (opts.focus) tabs[name].focus();
  }
  Object.keys(tabs).forEach(function (k) {
    tabs[k].addEventListener("click", function () { showTab(k, { updateUrl: true }); });
    tabs[k].addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      showTab(k === "collection" ? "regeneration" : "collection", { updateUrl: true, focus: true });
    });
  });
  document.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { showTab(b.getAttribute("data-goto"), { updateUrl: true, scroll: true }); });
  });

  /* ---------------- Regeneration numbers ---------------- */
  (function () {
    var share = num(impact.profitShare) || 10;
    ["share-a", "share-b", "share-c"].forEach(function (id) { $(id).textContent = share; });
    var p = num(impact.piecesSold), w = num(impact.treesWales), i = num(impact.treesIndia);
    if (p || w || i) {
      $("n-pieces").textContent = fmt(p);
      $("n-wales").textContent = fmt(w);
      $("n-india").textContent = fmt(i);
      $("stats").hidden = false;
      $("soon").hidden = true;
      if (impact.updated) $("upd").textContent = "Last updated " + impact.updated + ".";
    }
  })();

  /* ---------------- Collection ---------------- */
  function buildPrice(item) {
    var p = item.price || {};
    var have = CURRENCY.filter(function (c) { return num(p[c.key]); });
    if (!have.length) return el("p", { class: "price tbc", text: "Price confirmed when the piece is ready." });
    var first = have[0];
    var box = el("div", { class: "price" }, [
      el("div", { class: "main" }, [first.sym + fmt(p[first.key]), el("small", { text: "delivered " + first.where })])
    ]);
    if (have.length > 1) {
      box.appendChild(el("div", { class: "alt", text: have.slice(1).map(function (c) { return c.sym + fmt(p[c.key]) + " " + c.where; }).join("  ·  ") }));
    }
    box.appendChild(el("div", { class: "note", text: item.priceNote || "Indicative, including taxes. Final price confirmed by email." }));
    return box;
  }

  function buildCard(item) {
    var photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
    var photo = el("div", { class: "photo" });
    var img = null;
    function placeholder() {
      photo.querySelectorAll("img").forEach(function (x) { x.remove(); });
      if (!photo.querySelector(".ph")) photo.insertBefore(el("div", { class: "ph", text: "Photos coming soon" }), photo.firstChild);
    }
    if (photos.length) {
      img = el("img", { src: photos[0], alt: item.title + ", photo 1", loading: "lazy", decoding: "async" });
      img.addEventListener("error", placeholder);
      photo.appendChild(img);
    } else {
      placeholder();
    }
    var s = STATUS[item.status] ? item.status : "sourcing";
    photo.appendChild(el("span", { class: "status", "data-s": s, text: STATUS[s] }));

    var thumbs = null;
    if (photos.length > 1) {
      thumbs = el("div", { class: "thumbs" });
      photos.forEach(function (src, i) {
        var b = el("button", { type: "button", "aria-label": "Show photo " + (i + 1), "aria-current": i === 0 ? "true" : "false" },
          [el("img", { src: src, alt: "", loading: "lazy" })]);
        b.addEventListener("click", function () {
          if (!img) return;
          img.src = src; img.alt = item.title + ", photo " + (i + 1);
          thumbs.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-current", "false"); });
          b.setAttribute("aria-current", "true");
        });
        thumbs.appendChild(b);
      });
    }

    var specs = el("dl", { class: "specs" });
    [["Period", item.period], ["Material", item.material], ["Size", item.dimensions], ["Condition", item.condition]]
      .forEach(function (p) { if (p[1]) { specs.appendChild(el("dt", { text: p[0] })); specs.appendChild(el("dd", { text: p[1] })); } });

    var reserved = item.status === "reserved";
    var btn = el("button", { type: "button", class: "btn", text: reserved ? "Join the waiting list" : "Register interest" });
    btn.addEventListener("click", function () { openDialog(item); });

    var share = el("button", { type: "button", class: "share", text: "Copy link to this piece" });
    share.addEventListener("click", function () {
      var url = location.origin + location.pathname + "#" + item.id;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
        .then(function () { share.textContent = "Link copied"; })
        .catch(function () { location.hash = item.id; share.textContent = "Link is in the address bar"; });
    });

    return el("article", { class: "card", id: item.id }, [
      photo, thumbs,
      el("div", { class: "body" }, [
        el("p", { class: "cat", text: item.category || "Other" }),
        el("h2", { text: item.title }),
        item.description ? el("p", { class: "desc", text: item.description }) : null,
        specs.children.length ? specs : null,
        buildPrice(item), share, btn
      ])
    ]);
  }

  function render() {
    grid.textContent = "";
    var shown = items.filter(function (i) { return activeCat === "All" || (i.category || "Other") === activeCat; });
    shown.forEach(function (i) { grid.appendChild(buildCard(i)); });
    var none = items.length === 0;
    $("soon-box").hidden = !none;
    emptyEl.hidden = none || shown.length > 0;
    countEl.hidden = none;
    countEl.textContent = shown.length + (shown.length === 1 ? " piece" : " pieces");
  }

  function renderFilters() {
    var cats = ["All"];
    items.forEach(function (i) { var c = i.category || "Other"; if (cats.indexOf(c) < 0) cats.push(c); });
    if (cats.length < 3) { filters.hidden = true; return; }
    cats.forEach(function (c) {
      var b = el("button", { type: "button", class: "chip", "aria-pressed": c === activeCat ? "true" : "false", text: c });
      b.addEventListener("click", function () {
        activeCat = c;
        filters.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        render();
      });
      filters.appendChild(b);
    });
  }

  /* ---------------- Register-interest form ---------------- */
  function openDialog(item) {
    current = item;
    form.hidden = false; doneEl.hidden = true; errEl.hidden = true;
    $("dlg-for").textContent = item.title;
    submitBtn.disabled = false; submitBtn.textContent = "Register interest";
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    $("f-name").focus();
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }
  function fail(msg) { errEl.textContent = msg; errEl.hidden = false; submitBtn.disabled = false; submitBtn.textContent = "Register interest"; }

  $("cancel").addEventListener("click", closeDialog);
  $("close").addEventListener("click", closeDialog);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDialog(); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    errEl.hidden = true;
    var name = form.elements["name"].value.trim();
    var email = form.elements["email"].value.trim();
    var country = form.elements["country"].value;
    if (!name) return fail("Please add your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("Please check your email address.");
    if (!country) return fail("Please choose where the piece would be delivered.");
    if (!form.elements["consent"].checked) return fail("Please tick the box so we can email you about this piece.");
    if (SHEET_ENDPOINT.indexOf("https://") !== 0) return fail("The form is not connected yet. Please email " + CONTACT_EMAIL + ".");

    var leadId = window.nvAnalytics ? window.nvAnalytics.leadId() : String(Date.now());
    var data = new URLSearchParams({
      lead_id: leadId,
      item_id: current.id, item_title: current.title, name: name, email: email, country: country,
      note: form.elements["note"].value.trim(), consent: "yes", website: form.elements["website"].value,
      page: location.origin + location.pathname, referrer: document.referrer.slice(0, 200),
      utm_source: utm.utm_source || "", utm_medium: utm.utm_medium || "",
      utm_campaign: utm.utm_campaign || "", utm_content: utm.utm_content || "",
      ga_client_id: (window.nvAnalytics && window.nvAnalytics.clientId()) || ""
    });

    submitBtn.disabled = true; submitBtn.textContent = "Sending";
    fetch(SHEET_ENDPOINT, { method: "POST", body: data })
      .then(function (r) { return r.json(); })
      .then(function (out) {
        if (!out || !out.ok) throw new Error((out && out.error) || "failed");
        form.hidden = true; doneEl.hidden = false;
        $("done-text").textContent = "Thank you, " + name.split(" ")[0] + ". We will email " + email + " as soon as the " + current.title + " is ready to ship.";
        form.reset();
        var leadData = { item_id: current.id, item_name: current.title, country: country, lead_id: leadId };
        if (window.nvAnalytics) window.nvAnalytics.event("generate_lead", leadData);
        else (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: "generate_lead" }, leadData));
      })
      .catch(function () {
        fail("Sorry, that did not send. Please try again, or email " + CONTACT_EMAIL + " and mention the " + current.title + ".");
      });
  });

  renderFilters();
  render();

  /* Links: shop.html#regeneration opens the trees tab; shop.html#item-id opens and highlights a piece. */
  function followHash(fromMenu) {
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash === "regeneration") {
      showTab("regeneration", { scroll: fromMenu });
    } else if (!hash) {
      showTab("collection", { scroll: fromMenu });
    } else {
      var linked = document.getElementById(hash);
      if (linked && linked.classList.contains("card")) {
        showTab("collection");
        linked.classList.add("is-linked"); linked.scrollIntoView({ block: "start" });
      }
    }
  }
  followHash(false);
  window.addEventListener("hashchange", function () { followHash(true); });
  /* Menu link to plain shop.html while already on the page: show the collection tab. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".nvm-links a");
    if (a && a.getAttribute("href") === "shop.html") {
      e.preventDefault();
      history.replaceState(null, "", location.pathname + location.search);
      followHash(true);
    }
  });
})();
