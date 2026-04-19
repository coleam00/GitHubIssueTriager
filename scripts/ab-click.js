// Usage (from bash):
//   agent-browser eval "$(cat scripts/ab-click.js)" '"sync-btn"'
// Click a React button reliably by invoking its React fiber's onClick prop.
// Necessary because agent-browser's programmatic click does not reach React 19's
// delegated synthetic event system in App Router projects.
(function (testid) {
  const el = document.querySelector('[data-testid="' + testid + '"]');
  if (!el) return "not found";
  const propKey = Object.keys(el).find(k => k.startsWith("__reactProps"));
  if (!propKey) return "no react props (not hydrated)";
  const props = el[propKey];
  if (typeof props.onClick !== "function") return "no onClick";
  if (props.disabled) return "disabled";
  props.onClick({ preventDefault() {}, stopPropagation() {} });
  return "clicked";
})
