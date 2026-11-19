/* Page script for index.html. Kept out of the HTML so the Content Security Policy can block inline scripts. */
(function(){
"use strict";

/* ============================================================
   GOOGLE SHEET ENDPOINT
   Paste your Apps Script web app URL (it ends in /exec)
   between the quotes. Nothing else needs changing.
   ============================================================ */
var SHEET_URL = "https://script.google.com/macros/s/AKfycby5Vm3MEnJvZUC9vSTIrjQqkwyN_YK6-HbDr50BrwuYwolTsPkeYNup1mJjaRA1Ff7N/exec";

var CONSENT = "We'll email you about Nirvanam pieces and launches. Unsubscribe any time.";
var PLACES = 100;
var configured = /^https:\/\/script\.google\.com\/macros\/s\/[^\/]+\/exec$/.test(SHEET_URL);
if (!configured && window.console) console.warn("[nirvanam] SHEET_URL is not set, so signups cannot be saved.");

function $all(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function param(k){
  var m = new RegExp("[?&]" + k + "=([^&#]*)").exec(window.location.search);
  return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
}

/* ============================================================
   HEADLINE VARIANTS for message testing
   Send traffic with ?v=heritage or ?v=craft. No parameter = design.
   The variant is saved against every signup in the sheet.
   ============================================================ */
var VARIANTS = {
  heritage: {
    h1: "The mansions are fading. Their treasures live on.",
    ld: "Hand-picked antiques from the Chettiar houses of Tamil Nadu, sent to homes worldwide. Every sale revives old furniture and plants trees in India and Wales."
  },
  craft: {
    h1: "Antiques chosen by hand, trees planted for good",
    ld: "We choose each piece in Chettinad, sell it worldwide, and put the profit into reviving old furniture and planting trees. Our signature brass-inlay line follows."
  }
};
var vKey = param("v"), variant = VARIANTS[vKey] ? vKey : "design";
if (VARIANTS[vKey]) {
  document.getElementById("h1").textContent = VARIANTS[vKey].h1;
  document.getElementById("ld").textContent = VARIANTS[vKey].ld;
}

/* where the visitor came from */
var attribution = {
  source: param("utm_source") || param("src") || (document.referrer ? "referral" : "direct"),
  medium: param("utm_medium"),
  campaign: param("utm_campaign"),
  referrer: document.referrer || ""
};

/* analytics: fires into GA4 / GTM / Plausible if any of them is on the page */
function track(event, data){
  data = data || {};
  data.variant = variant;
  data.source = attribution.source;
  if (window.nvAnalytics) window.nvAnalytics.event(event, data);
  else if (window.dataLayer && !window.gtag) window.dataLayer.push(Object.assign({event: event}, data));
  if (window.gtag) window.gtag("event", event, data);
  if (window.plausible) window.plausible(event, {props: data});
}

/* talk to the sheet. A plain form-encoded POST needs no preflight, and
   Apps Script answers with JSON we can read, so we know the row was saved. */
function send(data){
  if (!configured) return Promise.reject(new Error("not-configured"));
  var ctl = window.AbortController ? new AbortController() : null;
  var timer = ctl ? setTimeout(function(){ ctl.abort(); }, 15000) : null;
  return fetch(SHEET_URL, {
    method: "POST",
    body: new URLSearchParams(data),
    redirect: "follow",
    signal: ctl ? ctl.signal : undefined
  }).then(function(r){ return r.json(); }).then(function(j){
    if (timer) clearTimeout(timer);
    if (!j || !j.ok) { var e = new Error((j && j.error) || "rejected"); e.server = true; throw e; }
    return j;
  }, function(err){ if (timer) clearTimeout(timer); throw err; });
}

/* live count of places left */
var plateK = document.getElementById("plate-k"), plateV = document.getElementById("plate-v");
function showRemaining(n){
  var text = n > 0 ? n + " of " + PLACES + " places left." : "The first hundred is full. Join the wider list.";
  $all(".places").forEach(function(el){ el.textContent = text; });
  if (n > 0) { plateV.textContent = n + " of " + PLACES + " left"; plateK.hidden = false; plateV.hidden = false; }
}
if (configured) {
  fetch(SHEET_URL).then(function(r){ return r.json(); }).then(function(j){
    if (j && typeof j.remaining === "number") { if (j.places) PLACES = j.places; showRemaining(j.remaining); }
  }).catch(function(){});
}

/* ============================================================
   SIGNUP
   ============================================================ */
var signupId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
var signedUp = false;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var bar = document.getElementById("bar");

function el(tag, cls, text){ var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

var INTERESTS = [
  ["revived", "Revived antique furniture",   "We'll write the moment the first revived pieces are ready."],
  ["kolam",   "The signature brass-inlay line", "We'll show you the signature line first."],
  ["coedwig", "Antiques from the Collection",   "We'll write as soon as the first antiques are ready."],
  ["story",   "Just the story",               "We'll send the films and the story, and leave the selling out."]
];

function finish(block, heading, line){
  block.innerHTML = "";
  var a = el("div", "after");
  a.appendChild(el("h3", "", heading));
  a.appendChild(el("p", "", line));
  block.appendChild(a);
  if (block.getAttribute("data-place") === "bar") setTimeout(function(){ bar.classList.remove("show"); }, 5000);
}

function askInterest(block, res){
  var heading = res.duplicate ? "You're already on the list" :
    (res.position && res.position <= PLACES ? "You're on the list, no. " + res.position + " of " + PLACES : "You're on the list");
  block.innerHTML = "";
  var a = el("div", "after");
  a.appendChild(el("h3", "", heading));
  a.appendChild(el("p", "", "One question so we send you the right things. What draws you?"));
  var chips = el("div", "chips");
  INTERESTS.forEach(function(it){
    var c = el("button", "chip", it[1]);
    c.type = "button";
    c.addEventListener("click", function(){
      send({action: "segment", id: signupId, segment: it[0]}).catch(function(){});
      track("segment_selected", {segment: it[0]});
      finish(block, heading, it[2]);
    });
    chips.appendChild(c);
  });
  a.appendChild(chips);
  block.appendChild(a);
}

function onSuccess(block, res){
  signedUp = true;
  try { localStorage.setItem("nirvanam_list", "1"); } catch (e) {}
  if (typeof res.remaining === "number") showRemaining(res.remaining);
  if (res.position) {
    plateK.textContent = res.position <= PLACES ? "First refusal" : "On the list";
    plateV.textContent = "No. " + res.position + (res.position <= PLACES ? " of " + PLACES : "");
    plateK.hidden = false; plateV.hidden = false;
    plateK.classList.add("new"); plateV.classList.add("new");
  }
  /* the other forms have done their job */
  $all(".signup").forEach(function(other){
    if (other === block) return;
    if (other.getAttribute("data-place") === "bar") { bar.classList.remove("show"); return; }
    finish(other, "You're on the list", "We'll write when the first pieces are ready.");
  });
  askInterest(block, res);
}

$all(".signup").forEach(function(block){
  var form = block.querySelector("form");
  var input = form.querySelector("input[type=email]");
  var btn = form.querySelector(".go");
  var msg = form.querySelector(".msg");
  function fail(text){ msg.textContent = text; msg.hidden = false; }

  input.addEventListener("input", function(){ msg.hidden = true; input.removeAttribute("aria-invalid"); });

  form.addEventListener("submit", function(ev){
    ev.preventDefault();
    var email = input.value.trim();
    msg.hidden = true;
    if (!EMAIL_RE.test(email)) {
      input.setAttribute("aria-invalid", "true");
      fail("Enter an email address, like name@example.com.");
      input.focus();
      return;
    }
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "Adding you";

    send({
      action: "signup",
      id: signupId,
      email: email,
      variant: variant,
      source: attribution.source,
      medium: attribution.medium,
      campaign: attribution.campaign,
      referrer: attribution.referrer,
      place: block.getAttribute("data-place"),
      consent: CONSENT,
      page: location.href.split("#")[0],
      ua: navigator.userAgent,
      ga_client_id: (window.nvAnalytics && window.nvAnalytics.clientId()) || "",
      website: form.querySelector("input[name=website]").value
    }).then(function(res){
      track("email_captured", {place: block.getAttribute("data-place"), lead_id: signupId});
      onSuccess(block, res);
    }).catch(function(err){
      btn.disabled = false;
      btn.textContent = label;
      if (err && err.message === "not-configured") fail("The list isn't open yet. Check back soon.");
      else if (err && err.server && err.message === "invalid-email") { input.setAttribute("aria-invalid", "true"); fail("That email address doesn't look right. Check it and try again."); }
      else fail("That didn't save. Check your connection and try again.");
    });
  });
});

/* show the bar only while neither main form is on screen */
var already = false;
try { already = localStorage.getItem("nirvanam_list") === "1"; } catch (e) {}
if ("IntersectionObserver" in window && !already) {
  var visible = {};
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ visible[en.target.getAttribute("data-place")] = en.isIntersecting; });
    var anyVisible = visible.hero || visible.join;
    if (signedUp) return;
    bar.classList.toggle("show", !anyVisible);
  }, {threshold: 0.2});
  $all(".signup").forEach(function(b){ if (b.getAttribute("data-place") !== "bar") io.observe(b); });
}

/* scroll depth, to see whether the story is being read */
var fired = {};
window.addEventListener("scroll", function(){
  var pct = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
  [0.5, 0.9].forEach(function(m){
    if (pct >= m && !fired[m]) { fired[m] = true; track("scroll_" + Math.round(m * 100)); }
  });
}, {passive: true});

})();
