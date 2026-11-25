/** Keyboard and mouse state, read once per frame. Keys are KeyboardEvent.code values. */
export class Input {
  private readonly down = new Set<string>()
  private readonly pressedSet = new Set<string>()
  private readonly releasedSet = new Set<string>()
  dx = 0
  dy = 0
