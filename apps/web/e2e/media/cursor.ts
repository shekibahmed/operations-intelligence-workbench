/**
 * Visible fake cursor for screen recordings (OIW-913). Playwright's video
 * capture does not draw the OS pointer, so a viewer would see clicks happen
 * with nothing moving. This script is injected into every page of the
 * recording context. The element is decorative: aria-hidden and
 * pointer-events none, so it can never intercept a click or reach assistive
 * technology. Its last position survives full-page navigations through
 * sessionStorage, which keeps the pointer from jumping back to a corner.
 */
export function installFakeCursor(): void {
  const KEY = "oiw-media-cursor";
  const ID = "oiw-media-cursor";
  type Point = { x: number; y: number };

  const read = (): Point | null => {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(KEY) ?? "null") as Point | null;
      return parsed !== null && Number.isFinite(parsed.x) && Number.isFinite(parsed.y) ? parsed : null;
    } catch {
      return null;
    }
  };
  const write = (point: Point): void => {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(point));
    } catch {
      // Storage unavailable: the pointer simply restarts from the last mouse event.
    }
  };

  const mount = (): void => {
    if (document.getElementById(ID) !== null) return;
    const cursor = document.createElement("div");
    cursor.id = ID;
    cursor.setAttribute("aria-hidden", "true");
    cursor.style.cssText =
      "position:fixed;left:0;top:0;width:30px;height:30px;margin:0;padding:0;pointer-events:none;z-index:2147483647;display:none;will-change:transform;";
    cursor.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">' +
      '<path d="M4 2.5v17l4.6-4.1 3 6.6 3-1.4-3-6.5H18.5z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cursor);

    let current: Point = read() ?? { x: -100, y: -100 };
    const place = (point: Point): void => {
      current = point;
      cursor.style.transform = `translate(${point.x - 4}px, ${point.y - 2}px)`;
      cursor.style.display = "block";
      write(point);
    };
    if (read() !== null) place(current);

    document.addEventListener("mousemove", (event) => place({ x: event.clientX, y: event.clientY }), true);
    document.addEventListener(
      "mousedown",
      (event) => {
        const ring = document.createElement("div");
        ring.setAttribute("aria-hidden", "true");
        ring.style.cssText = `position:fixed;left:${event.clientX - 22}px;top:${event.clientY - 22}px;width:44px;height:44px;border-radius:50%;border:3px solid #f59e0b;pointer-events:none;z-index:2147483646;`;
        document.documentElement.appendChild(ring);
        const animation = ring.animate(
          [
            { transform: "scale(0.3)", opacity: 0.95 },
            { transform: "scale(1.25)", opacity: 0 },
          ],
          { duration: 600, easing: "ease-out" },
        );
        animation.onfinish = () => ring.remove();
      },
      true,
    );

    // Eased glide used by the recorder. It moves only the picture of the
    // pointer; the real (invisible) mouse is then moved to the same spot.
    (window as unknown as { __oiwGlide: (x: number, y: number, ms: number) => Promise<void> }).__oiwGlide = (
      x,
      y,
      ms,
    ) =>
      new Promise<void>((resolve) => {
        const from = current;
        const started = performance.now();
        const tick = (now: number): void => {
          const t = Math.min(1, (now - started) / ms);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          place({ x: from.x + (x - from.x) * eased, y: from.y + (y - from.y) * eased });
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
  };

  if (document.documentElement !== null) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
}
