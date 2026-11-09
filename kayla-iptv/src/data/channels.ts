export type Channel = {
  id: string
  name: string
  nameAr: string
  category: string
  categoryAr: string
  color: string
  streamUrl: string
  description: string
  logo?: string
}

/** Demo catalog using public test streams (not live TV). */
export const demoChannels: Channel[] = [
  {
    id: 'demo-1',
    name: 'Kayla Demo 1',
    nameAr: 'كايلا تجريبي ١',
    category: 'Demo',
    categoryAr: 'تجريبي',
    color: '#2aa889',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'بث تجريبي عام (Mux test stream)',
  },
  {
    id: 'demo-2',
    name: 'Kayla Demo 2',
    nameAr: 'كايلا تجريبي ٢',
    category: 'Demo',
    categoryAr: 'تجريبي',
    color: '#3d7ea6',
    streamUrl:
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    description: 'بث تجريبي عام (Apple bipbop)',
  },
  {
    id: 'demo-3',
    name: 'Kayla Cinema',
    nameAr: 'كايلا سينما',
    category: 'Movies',
    categoryAr: 'أفلام',
    color: '#c4783a',
    streamUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    description: 'عرض سينمائي تجريبي',
  },
  {
    id: 'demo-4',
    name: 'Kayla Sports',
    nameAr: 'كايلا رياضة',
    category: 'Sports',
    categoryAr: 'رياضة',
    color: '#c44b4b',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'قناة رياضية تجريبية',
  },
]

/** @deprecated use demoChannels + playlist store */
export const channels = demoChannels

export const categories = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'Demo', label: 'Demo', labelAr: 'تجريبي' },
  { id: 'Movies', label: 'Movies', labelAr: 'أفلام' },
  { id: 'Sports', label: 'Sports', labelAr: 'رياضة' },
]
