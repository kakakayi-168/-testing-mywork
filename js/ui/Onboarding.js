/* =========================================================================
   js/ui/Onboarding.js  —  SHARED
   First-load overlay. Shows instructions, dismisses on tap OR auto-fades
   after options.onboardingDurationMs. Resolves a promise when gone so the
   app can start movement only after the user has acknowledged it.
   ========================================================================= */

export function runOnboarding(options) {
  return new Promise((resolve) => {
    const el = document.getElementById("onboarding");
    const btn = document.getElementById("onboarding-dismiss");
    el.classList.remove("hidden");

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.classList.add("fading");
      setTimeout(() => {
        el.classList.add("hidden");
        resolve();
      }, 600);
    };

    btn.addEventListener("click", finish, { once: true });
    // Auto-fade after the configured duration (brief: ~5s)
    setTimeout(finish, options.onboardingDurationMs);
  });
}
