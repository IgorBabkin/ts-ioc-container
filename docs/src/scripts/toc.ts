/**
 * Table of Contents scroll tracking and smooth scrolling
 */

export function getHeaderHeight(): number {
  const header = document.querySelector(".layout-header");
  return header ? header.getBoundingClientRect().height : 56;
}

export function getScrollContainer(): Window | HTMLElement {
  return document.querySelector(".layout-main") || window;
}

export function updateActiveTOC(): void {
  const tocLinks = document.querySelectorAll<HTMLAnchorElement>(".toc-link");
  if (tocLinks.length === 0) return;

  const scrollContainer = getScrollContainer();
  const scrollTop =
    scrollContainer === window
      ? window.scrollY
      : (scrollContainer as HTMLElement).scrollTop;
  const headerHeight = getHeaderHeight();
  const scrollPosition = scrollTop + headerHeight + 50;

  let current = "";

  tocLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) return;

    const id = href.substring(1);
    const target = document.getElementById(id);

    if (target) {
      let elementTop: number;
      if (scrollContainer === window) {
        elementTop = target.getBoundingClientRect().top + window.scrollY;
      } else {
        const containerRect = (
          scrollContainer as HTMLElement
        ).getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        elementTop = targetRect.top - containerRect.top + scrollTop;
      }

      if (scrollPosition >= elementTop) {
        current = id;
      }
    }
  });

  tocLinks.forEach((link) => {
    link.classList.toggle(
      "active",
      link.getAttribute("href") === `#${current}`,
    );
  });
}

export function scrollToHeading(id: string, smooth = true): void {
  const target = document.getElementById(id);
  if (!target) return;

  const scrollContainer = getScrollContainer();
  const headerHeight = getHeaderHeight();

  if (scrollContainer === window) {
    const targetPosition =
      target.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - headerHeight - 10;
    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: smooth ? "smooth" : "auto",
    });
  } else {
    const containerRect = (
      scrollContainer as HTMLElement
    ).getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollTop = (scrollContainer as HTMLElement).scrollTop;
    const offsetPosition = targetRect.top - containerRect.top + scrollTop - 10;

    (scrollContainer as HTMLElement).scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: smooth ? "smooth" : "auto",
    });
  }

  // Update URL without triggering scroll
  setTimeout(() => {
    history.pushState(null, "", `#${id}`);
  }, 100);
}

export function initializeTableOfContents(): void {
  // Setup smooth scroll for TOC links
  document.querySelectorAll<HTMLAnchorElement>(".toc-link").forEach((link) => {
    if (link.dataset.initialized) return;
    link.dataset.initialized = "true";

    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      e.preventDefault();
      const id = href.substring(1);
      scrollToHeading(id);
    });
  });

  // Throttle scroll events
  let ticking = false;
  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateActiveTOC();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });

  // Initial update
  updateActiveTOC();
}
