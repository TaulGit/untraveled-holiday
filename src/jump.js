export function createJump() {
  let height = 0, velocity = 0;
  return {
    get height() { return height; },
    start() { if (height === 0 && velocity === 0) velocity = 4.2; },
    reset() { height = 0; velocity = 0; },
    update(dt) {
      const before = height;
      if (height > 0 || velocity > 0) {
        height = Math.max(0, height + velocity * dt - 6 * dt * dt);
        velocity -= 12 * dt;
        if (height === 0) velocity = 0;
      }
      return height - before;
    },
  };
}
