export type Language = 'en' | 'ar'

const messages = {
  en: {
    title: 'MARIA Flight Radar',
    liveTracker: 'Live tracker',
    airspace: 'Airspace',
    nearbyAircraft: 'Nearby aircraft',
    alerts: 'Flyby alerts',
    flybys: 'Predicted schedule',
    history: 'Recent signal',
    position: 'GPS telemetry',
    orientation: 'IMU telemetry',
    settings: 'Display settings',
    exportCsv: 'Export CSV',
    exportGeoJson: 'Export GeoJSON',
    copyLink: 'Copy share link',
  },
  ar: {
    title: 'رادار ماريا للطيران',
    liveTracker: 'تعقب مباشر',
    airspace: 'المجال الجوي',
    nearbyAircraft: 'الطائرات القريبة',
    alerts: 'تنبيهات التحليق',
    flybys: 'الجدول المتوقع',
    history: 'الإشارات الأخيرة',
    position: 'بيانات الموقع',
    orientation: 'بيانات الحركة',
    settings: 'إعدادات العرض',
    exportCsv: 'تصدير CSV',
    exportGeoJson: 'تصدير GeoJSON',
    copyLink: 'نسخ رابط المشاركة',
  },
} as const

export type MessageKey = keyof typeof messages.en

export function translate(language: Language, key: MessageKey) {
  return messages[language][key]
}
