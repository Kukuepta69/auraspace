/* ============================================================
   Aura Space — скролл-анимации
   Lenis (плавный скролл) + GSAP ScrollTrigger
   ============================================================ */
(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasST = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  const isMobile = window.matchMedia("(max-width: 820px)").matches;

  /* ---------------------------------------------------------
     Splitting текста на слова и буквы (аналог SplitType)
     --------------------------------------------------------- */
  function splitToChars(el) {
    const text = el.textContent.trim();
    el.textContent = "";
    const frag = document.createDocumentFragment();

    text.split(/\s+/).forEach((word, wi, arr) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "word";

      [...word].forEach((ch) => {
        const charSpan = document.createElement("span");
        charSpan.className = "char";
        charSpan.textContent = ch;
        wordSpan.appendChild(charSpan);
      });

      frag.appendChild(wordSpan);
      if (wi < arr.length - 1) frag.appendChild(document.createTextNode(" "));
    });

    el.appendChild(frag);
    el.classList.add("is-split");
    return el.querySelectorAll(".char");
  }

  const splitTargets = Array.from(document.querySelectorAll("[data-split]"));
  const splitMap = new Map();
  splitTargets.forEach((el) => {
    const chars = splitToChars(el);
    splitMap.set(el, chars);
    if (reduce) {
      chars.forEach((c) => {
        c.style.opacity = "1";
        c.style.filter = "none";
        c.style.transform = "none";
      });
    }
  });

  /* ---------------------------------------------------------
     Fallback без GSAP — просто показать всё
     --------------------------------------------------------- */
  const fadeUps = Array.from(document.querySelectorAll(".fade-up"));
  const reveals = Array.from(document.querySelectorAll("[data-reveal]"));

  if (reduce || !hasST) {
    fadeUps.forEach((el) => el.classList.add("is-visible"));
    splitTargets.forEach((el) => {
      splitMap.get(el).forEach((c) => {
        c.style.opacity = "1";
        c.style.filter = "none";
        c.style.transform = "none";
      });
    });
    document.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = el.dataset.count;
    });
  }

  /* ---------------------------------------------------------
     Lenis — мягкий скролл
     --------------------------------------------------------- */
  let lenis = null;
  if (typeof window.Lenis !== "undefined" && !reduce) {
    lenis = new Lenis({
      lerp: 0.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.1,
      syncTouch: false,
    });

    if (hasST) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ---------------------------------------------------------
     Якорные ссылки
     --------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -60, duration: 1.5 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------------------------------------------------------
     Навигация
     --------------------------------------------------------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav && nav.classList.toggle("is-stuck", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------------------------------------------------
     GSAP: всё остальное
     --------------------------------------------------------- */
  if (!hasST || reduce) {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
    bindForm();
    bindLightbox();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* --- Hero: параллакс фото + уход контента --- */
  const heroImg = document.querySelector(".hero__media img");
  if (heroImg) {
    gsap.to(heroImg, {
      yPercent: 18,
      scale: 1.22,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  }

  const heroContent = document.querySelector(".hero__content");
  if (heroContent) {
    gsap.to(heroContent, {
      y: -80,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom 40%",
        scrub: true,
      },
    });
  }

  /* --- Hero: появление строки за строкой (как на референсе) --- */
  const heroTitle = document.querySelector(".hero__title");
  if (heroTitle) {
    const lines = heroTitle.querySelectorAll("[data-split]");
    const tl = gsap.timeline({ delay: 0.2 });

    lines.forEach((line, i) => {
      const chars = splitMap.get(line);
      if (!chars) return;
      tl.to(chars, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.028,
      }, i * 0.14);
    });
  }

  /* --- Общий fade-up --- */
  if (fadeUps.length) {
    gsap.to(fadeUps, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.1,
      delay: 0.9,
    });
  }

  /* --- Остальные сплит-заголовки: буквы по строкам --- */
  splitTargets.forEach((el) => {
    if (el.closest(".hero__title")) return;
    const chars = splitMap.get(el);
    if (!chars || !chars.length) return;

    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () => {
        gsap.to(chars, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.55,
          ease: "power3.out",
          stagger: 0.018,
        });
      },
    });
  });

  /* --- Reveal карточек --- */
  if (reveals.length) {
    ScrollTrigger.batch(reveals, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.08,
          overwrite: true,
        }),
    });
  }

  /* --- Смена цвета фона по секциям --- */
  document.querySelectorAll("[data-bg]").forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: (self) => {
        if (self.isActive) {
          document.body.style.backgroundColor = section.dataset.bg;
        }
      },
    });
  });

  /* --- Горизонтальная галерея (пин + сдвиг вбок) --- */
  const hgal = document.querySelector(".hgal");
  const track = document.querySelector(".hgal__track");
  if (hgal && track && !isMobile) {
    /* ширина левой панели сдвигает контент — учитываем её */
    const getSideWidth = () => {
      const w = getComputedStyle(document.documentElement).getPropertyValue("--side-w");
      return parseFloat(w) || 0;
    };
    const getDistance = () =>
      Math.max(0, track.scrollWidth - (window.innerWidth - getSideWidth()) + 80);

    gsap.to(track, {
      x: () => -getDistance(),
      ease: "none",
      scrollTrigger: {
        trigger: hgal,
        start: "top top",
        end: () => "+=" + getDistance(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    /* лёгкий сдвиг самих фото внутри слайдов */
    gsap.utils.toArray(".hgal__slide img").forEach((img) => {
      gsap.fromTo(img, { scale: 1.12 }, {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: hgal,
          start: "top top",
          end: () => "+=" + getDistance(),
          scrub: 1.2,
        },
      });
    });
  }

  /* --- Счётчики --- */
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    const obj = { val: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: "power2.out",
          onUpdate: () => { el.textContent = Math.round(obj.val); },
        });
      },
    });
  });

  /* --- Сдвиг бегущей строки при скролле --- */
  const marqueeInner = document.querySelector(".marquee__inner");
  if (marqueeInner) {
    gsap.to(marqueeInner, {
      xPercent: -8,
      ease: "none",
      scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  /* ---------------------------------------------------------
     Лайтбокс
     --------------------------------------------------------- */
  bindLightbox();
  bindForm();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Функции
     --------------------------------------------------------- */
  function bindLightbox() {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;
    const img = lightbox.querySelector("img");

    const open = (src, alt) => {
      img.src = src;
      img.alt = alt || "";
      lightbox.hidden = false;
      requestAnimationFrame(() => lightbox.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
    };

    const close = () => {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      setTimeout(() => { lightbox.hidden = true; }, 400);
    };

    document.querySelectorAll(".hgal__slide img").forEach((el) => {
      el.addEventListener("click", () => open(el.src, el.alt));
    });

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.closest(".lightbox__close")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hidden) close();
    });
  }

  function bindForm() {
    const form = document.getElementById("booking-form");
    if (!form) return;
    const status = form.querySelector(".form__status");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;

      [form.elements.name, form.elements.phone].forEach((field) => {
        const valid = field.value.trim().length >= 2;
        field.closest(".field").classList.toggle("is-invalid", !valid);
        if (!valid) ok = false;
      });

      if (!ok) {
        status.textContent = "Заполните имя и телефон — и мы свяжемся с вами.";
        status.classList.remove("is-ok");
        return;
      }

      status.textContent = "Спасибо! Заявка отправлена — ответим в течение рабочего дня.";
      status.classList.add("is-ok");
      form.reset();
    });

    form.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        input.closest(".field")?.classList.remove("is-invalid");
      });
    });
  }
})();
