/* ============================================================
   Aura Space — interactions
   Lenis (smooth scroll) + GSAP ScrollTrigger + Swiper
   ============================================================ */
(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const hasST = hasGSAP && typeof window.ScrollTrigger !== "undefined";

  /* ----------------------------------------------
     0. Fallback: показать все .reveal, если нет GSAP
     ---------------------------------------------- */
  const reveals = Array.from(document.querySelectorAll(".reveal"));
  if (!hasST || reduce) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ----------------------------------------------
     1. Lenis — плавный скролл, синхронизированный с ScrollTrigger
     ---------------------------------------------- */
  let lenis = null;
  if (typeof window.Lenis !== "undefined" && !reduce) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    if (hasST) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ----------------------------------------------
     2. Плавный переход по якорям (через Lenis, если он есть)
     ---------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ----------------------------------------------
     3. Навигация: «прилипающая» плашка
     ---------------------------------------------- */
  const nav = document.getElementById("nav");
  const onNavScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-stuck", window.scrollY > 40);
  };
  onNavScroll();
  window.addEventListener("scroll", onNavScroll, { passive: true });

  /* ----------------------------------------------
     4. GSAP: hero-параллакс, reveal, манифест
     ---------------------------------------------- */
  if (hasST && !reduce) {
    gsap.registerPlugin(ScrollTrigger);

    /* Hero: медленный параллакс фона + уход контента */
    const heroMedia = document.querySelector(".hero__media img");
    if (heroMedia) {
      gsap.to(heroMedia, {
        yPercent: 14,
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
        y: -60,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom 55%",
          scrub: true,
        },
      });
      /* Вход hero-элементов при загрузке */
      gsap.from(heroContent.querySelectorAll(".reveal"), {
        y: 34,
        opacity: 0,
        duration: 1.2,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.15,
      });
    }

    /* Reveal секций — батчем, чтобы не дёргалось */
    ScrollTrigger.batch(reveals, {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 1,
          stagger: 0.09,
          ease: "power3.out",
          overwrite: true,
          onStart: () => batch.forEach((el) => el.classList.add("is-visible")),
        }),
    });

    /* Манифест: пословная подсветка по мере чтения */
    const manifest = document.querySelector("[data-split]");
    if (manifest) {
      const words = manifest.textContent.trim().split(/\s+/);
      manifest.innerHTML = words
        .map((w) => `<span class="word word--dim">${w}</span>`)
        .join(" ");

      const spans = manifest.querySelectorAll(".word");
      gsap.to(spans, {
        color: "#171412",
        stagger: 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: manifest,
          start: "top 78%",
          end: "bottom 55%",
          scrub: 0.6,
        },
      });
    }

    /* Лёгкий подъём карточек при скролле */
    gsap.utils.toArray(".card, .price").forEach((el, i) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 1,
        delay: (i % 3) * 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    });
  }

  /* ----------------------------------------------
     5. Swiper — галерея
     ---------------------------------------------- */
  if (typeof Swiper !== "undefined" && document.querySelector(".gallery__swiper")) {
    new Swiper(".gallery__swiper", {
      slidesPerView: "auto",
      spaceBetween: 20,
      grabCursor: true,
      centeredSlides: false,
      speed: 700,
      pagination: {
        el: ".gallery__swiper .swiper-pagination",
        clickable: true,
      },
      keyboard: { enabled: true },
      breakpoints: {
        860: { spaceBetween: 28 },
      },
    });
  }

  /* ----------------------------------------------
     6. Лайтбокс для галереи
     ---------------------------------------------- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox ? lightbox.querySelector("img") : null;

  const openLightbox = (src, alt) => {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = alt || "";
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add("is-open"));
    document.body.style.overflow = "hidden";
    if (lenis) lenis.stop();
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lenis) lenis.start();
    setTimeout(() => { lightbox.hidden = true; }, 400);
  };

  document.querySelectorAll(".gallery__swiper .swiper-slide img").forEach((img) => {
    img.addEventListener("click", () => openLightbox(img.src, img.alt));
  });
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.classList.contains("lightbox__close")) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  /* ----------------------------------------------
     7. Форма бронирования
     ---------------------------------------------- */
  const form = document.getElementById("booking-form");
  if (form) {
    const status = form.querySelector(".form__status");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.elements.name;
      const phone = form.elements.phone;
      let ok = true;

      [name, phone].forEach((field) => {
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

  /* ----------------------------------------------
     8. Мелочи
     ---------------------------------------------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
