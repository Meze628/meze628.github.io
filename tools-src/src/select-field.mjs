export function mountSelectFields(root, signal) {
  const on = (target, event, callback, options = {}) => target?.addEventListener(event, callback, {...options, signal});
  const fields = [...root.querySelectorAll('[data-select-field]')].map(field => {
    const select = field.querySelector('select');
    const trigger = field.querySelector('.tool-select-trigger');
    const menu = field.querySelector('.tool-select-menu');
    const options = [...menu.querySelectorAll('[data-select-option]')];
    const popover = typeof menu.showPopover === 'function';
    if (!popover) {menu.removeAttribute('popover');root.append(menu);}
    return {field, select, trigger, menu, options, popover};
  });
  let active = null;

  function position() {
    if (!active) return;
    const {trigger, menu} = active;
    const rect = trigger.getBoundingClientRect();
    if (!rect.width || !rect.height) {close();return;}
    const width = Math.min(rect.width, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const desired = Math.min(menu.scrollHeight, 224);
    const upwards = below < desired && above > below;
    const height = Math.max(34, Math.min(desired, upwards ? above : below));
    menu.style.width = `${width}px`;
    menu.style.maxHeight = `${height}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    menu.style.top = `${upwards ? Math.max(8, rect.top - height - 6) : rect.bottom + 6}px`;
  }
  function highlight(index) {
    if (!active) return;
    active.index = index;
    active.options.forEach((option, current) => option.classList.toggle('is-highlighted', current === index));
    const option = active.options[index];
    active.trigger.setAttribute('aria-activedescendant', option.id);
    option.scrollIntoView({block:'nearest'});
  }
  function close(focus = false) {
    if (!active) return;
    const current = active;active = null;
    if (current.popover && current.menu.matches(':popover-open')) current.menu.hidePopover();
    current.menu.hidden = true;
    current.trigger.setAttribute('aria-expanded', 'false');
    current.trigger.removeAttribute('aria-activedescendant');
    current.options.forEach(option => option.classList.remove('is-highlighted'));
    if (focus) current.trigger.focus({preventScroll:true});
  }
  function open(current, index = current.select.selectedIndex) {
    close();active = {...current, index, search:'', typedAt:0};
    current.menu.hidden = false;
    if (current.popover) current.menu.showPopover();
    current.trigger.setAttribute('aria-expanded', 'true');
    position();highlight(Math.max(0, index));
  }
  function choose(index) {
    const current = active;
    if (!current) return;
    current.select.value = current.options[index].dataset.selectOption;
    current.select.dispatchEvent(new Event('change', {bubbles:true}));
    close(true);
  }
  function sync() {
    for (const current of fields) {
      current.trigger.querySelector('[data-select-value]').textContent = current.select.selectedOptions[0]?.textContent || '';
      current.options.forEach(option => option.setAttribute('aria-selected', String(option.dataset.selectOption === current.select.value)));
    }
  }
  for (const current of fields) {
    on(current.trigger, 'click', () => active?.trigger === current.trigger ? close() : open(current));
    current.options.forEach((option, index) => {
      on(option, 'pointerdown', event => event.preventDefault());
      on(option, 'click', () => choose(index));
      on(option, 'pointermove', () => {if (active?.menu === current.menu) highlight(index);});
    });
    on(current.trigger, 'keydown', event => {
      const isOpen = active?.trigger === current.trigger;
      if (event.key === 'Escape' && isOpen) {event.preventDefault();event.stopPropagation();close(true);return;}
      if (event.key === 'Tab') {if (isOpen) close();return;}
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        if (!isOpen) {open(current, event.key === 'Home' ? 0 : event.key === 'End' ? current.options.length - 1 : current.select.selectedIndex);return;}
        if (event.key === 'Enter' || event.key === ' ') {choose(active.index);return;}
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? current.options.length - 1 : (active.index + (event.key === 'ArrowDown' ? 1 : -1) + current.options.length) % current.options.length;
        highlight(index);return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (!isOpen) open(current);
        const now = Date.now();
        active.search = (now - active.typedAt < 700 ? active.search : '') + event.key.toLocaleLowerCase();
        active.typedAt = now;
        const index = current.options.findIndex(option => option.textContent.trim().toLocaleLowerCase().startsWith(active.search));
        if (index >= 0) highlight(index);
      }
    });
  }
  on(document, 'pointerdown', event => {if (active && !active.field.contains(event.target) && !active.menu.contains(event.target)) close();});
  on(document, 'focusin', event => {if (active && !active.field.contains(event.target) && !active.menu.contains(event.target)) close();});
  on(document, 'scroll', position, {capture:true});
  on(window, 'resize', position);
  on(window.visualViewport, 'resize', position);
  sync();
  return {sync, close};
}
