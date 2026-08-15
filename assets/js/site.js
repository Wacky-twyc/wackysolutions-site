/* =========================================================
   !WackySolutions — site.js
   Navigation, scroll reveals, the scroll-driven morph, contact form.
   Everything here is progressive: the page works fully without it.
   ========================================================= */
(function(){
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile navigation ---------- */
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  var closeBtn = document.querySelector('.nav-close');

  function setNav(open){
    if (!nav) return;
    nav.setAttribute('data-open', open ? 'true' : 'false');
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open && window.innerWidth < 768 ? 'hidden' : '';
    if (open){
      var first = nav.querySelector('a');
      if (first) first.focus();
    }
  }

  if (toggle) toggle.addEventListener('click', function(){
    setNav(nav.getAttribute('data-open') !== 'true');
  });
  if (closeBtn) closeBtn.addEventListener('click', function(){
    setNav(false);
    if (toggle) toggle.focus();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && nav && nav.getAttribute('data-open') === 'true'){
      setNav(false);
      if (toggle) toggle.focus();
    }
  });
  if (nav) nav.addEventListener('click', function(e){
    if (e.target.tagName === 'A' && window.innerWidth < 768) setNav(false);
  });

  /* ---------- Scroll reveals ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)){
    Array.prototype.forEach.call(reveals, function(el){ el.classList.add('is-in'); });
  } else {
    var revealIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add('is-in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(reveals, function(el){ revealIO.observe(el); });
  }

  /* ---------- Scroll-driven morph ---------- */
  // The particle cloud reads the wordmark, then the wireframe, then the phone.
  // GSAP is optional; without it the hero simply stays as the wordmark.
  function initScrollMorph(){
    if (reduced) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    var journey = document.querySelector('.journey');
    if (!journey) return;

    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
      trigger: journey,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: function(self){
        if (window.__stageSetMorph) window.__stageSetMorph(self.progress * 2);
      }
    });

    // Fade the canvas out once the narrative is over so later sections stay clean.
    ScrollTrigger.create({
      trigger: journey,
      start: 'bottom bottom',
      end: 'bottom top+=30%',
      scrub: 0.4,
      onUpdate: function(self){
        if (window.__stageSetFade) window.__stageSetFade(1 - self.progress);
      }
    });
  }

  if (document.readyState === 'complete') initScrollMorph();
  else window.addEventListener('load', initScrollMorph);

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector('.site-header');
  if (header){
    var lastKnown = 0, ticking = false;
    window.addEventListener('scroll', function(){
      lastKnown = window.scrollY;
      if (!ticking){
        window.requestAnimationFrame(function(){
          header.setAttribute('data-scrolled', lastKnown > 20 ? 'true' : 'false');
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ---------- Current year ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function(el){
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Contact form ---------- */
  var form = document.getElementById('contact-form');
  if (form){
    var status = document.getElementById('form-status');

    form.addEventListener('submit', function(e){
      e.preventDefault();

      // Honeypot: real people leave this empty.
      if (form.querySelector('[name="company_website"]').value) return;

      var data = new FormData(form);
      var name = (data.get('name') || '').toString().trim();
      var email = (data.get('email') || '').toString().trim();
      var message = (data.get('message') || '').toString().trim();

      if (!name || !email || !message){
        say('Add your name, email, and a note about your idea.', 'error');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        say('That email address does not look right.', 'error');
        return;
      }

      var endpoint = form.getAttribute('data-endpoint');

      // No endpoint configured yet: hand off to the visitor's mail app so the
      // form is never a dead end during Apple's review.
      if (!endpoint || endpoint.indexOf('REPLACE') !== -1){
        var subject = encodeURIComponent('App idea from ' + name);
        var body = encodeURIComponent(
          'Name: ' + name + '\n' +
          'Email: ' + email + '\n' +
          'Phone: ' + (data.get('phone') || '') + '\n' +
          'Stage: ' + (data.get('stage') || '') + '\n\n' +
          message
        );
        window.location.href = 'mailto:info@wackysolutions.org?subject=' + subject + '&body=' + body;
        say('Opening your email app so you can send it.', 'ok');
        return;
      }

      say('Sending…', '');
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      }).then(function(res){
        if (!res.ok) throw new Error('bad status');
        form.reset();
        say('Got it. We reply within one business day.', 'ok');
      }).catch(function(){
        say('That did not send. Email info@wackysolutions.org and we will pick it up there.', 'error');
      });
    });

    function say(msg, state){
      if (!status) return;
      status.textContent = msg;
      status.setAttribute('data-state', state || '');
    }
  }
})();
