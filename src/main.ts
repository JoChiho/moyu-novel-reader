import { createApp } from "vue";
import App from "./App.vue";
import SettingsWindowApp from "./SettingsWindowApp.vue";
import ShelfWindowApp from "./ShelfWindowApp.vue";
import NavigatorWindowApp from "./NavigatorWindowApp.vue";
import "./style.css";

function getWindowMode(): "reader" | "settings" | "shelf" | "navigator" {
  const hash = window.location.hash.replace("#", "").trim();
  if (hash === "settings") return "settings";
  if (hash === "shelf") return "shelf";
  if (hash === "navigator") return "navigator";
  return "reader";
}

const mode = getWindowMode();
if (mode !== "reader") {
  document.documentElement.classList.add("child-window");
} else {
  document.title = "";
}

const root =
  mode === "settings"
    ? SettingsWindowApp
    : mode === "shelf"
      ? ShelfWindowApp
      : mode === "navigator"
        ? NavigatorWindowApp
        : App;

createApp(root).mount("#app");