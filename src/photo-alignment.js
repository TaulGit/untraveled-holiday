import { Vector3, MathUtils } from 'three';

/** Screen-space error makes near and distant architectural edges agree. */
export function assessAlignment(camera, captureCamera, marks, width, height, wasReady = false) {
  camera.updateMatrixWorld(true);
  captureCamera.updateMatrixWorld(true);
  let squaredError = 0;
  for (const coordinates of marks) {
    const mark = new Vector3(...coordinates);
    const photographed = mark.clone().project(captureCamera);
    const live = mark.clone().project(camera);
    if (live.z >= 1 || live.z <= -1) { squaredError = Infinity; break; }
    const dx = (live.x - photographed.x) * width * 0.5;
    const dy = (live.y - photographed.y) * height * 0.5;
    squaredError += dx * dx + dy * dy;
  }
  const error = Math.sqrt(squaredError / marks.length);
  // The camera has a fixed vertical FOV: pixel error scales with viewport height,
  // including portrait screens where width would make matching too strict.
  const tolerance = Math.max(32, height * 0.075);
  const ready = error <= tolerance * (wasReady ? 1.2 : 1);
  const progress = ready ? 1 : MathUtils.clamp(1 - (error - tolerance) / (tolerance * 4), 0, 1);
  return { error, tolerance, ready, progress };
}
