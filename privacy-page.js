/* Page script for privacy.html. Kept out of the HTML so the Content Security Policy can block inline scripts. */
document.getElementById("cookie-choice").addEventListener("click", function () {
  if (window.nvAnalytics) window.nvAnalytics.openCookieChoice();
});
