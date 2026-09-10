// Elements carrying this attribute form one ordered chain: Enter focuses the next one in DOM order.
export const ENTER_NAV_ATTR = "data-enter-nav";

export const handleEnterNav = (e) => {
  if (e.key !== "Enter" || e.shiftKey) return;

  e.preventDefault();

  const form = e.target.closest("form");
  if (!form) return;

  const navigable = Array.from(
    form.querySelectorAll(`[${ENTER_NAV_ATTR}]`)
  ).filter((el) => !el.disabled && el.offsetParent !== null);

  const nextField = navigable[navigable.indexOf(e.target) + 1];
  if (nextField) {
    nextField.focus();
  }
};
