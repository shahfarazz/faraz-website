export type Vec3 = [number, number, number]

// lon, lat in degrees. Returns XYZ in Three.js world coords (y-up),
// with lon=0 at +Z (front), lon=90 at +X (right), lat=90 at +Y (north).
export function latLonToCartesian(radius: number, lat: number, lon: number): Vec3 {
  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180
  const x = radius * Math.sin(lonRad) * Math.cos(latRad)
  const y = radius * Math.sin(latRad)
  const z = radius * Math.cos(lonRad) * Math.cos(latRad)
  return [x, y, z]
}

