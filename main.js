let lenis;

function initLenis() {
  const root = document.documentElement;
  if (typeof Lenis === "undefined") {
    root.classList.add("scroll-smooth");
    return;
  }

  root.classList.remove("scroll-smooth");

  lenis = new Lenis({
    lerp: 0.06,
    smoothWheel: true,
    smoothTouch: true,
    wheelMultiplier: 0.9,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  if (window.ScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }
}

function initPreloader() {
  const preloader = document.getElementById("site-preloader");
  if (!preloader) return;

  const hide = () => {
    preloader.remove();
  };

  if (document.readyState === "complete") {
    hide();
  } else {
    window.addEventListener("load", hide);
  }
}

function initSmoothAnchors() {
  const links = document.querySelectorAll("[data-scroll]");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetSelector = link.getAttribute("href") || link.dataset.target;
      if (!targetSelector) return;

      const isHash = targetSelector.startsWith("#");
      const targetId = isHash ? targetSelector : link.dataset.target;
      if (!targetId) return;

      const el = document.querySelector(targetId);
      if (!el) return;

      e.preventDefault();

      const scrollTo = () => {
        const rect = el.getBoundingClientRect();
        const offset = window.pageYOffset + rect.top - 80;

        if (lenis) {
          if (typeof lenis.start === "function") lenis.start();
          lenis.scrollTo(offset, { duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 3) });
        } else {
          window.scrollTo({ top: offset, behavior: "smooth" });
        }
      };

      const isMenuOpen = document.body.classList.contains("is-menu-open");
      if (isMenuOpen) {
        window.setTimeout(scrollTo, 320);
      } else {
        scrollTo();
      }
    });
  });
}

function initNavActiveState() {
  const links = Array.from(document.querySelectorAll('a[data-scroll][href^="#"]'));
  if (!links.length) return;
  const linkMap = new Map();
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    if (!linkMap.has(href)) linkMap.set(href, []);
    linkMap.get(href).push(link);
  });
  const sections = Array.from(linkMap.keys())
    .map((href) => document.querySelector(href))
    .filter(Boolean);
  if (!sections.length) return;

  let activeId = "";
  const setActive = (id) => {
    if (activeId === id) return;
    activeId = id;
    linkMap.forEach((items, href) => {
      items.forEach((item) => item.classList.toggle("is-active", href === id));
    });
  };

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");
      if (href) setActive(href);
    });
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = `#${visible[0].target.id}`;
        setActive(id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.2, 0.6, 1] }
    );
    sections.forEach((section) => observer.observe(section));
    return;
  }

  let sectionTops = [];
  const updateOffsets = () => {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    sectionTops = sections.map((section) => section.getBoundingClientRect().top + scrollY);
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
      let currentIndex = 0;
      for (let i = 0; i < sectionTops.length; i += 1) {
        if (scrollY + viewport * 0.45 >= sectionTops[i]) currentIndex = i;
      }
      const current = sections[currentIndex];
      if (current && current.id) setActive(`#${current.id}`);
      ticking = false;
    });
  };

  updateOffsets();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    updateOffsets();
    onScroll();
  });
  onScroll();
}

function initRevealOnScroll() {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const sections = gsap.utils.toArray(".js-reveal");

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPerf =
    (navigator && navigator.connection && navigator.connection.saveData) ||
    (navigator && typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
    (navigator && typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4);

  if (!sections.length) return;

  if (prefersReducedMotion) {
    gsap.set(sections, { autoAlpha: 1, y: 0 });
    return;
  }

  const enterOffset = lowPerf ? 28 : 48;
  const exitOffset = lowPerf ? -20 : -32;
  const enterDuration = lowPerf ? 1.1 : 1.8;
  const exitDuration = lowPerf ? 0.8 : 1.2;
  const enterEase = "cubic-bezier(0.22, 1, 0.36, 1)";
  const exitEase = "cubic-bezier(0.4, 0, 0.2, 1)";
  const stagger = lowPerf ? 0.05 : 0.08;

  const noExitIds = new Set(["pricing", "contacts", "reviews"]);
  const noExitSections = sections.filter((section) => section.id && noExitIds.has(section.id));
  const exitSections = sections.filter((section) => !noExitSections.includes(section));

  gsap.set(sections, { autoAlpha: 0, y: enterOffset });

  ScrollTrigger.batch(sections, {
    start: "top 85%",
    end: "bottom top",
    interval: 0.12,
    batchMax: 4,
    onEnter: (batch, self) => {
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: enterDuration,
        ease: enterEase,
        stagger,
        overwrite: "auto",
      });
    },
    onEnterBack: (batch, self) => {
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: enterDuration,
        ease: enterEase,
        stagger,
        overwrite: "auto",
      });
    },
    onLeave: (batch, self) => {
      if (Array.isArray(batch) && exitSections.length) {
        const filtered = batch.filter((section) => !noExitIds.has(section.id));
        if (filtered.length) {
          gsap.to(filtered, {
            autoAlpha: 0,
            y: exitOffset,
            duration: exitDuration,
            ease: exitEase,
            stagger: Math.min(stagger, 0.06),
            overwrite: "auto",
          });
        }
      }
    },
    onLeaveBack: (batch, self) => {
      if (Array.isArray(batch) && exitSections.length) {
        const filtered = batch.filter((section) => !noExitIds.has(section.id));
        if (filtered.length) {
          gsap.to(filtered, {
            autoAlpha: 0,
            y: enterOffset,
            duration: exitDuration,
            ease: exitEase,
            stagger: Math.min(stagger, 0.06),
            overwrite: "auto",
          });
        }
      }
    },
    fastScrollEnd: true,
  });
}

function initFadeIn() {
  const fadeItems = Array.from(document.querySelectorAll(".js-fade"));
  if (fadeItems.length) {
    fadeItems.forEach((el) => el.classList.add("is-visible"));
  }
  if (!window.gsap) return;

  const paths = Array.from(
    document.querySelectorAll('path[data-morph-to], path[data-hover], path[data-morph], #heroBlobPath')
  );
  if (!paths.length) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPerf =
    (navigator && navigator.connection && navigator.connection.saveData) ||
    (navigator && typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
    (navigator && typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4) ||
    document.documentElement.getAttribute("data-morphing") === "off";

  const items = paths
    .map((path) => {
      const baseD = path.getAttribute("d");
      const targetD = path.dataset.morphTo || path.dataset.hover || path.dataset.morph;
      if (!baseD || !targetD) return null;
      const triggerSelector = path.dataset.morphTrigger;
      const trigger =
        (triggerSelector && document.querySelector(triggerSelector)) ||
        path.closest("section") ||
        path;
      const tween = gsap.to(path, {
        attr: { d: targetD },
        duration: 1,
        ease: "none",
        paused: true,
      });
      return { path, trigger, tween };
    })
    .filter(Boolean);

  if (!items.length) return;

  if (prefersReducedMotion || lowPerf) {
    items.forEach((item) => item.tween.progress(0));
    return;
  }

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let rafId = 0;
  let debounceId = 0;

  const update = () => {
    const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
    const start = viewport * 0.9;
    const end = viewport * 0.1;
    const distance = Math.max(start - end, 1);
    items.forEach((item) => {
      const rect = item.trigger.getBoundingClientRect();
      const progress = clamp((start - rect.top) / distance, 0, 1);
      item.tween.progress(progress);
      item.path.style.setProperty("--morph-progress", progress.toFixed(3));
    });
  };

  const schedule = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    }
    if (debounceId) clearTimeout(debounceId);
    debounceId = window.setTimeout(update, 120);
  };

  if (lenis) {
    lenis.on("scroll", schedule);
  } else {
    window.addEventListener("scroll", schedule, { passive: true });
  }
  window.addEventListener("resize", schedule);
  schedule();
}

function initSectionColorShift() {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const sections = gsap.utils.toArray(".js-section-bg");

  sections.forEach((section) => {
    const fromColor = section.dataset.bgFrom;
    const toColor = section.dataset.bgTo;
    if (!fromColor || !toColor) return;

    gsap.fromTo(
      section,
      { backgroundColor: fromColor },
      {
        backgroundColor: toColor,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          end: "bottom 30%",
          scrub: 1.2,
        },
      }
    );
  });
}

function initHeroIntroReveal() {
  if (!window.gsap) return;
  const hero = document.querySelector("#hero");
  if (!hero) return;
  const title = hero.querySelector(".js-hero-title");
  const paragraph = title ? title.parentElement?.querySelector("p") : hero.querySelector("p");
  const tag = title ? title.parentElement?.querySelector("span") : hero.querySelector("span");
  const cta = hero.querySelector(".js-cta");
  const items = [title, paragraph, tag, cta].filter(Boolean);
  if (!items.length) return;
  gsap.from(items, {
    y: 22,
    autoAlpha: 0,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.08,
    delay: 0.15,
    immediateRender: false,
  });
}


function initMobileMenu() {
  const menu = document.querySelector("#mobile-menu");
  const burger = document.querySelector(".js-burger");
  const closeBtn = document.querySelector(".js-menu-close");
  if (!menu || !burger) return;

  const panel = menu.querySelector(".site-menu__panel");
  const items = menu.querySelectorAll(".site-menu__link, .site-menu__cta");
  const focusSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const getFocusable = () =>
    Array.from(menu.querySelectorAll(focusSelector)).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
    );
  let lastFocused = null;

  const lockScroll = () => {
    document.body.classList.add("is-menu-open");
    if (lenis && typeof lenis.stop === "function") lenis.stop();
  };

  const unlockScroll = () => {
    document.body.classList.remove("is-menu-open");
    if (lenis && typeof lenis.start === "function") lenis.start();
  };

  const setExpanded = (value) => {
    burger.setAttribute("aria-expanded", value ? "true" : "false");
  };

  const onKeydown = (event) => {
    if (!menu.classList.contains("is-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = getFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === first || active === menu) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const open = () => {
    if (menu.classList.contains("is-open")) return;
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    burger.classList.add("is-active");
    setExpanded(true);
    lockScroll();
    document.addEventListener("keydown", onKeydown);

    if (window.gsap) {
      gsap.killTweensOf([panel, items]);
      gsap.set(panel, { scale: 1.02 });
      gsap.set(items, { y: 16 });
      gsap.to(panel, { scale: 1, duration: 0.6, ease: "power3.out" });
      gsap.to(items, {
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.06,
        delay: 0.05,
      });
    } else {
    }

    requestAnimationFrame(() => {
      const focusable = getFocusable();
      const target = closeBtn || focusable[0];
      if (target) target.focus();
    });
  };

  const close = () => {
    if (!menu.classList.contains("is-open")) return;
    burger.classList.remove("is-active");
    setExpanded(false);
    unlockScroll();
    document.removeEventListener("keydown", onKeydown);

    if (window.gsap) {
      gsap.killTweensOf([panel, items]);
      gsap.to(items, { y: 12, duration: 0.25, ease: "power2.in" });
      gsap.to(panel, { scale: 0.98, duration: 0.3, ease: "power2.in" });
      setTimeout(() => {
        menu.classList.remove("is-open");
        menu.setAttribute("aria-hidden", "true");
        if (lastFocused) lastFocused.focus();
      }, 280);
    } else {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      if (lastFocused) lastFocused.focus();
    }
  };

  burger.addEventListener("click", () => {
    if (menu.classList.contains("is-open")) {
      close();
    } else {
      open();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }

  menu.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.closest(".site-menu__content") && !target.closest(".site-menu__close")) {
      close();
    }
  });

  const links = menu.querySelectorAll("[data-scroll]");
  links.forEach((link) => {
    link.addEventListener("click", () => {
      close();
    });
  });

  const handleResize = () => {
    if (window.innerWidth >= 768 && menu.classList.contains("is-open")) {
      close();
    }
  };

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);
}

function initBlobBg3Intro() {
  const blob = document.querySelector(".blob-bg-3");
  if (!blob) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const supportsAnimation =
    typeof blob.style.animation !== "undefined" ||
    (window.CSS && CSS.supports && CSS.supports("animation", "intro"));

  if (prefersReducedMotion || !supportsAnimation) {
    blob.classList.remove("blob-bg-3--intro");
    blob.style.opacity = "1";
    blob.style.transform = "scale(1)";
    blob.classList.add("is-floating");
    return;
  }

  blob.classList.add("blob-bg-3--intro");
  requestAnimationFrame(() => {
    blob.classList.add("is-visible");
  });

  window.setTimeout(() => {
    blob.classList.add("is-floating");
  }, 1700);
}

function initFloatingBlobs() {
  if (!window.gsap) return;

  const blobs = gsap.utils.toArray(".blob-bg:not(.blob-bg-3)");
  if (!blobs.length) return;

  blobs.forEach((blob, index) => {
    const baseX = parseFloat(blob.dataset.baseX || 0);
    const baseY = parseFloat(blob.dataset.baseY || 0);

    gsap.set(blob, {
      x: baseX,
      y: baseY,
    });

    const tl = gsap.timeline({
      repeat: -1,
      yoyo: true,
      defaults: { ease: "sine.inOut" },
      delay: index * 1.3,
    });

    tl.to(blob, {
      duration: 22 + Math.random() * 10,
      x: baseX + gsap.utils.random(-80, 80),
      y: baseY + gsap.utils.random(-60, 60),
      scale: gsap.utils.random(0.94, 1.08),
      rotate: gsap.utils.random(-6, 6),
    }).to(
      blob,
      {
        duration: 18 + Math.random() * 10,
        borderRadius:
          "60% 40% 48% 52% / 42% 60% 58% 50%",
      },
      0
    );
  });
}

function initStickyHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const applyState = (scrollY) => {
    const t = Math.min(Math.max((scrollY - 0) / 140, 0), 1);
    header.style.setProperty("--header-bg-opacity", String(t));
    if (t > 0.02) {
      header.classList.add("site-header--scrolled");
    } else {
      header.classList.remove("site-header--scrolled");
    }
  };

  if (lenis) {
    lenis.on("scroll", (e) => {
      const y = typeof e.scroll === "number" ? e.scroll : window.scrollY || window.pageYOffset || 0;
      applyState(y);
    });
    applyState(window.scrollY || window.pageYOffset || 0);
  } else {
    const onScroll = () => applyState(window.scrollY || window.pageYOffset || 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
}

function initHeroBlobFloat() {
  if (!window.gsap) return;

  const wrapper = document.querySelector(".hero-portrait-wrapper");
  if (!wrapper) return;

  gsap.set(wrapper, { x: 0, y: 0 });

  gsap.timeline({
    repeat: -1,
    yoyo: true,
    defaults: { ease: "sine.inOut" },
  })
    .to(wrapper, {
      duration: 18,
      x: 14,
      y: -10,
    })
    .to(
      wrapper,
      {
        duration: 20,
        x: -10,
        y: 14,
      },
      0
    );
}

function initHeroSlider() {
  if (!window.gsap) return;

  const slides = gsap.utils.toArray(".hero-slide");
  if (slides.length <= 1) {
    if (slides[0]) slides[0].classList.add("is-active");
    return;
  }

  slides.forEach((slide, index) => {
    slide.style.display = "block";
    gsap.set(slide, { opacity: index === 0 ? 1 : 0, scale: index === 0 ? 1 : 1.04, xPercent: 0 });
    slide.classList.toggle("is-active", index === 0);
  });

  let currentIndex = 0;

  const showSlide = (nextIndex) => {
    if (nextIndex === currentIndex) return;

    const current = slides[currentIndex];
    const next = slides[nextIndex];

    const tl = gsap.timeline({
      defaults: { duration: 1.1, ease: "power2.out" },
      onStart: () => {
        current.classList.remove("is-active");
        next.classList.add("is-active");
      },
    });

    tl.to(
      current,
      {
        opacity: 0,
        scale: 1.04,
        ease: "power2.inOut",
      },
      0
    ).to(
      next,
      {
        opacity: 1,
        scale: 1,
        ease: "power2.out",
      },
      0
    );

    currentIndex = nextIndex;
  };

  const loop = () => {
    const nextIndex = (currentIndex + 1) % slides.length;
    showSlide(nextIndex);
    gsap.delayedCall(4.2, loop);
  };

  gsap.delayedCall(3, loop);
}

function initHeroBlobHover() {
  if (!window.gsap) return;

  const wrapper = document.querySelector(".hero-portrait-wrapper");
  const blobPath = document.querySelector("#heroBlobPath");

  if (!wrapper || !blobPath) return;

  const baseD = blobPath.getAttribute("d");
  const hoverD = blobPath.dataset.hover;

  let morphTl = null;
  if (hoverD) {
    morphTl = gsap.timeline({
      repeat: -1,
      yoyo: true,
      defaults: { duration: 16, ease: "sine.inOut" },
    });
    morphTl.to(blobPath, {
      attr: { d: hoverD },
    });
  }

  const hoverIn = () => {
    const tl = gsap.timeline();
    tl.to(wrapper, {
      duration: 0.7,
      scale: 1.02,
      rotation: 1.2,
      ease: "power3.out",
    }).to(
      ".hero-portrait-shadow",
      {
        duration: 0.7,
        scaleX: 1.08,
        opacity: 0.9,
        ease: "power3.out",
      },
      0
    );

    if (morphTl) {
      morphTl.timeScale(1.8);
    }
  };

  const hoverOut = () => {
    const tl = gsap.timeline();
    tl.to(wrapper, {
      duration: 0.7,
      scale: 1,
      rotation: 0,
      ease: "power3.out",
    }).to(
      ".hero-portrait-shadow",
      {
        duration: 0.7,
        scaleX: 1,
        opacity: 0.75,
        ease: "power3.out",
      },
      0
    );

    if (morphTl) {
      morphTl.timeScale(1);
    } else if (baseD) {
      tl.to(
        blobPath,
        {
          duration: 0.9,
          attr: { d: baseD },
          ease: "power2.inOut",
        },
        0
      );
    }
  };

  wrapper.addEventListener("mouseenter", hoverIn);
  wrapper.addEventListener("mouseleave", hoverOut);
}

function initWorkBlobsHover() {
  if (!window.gsap) return;

  const items = gsap.utils.toArray("#works .work-blob");

  items.forEach((item) => {
    const img = item.querySelector(".work-blob__image");
    if (!img) return;

    const enter = () => {
      gsap.to(item, {
        duration: 0.6,
        borderRadius: "48% 52% 40% 60% / 58% 44% 56% 42%",
        ease: "power3.out",
      });
      gsap.to(img, {
        duration: 0.6,
        scale: 1.08,
        y: -4,
        ease: "power3.out",
      });
    };

    const leave = () => {
      gsap.to(item, {
        duration: 0.7,
        borderRadius: "56% 46% 60% 40% / 52% 60% 46% 54%",
        ease: "power3.out",
      });
      gsap.to(img, {
        duration: 0.7,
        scale: 1.04,
        y: 0,
        ease: "power3.out",
      });
    };

    item.addEventListener("mouseenter", enter);
    item.addEventListener("mouseleave", leave);
  });
}

function initBeforeAfter() {
  const blocks = Array.from(document.querySelectorAll("[data-before-after]"));
  if (!blocks.length) return;

  blocks.forEach((block) => {
    const range = block.querySelector(".before-after__range");
    if (!(range instanceof HTMLInputElement)) return;

    const apply = (value) => {
      const raw = Number(value);
      const clamped = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 50;
      block.style.setProperty("--ba-pos", `${clamped}%`);
      range.setAttribute("aria-valuenow", String(clamped));
    };

    apply(range.value);

    range.addEventListener("input", () => apply(range.value));
    range.addEventListener("change", () => apply(range.value));
  });
}

function initGalleryOverlayInteractions() {
  const items = Array.from(document.querySelectorAll("#gallery .gallery-item"));
  if (!items.length) return;

  const setActive = (target) => {
    items.forEach((item) => {
      const isActive = item === target;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-expanded", isActive ? "true" : "false");
    });
  };

  const clearActive = () => {
    items.forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-expanded", "false");
    });
  };

  items.forEach((item) => {
    const blob = item.querySelector(".work-blob");
    if (!blob) return;

    blob.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      event.preventDefault();
      if (item.classList.contains("is-active")) {
        item.classList.remove("is-active");
        item.setAttribute("aria-expanded", "false");
        return;
      }
      setActive(item);
    });

    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (item.classList.contains("is-active")) {
          item.classList.remove("is-active");
          item.setAttribute("aria-expanded", "false");
          return;
        }
        setActive(item);
      }
      if (event.key === "Escape") {
        clearActive();
        item.blur();
      }
    });
  });

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      clearActive();
      return;
    }
    if (!target.closest("#gallery .gallery-item")) clearActive();
  });
}

function initReviewsModal() {
  const modal = document.getElementById("reviews-modal");
  if (!modal) return;
  const image = modal.querySelector(".reviews-modal__image");
  const closeBtn = modal.querySelector(".reviews-modal__close");
  const backdrop = modal.querySelector(".reviews-modal__backdrop");
  const items = Array.from(document.querySelectorAll("[data-review-src]"));
  if (!image || !items.length) return;

  const open = (src, alt) => {
    image.src = src;
    image.alt = alt || "Отзыв клиента";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-modal-open");
  };

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-modal-open");
    image.removeAttribute("src");
    image.removeAttribute("alt");
  };

  items.forEach((item) => {
    item.addEventListener("click", () => {
      const src = item.getAttribute("data-review-src");
      if (!src) return;
      const alt =
        item.getAttribute("data-review-alt") ||
        item.querySelector("img")?.getAttribute("alt") ||
        "Отзыв клиента";
      open(src, alt);
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) close();
  });
}

function initPricingCalculator() {
  const form = document.querySelector("#pricing-calculator");
  if (!form) return;

  const sizeSelect = form.querySelector("[data-price-size]");
  const peopleInput = form.querySelector("[data-price-people]");
  const lacquerInput = form.querySelector("[data-price-lacquer]");
  const gelInput = form.querySelector("[data-price-gel]");
  const totalEl = form.querySelector("[data-price-total]");
  const totalInput = form.querySelector("[data-price-total-input]");

  if (!sizeSelect || !peopleInput || !totalEl) return;

  const clampPeople = () => {
    const value = parseInt(peopleInput.value || "1", 10);
    if (!Number.isFinite(value) || value < 1) {
      peopleInput.value = "1";
      return 1;
    }
    return value;
  };

  const calc = () => {
    const base = Number(sizeSelect.value || 0);
    const people = clampPeople();
    const extra = Math.max(0, people - 1) * 500;
    let total = base + extra;
    if (lacquerInput && lacquerInput.checked) total *= 1.1;
    if (gelInput && gelInput.checked) total *= 1.2;
    const rounded = Math.round(total);
    totalEl.textContent = `${rounded} р.`;
    if (totalInput) totalInput.value = String(rounded);
  };

  sizeSelect.addEventListener("change", calc);
  peopleInput.addEventListener("input", calc);
  if (lacquerInput) lacquerInput.addEventListener("change", calc);
  if (gelInput) gelInput.addEventListener("change", calc);
  calc();
}

function initPricingValidation() {
  const form = document.querySelector("#pricing-calculator");
  if (!form) return;

  const nameInput = form.querySelector("#pricing-name");
  const phoneInput = form.querySelector("#pricing-phone");
  const emailInput = form.querySelector("#pricing-email");
  const styleSelect = form.querySelector("#pricing-style");
  const peopleInput = form.querySelector("#pricing-people");
  const statusEl = form.querySelector(".pricing-status");
  const submitBtn = form.querySelector(".pricing-submit");
  const honeypot = form.querySelector('input[name="company"]');
  const startedAt = form.querySelector('input[name="form_started_at"]');

  if (!nameInput || !phoneInput || !emailInput || !styleSelect || !peopleInput) return;
  if (startedAt) startedAt.value = String(Date.now());

  const getErrorEl = (input) => {
    const id = input.getAttribute("aria-describedby");
    return id ? document.getElementById(id) : null;
  };

  const setError = (input, message) => {
    const errorEl = getErrorEl(input);
    if (errorEl) errorEl.textContent = message;
    input.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    const selectWrapper = input.closest(".pricing-select");
    if (selectWrapper) {
      selectWrapper.classList.toggle("is-invalid", Boolean(message));
    }
  };
  const setStatus = (message, type) => {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.remove("pricing-status--success", "pricing-status--error");
    if (type) statusEl.classList.add(`pricing-status--${type}`);
  };

  const validateName = () => {
    const value = nameInput.value.trim();
    if (value.length < 2) {
      setError(nameInput, "Введите минимум 2 символа.");
      return false;
    }
    setError(nameInput, "");
    return true;
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").replace(/^8/, "7");
    const cleaned = digits.startsWith("7") ? digits.slice(1, 11) : digits.slice(0, 10);
    const parts = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
    if (!parts) return "+7(";
    const [, p1, p2, p3, p4] = parts;
    let result = "+7";
    if (p1) result += `(${p1}`;
    if (p1 && p1.length === 3) result += ")";
    if (p2) result += `${p2}`;
    if (p3) result += `-${p3}`;
    if (p4) result += `-${p4}`;
    return result;
  };

  const validatePhone = () => {
    const digits = phoneInput.value.replace(/\D/g, "");
    if (digits.length !== 11 || !digits.startsWith("7")) {
      setError(phoneInput, "Введите телефон в формате +7 (XXX) XXX-XX-XX.");
      return false;
    }
    setError(phoneInput, "");
    return true;
  };

  const validateEmail = () => {
    const value = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isValid) {
      setError(emailInput, "Введите корректный email.");
      return false;
    }
    setError(emailInput, "");
    return true;
  };

  const validateStyle = () => {
    if (!styleSelect.value) {
      setError(styleSelect, "Выберите стиль портрета.");
      return false;
    }
    setError(styleSelect, "");
    return true;
  };

  const validatePeople = () => {
    const value = parseInt(peopleInput.value || "0", 10);
    if (!Number.isFinite(value) || value < 1) {
      setError(peopleInput, "Укажите количество лиц от 1.");
      return false;
    }
    setError(peopleInput, "");
    return true;
  };

  nameInput.addEventListener("blur", validateName);
  emailInput.addEventListener("blur", validateEmail);
  phoneInput.addEventListener("input", () => {
    const formatted = formatPhone(phoneInput.value);
    phoneInput.value = formatted;
  });
  phoneInput.addEventListener("focus", () => {
    if (!phoneInput.value) phoneInput.value = "+7(";
  });
  phoneInput.addEventListener("blur", validatePhone);
  styleSelect.addEventListener("change", validateStyle);
  peopleInput.addEventListener("blur", validatePeople);

  form.addEventListener("submit", async (e) => {
    if (honeypot && honeypot.value.trim()) {
      e.preventDefault();
      setStatus("Не удалось отправить заявку. Попробуйте еще раз позже.", "error");
      return;
    }
    if (startedAt) {
      const elapsed = Date.now() - Number(startedAt.value || 0);
      if (elapsed > 0 && elapsed < 1500) {
        e.preventDefault();
        setStatus("Пожалуйста, заполните форму чуть внимательнее.", "error");
        return;
      }
    }
    const okName = validateName();
    const okPhone = validatePhone();
    const okEmail = validateEmail();
    const okStyle = validateStyle();
    const okPeople = validatePeople();
    if (!okName || !okPhone || !okEmail || !okStyle || !okPeople) {
      e.preventDefault();
      setStatus("Проверьте корректность заполнения формы.", "error");
      return;
    }

    e.preventDefault();
    setStatus("Отправляем заявку...", "");
    if (submitBtn) submitBtn.classList.add("is-loading");

    try {
      const action = form.getAttribute("action") || "";
      const response = await fetch(action, {
        method: "POST",
        body: new FormData(form),
      });
      if (!response.ok) {
        throw new Error("request_failed");
      }
      setStatus("Заявка отправлена! Мы свяжемся с вами в ближайшее время.", "success");
      form.reset();
    } catch (err) {
      setStatus("Не удалось отправить заявку. Попробуйте еще раз позже.", "error");
    } finally {
      if (submitBtn) submitBtn.classList.remove("is-loading");
    }
  });
}

function initPricingSelects() {
  const wrappers = Array.from(document.querySelectorAll("[data-pricing-select]"));
  if (!wrappers.length) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const handledForms = new WeakSet();
  const closeTimeouts = new WeakMap();

  const getParts = (wrapper) => {
    const native = wrapper.querySelector("select");
    const trigger = wrapper.querySelector(".pricing-select__trigger");
    const valueEl = wrapper.querySelector(".pricing-select__value");
    const list = wrapper.querySelector(".pricing-select__list");
    const options = Array.from(wrapper.querySelectorAll(".pricing-select__option"));
    return { native, trigger, valueEl, list, options };
  };

  const sync = (wrapper) => {
    const { native, trigger, valueEl, options } = getParts(wrapper);
    if (!native || !trigger || !valueEl) return;
    const selected = native.options[native.selectedIndex];
    const selectedText = selected ? selected.textContent : "";
    const isPlaceholder = !native.value;
    valueEl.textContent = selectedText;
    valueEl.classList.toggle("is-placeholder", isPlaceholder);
    trigger.classList.toggle("is-placeholder", isPlaceholder);
    wrapper.classList.toggle("is-invalid", native.classList.contains("is-invalid"));

    options.forEach((option) => {
      const value = option.dataset.value || "";
      const isSelected = value === native.value;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  };

  const closeWrapper = (wrapper, force) => {
    const { trigger, list } = getParts(wrapper);
    if (!trigger || !list) return;
    if (!wrapper.classList.contains("is-open")) return;
    const existingTimeout = closeTimeouts.get(list);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      closeTimeouts.delete(list);
    }
    trigger.setAttribute("aria-expanded", "false");
    if (prefersReducedMotion || force) {
      list.classList.remove("is-closing");
      wrapper.classList.remove("is-open");
      list.setAttribute("aria-hidden", "true");
      return;
    }
    list.classList.add("is-closing");
    const onEnd = (event) => {
      if (event.target !== list) return;
      list.removeEventListener("animationend", onEnd);
      const timeoutId = closeTimeouts.get(list);
      if (timeoutId) {
        clearTimeout(timeoutId);
        closeTimeouts.delete(list);
      }
      list.classList.remove("is-closing");
      wrapper.classList.remove("is-open");
      list.setAttribute("aria-hidden", "true");
    };
    list.addEventListener("animationend", onEnd);
    const timeoutId = setTimeout(() => {
      list.removeEventListener("animationend", onEnd);
      list.classList.remove("is-closing");
      wrapper.classList.remove("is-open");
      list.setAttribute("aria-hidden", "true");
      closeTimeouts.delete(list);
    }, 260);
    closeTimeouts.set(list, timeoutId);
  };

  const openWrapper = (wrapper) => {
    const { trigger, list } = getParts(wrapper);
    if (!trigger || !list) return;
    if (wrapper.classList.contains("is-open")) return;
    const existingTimeout = closeTimeouts.get(list);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      closeTimeouts.delete(list);
    }
    wrappers.forEach((item) => {
      if (item !== wrapper) closeWrapper(item, true);
    });
    wrapper.classList.add("is-open");
    list.classList.remove("is-closing");
    trigger.setAttribute("aria-expanded", "true");
    list.setAttribute("aria-hidden", "false");
  };

  wrappers.forEach((wrapper) => {
    const { native, trigger, list, options } = getParts(wrapper);
    if (!native || !trigger || !list) return;

    sync(wrapper);

    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("is-open")) {
        closeWrapper(wrapper);
      } else {
        openWrapper(wrapper);
      }
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeWrapper(wrapper);
      }
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        openWrapper(wrapper);
      }
    });

    const handleSelect = (option) => {
      if (option.getAttribute("aria-disabled") === "true") return;
      const value = option.dataset.value || "";
      if (native.value !== value) {
        native.value = value;
        native.dispatchEvent(new Event("change", { bubbles: true }));
      }
      sync(wrapper);
      closeWrapper(wrapper);
    };

    options.forEach((option) => {
      option.addEventListener("click", () => handleSelect(option));
      option.addEventListener("pointerup", () => handleSelect(option));
      option.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect(option);
        }
      });
    });

    native.addEventListener("change", () => {
      sync(wrapper);
      closeWrapper(wrapper);
    });
    native.addEventListener("blur", () => sync(wrapper));

    const form = wrapper.closest("form");
    if (form && !handledForms.has(form)) {
      handledForms.add(form);
      form.addEventListener("reset", () => {
        requestAnimationFrame(() => {
          wrappers.forEach((item) => sync(item));
        });
      });
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      wrappers.forEach((wrapper) => closeWrapper(wrapper));
      return;
    }
    const wrapper = target.closest(".pricing-select");
    if (!wrapper) wrappers.forEach((item) => closeWrapper(item));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") wrappers.forEach((wrapper) => closeWrapper(wrapper));
  });
}

function initTimelineInteractions() {
  const items = Array.from(document.querySelectorAll(".js-timeline-item"));
  if (!items.length) return;

  const setActive = (target) => {
    items.forEach((item) => {
      const wrapper = item.closest(".timeline-item");
      if (wrapper) wrapper.classList.toggle("is-active", item === target);
    });
  };

  items.forEach((item) => {
    item.addEventListener("click", () => setActive(item));
    item.addEventListener("focus", () => setActive(item));
  });
}

function initTimelineMorphOnScroll() {
  const cards = Array.from(document.querySelectorAll(".js-timeline-item"));
  if (!cards.length) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const blob = [0.58, 0.42, 0.52, 0.48, 0.54, 0.46, 0.56, 0.44];
  const endRadius = 14;

  const apply = () => {
    const viewport =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const start = viewport * 0.9;
    const end = viewport * 0.35;
    const distance = Math.max(start - end, 1);

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const progress = clamp((start - rect.top) / distance, 0, 1);
      const minSide = Math.max(1, Math.min(rect.width, rect.height));
      const radii = blob.map((ratio) => ratio * minSide);
      const blended = radii.map((value) => value * (1 - progress) + endRadius * progress);
      card.style.borderRadius = `${blended[0].toFixed(2)}px ${blended[1].toFixed(2)}px ${blended[2].toFixed(2)}px ${blended[3].toFixed(2)}px / ${blended[4].toFixed(2)}px ${blended[5].toFixed(2)}px ${blended[6].toFixed(2)}px ${blended[7].toFixed(2)}px`;
    });
  };

  if (prefersReducedMotion) {
    cards.forEach((card) => {
      card.style.borderRadius = `${endRadius}px`;
    });
    return;
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  };

  if (lenis) {
    lenis.on("scroll", onScroll);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  window.addEventListener("resize", onScroll);
  onScroll();
}

function initAboutQualityMorphOnScroll() {
  const section = document.querySelector(".about-quality");
  if (!section) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const startRadius = 999;
  const endRadius = 28;
  const minSize = 120;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const apply = () => {
    const rect = section.getBoundingClientRect();
    const viewport =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const start = viewport * 0.9;
    const end = viewport * 0.35;
    const distance = Math.max(start - end, 1);
    const progress = clamp((start - rect.top) / distance, 0, 1);
    const radius = startRadius + (endRadius - startRadius) * progress;
    const minSide = Math.max(1, Math.min(rect.width, rect.height));
    const scaleMin = Math.min(1, minSize / minSide);
    const scale = scaleMin + (1 - scaleMin) * progress;
    const shiftX = -0.12 * rect.width * (1 - progress);
    const shiftY = -0.18 * rect.height * (1 - progress);
    section.style.borderRadius = `${radius.toFixed(2)}px`;
    section.style.transform = `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    section.style.opacity = `${(0.7 + 0.3 * progress).toFixed(2)}`;
  };

  if (prefersReducedMotion) {
    section.style.borderRadius = `${endRadius}px`;
    section.style.transform = "none";
    section.style.opacity = "1";
    return;
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  };

  if (lenis) {
    lenis.on("scroll", onScroll);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  window.addEventListener("resize", onScroll);
  onScroll();
}

function initPricingMorphOnScroll() {
  const card = document.querySelector(".pricing-card");
  if (!card) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const startRadius = 999;
  const computed = window.getComputedStyle(card);
  const endRadiusRaw = parseFloat(computed.borderTopLeftRadius || "0");
  const endRadius = Number.isFinite(endRadiusRaw) && endRadiusRaw > 0 ? endRadiusRaw : 16;
  const minSize = 120;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const apply = () => {
    const rect = card.getBoundingClientRect();
    const viewport =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const start = viewport * 0.9;
    const end = viewport * 0.35;
    const distance = Math.max(start - end, 1);
    const progress = clamp((start - rect.top) / distance, 0, 1);
    const radius = startRadius + (endRadius - startRadius) * progress;
    const minSide = Math.max(1, Math.min(rect.width, rect.height));
    const scaleMin = Math.min(1, minSize / minSide);
    const scale = scaleMin + (1 - scaleMin) * progress;
    const shiftX = -0.12 * rect.width * (1 - progress);
    const shiftY = -0.18 * rect.height * (1 - progress);
    card.style.borderRadius = `${radius.toFixed(2)}px`;
    card.style.transform = `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    card.style.opacity = `${(0.7 + 0.3 * progress).toFixed(2)}`;
  };

  if (prefersReducedMotion) {
    card.style.borderRadius = `${endRadius}px`;
    card.style.transform = "none";
    card.style.opacity = "1";
    return;
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  };

  if (lenis) {
    lenis.on("scroll", onScroll);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  window.addEventListener("resize", onScroll);
  onScroll();
}

function initSectionMorphOnScroll() {
  const targets = [
    { selector: ".faq-card", fallbackRadius: 32 },
    { selector: ".contacts-card", fallbackRadius: 32 },
  ];

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const attach = (element, options) => {
    const { fallbackRadius, easePower, shiftX, shiftY } = options;
    element.dataset.morphScroll = "true";
    const computed = window.getComputedStyle(element);
    const endRadiusRaw = parseFloat(computed.borderTopLeftRadius || "0");
    const endRadius =
      Number.isFinite(endRadiusRaw) && endRadiusRaw > 0
        ? endRadiusRaw
        : fallbackRadius;
    const startRadius = 999;
    const minSize = 120;
    const easingPower = Number.isFinite(easePower) ? easePower : 1;
    const shiftXFactor = Number.isFinite(shiftX) ? shiftX : -0.12;
    const shiftYFactor = Number.isFinite(shiftY) ? shiftY : -0.18;

    const apply = () => {
      const rect = element.getBoundingClientRect();
      const viewport =
        window.innerHeight || document.documentElement.clientHeight || 0;
      const start = viewport * 0.9;
      const end = viewport * 0.35;
      const distance = Math.max(start - end, 1);
      const progress = clamp((start - rect.top) / distance, 0, 1);
      const eased =
        easingPower === 1 ? progress : 1 - Math.pow(1 - progress, easingPower);
      const radius = startRadius + (endRadius - startRadius) * eased;
      const minSide = Math.max(1, Math.min(rect.width, rect.height));
      const scaleMin = Math.min(1, minSize / minSide);
      const scale = scaleMin + (1 - scaleMin) * eased;
      const shiftX = shiftXFactor * rect.width * (1 - eased);
      const shiftY = shiftYFactor * rect.height * (1 - eased);
      element.style.borderRadius = `${radius.toFixed(2)}px`;
      element.style.transform = `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
      element.style.opacity = `${(0.7 + 0.3 * eased).toFixed(2)}`;
    };

    if (prefersReducedMotion) {
      element.style.borderRadius = `${endRadius}px`;
      element.style.transform = "none";
      element.style.opacity = "1";
      return;
    }

    let rafId = 0;
    let debounceId = 0;
    let active = true;

    const schedule = () => {
      if (!active) return;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          apply();
        });
      }
      if (debounceId) clearTimeout(debounceId);
      debounceId = window.setTimeout(apply, 120);
    };

    if ("IntersectionObserver" in window) {
      active = false;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          active = entry.isIntersecting || entry.intersectionRatio > 0;
          if (active) schedule();
        },
        { threshold: [0, 0.2, 0.6, 1], rootMargin: "0px 0px -10% 0px" }
      );
      observer.observe(element);
    }

    apply();

    if (lenis) {
      lenis.on("scroll", schedule);
    } else {
      window.addEventListener("scroll", schedule, { passive: true });
    }
    window.addEventListener("resize", schedule);
    schedule();
  };

  targets.forEach((options) => {
    const { selector } = options;
    const element = document.querySelector(selector);
    if (!element) return;
    attach(element, options);
  });
}

function initGiftMorphOnScroll() {
  const card = document.querySelector(".gift-card");
  if (!card) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const computed = window.getComputedStyle(card);
  const endRadiusRaw = parseFloat(computed.borderTopLeftRadius || "0");
  const endRadius = Number.isFinite(endRadiusRaw) && endRadiusRaw > 0 ? endRadiusRaw : 32;
  const startRadius = 999;
  const minSize = 120;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const apply = () => {
    const rect = card.getBoundingClientRect();
    const viewport =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const start = viewport * 0.9;
    const end = viewport * 0.35;
    const distance = Math.max(start - end, 1);
    const progress = clamp((start - rect.top) / distance, 0, 1);
    const radius = startRadius + (endRadius - startRadius) * progress;
    const minSide = Math.max(1, Math.min(rect.width, rect.height));
    const scaleMin = Math.min(1, minSize / minSide);
    const scale = scaleMin + (1 - scaleMin) * progress;
    const shiftX = -0.12 * rect.width * (1 - progress);
    const shiftY = -0.18 * rect.height * (1 - progress);
    card.style.borderRadius = `${radius.toFixed(2)}px`;
    card.style.transform = `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    card.style.opacity = `${(0.7 + 0.3 * progress).toFixed(2)}`;
  };

  if (prefersReducedMotion) {
    card.style.borderRadius = `${endRadius}px`;
    card.style.transform = "none";
    card.style.opacity = "1";
    return;
  }

  let rafId = 0;
  let debounceId = 0;
  let active = true;

  const schedule = () => {
    if (!active) return;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        apply();
      });
    }
    if (debounceId) clearTimeout(debounceId);
    debounceId = window.setTimeout(apply, 120);
  };

  if ("IntersectionObserver" in window) {
    active = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        active = entry.isIntersecting || entry.intersectionRatio > 0;
        if (active) schedule();
      },
      { threshold: [0, 0.2, 0.6, 1], rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(card);
  }

  apply();

  if (lenis) {
    lenis.on("scroll", schedule);
  } else {
    window.addEventListener("scroll", schedule, { passive: true });
  }
  window.addEventListener("resize", schedule);
  schedule();
}

function initFaqBlobMorph() {
  const section = document.querySelector("#faq");
  if (!section) return;
  const card = section.querySelector(".faq-card");
  const blob = section.querySelector(".faq-blob");
  const shape = section.querySelector(".faq-blob__shape");
  if (!card || !blob || !shape) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof SVGRectElement === "undefined" || !shape.setAttribute) return;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  let targetRx = 14;
  let targetRy = 14;

  const updateTargets = () => {
    const rect = card.getBoundingClientRect();
    const styles = window.getComputedStyle(card);
    const radius = parseFloat(styles.borderTopLeftRadius || "0");
    const rx = rect.width ? (radius / rect.width) * 100 : 0;
    const ry = rect.height ? (radius / rect.height) * 100 : 0;
    targetRx = clamp(rx, 0, 50);
    targetRy = clamp(ry, 0, 50);
  };

  const apply = () => {
    const rect = section.getBoundingClientRect();
    const viewport =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const start = viewport * 0.9;
    const end = viewport * 0.35;
    const distance = Math.max(start - end, 1);
    const progress = clamp((start - rect.top) / distance, 0, 1);
    const eased = easeOut(progress);
    const rx = 50 + (targetRx - 50) * eased;
    const ry = 50 + (targetRy - 50) * eased;
    shape.setAttribute("rx", rx.toFixed(2));
    shape.setAttribute("ry", ry.toFixed(2));
    const scale = 0.9 + 0.1 * eased;
    blob.style.setProperty("--faq-blob-scale", scale.toFixed(3));
    const shiftY = -12 * (1 - eased);
    blob.style.setProperty("--faq-blob-y", `${shiftY.toFixed(2)}px`);
    blob.style.opacity = `${(0.45 + 0.25 * eased).toFixed(2)}`;
  };

  updateTargets();

  if (prefersReducedMotion) {
    shape.setAttribute("rx", targetRx.toFixed(2));
    shape.setAttribute("ry", targetRy.toFixed(2));
    blob.style.setProperty("--faq-blob-scale", "1");
    blob.style.setProperty("--faq-blob-y", "0px");
    blob.style.opacity = "0.7";
    return;
  }

  let ticking = false;
  let active = true;
  const onScroll = () => {
    if (!active || ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      apply();
      ticking = false;
    });
  };

  if ("IntersectionObserver" in window) {
    active = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        active = entry.isIntersecting || entry.intersectionRatio > 0;
        if (active) onScroll();
      },
      { threshold: [0, 0.2, 0.6, 1], rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(section);
  }

  if (lenis) {
    lenis.on("scroll", onScroll);
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  window.addEventListener("resize", () => {
    updateTargets();
    onScroll();
  });
  onScroll();
}

function initAboutStatsBlob() {
  const card = document.querySelector(".about-card--stats");
  if (!card) return;

  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const computed = window.getComputedStyle(card);
  const endRadiusRaw = parseFloat(computed.borderTopLeftRadius || "0");
  const endRadius = Number.isFinite(endRadiusRaw) && endRadiusRaw > 0 ? endRadiusRaw : 28;
  const startRadius = 999;
  const minSize = 120;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const apply = () => {
    const rect = card.getBoundingClientRect();
    const viewport =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const start = viewport * 0.9;
    const end = viewport * 0.35;
    const distance = Math.max(start - end, 1);
    const progress = clamp((start - rect.top) / distance, 0, 1);
    const radius = startRadius + (endRadius - startRadius) * progress;
    const minSide = Math.max(1, Math.min(rect.width, rect.height));
    const scaleMin = Math.min(1, minSize / minSide);
    const scale = scaleMin + (1 - scaleMin) * progress;
    const shiftX = -0.12 * rect.width * (1 - progress);
    const shiftY = -0.18 * rect.height * (1 - progress);
    card.style.borderRadius = `${radius.toFixed(2)}px`;
    card.style.transform = `translate3d(${shiftX.toFixed(2)}px, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
    card.style.opacity = `${(0.7 + 0.3 * progress).toFixed(2)}`;
  };

  if (prefersReducedMotion) {
    card.style.borderRadius = `${endRadius}px`;
    card.style.transform = "none";
    card.style.opacity = "1";
    return;
  }

  let rafId = 0;
  let debounceId = 0;
  let active = true;

  const schedule = () => {
    if (!active) return;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        apply();
      });
    }
    if (debounceId) clearTimeout(debounceId);
    debounceId = window.setTimeout(apply, 120);
  };

  if ("IntersectionObserver" in window) {
    active = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        active = entry.isIntersecting || entry.intersectionRatio > 0;
        if (active) schedule();
      },
      { threshold: [0, 0.2, 0.6, 1], rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(card);
  }

  apply();

  if (lenis) {
    lenis.on("scroll", schedule);
  } else {
    window.addEventListener("scroll", schedule, { passive: true });
  }
  window.addEventListener("resize", schedule);
  schedule();
}

function runPricingCardTests() {
  const results = [];
  const card = document.querySelector(".pricing-card");
  results.push({
    name: "pricing-card exists",
    ok: Boolean(card),
  });

  const styleTrigger = document.querySelector("#pricing-style")?.closest(".pricing-select")?.querySelector(".pricing-select__trigger");
  const styleList = document.getElementById("pricing-style-list");
  results.push({
    name: "style listbox wiring",
    ok: Boolean(styleTrigger && styleList && styleTrigger.getAttribute("aria-controls") === "pricing-style-list"),
  });

  const sizeTrigger = document.querySelector("#pricing-size")?.closest(".pricing-select")?.querySelector(".pricing-select__trigger");
  const sizeList = document.getElementById("pricing-size-list");
  results.push({
    name: "size listbox wiring",
    ok: Boolean(sizeTrigger && sizeList && sizeTrigger.getAttribute("aria-controls") === "pricing-size-list"),
  });

  const optionRoles = Array.from(document.querySelectorAll(".pricing-select__option"))
    .every((option) => option.getAttribute("role") === "option");
  results.push({
    name: "options have role=option",
    ok: optionRoles,
  });

  const peopleInput = document.querySelector("#pricing-people");
  results.push({
    name: "people input has min=1",
    ok: Boolean(peopleInput && peopleInput.getAttribute("min") === "1"),
  });

  return results;
}

function renderPricingTestPanel(results) {
  const panel = document.createElement("div");
  panel.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:9999;padding:12px 14px;border-radius:12px;background:#fff;box-shadow:0 12px 28px rgba(0,0,0,0.18);font:12px/1.4 Montserrat, sans-serif;color:#2c211c;max-width:260px;";
  const title = document.createElement("div");
  title.textContent = "Pricing tests";
  title.style.cssText = "font-weight:700;margin-bottom:8px;";
  panel.appendChild(title);

  results.forEach((item) => {
    const row = document.createElement("div");
    row.textContent = `${item.ok ? "✔" : "✖"} ${item.name}`;
    row.style.cssText = `color:${item.ok ? "#2f6b3b" : "#a1463a"};`;
    panel.appendChild(row);
  });

  document.body.appendChild(panel);
}

window.addEventListener("DOMContentLoaded", () => {
  initPreloader();
  initLenis();
  initNavActiveState();
  initSmoothAnchors();
  initHeroIntroReveal();
  initFadeIn();
  initBlobBg3Intro();
  initRevealOnScroll();
  initSectionColorShift();
  initFloatingBlobs();
  initStickyHeader();
  initHeroSlider();
  initHeroBlobFloat();
  initHeroBlobHover();
  initWorkBlobsHover();
  initBeforeAfter();
  initGalleryOverlayInteractions();
  initReviewsModal();
  initMobileMenu();
  initPricingCalculator();
  initPricingSelects();
  initSectionMorphOnScroll();
  initPricingValidation();
  initTimelineInteractions();
  initTimelineMorphOnScroll();
  initAboutQualityMorphOnScroll();
  initPricingMorphOnScroll();
  initGiftMorphOnScroll();
  initFaqBlobMorph();
  initAboutStatsBlob();
  if (new URLSearchParams(window.location.search).get("pricingTests") === "1") {
    renderPricingTestPanel(runPricingCardTests());
  }
});
