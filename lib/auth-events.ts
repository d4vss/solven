import mitt from "mitt";

type AuthEvents = {
  changed: undefined;
};

const authEvents = mitt<AuthEvents>();

export function emitAuthChanged() {
  authEvents.emit("changed");
}

export function onAuthChanged(handler: () => void) {
  authEvents.on("changed", handler);
  return () => authEvents.off("changed", handler);
}
