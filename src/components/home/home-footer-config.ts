export type HomeFooterConfigSource = 'platform' | 'network'

export function resolveHomeFooterConfigSource(isElectron: boolean): HomeFooterConfigSource {
  return isElectron ? 'platform' : 'network'
}

export function filterHomeFooterLinks<T extends { id: string; action?: string }>(
  links: readonly T[],
  showChangelog: boolean
): T[] {
  if (showChangelog) return [...links]
  return links.filter((link) => link.id !== 'changelog' && link.action !== 'changelog')
}
