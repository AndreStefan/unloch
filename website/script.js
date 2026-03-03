// ============================================
// Unloch.me — Landing Page Scripts
// ============================================

(function () {
  'use strict';

  // --- Navbar scroll effect ---
  const nav = document.getElementById('nav');

  function onScroll() {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Mobile nav toggle ---
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  toggle.addEventListener('click', function () {
    toggle.classList.toggle('active');
    links.classList.toggle('open');
  });

  // Close mobile nav when a link is clicked
  links.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      toggle.classList.remove('active');
      links.classList.remove('open');
    });
  });

  // --- Scroll-based fade-in animations ---
  const fadeElements = document.querySelectorAll(
    '.step-card, .feature-card, .principle-card, .split-content, .split-visual, .cta-container'
  );

  fadeElements.forEach(function (el) {
    el.classList.add('fade-in');
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  fadeElements.forEach(function (el) {
    observer.observe(el);
  });

  // --- Waitlist form ---
  const form = document.getElementById('waitlist-form');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('form-name').value.trim();
    var email = document.getElementById('form-email').value.trim();
    var role = document.getElementById('form-role').value;

    if (!name || !email) return;

    // Replace the form with a success message
    var container = form.parentElement;
    form.remove();

    var msg = document.createElement('div');
    msg.style.cssText =
      'background: #daf1f1; border-radius: 16px; padding: 32px; text-align: center;';
    msg.innerHTML =
      '<p style="font-size: 1.5rem; margin-bottom: 8px;">&#x2705;</p>' +
      '<h3 style="font-size: 1.2rem; color: #1a3a3a; margin-bottom: 8px;">You\'re on the list!</h3>' +
      '<p style="color: #5e5e78; font-size: 0.95rem;">Thanks, <strong>' +
      name.split(' ')[0] +
      '</strong>. We\'ll reach out at <strong>' +
      email +
      '</strong> when early access opens.</p>';

    container.insertBefore(msg, container.querySelector('.cta-note'));
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
