export type Route =
  | { name: "maxes" }
  | { name: "schedule" }
  | { name: "skills" }
  | { name: "day"; date: string };

export const parseRoute = (hash: string): Route | null => {
  const path = hash.replace(/^#/, "");
  if (path === "/maxes") return { name: "maxes" };
  if (path === "/schedule") return { name: "schedule" };
  if (path === "/skills") return { name: "skills" };
  const m = path.match(/^\/day\/(\d{4}-\d{2}-\d{2})$/);
  if (m) return { name: "day", date: m[1] };
  return null;
};

export const routeToHash = (route: Route): string => {
  if (route.name === "maxes") return "#/maxes";
  if (route.name === "schedule") return "#/schedule";
  if (route.name === "skills") return "#/skills";
  return `#/day/${route.date}`;
};

export const onRouteChange = (handler: () => void): void => {
  window.addEventListener("hashchange", handler);
};

export const navigate = (route: Route): void => {
  window.location.hash = routeToHash(route);
};
