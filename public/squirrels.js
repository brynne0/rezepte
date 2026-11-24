// Picks today's squirrel for the splash and SeasonalSquirrel; ?season=easter to test
(function () {
  var BIRTHDAY = ""; // "MM-DD" to enable

  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  var d = now.getDate();
  var mmdd = String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");

  // Easter Sunday (Meeus algorithm)
  var a = y % 19, b = Math.floor(y / 100), c = y % 100;
  var h = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  var l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
  var k = Math.floor((a + 11 * h + 22 * l) / 451);
  var easter = new Date(y, Math.floor((h + l - 7 * k + 114) / 31) - 1, ((h + l - 7 * k + 114) % 31) + 1);
  var daysFromEaster = Math.round((new Date(y, m - 1, d) - easter) / 864e5);

  var season = "";
  if (BIRTHDAY && mmdd === BIRTHDAY) season = "birthday";
  else if (m === 12 && d <= 26) season = "christmas";
  else if (m === 12 || mmdd === "01-01") season = "nye";
  else if (daysFromEaster >= -7 && daysFromEaster <= 1) season = "easter"; // Palm Sunday to Easter Monday
  else if (m === 10 && d >= 17) season = "halloween";
  else if (m === 2 && d >= 7 && d <= 14) season = "valentines";

  var forced = location.search.match(/[?&]season=(\w+)/);
  if (forced) season = forced[1];

  var PAW = '<path d="M15.236 22a3 3 0 0 0-2.2-5"/><path d="M18 13h.01"/>';
  var FULL = PAW +
    '<path d="M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-4-4V4"/>' +
    '<path d="M18 6a4 4 0 0 0-4 4 7 7 0 0 0-7 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10"/>';
  // Head cut away for a hat
  var HAT_BODY = PAW +
    '<path d="M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-1.354-3"/>' +
    '<path d="M14.5 10a7 7 0 0 0-7.5 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10"/>';

  var drawings = {
    christmas: HAT_BODY +
      '<g stroke-width="1.3"><path fill="#b8402f" d="M20 7.3c0-3.1-1.3-5.2-3.4-5.4-1.7-.1-3 1-3.3 2.6l1.5.6.2 2.2Z"/>' +
      '<circle fill="#fffaf2" cx="13.3" cy="5.1" r="1.3"/>' +
      '<path fill="#fffaf2" d="M15.5 10.45h4a1.6 1.6 0 0 0 0-3.2h-4a1.6 1.6 0 0 0 0 3.2Z"/></g>',
    // Reindeer: antlers and a glowing nose
    "christmas-dark": HAT_BODY + '<path d="M14.5 10C15.5 7.6 19.2 7.4 20.646 10"/>' +
      '<defs><filter id="squirrel-glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation=".7" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<g stroke="#8a5a3b" stroke-width="1.3"><path d="M16.2 8.9 15.3 4.4M15.6 5.8l-1.4-1.1M15.3 4.4l-.3-1.6"/>' +
      '<path d="M19.1 8.6 20.2 4.2M19.9 5.5l1.5-1M20.2 4.2l.5-1.6"/></g>' +
      '<circle fill="#e0624c" stroke="none" cx="22.1" cy="13.7" r=".85" filter="url(#squirrel-glow)"/>',
    nye: FULL +
      '<g stroke-width="1.4"><path stroke="#e0624c" d="m12.6 2.2.6.9"/><path stroke="#5a8fd6" d="M15.2 1.4h1"/>' +
      '<path stroke="#e8b339" d="m14.4 4.6.8-.5"/><path stroke="#7fb58e" d="m20.6 2.1.5.8"/>' +
      '<path stroke="#e0624c" d="M22.6 5.4h.9"/><path stroke="#5a8fd6" d="m10.6 1 .7-.4"/></g>',
    easter: HAT_BODY + '<path d="M14.5 10C15.5 7.6 19.2 7.4 20.646 10"/>' +
      '<g stroke-width="1.3"><path fill="#f3c1c9" d="M16.1 8.7C15 6 15 2.4 16.4 1.6c1.2.6 1.3 4.2.9 6.8"/>' +
      '<path fill="#f3c1c9" d="M18.5 8.3c-.2-2.7.5-6.2 2-6.5 1 .8 0 4.2-.8 6.8"/>' +
      '<ellipse fill="#9cc9a8" cx="21.4" cy="19.7" rx="1.9" ry="2.4"/><path d="m19.6 19.5.9-.7.9.7.9-.7.8.6"/></g>',
    halloween: HAT_BODY +
      '<g stroke-width="1.3"><path fill="#5b3f73" d="M15.4 9.9 17.5 3.7c.6-1.8 1.7-2.3 3.1-2.3-1.3 1-1.3 2.2-1.2 3.1l1 5.4Z"/>' +
      '<path stroke="#e8862a" d="M15.9 8.5h4.3"/><path fill="#5b3f73" d="M13.2 10.3c2.8-1.1 6.2-1.1 9 0-2.8.7-6.2.7-9 0Z"/></g>',
    valentines: FULL +
      '<path transform="translate(21.5 20.3) scale(1.35)" fill="#e0624c" stroke-width=".89" ' +
      'd="M0 .9c-1-.6-1.4-1.1-1.4-1.6 0-.4.3-.7.7-.7.3 0 .5.2.7.4.2-.2.4-.4.7-.4.4 0 .7.3.7.7 0 .5-.4 1-1.4 1.6Z"/>',
    birthday: HAT_BODY +
      '<g stroke-width="1.3"><path fill="#e8b339" d="M15 10.2 18.4 2.4l2.6 7.8Z"/><circle fill="#e0624c" cx="18.4" cy="1.9" r="1"/>' +
      '<g fill="#fffaf2" stroke="none"><circle cx="17.9" cy="6.4" r=".55"/><circle cx="19.3" cy="8.6" r=".55"/><circle cx="16.7" cy="8.9" r=".55"/></g></g>',
  };
  if (!drawings[season]) season = "";

  window.squirrels = { season: season, drawings: drawings };
  if (season) document.documentElement.dataset.season = season;

  var splash = document.getElementById("splash");
  if (splash) {
    var isDark = document.documentElement.classList.contains("dark");
    var drawing = (isDark && drawings[season + "-dark"]) || drawings[season] || FULL;
    splash.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + drawing + "</svg>";
  }
})();
