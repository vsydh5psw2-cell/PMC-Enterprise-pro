export type Channel = {
  id: string
  name: string
  nameAr: string
  category: string
  categoryAr: string
  color: string
  /** Public demo HLS — licensed sample content only */
  streamUrl: string
  description: string
}

/** Demo catalog using public test streams (not live TV). */
export const channels: Channel[] = [
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
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
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
  {
    id: 'demo-5',
    name: 'Kayla News',
    nameAr: 'كايلا أخبار',
    category: 'News',
    categoryAr: 'أخبار',
    color: '#6b7fd7',
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    description: 'نشرة تجريبية',
  },
  {
    id: 'demo-6',
    name: 'Kayla Kids',
    nameAr: 'كايلا أطفال',
    category: 'Kids',
    categoryAr: 'أطفال',
    color: '#d4a017',
    streamUrl:
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    description: 'محتوى أطفال تجريبي',
  },
  {
    id: 'demo-7',
    name: 'Kayla Music',
    nameAr: 'كايلا موسيقى',
    category: 'Music',
    categoryAr: 'موسيقى',
    color: '#9b59b6',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'موسيقى تجريبية',
  },
  {
    id: 'demo-8',
    name: 'Kayla Docs',
    nameAr: 'كايلا وثائقي',
    category: 'Docs',
    categoryAr: 'وثائقي',
    color: '#1abc9c',
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    description: 'وثائقي تجريبي',
  },
]

export const categories = [
  { id: 'all', label: 'All', labelAr: 'الكل' },
  { id: 'Demo', label: 'Demo', labelAr: 'تجريبي' },
  { id: 'Movies', label: 'Movies', labelAr: 'أفلام' },
  { id: 'Sports', label: 'Sports', labelAr: 'رياضة' },
  { id: 'News', label: 'News', labelAr: 'أخبار' },
  { id: 'Kids', label: 'Kids', labelAr: 'أطفال' },
  { id: 'Music', label: 'Music', labelAr: 'موسيقى' },
  { id: 'Docs', label: 'Docs', labelAr: 'وثائقي' },
]
