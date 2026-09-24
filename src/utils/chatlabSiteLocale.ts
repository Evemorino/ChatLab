const LOCALE_PATH_MAP: Record<string, string> = {
  'en-US': 'en',
  'zh-CN': 'cn',
  'zh-TW': 'tw',
  'ja-JP': 'ja',
}

export const CHATLAB_SITE_BASE = 'https://chatlab.fun'

/**
 * 将应用 locale 转为 chatlab.fun 站点的路径前缀。
 */
export function getChatlabSiteLocalePath(locale: string): string {
  return LOCALE_PATH_MAP[locale] ?? ''
}

/**
 * 官网跳转统一使用根路径，并通过 query 传递语言参数。
 * 例如：?lang=cn / ?lang=en
 */
export function getChatlabSiteLangQuery(locale: string): string {
  const lang = LOCALE_PATH_MAP[locale]
  return lang ? `?lang=${lang}` : ''
}
