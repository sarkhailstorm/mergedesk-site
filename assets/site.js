// MergeDesk site: theme toggle, menu, scroll effects, price estimate, docs navigation.
// No cookies or trackers; the theme choice is kept in this browser only.
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');

  // ---- Theme ----
  var KEY = 'md-theme';
  function effectiveTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
    });
  });

  // ---- Header + mobile menu ----
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menuBtn = document.querySelector('.menu-toggle');
  var links = document.querySelector('.nav-links');
  if (menuBtn && links) {
    menuBtn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add('in');
    });
  }

  // ---- Footer year ----
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // ---- Price estimate ----
  // Atlassian bills apps on the site's Jira user count. Up to 10 users is a
  // flat price (free here). Above 10, every user is billed at the 11-100 rate
  // up to 100 users, and each later band at its own lower rate.
  var TIERS = [
    [100, 1.0],
    [250, 0.7],
    [1000, 0.35],
    [2500, 0.15],
    [5000, 0.08],
    [Infinity, 0.05],
  ];
  function monthly(n) {
    if (n <= 10) return 0;
    var total = 0;
    var prev = 0;
    for (var i = 0; i < TIERS.length; i++) {
      var cap = TIERS[i][0];
      var rate = TIERS[i][1];
      var upto = Math.min(n, cap);
      if (upto > prev) total += (upto - prev) * rate;
      if (n <= cap) break;
      prev = cap;
    }
    return total;
  }
  function tierIndex(n) {
    if (n <= 10) return 0;
    for (var i = 0; i < TIERS.length; i++) if (n <= TIERS[i][0]) return i + 1;
    return TIERS.length;
  }
  var calc = document.querySelector('[data-calc]');
  if (calc) {
    var num = calc.querySelector('input[type="number"]');
    var range = calc.querySelector('input[type="range"]');
    var amount = calc.querySelector('[data-amount]');
    var per = calc.querySelector('[data-per]');
    var sub = calc.querySelector('[data-sub]');
    var btns = calc.querySelectorAll('.billing button');
    var rows = document.querySelectorAll('[data-tier]');
    var MAX = 10000;
    var annual = false;
    var money = function (v) {
      return '$' + v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    };
    // Slider is logarithmic so small teams get fine steps.
    var toUsers = function (v) {
      return Math.max(1, Math.round(Math.pow(MAX, v / 1000)));
    };
    var toSlider = function (u) {
      return Math.round((Math.log(Math.max(1, u)) / Math.log(MAX)) * 1000);
    };
    var render = function (n) {
      n = Math.min(MAX, Math.max(1, Math.round(n) || 1));
      var m = monthly(n);
      var total = annual ? m * 10 : m;
      amount.textContent = m === 0 ? 'Free' : money(total);
      per.textContent = m === 0 ? 'up to 10 users' : annual ? 'per year' : 'per month';
      if (m === 0) {
        sub.textContent = 'Sites with up to 10 Jira users use MergeDesk for free, with every feature.';
      } else {
        var avg = m / n;
        sub.textContent =
          'For ' + n.toLocaleString('en-US') + ' users: about ' + money(Math.round(avg * 100) / 100) + ' per user each month' +
          (annual ? ', with 2 months free for paying yearly.' : '.');
      }
      var t = tierIndex(n);
      rows.forEach(function (r) {
        r.classList.toggle('active', Number(r.getAttribute('data-tier')) === t);
      });
    };
    num.addEventListener('input', function () {
      var n = Number(num.value);
      if (n >= 1) {
        range.value = toSlider(n);
        render(n);
      }
    });
    num.addEventListener('blur', function () {
      var n = Math.min(MAX, Math.max(1, Math.round(Number(num.value)) || 1));
      num.value = n;
      range.value = toSlider(n);
      render(n);
    });
    range.addEventListener('input', function () {
      var n = toUsers(Number(range.value));
      num.value = n;
      render(n);
    });
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        annual = b.getAttribute('data-billing') === 'annual';
        btns.forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        render(Number(num.value));
      });
    });
    range.value = toSlider(Number(num.value));
    render(Number(num.value));
  }

  // ---- Docs: highlight the current section and filter the sidebar ----
  var docNav = document.querySelector('.doc-nav');
  if (docNav) {
    var navLinks = Array.prototype.slice.call(docNav.querySelectorAll('a[href^="#"]'));
    var sections = navLinks
      .map(function (a) {
        return document.getElementById(a.getAttribute('href').slice(1));
      })
      .filter(Boolean);
    var setActive = function () {
      var y = window.scrollY + 140;
      var current = sections[0];
      sections.forEach(function (s) {
        if (s.offsetTop <= y) current = s;
      });
      navLinks.forEach(function (a) {
        a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id);
      });
    };
    window.addEventListener('scroll', setActive, { passive: true });
    setActive();

    var search = docNav.querySelector('input[type="search"]');
    var empty = docNav.querySelector('.empty');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        var shown = 0;
        navLinks.forEach(function (a) {
          var s = document.getElementById(a.getAttribute('href').slice(1));
          var text = (a.textContent + ' ' + (s ? s.textContent : '')).toLowerCase();
          var match = !q || text.indexOf(q) !== -1;
          a.parentElement.style.display = match ? '' : 'none';
          if (match) shown++;
        });
        docNav.querySelectorAll('h5').forEach(function (h) {
          var list = h.nextElementSibling;
          var any = list && Array.prototype.some.call(list.children, function (li) {
            return li.style.display !== 'none';
          });
          h.style.display = any ? '' : 'none';
        });
        if (empty) empty.style.display = shown ? 'none' : 'block';
      });
    }
  }
})();
