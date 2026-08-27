import type { Ramp, RampAxis, RampCurve, RampParam, RampTrack, ShapeDef } from "bitshaper";

/** Options accepted by {@link buildRampPanel}. */
export interface RampPanelOptions {
  /** Called on every edit with the new ramp, or `undefined` when no tracks remain. */
  readonly onChange: (ramp: Ramp | undefined) => void;
}

/** Handle returned by {@link buildRampPanel}. */
export interface RampPanelHandle {
  readonly element: HTMLElement;
  /** Repopulates the panel from a shape's ramp, or resets it when there is none. */
  setFromShape(shape: ShapeDef): void;
  /** The ramp the panel currently represents, or `undefined` when it has no tracks. */
  currentRamp(): Ramp | undefined;
}

/** Quantization grid, mirroring `bitshaper`'s ramp codec (index 0-61, 31 = identity). */
const IDENTITY_INDEX = 31;
const SCALE_STEPS = 31;
const ANGLE_HALF_RANGE_DEG = 90;

const AXES: ReadonlyArray<{ readonly value: RampAxis; readonly label: string }> = [
  { value: "column", label: "left → right" },
  { value: "row", label: "top → bottom" },
  { value: "diagonal", label: "diagonal" },
  { value: "radial", label: "from centre" },
];
const CURVES: ReadonlyArray<{ readonly value: RampCurve; readonly label: string }> = [
  { value: "linear", label: "linear" },
  { value: "easeIn", label: "ease in" },
  { value: "easeOut", label: "ease out" },
  { value: "easeInOut", label: "ease in-out" },
  { value: "symmetric", label: "centre peak" },
];
const PARAMS: ReadonlyArray<{ readonly value: RampParam; readonly label: string }> = [
  { value: "scale", label: "scale" },
  { value: "scaleX", label: "scale X" },
  { value: "scaleY", label: "scale Y" },
  { value: "angle", label: "angle" },
];

function isScaleParam(param: RampParam): boolean {
  return param === "scale" || param === "scaleX" || param === "scaleY";
}

function indexToValue(param: RampParam, index: number): number {
  return isScaleParam(param)
    ? index / SCALE_STEPS
    : ((index - IDENTITY_INDEX) * ANGLE_HALF_RANGE_DEG) / SCALE_STEPS;
}

function valueToIndex(param: RampParam, value: number): number {
  const raw = isScaleParam(param)
    ? Math.round(value * SCALE_STEPS)
    : Math.round((value * SCALE_STEPS) / ANGLE_HALF_RANGE_DEG + IDENTITY_INDEX);
  return Math.min(61, Math.max(0, raw));
}

function formatValue(param: RampParam, index: number): string {
  const value = indexToValue(param, index);
  return isScaleParam(param) ? value.toFixed(2) : `${Math.round(value)}°`;
}

interface TrackState {
  param: RampParam;
  fromIndex: number;
  toIndex: number;
}

/**
 * Builds the collapsible "Morph" panel that authors a shape's ramp modifier.
 * The panel operates directly on the ID format's quantization grid (each
 * slider position is a base62 index), so the value it shows is exactly the
 * value the shape ID encodes.
 */
export function buildRampPanel(container: HTMLElement, opts: RampPanelOptions): RampPanelHandle {
  let axis: RampAxis = "column";
  let curve: RampCurve = "linear";
  let tracks: TrackState[] = [];

  const details = document.createElement("details");
  details.className = "morph-panel";
  const summary = document.createElement("summary");
  summary.textContent = "Morph";
  details.appendChild(summary);

  const controls = document.createElement("div");
  controls.className = "morph-controls";
  const axisSelect = buildSelect("Direction", AXES);
  const curveSelect = buildSelect("Curve", CURVES);
  controls.appendChild(axisSelect.label);
  controls.appendChild(curveSelect.label);
  details.appendChild(controls);

  const trackList = document.createElement("div");
  trackList.className = "morph-tracks";
  details.appendChild(trackList);

  const footer = document.createElement("div");
  footer.className = "morph-footer";
  const addSelect = document.createElement("select");
  addSelect.className = "morph-add";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "morph-remove";
  removeButton.textContent = "Remove morph";
  footer.appendChild(addSelect);
  footer.appendChild(removeButton);
  details.appendChild(footer);

  container.appendChild(details);

  function currentRamp(): Ramp | undefined {
    if (tracks.length === 0) {
      return undefined;
    }
    const rampTracks: RampTrack[] = tracks.map((track) => ({
      param: track.param,
      from: indexToValue(track.param, track.fromIndex),
      to: indexToValue(track.param, track.toIndex),
    }));
    return { axis, curve, tracks: rampTracks };
  }

  function emit(): void {
    opts.onChange(currentRamp());
  }

  function usableAddParams(): RampParam[] {
    const used = new Set(tracks.map((t) => t.param));
    const hasScale = used.has("scale");
    const hasScaleAxis = used.has("scaleX") || used.has("scaleY");
    return PARAMS.map((p) => p.value).filter((param) => {
      if (used.has(param)) return false;
      if (param === "scale" && hasScaleAxis) return false;
      if ((param === "scaleX" || param === "scaleY") && hasScale) return false;
      return true;
    });
  }

  function refreshAddSelect(): void {
    const options = usableAddParams();
    addSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = options.length > 0 ? "+ add…" : "+ add (all in use)";
    placeholder.disabled = true;
    placeholder.selected = true;
    addSelect.appendChild(placeholder);
    for (const param of options) {
      const option = document.createElement("option");
      option.value = param;
      option.textContent = `+ ${PARAMS.find((p) => p.value === param)?.label ?? param}`;
      addSelect.appendChild(option);
    }
    addSelect.disabled = options.length === 0;
  }

  function renderTracks(): void {
    trackList.innerHTML = "";
    tracks.forEach((track, trackIndex) => {
      const row = document.createElement("div");
      row.className = "morph-track";

      const name = document.createElement("span");
      name.className = "morph-track-name";
      name.textContent = PARAMS.find((p) => p.value === track.param)?.label ?? track.param;
      row.appendChild(name);

      const makeSlider = (which: "fromIndex" | "toIndex"): HTMLElement => {
        const wrap = document.createElement("span");
        wrap.className = "morph-slider";
        const input = document.createElement("input");
        input.type = "range";
        input.min = "0";
        input.max = "61";
        input.step = "1";
        input.value = String(track[which]);
        const readout = document.createElement("span");
        readout.className = "morph-readout";
        readout.textContent = formatValue(track.param, track[which]);
        input.addEventListener("input", () => {
          track[which] = Number(input.value);
          readout.textContent = formatValue(track.param, track[which]);
          emit();
        });
        wrap.appendChild(input);
        wrap.appendChild(readout);
        return wrap;
      };
      row.appendChild(makeSlider("fromIndex"));
      row.appendChild(makeSlider("toIndex"));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "morph-track-remove";
      remove.setAttribute("aria-label", `Remove ${track.param} track`);
      remove.textContent = "✕";
      remove.addEventListener("click", () => {
        tracks.splice(trackIndex, 1);
        renderTracks();
        refreshAddSelect();
        emit();
      });
      row.appendChild(remove);

      trackList.appendChild(row);
    });
  }

  axisSelect.select.addEventListener("change", () => {
    axis = axisSelect.select.value as RampAxis;
    emit();
  });
  curveSelect.select.addEventListener("change", () => {
    curve = curveSelect.select.value as RampCurve;
    emit();
  });
  addSelect.addEventListener("change", () => {
    const param = addSelect.value as RampParam;
    if (!param) return;
    tracks.push({ param, fromIndex: IDENTITY_INDEX, toIndex: IDENTITY_INDEX });
    renderTracks();
    refreshAddSelect();
    emit();
  });
  removeButton.addEventListener("click", () => {
    tracks = [];
    details.open = false;
    renderTracks();
    refreshAddSelect();
    emit();
  });

  refreshAddSelect();

  return {
    element: details,
    currentRamp,
    setFromShape(shape: ShapeDef): void {
      const ramp = shape.ramp;
      if (ramp) {
        axis = ramp.axis;
        curve = ramp.curve;
        axisSelect.select.value = ramp.axis;
        curveSelect.select.value = ramp.curve;
        tracks = ramp.tracks.map((track) => ({
          param: track.param,
          fromIndex: valueToIndex(track.param, track.from),
          toIndex: valueToIndex(track.param, track.to),
        }));
        details.open = true;
      } else {
        tracks = [];
        details.open = false;
      }
      renderTracks();
      refreshAddSelect();
    },
  };
}

function buildSelect<T extends string>(
  labelText: string,
  options: ReadonlyArray<{ readonly value: T; readonly label: string }>,
): { readonly label: HTMLLabelElement; readonly select: HTMLSelectElement } {
  const label = document.createElement("label");
  label.className = "morph-select";
  label.append(labelText);
  const select = document.createElement("select");
  for (const option of options) {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  }
  label.appendChild(select);
  return { label, select };
}
