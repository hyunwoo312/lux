(function () {
  try {
    var mode = localStorage.getItem("lux.theme");
    if (mode !== "light" && mode !== "dark" && mode !== "system") mode = "dark";
    var dark =
      mode === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : mode === "dark";
    document.documentElement.classList.toggle("dark", dark);
    var accent = localStorage.getItem("lux.accent");
    if (accent && /^[a-z]+$/.test(accent)) {
      document.documentElement.classList.add("accent-" + accent);
    }
  } catch (error) {
    void error;
  }
})();
