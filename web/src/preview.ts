import { RenderError, ShapeIdError, renderShape } from "bitshaper";

/** CSS class applied to the preview container when it is showing an error state. */
const ERROR_STATE_CLASS = "preview-error";

/**
 * Renders `shapeId` via `renderShape` and injects the resulting SVG markup
 * into `container`, replacing any prior content. On decode/render failure,
 * shows a visible error message in `container` instead of throwing or
 * leaving stale content.
 */
export function renderPreview(
  container: HTMLElement,
  shapeId: string,
  opts?: { readonly tile?: boolean },
): void {
  try {
    const svg = opts?.tile ? renderShape(shapeId, { tile: true }) : renderShape(shapeId);
    container.classList.remove(ERROR_STATE_CLASS);
    container.innerHTML = svg;
  } catch (error) {
    showPreviewError(container, describeRenderFailure(error));
  }
}

/** Shows a visible error message in `container` instead of a preview. */
export function showPreviewError(container: HTMLElement, message: string): void {
  container.classList.add(ERROR_STATE_CLASS);
  container.innerHTML = "";
  const errorEl = document.createElement("p");
  errorEl.className = "preview-error-message";
  errorEl.textContent = message;
  container.appendChild(errorEl);
}

/** Turns a `renderShape` failure into a user-facing message. */
function describeRenderFailure(error: unknown): string {
  if (error instanceof ShapeIdError || error instanceof RenderError) {
    return `Couldn't render this shape: ${error.message}`;
  }
  return "Couldn't render this shape.";
}
