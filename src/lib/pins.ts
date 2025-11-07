export type Pin = {
  id: string
  label: string
  lat: number
  lon: number
  href: string
  color?: string
}

export const pins: Pin[] = [
  { id: 'projects', label: 'Projects', lat: 0, lon: 20, href: '/#projects', color: '#FF0000' },   // red
  { id: 'experience', label: 'Experience', lat: 35, lon: -60, href: '/#experience', color: '#00FF40' }, // lime
  { id: 'skills', label: 'Skills', lat: -5, lon: 110, href: '/#skills', color: '#008CFF' }, // electric blue
  { id: 'about', label: 'About', lat: 50, lon: 140, href: '/#about', color: '#B400FF' }, // vivid purple
  { id: 'contact', label: 'Contact', lat: -30, lon: -120, href: '/#contact', color: '#FFD500' } // neon yellow
]
