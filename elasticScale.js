const resolveGlobal = () => {
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return null;
};

let isAnimating = false;

const getGsap = () => {
  const root = resolveGlobal();
  if (!root) return null;
  return root.gsap || null;
};

const normalizeDuration = (duration) => {
  const value = Number(duration);
  return Number.isFinite(value) ? value : 0.6;
};

const done = (element, callback) => {
  if (element && element.style) element.style.willChange = "";
  isAnimating = false;
  if (typeof callback === "function") callback();
};

const fail = (callback) => {
  isAnimating = false;
  if (typeof callback === "function") callback(new Error("gsap_unavailable"));
};

const elasticScaleIn = (element, duration = 0.6, callback) => {
  if (isAnimating) return false;
  const gsap = getGsap();
  if (!gsap || typeof gsap.fromTo !== "function" || !element) {
    fail(callback);
    return false;
  }
  isAnimating = true;
  if (element.style) element.style.willChange = "transform, opacity";
  gsap.fromTo(
    element,
    { scale: 0, autoAlpha: 0, force3D: true },
    {
      scale: 1,
      autoAlpha: 1,
      force3D: true,
      duration: normalizeDuration(duration),
      ease: "elastic.out(1, 0.5)",
      onComplete: () => done(element, callback),
    }
  );
  return true;
};

const elasticScaleOut = (element, duration = 0.6, callback) => {
  if (isAnimating) return false;
  const gsap = getGsap();
  if (!gsap || typeof gsap.fromTo !== "function" || !element) {
    fail(callback);
    return false;
  }
  isAnimating = true;
  if (element.style) element.style.willChange = "transform, opacity";
  gsap.fromTo(
    element,
    { scale: 1, autoAlpha: 1, force3D: true },
    {
      scale: 0,
      autoAlpha: 0,
      force3D: true,
      duration: normalizeDuration(duration),
      ease: "elastic.in(1, 0.5)",
      onComplete: () => done(element, callback),
    }
  );
  return true;
};

const api = {
  elasticScaleIn,
  elasticScaleOut,
  getIsAnimating: () => isAnimating,
  resetIsAnimating: () => {
    isAnimating = false;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

const root = resolveGlobal();
if (root) {
  root.elasticScaleIn = elasticScaleIn;
  root.elasticScaleOut = elasticScaleOut;
}
