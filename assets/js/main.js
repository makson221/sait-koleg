/* КПІК — інтерактивність сайту */
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) { /* недоступно */ }
    },
  };

  const desktop = window.matchMedia("(min-width: 1100px)");

  /* ---------- anime.js ---------- */
  // Анімації вмикаються, лише якщо бібліотека завантажилась і скрипт у <head>
  // додав клас .anim (рух дозволений і не ввімкнено версію для людей з порушенням зору).
  const anime = window.anime;
  let animOn = Boolean(anime) && root.classList.contains("anim");
  if (animOn) {
    window.__kpikAnim = true;
  } else {
    root.classList.remove("anim");
  }

  // Запускає анімацію і на час її виконання вимикає CSS-переходи елементів,
  // щоб вони не змагалися з покадровими змінами transform.
  const play = (targets, params) => {
    const els = [...targets];
    if (!els.length) return null;
    els.forEach((el) => el.classList.add("is-animating"));
    const { onComplete } = params;
    return anime.animate(els, {
      duration: 800,
      ease: "outCubic",
      ...params,
      onComplete: (animation) => {
        els.forEach((el) => {
          el.classList.remove("is-animating");
          el.style.removeProperty("transform");
        });
        if (onComplete) onComplete(animation);
      },
    });
  };

  const countUp = (el) => {
    const end = parseInt(el.textContent, 10);
    if (Number.isNaN(end)) return;
    const counter = { value: parseInt(el.dataset.countFrom || "0", 10) };
    el.textContent = String(counter.value);
    anime.animate(counter, {
      value: end,
      duration: 1800,
      ease: "outExpo",
      onUpdate: () => { el.textContent = String(Math.round(counter.value)); },
      onComplete: () => { el.textContent = String(end); },
    });
  };

  /* ---------- Фото: запасний фон, якщо зображення не завантажилось ---------- */
  const dropBrokenImage = (img) => img.remove();
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      dropBrokenImage(img);
    } else {
      img.addEventListener("error", () => dropBrokenImage(img), { once: true });
    }
  });

  /* ---------- Версія для людей з порушенням зору ---------- */
  const A11Y_KEY = "kpik-a11y";
  const a11yButtons = document.querySelectorAll("[data-a11y-toggle]");
  const applyA11y = (on) => {
    root.classList.toggle("a11y", on);
    a11yButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(on)));
  };
  applyA11y(root.classList.contains("a11y"));
  a11yButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      const on = !root.classList.contains("a11y");
      applyA11y(on);
      storage.set(A11Y_KEY, on ? "1" : "0");
    })
  );

  /* ---------- Мобільне меню ---------- */
  const nav = document.querySelector("[data-nav]");
  const burger = document.querySelector("[data-burger]");
  const overlay = document.querySelector("[data-nav-overlay]");
  const navClose = document.querySelector("[data-nav-close]");

  const isNavOpen = () => nav && nav.classList.contains("is-open");

  const setNav = (open) => {
    if (!nav) return;
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    overlay.hidden = !open;
    document.body.classList.toggle("nav-open", open);
    if (open) {
      navClose.focus();
      if (animOn && !desktop.matches) {
        play(nav.querySelectorAll(".nav__list > li, .nav__extra > *"), {
          opacity: [0, 1],
          translateX: [32, 0],
          duration: 600,
          delay: anime.stagger(40, { start: 120 }),
        });
      }
    }
  };

  if (nav && burger) {
    burger.addEventListener("click", () => setNav(!isNavOpen()));
    overlay.addEventListener("click", () => setNav(false));
    navClose.addEventListener("click", () => {
      setNav(false);
      burger.focus();
    });

    nav.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !isNavOpen() || desktop.matches) return;
      const focusable = [...nav.querySelectorAll("a[href], button:not([disabled])")]
        .filter((el) => el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (link && !desktop.matches) setNav(false);
    });

    desktop.addEventListener("change", (event) => {
      if (event.matches) setNav(false);
      closeSubmenus();
    });
  }

  /* ---------- Підменю ---------- */
  const subItems = [...document.querySelectorAll(".has-sub")];

  const setSub = (item, open) => {
    item.classList.toggle("is-open", open);
    item.querySelector("[data-sub-toggle]").setAttribute("aria-expanded", String(open));
  };

  function closeSubmenus(except) {
    subItems.forEach((item) => {
      if (item !== except) setSub(item, false);
    });
  }

  subItems.forEach((item) => {
    item.querySelector("[data-sub-toggle]").addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      if (desktop.matches) closeSubmenus(item);
      setSub(item, open);
    });

    item.addEventListener("mouseenter", () => {
      if (desktop.matches) closeSubmenus(item);
    });

    item.addEventListener("focusout", (event) => {
      if (desktop.matches && !item.contains(event.relatedTarget)) setSub(item, false);
    });
  });

  document.addEventListener("click", (event) => {
    if (desktop.matches && !event.target.closest(".has-sub")) closeSubmenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isNavOpen()) {
      setNav(false);
      burger.focus();
      return;
    }
    const openItem = subItems.find((item) => item.classList.contains("is-open"));
    if (openItem) {
      setSub(openItem, false);
      openItem.querySelector("[data-sub-toggle]").focus();
    }
  });

  /* ---------- Тінь шапки та кнопка «нагору» ---------- */
  const header = document.querySelector("[data-header]");
  const toTop = document.querySelector("[data-to-top]");

  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (toTop) toTop.classList.toggle("is-visible", y > 600);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", () => window.scrollTo({ top: 0 }));
  }

  /* ---------- Поява блоків ---------- */
  const revealItems = [...document.querySelectorAll("[data-reveal]")];
  let revealObserver = null;

  const markRevealed = (el) => {
    el.dataset.revealed = "";
    if (revealObserver) revealObserver.unobserve(el);
  };

  const showWithoutAnimation = () => {
    animOn = false;
    root.classList.remove("anim");
    revealItems.forEach((el) => el.classList.add("is-visible"));
  };

  // Банер: заголовок з'являється по словах, далі текст, кнопки, картка й швидкі посилання.
  const animateIntro = () => {
    const hero = document.querySelector(".hero, .page-hero");
    if (!hero) return;
    const pick = (selector) => hero.querySelectorAll(selector);
    let splitter = null;
    const timeline = anime.createTimeline({
      defaults: { ease: "outExpo", duration: 1000 },
      // Повертає заголовку початкову розмітку після анімації.
      onComplete: () => { if (splitter) splitter.revert(); },
    });
    const add = (targets, params, position) => {
      if (targets.length) timeline.add(targets, params, position);
    };

    const title = hero.querySelector("h1");
    let words = [];
    if (title) {
      splitter = anime.splitText(title, { words: true });
      words = splitter.words;
      words.forEach((word) => { word.style.display = "inline-block"; });
      anime.utils.set(words, { opacity: 0 });
      title.style.opacity = "1";
    }

    add(pick(".hero__bg, .page-hero__bg"), { scale: [1.12, 1], duration: 2400, ease: "outQuart" }, 0);
    add(pick(".hero__eyebrow, .breadcrumbs"), { opacity: [0, 1], translateY: [16, 0] }, 100);
    add(words, { opacity: [0, 1], translateY: ["0.45em", 0], delay: anime.stagger(70) }, 250);
    add(pick(".hero__lead, .page-hero p"), { opacity: [0, 1], translateY: [20, 0] }, 550);
    add(pick(".hero__actions, .page-hero__actions"), { opacity: [0, 1], translateY: [20, 0] }, 700);
    add(pick(".hero-card"), { opacity: [0, 1], translateX: [40, 0], duration: 1100 }, 400);
    add(pick(".hero-card__list li"), { opacity: [0, 1], translateX: [24, 0], delay: anime.stagger(110) }, 750);
    if (hero.classList.contains("hero")) {
      add(document.querySelectorAll(".quick__grid > li"), {
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 900,
        delay: anime.stagger(70),
      }, 800);
    }
  };

  if (animOn) {
    try {
      animateIntro();

      revealObserver = new IntersectionObserver(
        (entries) => {
          const batch = entries
            .filter((entry) => entry.isIntersecting && !("revealed" in entry.target.dataset))
            .map((entry) => entry.target);
          if (!batch.length) return;
          batch.forEach(markRevealed);
          play(batch, { opacity: [0, 1], translateY: [28, 0], delay: anime.stagger(90) });
          batch.forEach((el) => el.querySelectorAll(".stat__value").forEach(countUp));
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealItems.forEach((el) => revealObserver.observe(el));

      document.querySelectorAll(".collage__badge").forEach((badge) => {
        anime.animate(badge, { translateY: [-6, 6], duration: 2600, ease: "inOutSine", loop: true, alternate: true });
      });
    } catch (error) {
      showWithoutAnimation();
    }
  } else if ("IntersectionObserver" in window) {
    const classObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            classObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealItems.forEach((el) => classObserver.observe(el));
  } else {
    showWithoutAnimation();
  }

  /* ---------- Зміст сторінки: підсвічування активного розділу ---------- */
  const tocLinks = [...document.querySelectorAll(".toc a[href^='#']")];

  if (tocLinks.length && "IntersectionObserver" in window) {
    const sections = tocLinks
      .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
      .filter(Boolean);

    const setActive = (id) => {
      tocLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`;
        if (active) {
          link.setAttribute("aria-current", "true");
          const list = link.closest("ul");
          if (list.scrollWidth > list.clientWidth) {
            list.scrollTo({ left: link.offsetLeft - 16, behavior: "smooth" });
          }
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    const tocObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach((section) => tocObserver.observe(section));
    if (sections.length && !window.location.hash) setActive(sections[0].id);
  }

  /* ---------- Фільтр спеціальностей ---------- */
  const filterGroup = document.querySelector("[data-filters]");

  if (filterGroup) {
    const chips = [...filterGroup.querySelectorAll("[data-filter]")];
    const deptSections = [...document.querySelectorAll("[data-dept]")];

    const applyFilter = (value) => {
      chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.filter === value)));
      deptSections.forEach((section) => {
        section.hidden = value !== "all" && section.dataset.dept !== value;
      });
    };

    chips.forEach((chip) =>
      chip.addEventListener("click", () => {
        applyFilter(chip.dataset.filter);
        if (!animOn) return;
        const shown = deptSections.filter((section) => !section.hidden);
        const cards = shown.flatMap((section) => [...section.querySelectorAll("[data-reveal]")]);
        cards.forEach(markRevealed);
        play(shown.map((section) => section.querySelector(".dept-section__banner")).filter(Boolean), {
          opacity: [0, 1],
          scale: [0.97, 1],
          duration: 600,
        });
        play(cards, { opacity: [0, 1], translateY: [24, 0], duration: 600, delay: anime.stagger(60) });
      })
    );

    const syncWithHash = () => {
      const id = window.location.hash.slice(1);
      if (deptSections.some((section) => section.dataset.dept === id)) applyFilter("all");
    };
    window.addEventListener("hashchange", syncWithHash);
  }

  /* ---------- Фотогалерея ---------- */
  const galleryLinks = document.querySelectorAll("[data-gallery-item]");

  if (galleryLinks.length && typeof HTMLDialogElement === "function") {
    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.innerHTML =
      '<img alt="">' +
      '<button class="icon-btn lightbox__close" type="button">' +
      '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '<span class="visually-hidden">Закрити</span></button>';
    document.body.appendChild(dialog);

    const dialogImg = dialog.querySelector("img");
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    galleryLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const thumb = link.querySelector("img");
        if (!thumb) return;
        event.preventDefault();
        dialogImg.src = link.href;
        dialogImg.alt = thumb.alt;
        dialog.showModal();
        if (animOn) {
          anime.animate(dialogImg, { opacity: [0, 1], scale: [0.94, 1], duration: 450, ease: "outCubic" });
        }
      });
    });
  }

  /* ---------- Форма зворотного зв'язку (через поштовий застосунок) ---------- */
  const form = document.querySelector("[data-contact-form]");

  if (form) {
    const status = form.querySelector("[data-form-status]");

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const fields = [...form.querySelectorAll("[required]")];
      let firstInvalid = null;

      fields.forEach((field) => {
        const invalid = !field.value.trim();
        field.setAttribute("aria-invalid", String(invalid));
        if (invalid && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        status.textContent = "Будь ласка, заповніть усі поля.";
        status.className = "form__status is-error";
        firstInvalid.focus();
        return;
      }

      const data = new FormData(form);
      const subject = `Запит з сайту: ${data.get("topic")}`;
      const body = `Ім'я: ${data.get("name")}\nКонтакт: ${data.get("contact")}\n\n${data.get("message")}`;
      window.location.href =
        `mailto:industrial_k_p@ukr.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      status.textContent = "Відкриваємо ваш поштовий застосунок…";
      status.className = "form__status is-success";
    });
  }

  /* ---------- Поточний рік у підвалі ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
