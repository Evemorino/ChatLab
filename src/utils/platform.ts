/**
 * 平台检测工具
 *
 * 通过编译时注入的常量区分运行环境：
 * - Electron: __IS_ELECTRON__ = true
 * - CLI Web:  false（默认，FetchAdapter）
 */

declare const __IS_ELECTRON__: boolean | undefined

export const IS_ELECTRON = typeof __IS_ELECTRON__ !== 'undefined' && __IS_ELECTRON__
