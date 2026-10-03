/* Small enhancements: the light/dark toggle, section tracking along the left
   path, copy buttons, BibTeX and demo panels, and the animated scene in the
   top frame. The page reads fine without any of this. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function onMediaChange(query, fn) {
    if (query.addEventListener) query.addEventListener("change", fn);
    else if (query.addListener) query.addListener(fn);
  }

  /* ---------- Light / dark ---------- */

  var toggle = document.getElementById("theme-toggle");

  function isDark() {
    var chosen = root.getAttribute("data-theme");
    return chosen ? chosen === "dark" : systemDark.matches;
  }

  var themeColor = document.querySelector('meta[name="theme-color"]');

  function labelToggle() {
    if (toggle) toggle.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    if (themeColor) themeColor.setAttribute("content", isDark() ? "#121110" : "#f4f3f0");   // browser bar color
  }

  var hint = document.getElementById("night-hint");

  function hasSavedTheme() {
    try { var saved = sessionStorage.getItem("site-theme"); return saved === "light" || saved === "dark"; } catch (e) { return false; }
  }

  var sceneApi = null;                  // set by the scene below; turns the city lights on

  function setTheme(next) {
    root.setAttribute("data-theme", next);
    try { sessionStorage.setItem("site-theme", next); } catch (e) { /* storage blocked */ }   // this visit only
    labelToggle();
    if (hint) hint.hidden = true;       // the visitor has chosen; no more invitation
  }

  // Switch themes at once, with a quick page cross-fade where the browser supports it.
  function commitTheme(next) {
    if (!document.startViewTransition || reduceMotion.matches) { setTheme(next); return; }
    var applied = false;
    var apply = function () { if (!applied) { applied = true; setTheme(next); } };
    document.startViewTransition(apply);
    setTimeout(apply, 300);             // in case the browser never gets to run the fade
  }

  // Night: the page turns dark right away; in the scene, the city lights come on one by one.
  function startNight() {
    if (hint) hint.hidden = true;
    if (sceneApi) sceneApi.lightUp();
    commitTheme("dark");
  }

  if (toggle) toggle.addEventListener("click", function () { if (isDark()) commitTheme("light"); else startNight(); });

  // Invite first-time visitors to the night view. It also follows theme changes
  // made from outside (such as a host page applying its own theme).
  function syncHint() {
    if (hint) hint.hidden = hasSavedTheme() || isDark();
  }
  // In the visitor's evening (or small hours), the invitation says so.
  function setHintTime() {
    var when = hint && hint.querySelector(".frame__hint-when");
    if (!when) return;
    var hour = new Date().getHours();
    when.textContent = hour >= 18 ? "It\u2019s evening where you are. " : hour < 5 ? "It\u2019s late where you are. " : "";
  }

  if (hint) {
    setHintTime();
    syncHint();
    hint.addEventListener("click", startNight);
    if (window.MutationObserver) {
      new MutationObserver(syncHint).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    }
    onMediaChange(systemDark, syncHint);
  }
  onMediaChange(systemDark, labelToggle);
  labelToggle();

  /* ---------- Sections along the path ---------- */

  var bar = document.getElementById("bar");
  var path = document.getElementById("path");
  var sections = Array.prototype.slice.call(document.querySelectorAll(".section"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  var pending = false;

  // Height in the viewport where a section becomes current: the dot of a pinned label.
  function markerY() {
    var label = sections.length ? sections[0].querySelector(".section__label") : null;
    var style = label ? getComputedStyle(label) : null;
    var top = style && style.position === "sticky" ? parseFloat(style.top) : NaN;
    if (isNaN(top)) top = (bar ? bar.offsetHeight : 60) + 40;
    return top + 9;
  }

  function track() {
    pending = false;
    var doc = document.documentElement;
    if (bar) bar.classList.toggle("is-scrolled", window.scrollY > 8);
    if (!path || !sections.length) return;

    var y = markerY();
    var box = path.getBoundingClientRect();
    var scrollable = doc.scrollHeight - window.innerHeight > 4;
    var atEnd = scrollable && window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
    var travel = atEnd ? 1 : Math.min(1, Math.max(0, (y - box.top) / box.height));
    path.style.setProperty("--travel", travel.toFixed(4));

    var current = -1;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= y) current = i;
    }
    if (atEnd) current = sections.length - 1;

    sections.forEach(function (section, index) {
      section.classList.toggle("is-current", index === current);
      section.classList.toggle("is-past", index < current);
    });

    var key = current >= 0 ? sections[current].getAttribute("data-nav") : null;
    navLinks.forEach(function (link) {
      link.classList.toggle("is-current", !!key && link.getAttribute("href") === "#" + key);
    });
  }

  function requestTrack() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(track);
  }

  window.addEventListener("scroll", requestTrack, { passive: true });
  window.addEventListener("resize", requestTrack);
  track();

  // On a very narrow phone the nav can still run past the edge; fade its end only then.
  var nav = document.querySelector(".nav");
  function fitNav() {
    if (nav) nav.classList.toggle("is-clipped", nav.scrollWidth > nav.clientWidth + 1);
  }
  window.addEventListener("resize", fitNav);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);
  fitNav();

  /* ---------- Copy buttons ---------- */

  var announcer = document.getElementById("announcer");

  function flash(button, message) {
    if (!button.hasAttribute("data-label")) button.setAttribute("data-label", button.textContent);
    button.textContent = message;
    button.classList.add("is-done");
    if (announcer) announcer.textContent = message;
    window.clearTimeout(button._reset);
    button._reset = window.setTimeout(function () {
      button.textContent = button.getAttribute("data-label");
      button.classList.remove("is-done");
    }, 1800);
  }

  function selectContents(node) {
    if (!node || !window.getSelection) return;
    var range = document.createRange();
    range.selectNodeContents(node);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest ? event.target.closest(".copy") : null;
    if (!button) return;
    var source = document.getElementById(button.getAttribute("data-copy-from") || "");
    var text = source ? source.textContent : button.getAttribute("data-copy-text");
    var target = source || button.previousElementSibling;
    if (!text) return;
    var fallback = function () { selectContents(target); flash(button, "Selected"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(button, "Copied"); }, fallback);
    } else {
      fallback();
    }
  });

  /* ---------- Panels under an entry (BibTeX, demo video) ----------
     A demo plays when its panel opens and pauses when it closes. */

  Array.prototype.forEach.call(document.querySelectorAll(".actions button[aria-controls]"), function (button) {
    var panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    var video = panel.querySelector("video");
    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      if (video && open) video.pause();
      if (video && !open) {
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () {});
        panel.scrollIntoView({ block: "nearest" });
      }
      requestTrack();
    });
  });

  /* ---------- Scene in the top frame ----------
     A road at dusk, seen from behind and above a test vehicle: the rings its
     roof sensor traces on the ground, boxes around two cars it tracks, and a
     drone overhead. The drone's detection area moves with it, and the
     sensor dots inside that area turn gold. Roadside units pass by like
     street lamps and talk to the test vehicle while it is in range. Far
     ahead, a small skyline sits on the horizon where the road leads. Units are meters:
     x across the road, y along it, z up. The camera rides with the test
     vehicle, so the lane paint slides past. */

  var TAU = Math.PI * 2;
  var SPEED = 10;                             // m/s the road slides past, about city-street pace
  var SENSOR = { x: 1.75, y: 0, z: 1.95 };     // roof sensor of the test vehicle
  var EGO = { x: 1.75, cy: 0, w: 1.9, l: 4.6, h: 1.5 };
  var STEPS = 240;                             // samples around each ring
  var RINGS = [];                              // where each downward beam meets the ground
  var STRIDE = [];                             // use every Nth sample, so dots sit ~0.45 m apart
  for (var ringIndex = 0; ringIndex < 6; ringIndex++) {
    var reachM = 3 * Math.pow(1.28, ringIndex);
    RINGS.push(reachM);
    STRIDE.push(Math.max(1, Math.round(STEPS / Math.min(STEPS, Math.max(40, TAU * reachM / 0.45)))));
  }

  // Two cars ahead, keeping pace: a lead car in the test vehicle's lane and
  // one far ahead in the right lane. Lane center x, distance ahead, size, and
  // how far each eases forward and back. Placed so that, from this camera,
  // no box ever touches the drone's corner marks.
  var TRAFFIC = [
    { x: 1.75, y: 26, w: 1.9, l: 4.7, h: 1.5, drift: 2, phase: 0 },
    { x: 5.25, y: 78, w: 1.9, l: 4.6, h: 1.5, drift: 3, phase: 2 }
  ];

  // Roadside units: light poles on the right shoulder, each with an arm and a
  // sensor head over the road, one every RSU_GAP meters. They fade in near
  // the horizon and out before reaching the test vehicle; while one is within
  // RSU_TALK meters ahead, a dashed link with small pulses joins its head to
  // the vehicle's roof sensor.
  var RSU_X = 9.5;
  var RSU_GAP = 85;          // wide enough that at most two are in view at once
  var RSU_POLE = 6.2;
  var RSU_ARM = 1.4;
  var RSU_TALK = 50;

  // Camera for each frame shape: position, yaw (+ looks right), pitch
  // (- looks down) and horizontal field of view, in degrees. skyline is where
  // the skyline is centered, as a fraction of the frame width: the middle,
  // except on phones, where the drone and its view lines take the middle.
  var SHOTS = {
    wide: { pos: [-5, -44, 7], yaw: -5, pitch: -5, fov: 56, skyline: 0.5 },
    mid: { pos: [-4.5, -40, 7.8], yaw: -4, pitch: -6.5, fov: 58, skyline: 0.5 },
    tall: { pos: [0, -30, 9], yaw: 0, pitch: -20, fov: 50, skyline: 0.28 }
  };

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function ramp(from, to, value) { return clamp((value - from) / (to - from), 0, 1); }

  // A light that switches on as `level` passes `delay`, with a brief flicker as it does.
  function switchOn(level, delay, t, seed) {
    var v = clamp((level - delay) / 0.14, 0, 1);
    if (v > 0 && v < 1) v *= 0.45 + 0.55 * Math.abs(Math.sin(t * 37 + seed * 12.9898));
    return v;
  }
  function wrap(value, min, span) { return (((value - min) % span) + span) % span + min; }
  function fade(depth) { return clamp(1 - (depth - 35) / 190, 0.2, 1); }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  var probe = null;

  // Any CSS color (hex, rgb, oklch) to [r, g, b] bytes, by painting one pixel.
  function cssColor(name) {
    var value = getComputedStyle(root).getPropertyValue(name).trim();
    if (!probe) {
      probe = document.createElement("canvas");
      probe.width = probe.height = 1;
    }
    var ctx = probe.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    if (value) ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    var d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }

  function camera(shot, w, h) {
    var yaw = shot.yaw * Math.PI / 180;
    var pitch = shot.pitch * Math.PI / 180;
    var f = [Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch)];
    var n = Math.hypot(f[0], f[1]);
    var r = [f[1] / n, -f[0] / n, 0];
    var u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    return { p: shot.pos, f: f, r: r, u: u, focal: w / 2 / Math.tan(shot.fov * Math.PI / 360), cx: w / 2, cy: h / 2 };
  }

  // World point to screen. Returns false for points behind the camera.
  function project(cam, x, y, z, out) {
    var dx = x - cam.p[0], dy = y - cam.p[1], dz = z - cam.p[2];
    var depth = dx * cam.f[0] + dy * cam.f[1] + dz * cam.f[2];
    if (depth < 0.5) return false;
    out.x = cam.cx + (dx * cam.r[0] + dy * cam.r[1] + dz * cam.r[2]) / depth * cam.focal;
    out.y = cam.cy - (dx * cam.u[0] + dy * cam.u[1] + dz * cam.u[2]) / depth * cam.focal;
    out.d = depth;
    return true;
  }

  // Where a flat ray from (ox, oy) first enters a car's footprint, and where it leaves.
  function hitCar(ox, oy, dx, dy, car, out) {
    var lo = -Infinity, hi = Infinity, a, b;
    if (dx !== 0) {
      a = (car.x - car.w / 2 - ox) / dx;
      b = (car.x + car.w / 2 - ox) / dx;
      lo = Math.max(lo, Math.min(a, b));
      hi = Math.min(hi, Math.max(a, b));
    } else if (Math.abs(ox - car.x) > car.w / 2) return false;
    if (dy !== 0) {
      a = (car.cy - car.l / 2 - oy) / dy;
      b = (car.cy + car.l / 2 - oy) / dy;
      lo = Math.max(lo, Math.min(a, b));
      hi = Math.min(hi, Math.max(a, b));
    } else if (Math.abs(oy - car.cy) > car.l / 2) return false;
    if (lo <= 0 || hi < lo) return false;
    out.near = lo;
    out.far = hi;
    return true;
  }

  // The drone's detection area: a road-aligned rectangle centered across the
  // test vehicle's lane, reaching further ahead than behind so the vehicle
  // sits in its middle once perspective shortens the far end; the lead car
  // is inside it too. It slides with the drone and grows a little as the
  // drone climbs. Corners run counterclockwise: back-left, back-right,
  // front-right, front-left.
  function footprint(drone) {
    var scale = drone[2] / 11;
    var hx = 6 * scale;
    var back = drone[1] - 23 * scale;
    var front = drone[1] + 16 * scale;
    return [[drone[0] - hx, back], [drone[0] + hx, back], [drone[0] + hx, front], [drone[0] - hx, front]];
  }

  function inside(quad, x, y) {
    for (var i = 0; i < 4; i++) {
      var a = quad[i];
      var b = quad[(i + 1) % 4];
      if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
    }
    return true;
  }

  // Seeded, so the sky looks the same on every visit.
  function makeSpecks(count) {
    var seed = 20261001;
    function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    var specks = [];
    for (var i = 0; i < count; i++) {
      specks.push({ u: rand(), v: rand(), size: 0.8 + rand() * rand() * 1.2, a: 0.2 + rand() * 0.5, rate: 0.4 + rand() * 1.2, phase: rand() * TAU });
    }
    return specks;
  }

  function segment(ctx, cam, a, b, p, q) {
    if (!project(cam, a[0], a[1], a[2], p) || !project(cam, b[0], b[1], b[2], q)) return;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
  }

  function glowDot(ctx, x, y, radius, color, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawBox(ctx, cam, car, color, alpha, width, p, q) {
    var x0 = car.x - car.w / 2, x1 = car.x + car.w / 2;
    var y0 = car.cy - car.l / 2, y1 = car.cy + car.l / 2;
    var c = [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], [x0, y0, car.h], [x1, y0, car.h], [x1, y1, car.h], [x0, y1, car.h]];
    var edges = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
    if (!project(cam, car.x, car.cy, 0, p)) return;
    ctx.globalAlpha = alpha * fade(p.d);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (var e = 0; e < edges.length; e += 2) segment(ctx, cam, c[edges[e]], c[edges[e + 1]], p, q);
    ctx.stroke();
  }

  // A small skyline on the horizon, in thin lines the color of the horizon
  // line. Living quarters on the left: solar panels, a dish on an A-frame,
  // two domes, an apartment block, a terraced tower, and a long greenhouse.
  // Works on the right: a hall with a tall door, two tanks, a control tower,
  // a lattice tower with two arms beside a tall vessel on its stand (no
  // taller than the control tower), and a shorter vessel standing on its legs
  // on a pad. At night a faint glow rises over it, windows are lit, and small
  // lights on the tall structures pulse slowly. Shapes use skyline units
  // (x from 0 to SKYLINE_WIDTH, y up from the horizon); unit is one skyline
  // unit in device pixels. Each shape is filled with the background so the
  // specks behind it do not show through.
  var SKYLINE_WIDTH = 158;

  // Night lights: x, y in skyline units, and kind: "w" window, "b" beacon
  // with a slow pulse, "f" floodlight (soft and wide).
  var SKYLINE_LIGHTS = [
    [24.6, 12.1, "b"],
    [31.5, 1.4, "w"], [35, 1.4, "w"], [38.5, 1.4, "w"], [44.5, 1.2, "w"],
    [54, 2.3, "w"], [58, 2.3, "w"], [56, 6.8, "w"], [54, 11.3, "w"], [58, 11.3, "w"], [56, 15.2, "w"],
    [64.8, 2.4, "w"], [68.2, 7, "w"], [66.5, 11.7, "w"], [65.8, 16.3, "w"], [67.2, 20.7, "w"],
    [94, 17.5, "w"], [101, 17.5, "w"], [94, 13.5, "w"], [101, 13.5, "w"],
    [121, 26, "b"],
    [130, 24.6, "b"], [130, 16, "w"],
    [137.5, 1.6, "f"],
    [146.6, 1.4, "w"], [157.4, 1.4, "w"]
  ];

  function drawSkyline(ctx, left, base, unit, dpr, colors, alpha, day, t, lights) {
    function lit(delay, seed) { return switchOn(lights, delay, t, seed); }
    function X(u) { return left + u * unit; }
    function Y(v) { return base - v * unit; }
    function line(x0, y0, x1, y1) {
      ctx.moveTo(X(x0), Y(y0));
      ctx.lineTo(X(x1), Y(y1));
    }
    var background = rgba(colors.bg, 1);
    var accent = rgba(colors.accent, 1);

    // filled: paint the background inside first. glow: at night, add a warm
    // wash inside (lit windows, a lit door).
    function shape(build, filled, glow) {
      ctx.beginPath();
      build();
      if (filled) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = background;
        ctx.fill();
      }
      if (glow && !day) {
        ctx.globalAlpha = glow;
        ctx.fillStyle = accent;
        ctx.fill();
      }
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }

    ctx.save();

    // At night, a faint glow over the whole skyline
    var cityGlow = clamp(lights / 0.7, 0, 1);
    if (!day && cityGlow > 0) {
      var reach = SKYLINE_WIDTH * unit * 0.7;
      ctx.save();
      ctx.translate(X(SKYLINE_WIDTH / 2), base);
      ctx.scale(1, 0.32);
      var haze = ctx.createRadialGradient(0, 0, 0, 0, 0, reach);
      haze.addColorStop(0, rgba(colors.accent, 0.12 * cityGlow));
      haze.addColorStop(1, rgba(colors.accent, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = haze;
      ctx.fillRect(-reach, -reach, reach * 2, reach);
      ctx.restore();
    }

    ctx.lineWidth = 0.75 * dpr;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = accent;

    // Solar panels on posts
    shape(function () {
      for (var k = 0; k < 3; k++) {
        line(k * 4.6 + 1.8, 0, k * 4.6 + 1.8, 3.2);
        line(k * 4.6, 2.2, k * 4.6 + 3.6, 4.2);
      }
    });

    // Dish on an A-frame, facing up and to the right
    shape(function () {
      line(19.5, 0, 22, 6.5);
      line(22, 6.5, 24.5, 0);
    });
    shape(function () { ctx.ellipse(X(22), Y(9.5), 5 * unit, 1.7 * unit, Math.PI / 4, 0, TAU); }, true);
    shape(function () { line(22, 9.5, 24.6, 12.1); });

    // Two domes, the larger one with a seam
    shape(function () {
      ctx.arc(X(35), Y(0), 6 * unit, Math.PI, TAU);
      ctx.closePath();
    }, true);
    shape(function () { line(29.8, 3, 40.2, 3); });
    shape(function () {
      ctx.arc(X(44.5), Y(0), 3.6 * unit, Math.PI, TAU);
      ctx.closePath();
    }, true);

    // Apartment block with its floors marked
    shape(function () { ctx.rect(X(52), Y(17), 8 * unit, 17 * unit); }, true);
    shape(function () {
      line(52, 4.5, 60, 4.5);
      line(52, 9, 60, 9);
      line(52, 13.5, 60, 13.5);
    });

    // Terraced tower: a wide lower block and a narrower upper one
    shape(function () { ctx.rect(X(63), Y(14), 7 * unit, 14 * unit); }, true);
    shape(function () { ctx.rect(X(64.5), Y(23), 4 * unit, 9 * unit); }, true);
    shape(function () {
      line(63, 4.7, 70, 4.7);
      line(63, 9.4, 70, 9.4);
      line(64.5, 18.5, 68.5, 18.5);
    });

    // Long greenhouse with ribs
    shape(function () {
      ctx.moveTo(X(74), Y(0));
      ctx.lineTo(X(74), Y(2.5));
      ctx.quadraticCurveTo(X(74), Y(5), X(77), Y(5));
      ctx.lineTo(X(85), Y(5));
      ctx.quadraticCurveTo(X(88), Y(5), X(88), Y(2.5));
      ctx.lineTo(X(88), Y(0));
      ctx.closePath();
    }, true, 0.14 * lit(0.3, 101));
    shape(function () {
      for (var rib = 77.5; rib < 86; rib += 3.5) line(rib, 0, rib, 5);
    });

    // Hall with a tall door
    shape(function () { ctx.rect(X(92), Y(20), 11 * unit, 20 * unit); }, true);
    shape(function () { ctx.rect(X(96), Y(15), 3 * unit, 15 * unit); }, true, 0.18 * lit(0.36, 102));

    // Two tanks
    shape(function () { ctx.arc(X(108.5), Y(2.8), 2.8 * unit, 0, TAU); }, true);
    shape(function () { ctx.arc(X(113.4), Y(2.2), 2.2 * unit, 0, TAU); }, true);

    // Control tower: a slender shaft, a cab, an antenna
    shape(function () { ctx.rect(X(120.2), Y(19), 1.6 * unit, 19 * unit); }, true);
    shape(function () {
      ctx.moveTo(X(119.3), Y(19));
      ctx.lineTo(X(122.7), Y(19));
      ctx.lineTo(X(123.2), Y(22.5));
      ctx.lineTo(X(118.8), Y(22.5));
      ctx.closePath();
    }, true, 0.3 * lit(0.5, 103));
    shape(function () { line(121, 22.5, 121, 26); });

    // Lattice tower with two arms
    shape(function () { ctx.rect(X(128), Y(24), 4 * unit, 24 * unit); }, true);
    shape(function () {
      for (var k = 0; k < 4; k++) line(k % 2 ? 132 : 128, k * 6, k % 2 ? 128 : 132, k * 6 + 6);
      line(132, 17.5, 134.8, 17.5);
      line(132, 20.5, 134.8, 20.5);
    });

    // Tall vessel on its stand; its tip is level with the control tower's
    shape(function () { ctx.rect(X(134), Y(2.5), 7 * unit, 2.5 * unit); }, true);
    shape(function () {
      ctx.moveTo(X(136), Y(2.5));
      ctx.lineTo(X(136), Y(21.5));
      ctx.quadraticCurveTo(X(136), Y(24.6), X(137.5), Y(26));
      ctx.quadraticCurveTo(X(139), Y(24.6), X(139), Y(21.5));
      ctx.lineTo(X(139), Y(2.5));
      ctx.closePath();
    }, true);
    shape(function () {
      line(136, 6, 135, 2.5);
      line(139, 6, 140, 2.5);
    });

    // Shorter vessel standing on its legs on a pad
    shape(function () { ctx.rect(X(146), Y(1.2), 12 * unit, 1.2 * unit); }, true);
    shape(function () {
      ctx.moveTo(X(150.6), Y(1.2));
      ctx.lineTo(X(150.6), Y(15));
      ctx.quadraticCurveTo(X(152), Y(16.2), X(153.4), Y(15));
      ctx.lineTo(X(153.4), Y(1.2));
      ctx.closePath();
    }, true);
    shape(function () {
      line(150.6, 4.5, 148.4, 1.2);
      line(153.4, 4.5, 155.6, 1.2);
      line(150.6, 13.5, 149.8, 13.5);
      line(153.4, 13.5, 154.2, 13.5);
    });

    // At night, lit windows and slowly pulsing lights
    if (!day) {
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < SKYLINE_LIGHTS.length; i++) {
        var light = SKYLINE_LIGHTS[i];
        var on = lit(0.04 + 0.6 * light[0] / SKYLINE_WIDTH, i);   // windows come on left to right
        if (on <= 0) continue;
        var lx = X(light[0]);
        var ly = Y(light[1]);
        var pulse = light[2] === "b"
          ? 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.3 + i), 3)
          : 0.75 + 0.25 * Math.sin(t * (0.7 + (i * 37 % 10) / 12) + i * 1.7);
        var radius = (light[2] === "f" ? 6 : light[2] === "b" ? 3.4 : 2.4) * dpr;
        glowDot(ctx, lx, ly, radius, colors.accent, (light[2] === "f" ? 0.35 : 0.6) * pulse * on);
        if (light[2] !== "f") {
          ctx.globalAlpha = 0.85 * pulse * on;
          ctx.fillStyle = rgba(colors.ink, 1);
          ctx.fillRect(lx - 0.5 * dpr, ly - 0.5 * dpr, dpr, dpr);
        }
      }
    }
    ctx.restore();
  }

  function drawDrone(ctx, x, y, dpr, t, colors) {
    var arm = 5 * dpr;
    var tilt = 0.42;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = rgba(colors.ink, 1);
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(x - arm, y - arm * tilt);
    ctx.lineTo(x + arm, y + arm * tilt);
    ctx.moveTo(x - arm, y + arm * tilt);
    ctx.lineTo(x + arm, y - arm * tilt);
    for (var s = 0; s < 4; s++) {
      var rx = x + (s < 2 ? -arm : arm);
      var ry = y + (s % 2 ? arm : -arm) * tilt;
      ctx.moveTo(rx + 2.4 * dpr, ry);
      ctx.ellipse(rx, ry, 2.4 * dpr, 2.4 * dpr * tilt, 0, 0, TAU);
    }
    ctx.stroke();
    // A light that blinks once every 1.25 s.
    var phase = (t % 1.25) / 1.25;
    var flash = phase < 0.08 ? 1 : Math.exp(-(phase - 0.08) * 10);
    glowDot(ctx, x, y, 6 * dpr, colors.accent, 0.95 * flash);
  }

  function drawScene(ctx, w, h, dpr, t, colors, specks, lights) {
    if (lights === undefined) lights = 1;   // 0..1: how far the night lights have come on
    var aspect = w / h;
    var shot = aspect < 1.2 ? SHOTS.tall : aspect < 2 ? SHOTS.mid : SHOTS.wide;
    var cam = camera(shot, w, h);
    var p = { x: 0, y: 0, d: 0 };
    var q = { x: 0, y: 0, d: 0 };
    var near = cam.p[1] + 4;
    var day = colors.day;
    var ink = rgba(colors.ink, 1);
    var accent = rgba(colors.accent, 1);
    var i, k;

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(colors.bg, 1);
    ctx.fillRect(0, 0, w, h);

    // Sky: a few faint specks, a low glow on the horizon, and a hairline along it.
    project(cam, cam.p[0], cam.p[1] + 1e5, 0, p);
    var horizon = p.y;
    ctx.fillStyle = ink;
    for (i = 0; i < specks.length; i++) {
      var speck = specks[i];
      var sy = speck.v * (horizon - 10 * dpr);
      if (sy <= 0) continue;
      ctx.globalAlpha = (day ? 0.45 : 1) * speck.a * (1 - 0.7 * speck.v) * (0.75 + 0.25 * Math.sin(t * speck.rate + speck.phase));
      ctx.fillRect(speck.u * w, sy, speck.size * dpr, speck.size * dpr);
    }
    var glow = ctx.createLinearGradient(0, horizon - 40 * dpr, 0, horizon + 12 * dpr);
    glow.addColorStop(0, rgba(colors.haze, 0));
    glow.addColorStop(0.8, rgba(colors.haze, day ? 0.035 : 0.07));
    glow.addColorStop(1, rgba(colors.haze, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - 40 * dpr, w, 52 * dpr);
    // The hairline is strongest where the skyline sits; the skyline uses the same color.
    var horizonAlpha = day ? 0.34 : 0.26;
    var hairline = ctx.createLinearGradient(0, 0, w, 0);
    hairline.addColorStop(0, rgba(colors.accent, 0));
    hairline.addColorStop(shot.skyline, rgba(colors.accent, horizonAlpha));
    hairline.addColorStop(1, rgba(colors.accent, 0));
    ctx.fillStyle = hairline;
    ctx.fillRect(0, horizon, w, dpr);

    var unit = 1.56 * dpr * clamp(w / dpr / 1700, 0.48, 0.62);
    drawSkyline(ctx, shot.skyline * w - SKYLINE_WIDTH * unit / 2, horizon, unit, dpr, colors, horizonAlpha, day, t, lights);

    // Lane paint: a solid line on each side and a dashed divider (3 m paint, 9 m gap).
    ctx.lineCap = "round";
    ctx.lineWidth = dpr;
    solid(0, colors.accent, 0.6);
    solid(7, colors.ink, 0.42);
    ctx.strokeStyle = ink;
    for (var dash = near - wrap(near + t * SPEED, 0, 12); dash < 300; dash += 12) {
      if (dash + 3 < near) continue;
      if (!project(cam, 3.5, Math.max(dash, near), 0, p) || !project(cam, 3.5, dash + 3, 0, q)) continue;
      ctx.globalAlpha = 0.52 * fade(p.d);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }

    // Roadside units: where they are now, how visible, how strongly linked.
    var units = [];
    var firstUnit = 64 - wrap(t * SPEED, 0, RSU_GAP);
    for (k = -1; k < 3; k++) {
      var uy = firstUnit + k * RSU_GAP;
      var seen = ramp(165, 135, uy) * ramp(4, 12, uy);
      if (seen > 0) units.push({ y: uy, seen: seen, talk: ramp(RSU_TALK + 2, RSU_TALK - 10, uy) * ramp(4, 12, uy) });
    }
    for (k = 0; k < units.length; k++) {
      var unit = units[k];
      var headX = RSU_X - RSU_ARM;
      if (!day) {
        // a faint pool of lamp light on the ground
        ctx.beginPath();
        var pool = true;
        for (i = 0; i <= 16; i++) {
          var a = i / 16 * TAU;
          if (!project(cam, headX + 3.2 * Math.cos(a), unit.y + 3.2 * Math.sin(a), 0, p)) { pool = false; break; }
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        if (pool) {
          ctx.globalAlpha = 0.06 * unit.seen * switchOn(lights, 0.74 + 0.05 * k, t, 200 + k);
          ctx.fillStyle = accent;
          ctx.fill();
        }
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = dpr;
      ctx.globalAlpha = (day ? 0.55 : 0.5) * unit.seen;
      ctx.beginPath();
      segment(ctx, cam, [RSU_X, unit.y, 0], [RSU_X, unit.y, RSU_POLE], p, q);
      segment(ctx, cam, [RSU_X, unit.y, RSU_POLE], [headX, unit.y, RSU_POLE + 0.2], p, q);
      ctx.stroke();
    }

    var cars = TRAFFIC.map(function (car) {
      return { x: car.x, cy: car.y + car.drift * Math.sin(t * 0.07 + car.phase), w: car.w, l: car.l, h: car.h };
    });
    var drone = [EGO.x + 0.6 * Math.sin(t * 0.27), 16 + 1.8 * Math.sin(t * 0.19 + 1), 11 + 0.35 * Math.sin(t * 0.83)];
    var foot = footprint(drone);

    // Rings where the roof sensor's beams meet the ground. Cars catch the
    // beams on their sides and leave a gap behind them.
    var sweep = (t * TAU / 7) % TAU;
    var hit = { near: 0, far: 0 };
    var ground = [];
    var seen = [];
    var surface = [];
    for (i = 0; i < STEPS; i++) {
      var angle = i / STEPS * TAU;
      var dx = Math.cos(angle);
      var dy = Math.sin(angle);
      var blocker = null;
      var enter = Infinity;
      var leave = 0;
      for (k = 0; k < cars.length; k++) {
        if (hitCar(SENSOR.x, SENSOR.y, dx, dy, cars[k], hit) && hit.near < enter) {
          blocker = cars[k];
          enter = hit.near;
          leave = hit.far;
        }
      }
      var lift = 1 + 0.7 * Math.exp(-wrap(sweep - angle, 0, TAU) / 0.45);
      for (k = 0; k < RINGS.length; k++) {
        if (i % STRIDE[k]) continue;
        var reach = RINGS[k];
        var dist = reach;
        var z = 0;
        var onCar = false;
        if (blocker && enter < reach) {
          var zFace = SENSOR.z * (1 - enter / reach);
          var roof = reach * (1 - blocker.h / SENSOR.z);
          if (zFace <= blocker.h) { dist = enter; z = zFace; onCar = true; }
          else if (roof <= leave) { dist = roof; z = blocker.h; onCar = true; }
        }
        var gx = SENSOR.x + dx * dist;
        var gy = SENSOR.y + dy * dist;
        if (!project(cam, gx, gy, z, p)) continue;
        var size = dpr * clamp(55 / p.d, 0.8, 1.7);
        if (onCar) surface.push(p.x, p.y, size, 0.9 * fade(p.d));
        else if (inside(foot, gx, gy)) seen.push(p.x, p.y, size, 0.62 * Math.pow(0.9, k) * fade(p.d) * lift);
        else ground.push(p.x, p.y, size, 0.5 * Math.pow(0.9, k) * fade(p.d) * lift);
      }
    }
    // At night the dots add light; by day they are plain dark marks.
    ctx.globalCompositeOperation = day ? "source-over" : "lighter";
    ctx.fillStyle = ink;
    dots(ground);
    dots(surface);
    ctx.fillStyle = accent;
    dots(seen);
    ctx.globalCompositeOperation = "source-over";

    // Boxes around the tracked cars; brighter for the closer one.
    for (k = 0; k < cars.length; k++) {
      var car = cars[k];
      var close = Math.hypot(car.x - SENSOR.x, car.cy - SENSOR.y) < 35;
      drawBox(ctx, cam, car, accent, close ? 0.9 : 0.45, dpr * (close ? 1.25 : 1), p, q);
    }
    drawBox(ctx, cam, EGO, ink, 0.7, dpr, p, q);
    if (project(cam, SENSOR.x, SENSOR.y, SENSOR.z, p)) glowDot(ctx, p.x, p.y, 6 * dpr, day ? colors.accent : colors.ink, 0.75);

    // The drone: faint lines to the corners of its detection area, and
    // corner marks along the area's edges.
    if (project(cam, drone[0], drone[1], drone[2], q)) {
      var dxs = q.x;
      var dys = q.y;
      ctx.strokeStyle = accent;
      ctx.lineWidth = dpr;
      ctx.globalAlpha = day ? 0.16 : 0.1;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        if (!project(cam, foot[k][0], foot[k][1], 0, p)) continue;
        ctx.moveTo(dxs, dys);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (k = 0; k < 4; k++) {
        var corner = foot[k];
        var across = k === 0 || k === 3 ? 2 : -2;   // arm toward the other side
        var along = k < 2 ? 2.4 : -2.4;             // arm toward the other end
        segment(ctx, cam, [corner[0] + across, corner[1], 0], [corner[0], corner[1], 0], p, q);
        segment(ctx, cam, [corner[0], corner[1], 0], [corner[0], corner[1] + along, 0], p, q);
      }
      ctx.stroke();
      drawDrone(ctx, dxs, dys, dpr, t, colors);
    }

    // Roadside unit heads glow like lamps; in range, a dashed link with pulses
    // running both ways joins the head to the test vehicle's roof sensor.
    for (k = 0; k < units.length; k++) {
      var u = units[k];
      var head = [RSU_X - RSU_ARM, u.y, RSU_POLE + 0.2];
      if (!project(cam, head[0], head[1], head[2], p)) continue;
      var hx = p.x;
      var hy = p.y;
      if (u.talk > 0 && project(cam, SENSOR.x, SENSOR.y, SENSOR.z, q)) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = dpr;
        ctx.globalAlpha = 0.4 * u.talk;
        ctx.setLineDash([3 * dpr, 4 * dpr]);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = accent;
        for (i = 0; i < 3; i++) {
          var along = (t * 0.45 + i / 3) % 1;
          if (i === 2) along = 1 - along;          // one pulse runs back up to the unit
          var px = head[0] + (SENSOR.x - head[0]) * along;
          var py = head[1] + (SENSOR.y - head[1]) * along;
          var pz = head[2] + (SENSOR.z - head[2]) * along;
          if (!project(cam, px, py, pz, q)) continue;
          ctx.globalAlpha = 0.9 * u.talk * Math.sin(Math.PI * along);
          ctx.beginPath();
          ctx.arc(q.x, q.y, 1.6 * dpr, 0, TAU);
          ctx.fill();
        }
      }
      if (!day) glowDot(ctx, hx, hy, 8 * dpr, colors.accent, (0.45 + 0.45 * u.talk) * u.seen * switchOn(lights, 0.74 + 0.05 * k, t, 200 + k));
      ctx.globalAlpha = 0.9 * u.seen;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.5 * dpr, 0, TAU);
      ctx.fill();
    }

    function solid(x, color, alpha) {
      if (!project(cam, x, near, 0, p) || !project(cam, x, 900, 0, q)) return;
      var g = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
      g.addColorStop(0, rgba(color, alpha));
      g.addColorStop(1, rgba(color, 0));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    }

    function dots(list) {
      for (var n = 0; n < list.length; n += 4) {
        ctx.globalAlpha = Math.min(1, list[n + 3]);
        ctx.fillRect(list[n] - list[n + 2] / 2, list[n + 1] - list[n + 2] / 2, list[n + 2], list[n + 2]);
      }
    }
  }

  function startScene(frame, canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dayColors = { day: true };
    var nightColors = { day: false };
    var specks = makeSpecks(44);
    var dpr = 1;
    var clock = 12;            // seconds of scene time; only moves while the scene plays
    var lastFrame = 0;         // time of the previous drawn frame; 0 right after a pause
    var lastSave = 0;
    var raf = 0;
    var onScreen = true;

    // When the visitor switches to night, the city lights come on over LIGHTS_FOR seconds.
    var LIGHTS_FOR = 1.3;
    var lightUp = null;                               // { at } while the lights are coming on

    // Pick up where this tab left off, so a reload doesn't restart the scene.
    try {
      var saved = parseFloat(sessionStorage.getItem("scene-clock"));
      if (saved > 0) clock = saved;
    } catch (e) { /* storage blocked */ }

    function saveClock() {
      try { sessionStorage.setItem("scene-clock", clock.toFixed(3)); } catch (e) { /* storage blocked */ }
    }

    function readColors() {
      ["bg", "ink", "accent", "haze"].forEach(function (key) {
        dayColors[key] = cssColor("--scene-day-" + key);
        nightColors[key] = cssColor("--scene-night-" + key);
      });
    }

    function lightsLevel() {
      if (!lightUp) return 1;
      if (!lightUp.at) return 0;
      var v = clamp((lastFrame - lightUp.at) / 1000 / LIGHTS_FOR, 0, 1);
      if (v >= 1) lightUp = null;
      return v;
    }

    function render() {
      var w = canvas.width, h = canvas.height;
      if (isDark()) {
        drawScene(ctx, w, h, dpr, clock, nightColors, specks, lightsLevel());
        return;
      }
      drawScene(ctx, w, h, dpr, clock, dayColors, specks, 1);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var box = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(box.width * dpr));
      var h = Math.max(1, Math.round(box.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      render();
    }


    // 30 frames a second: smooth for the moving road, and it divides evenly
    // into 60 Hz and 120 Hz screens (the small margin absorbs timer jitter).
    // The clock advances by the time between drawn frames, capped, so a pause
    // or a stalled frame never makes the scene skip ahead.
    function tick(now) {
      raf = window.requestAnimationFrame(tick);
      if (lastFrame && now - lastFrame < 1000 / 30 - 4) return;
      if (lastFrame) clock += Math.min(now - lastFrame, 100) / 1000;
      lastFrame = now;
      if (lightUp && !lightUp.at && isDark()) lightUp.at = now;   // start once the scene is dark
      render();
      if (now - lastSave > 1000) { lastSave = now; saveClock(); }
    }

    function play() {
      if (raf || !onScreen || document.hidden || reduceMotion.matches) return;
      lastFrame = 0;             // resume from the frame on screen, without a jump
      raf = window.requestAnimationFrame(tick);
    }

    function pause() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      saveClock();
    }

    sceneApi = {
      // Called as the page switches to night: start with the city dark, then light it up.
      lightUp: function () {
        if (onScreen && !document.hidden && !reduceMotion.matches) {
          lightUp = { at: 0 };
          play();
        }
      }
    };

    readColors();
    resize();
    play();

    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) play(); else pause();
      }).observe(frame);
    }

    window.addEventListener("pagehide", saveClock);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause(); else play();
    });
    onMediaChange(reduceMotion, function () { pause(); play(); render(); });

    var recolor = function () { readColors(); render(); };
    onMediaChange(systemDark, recolor);
    if (window.MutationObserver) {
      new MutationObserver(recolor).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    }
  }

  var frame = document.querySelector(".frame");
  var canvas = frame ? frame.querySelector(".frame__scene") : null;
  if (canvas) startScene(frame, canvas);
})();
