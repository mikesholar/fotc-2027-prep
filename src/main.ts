import "./styles.css";
import { startApp } from "./ui/app";

const mount = document.querySelector<HTMLDivElement>("#app");
if (mount) startApp(mount);
