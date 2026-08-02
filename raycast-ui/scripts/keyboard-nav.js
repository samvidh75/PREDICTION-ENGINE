(function () {
  const input = document.getElementById("command-input");
  const list = document.getElementById("result-list");
  const items = Array.from(list.querySelectorAll(".result-item"));
  let selected = 0;

  list.setAttribute("role", "listbox");
  items.forEach((item) => item.setAttribute("role", "option"));

  function render() {
    items.forEach((item, i) => {
      const isSelected = i === selected;
      item.dataset.selected = isSelected ? "true" : "false";
      item.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
    items[selected].scrollIntoView({ block: "nearest" });
  }

  function move(delta) {
    selected = (selected + delta + items.length) % items.length;
    render();
    items[selected].focus({ preventScroll: true });
  }

  function activate(index) {
    // Placeholder for the real command dispatch — visually confirms the
    // row was actioned so ⌘D/⌘N/↵ hints aren't dead-ends in the demo.
    const item = items[index];
    item.animate(
      [
        { backgroundColor: "rgba(244,244,245,0.12)" },
        { backgroundColor: "" },
      ],
      { duration: 220, easing: "ease-out" }
    );
  }

  function focusCommandInput() {
    input.focus();
    input.select();
  }

  items.forEach((item, i) => {
    item.addEventListener("mouseenter", () => {
      selected = i;
      render();
    });
    item.addEventListener("click", () => {
      selected = i;
      render();
      activate(i);
    });
    // Native Tab focus should track the same selection state as
    // arrow-key navigation — otherwise two rows can look "active" at once.
    item.addEventListener("focus", () => {
      selected = i;
      render();
    });
  });

  document.addEventListener("keydown", (e) => {
    const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";

    if (isCmdK) {
      e.preventDefault();
      focusCommandInput();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      if (document.activeElement !== input) {
        e.preventDefault();
        activate(selected);
      }
    } else if (e.key === "Escape") {
      input.blur();
    }
  });

  render();
  focusCommandInput();
})();
