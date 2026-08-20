/* =========================================================
   !WackySolutions LLC — site behaviour
   No dependencies. Safe to load with `defer` on every page.
   ========================================================= */

(function () {
  "use strict";

  /* ---- Mobile navigation ------------------------------------------ */
  var toggle = document.querySelector(".nav-toggle");
  var navList = document.getElementById("primary-nav");

  if (toggle && navList) {
    toggle.addEventListener("click", function () {
      var open = navList.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "Close" : "Menu";
    });
  }

  /* ---- Footer year ------------------------------------------------ */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---- Scroll reveal ---------------------------------------------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");

  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---- Fit the oversized page mark to its row -----------------------
     The mark is meant to run the full width of the page. Measuring beats
     guessing a vw value, because the answer changes with the word, the
     viewport, and whether the webfont has loaded yet.
     ------------------------------------------------------------------- */
  var marks = document.querySelectorAll(".pagemark");

  // Wrap the word so its rendered width can be measured directly.
  marks.forEach(function (el) {
    if (el.firstElementChild && el.firstElementChild.classList.contains("pm-inner")) return;
    var inner = document.createElement("span");
    inner.className = "pm-inner";
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
  });

  var measureCanvas = document.createElement("canvas").getContext("2d");

  // Sit the word on the bottom edge of the hero with a hairline crop,
  // whichever font actually ends up rendering.
  function seatMark(el, size) {
    if (!measureCanvas) return;
    try {
      var style = window.getComputedStyle(el);
      measureCanvas.font = style.fontWeight + " " + size + "px " + style.fontFamily;
      var m = measureCanvas.measureText(el.textContent.toUpperCase());
      if (!m.fontBoundingBoxAscent) return;
      var boxHeight = el.getBoundingClientRect().height;
      var baseline = (boxHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2
                     + m.fontBoundingBoxAscent;
      var overhang = boxHeight - (baseline + m.actualBoundingBoxDescent);
      el.style.marginBottom = -(overhang + size * 0.012) + "px";
    } catch (err) { /* keep the CSS fallback */ }
  }

  function fitMarks() {
    marks.forEach(function (el) {
      var inner = el.firstElementChild;
      var available = el.clientWidth;
      if (!inner || !available) return;
      el.style.fontSize = "100px";
      var natural = inner.getBoundingClientRect().width;
      if (!natural) return;
      var size = 100 * available / natural;
      var cap = parseFloat(el.getAttribute("data-fit-max"));
      if (cap && size > cap) size = cap;
      el.style.fontSize = size + "px";
      seatMark(el, size);
    });
  }

  if (marks.length) {
    fitMarks();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitMarks);
    window.addEventListener("load", fitMarks);
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitMarks, 120);
    });
  }

  /* ---- Contact form ------------------------------------------------
     Posts JSON to the endpoint in data-endpoint on the <form>, which is
     the Formspree AJAX API. Formspree replies with JSON either way: a 2xx
     on success, or a 4xx carrying an `errors` array we surface verbatim.
     If data-endpoint is ever emptied, the form falls back to a mailto:
     handoff so the page is never a dead end.
     ------------------------------------------------------------------ */
  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = document.getElementById("form-status");
  var submit = form.querySelector('button[type="submit"]');
  var endpoint = (form.dataset.endpoint || "").trim();
  var fallbackEmail = form.dataset.fallbackEmail || "info@wackysolutions.org";

  var cannotSend = "That did not send. Please call 404-409-6050 or write to " +
    fallbackEmail + " and we will pick it up from there.";

  function say(message, state) {
    status.textContent = message;
    status.className = "form-status" + (state ? " " + state : "");
    status.hidden = false;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Bots fill hidden fields; people do not.
    if (form.querySelector('input[name="company_website"]').value) return;

    var data = Object.fromEntries(new FormData(form).entries());
    delete data.company_website;

    if (!endpoint) {
      var body = [
        "Name: " + (data.name || ""),
        "Email: " + (data.email || ""),
        "Phone: " + (data.phone || ""),
        "Stage: " + (data.stage || ""),
        "",
        data.message || ""
      ].join("\n");

      window.location.href =
        "mailto:" + fallbackEmail +
        "?subject=" + encodeURIComponent("Project enquiry from " + (data.name || "the website")) +
        "&body=" + encodeURIComponent(body);

      say("Opening your email app with this message ready to send. If nothing happens, write to " + fallbackEmail + " directly.");
      return;
    }

    submit.disabled = true;
    var original = submit.textContent;
    submit.textContent = "Sending";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (response) {
        // Read the body either way; the useful detail is in the error case.
        return response
          .json()
          .catch(function () { return null; })
          .then(function (payload) {
            return { ok: response.ok, payload: payload };
          });
      })
      .then(function (result) {
        if (result.ok) {
          form.reset();
          say("Thanks — that came through. We answer every enquiry within one business day.", "is-ok");
          return;
        }
        // Formspree returns { errors: [{ field, message, code }] }.
        var detail = "";
        if (result.payload && Array.isArray(result.payload.errors)) {
          detail = result.payload.errors
            .map(function (item) { return item.message; })
            .filter(Boolean)
            .join(" ");
        }
        say(detail || cannotSend, "is-error");
      })
      .catch(function () {
        say(cannotSend, "is-error");
      })
      .finally(function () {
        submit.disabled = false;
        submit.textContent = original;
      });
  });
})();
