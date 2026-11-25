/**
 * The `facing` angle that turns a snowman standing at `from` to look at `to`.
 * Both are [x, z] positions on the ground. A snowman with facing 0 looks toward +Z.
 */
export function faceToward(from: [number, number], to: [number, number]) {
  return Math.atan2(to[0] - from[0], to[1] - from[1]);
}
