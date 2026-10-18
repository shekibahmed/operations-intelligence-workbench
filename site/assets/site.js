/* Operations Intelligence Workbench: project site behaviour.
   Progressive enhancement only. The page is complete without this file. */
/* global document */
(function () {
  "use strict";

  // Pipeline: tap or click a stage to pin its description (touch has no hover).
  var stages = document.querySelectorAll("[data-pipe] .stage");
  function closeStages(except) {
    stages.forEach(function (stage) {
      if (stage !== except) {
        stage.classList.remove("is-open");
        var btn = stage.querySelector(".stage__btn");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    });
  }
  stages.forEach(function (stage) {
    var button = stage.querySelector(".stage__btn");
    if (!button) return;
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      closeStages(stage);
      var open = stage.classList.toggle("is-open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
      stage.classList.remove("is-dismissed");
    });
    // A new hover or focus shows the tooltip again after an Escape dismissal.
    ["mouseenter", "focus"].forEach(function (name) {
      button.addEventListener(name, function () { stage.classList.remove("is-dismissed"); });
    });
  });
  document.addEventListener("click", function () { closeStages(null); });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    closeStages(null);
    // WCAG 1.4.13: hide tooltips shown by hover or focus without moving focus.
    stages.forEach(function (stage) {
      if (stage.matches(":hover") || stage.contains(document.activeElement)) {
        stage.classList.add("is-dismissed");
      }
    });
  });

  // Videos: never autoplay, and only one thing makes sound at a time.
  var videos = document.querySelectorAll("video");
  var audio = document.getElementById("music-audio");
  var toggle = document.getElementById("music-toggle");

  function setMusic(on) {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
    toggle.textContent = "Background music: " + (on ? "on" : "off");
  }

  videos.forEach(function (video) {
    video.addEventListener("play", function () {
      videos.forEach(function (other) { if (other !== video) other.pause(); });
      if (audio && !audio.paused) { audio.pause(); setMusic(false); }
    });
  });

  // Background music: opt in, off by default, no autoplay.
  if (audio && toggle) {
    audio.volume = 0.4;
    toggle.hidden = false;
    toggle.addEventListener("click", function () {
      if (audio.paused) {
        videos.forEach(function (video) { video.pause(); });
        var attempt = audio.play();
        setMusic(true);
        if (attempt && typeof attempt.catch === "function") {
          attempt.catch(function () { setMusic(false); });
        }
      } else {
        audio.pause();
        setMusic(false);
      }
    });
    audio.addEventListener("error", function () { toggle.hidden = true; });
  }
})();
