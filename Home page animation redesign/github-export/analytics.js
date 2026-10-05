/* Cookieless Umami events for the portfolio. No persistent visitor IDs or PII. */
(() => {
  'use strict';

  const domains = new Set(['orionpowers.com', 'www.orionpowers.com']);
  const sections = new Map([
    ['ax-hero', 'hero'], ['ax-about', 'about'], ['ax-edu', 'education'],
    ['ax-skills', 'skills'], ['ax-exp-pin', 'experience'],
    ['ax-work', 'projects'], ['ax-reference', 'reference'], ['ax-contact', 'contact']
  ]);
  const campaigns = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const skillCategories = ['languages', 'frameworks', 'data-backend', 'cloud-tools',
    'design', 'machine-learning', 'agentic-ai', 'hardware', 'performance'];
  const pending = [];
  const viewed = new Set();
  let observer;

  function allowed() {
    if (!domains.has(location.hostname) || navigator.globalPrivacyControl === true ||
        navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
    try { return !localStorage.getItem('umami.disabled'); }
    catch { return false; } // Respect preferences conservatively when storage is unavailable.
  }

  function cleanUrl(value) {
    const url = new URL(value, location.origin);
    const query = new URLSearchParams();
    campaigns.forEach((key) => {
      const label = url.searchParams.get(key);
      // Retain short campaign labels only. Publishers must keep labels free of PII.
      if (label && /^[a-z0-9_-]{1,64}$/i.test(label)) query.set(key, label);
    });
    return url.pathname + (query.size ? '?' + query.toString() : '');
  }

  // Umami invokes this for pageviews and events, including its automatic events.
  window.axAnalyticsBeforeSend = (_type, payload) => {
    if (!allowed()) return false;
    try {
      payload.url = cleanUrl(payload.url || location.href);
      payload.referrer = payload.referrer ? new URL(payload.referrer, location.origin).origin : '';
      return payload;
    } catch { return false; }
  };

  function send(name, data) {
    try {
      const result = window.umami.track(name, data);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch { /* Analytics failures must never interrupt links or animations. */ }
  }

  function track(name, data) {
    if (!allowed()) return;
    if (window.umami && typeof window.umami.track === 'function') send(name, data);
    else if (pending.length < 30) pending.push([name, data]);
  }

  const tracker = document.getElementById('ax-umami-script');
  if (tracker) {
    tracker.addEventListener('load', () => {
      const events = pending.splice(0);
      if (allowed() && window.umami) events.forEach(([name, data]) => send(name, data));
    }, { once: true });
    tracker.addEventListener('error', () => { pending.length = 0; }, { once: true });
  }

  // Delegation survives DC/React rendering, archive expansion, and fallback mode.
  // Capture observes the click without cancelling navigation or other listeners.
  document.addEventListener('click', (event) => {
    if (!allowed() || !(event.target instanceof Element)) return;
    if (event.target.closest('x-dc')) return;
    const button = event.target.closest('#ax-page button');
    if (button) {
      if (button.matches('.ax-skill-tab')) {
        const index = Array.from(document.querySelectorAll('#ax-page .ax-skill-tab')).indexOf(button);
        if (skillCategories[index]) track('skill_select', { category: skillCategories[index] });
      } else if (button.matches('.ax-modus-cue')) {
        track('dossier_open', { section: 'experience' });
      } else if (/^ax-dossier-tab-(paige|logen|pomml)$/.test(button.id)) {
        track('program_select', { program: button.id.replace('ax-dossier-tab-', '') });
      } else if (button.id === 'ax-archive-toggle') {
        track('archive_toggle', { section: 'projects' });
      }
      return;
    }
    const link = event.target.closest('a[href]');
    if (!link || !link.closest('#ax-page, #ax-topbar, #ax-noscript-fallback')) return;
    const section = link.closest('[data-screen-label]');
    const data = { section: section ? sections.get(section.id) || 'other' : 'fallback' };
    const href = link.getAttribute('href');
    let url;
    try { url = new URL(href, location.href); } catch { return; }

    if (url.origin === location.origin && /\/documents\/Orion-Powers-Resume\.pdf$/i.test(url.pathname)) {
      data.action = link.hasAttribute('download') ? 'download' : 'view';
      track('resume_click', data);
    } else if (href.startsWith('#') && sections.has(href.slice(1))) {
      track('section_link_click', { section: sections.get(href.slice(1)) });
    } else if (url.protocol === 'mailto:') {
      track('email_click', data);
    } else if (url.protocol === 'tel:') {
      track('phone_click', data);
    } else if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) {
      data.destination = url.hostname;
      const linkedin = /(^|\.)linkedin\.com$/.test(url.hostname);
      track(data.section === 'projects' ? 'project_click' : linkedin ? 'linkedin_click' : 'outbound_click', data);
    }
  }, true);

  function observeSections() {
    if (observer || !allowed() || typeof IntersectionObserver === 'undefined') return;
    // A central viewport band works for both short sections and the 340vh
    // Experience scene; a percentage-of-section threshold would miss tall sections.
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const section = sections.get(entry.target.id);
        if (!entry.isIntersecting || document.hidden || viewed.has(section)) return;
        viewed.add(section);
        track('section_view', { section });
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '-20% 0px -20% 0px', threshold: 0 });
    document.querySelectorAll('#ax-page > section[data-screen-label]').forEach((section) => {
      if (sections.has(section.id)) observer.observe(section);
    });
  }

  window.axAnalytics = { observeSections };
  document.addEventListener('visibilitychange', () => {
    if (!observer || document.hidden) return;
    document.querySelectorAll('#ax-page > section[data-screen-label]').forEach((section) => {
      if (sections.has(section.id) && !viewed.has(sections.get(section.id))) {
        observer.unobserve(section);
        observer.observe(section);
      }
    });
  });
})();
