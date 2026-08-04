// Alpine component para el sidebar. Lee items de window.NAV_ITEMS
// (definido en navigation.js, cargado antes que este script).
function sidebar() {
  return {
    open: false,
    items: window.NAV_ITEMS || [],
    active(item) {
      return location.pathname + location.hash === item.href;
    },
    close() {
      this.open = false;
    },
  };
}
