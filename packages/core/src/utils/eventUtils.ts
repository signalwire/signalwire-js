

export const stripNamespacePrefix = (
  event: string,
  namespace?: string
): string => {
  if (namespace && typeof namespace === 'string') {
    const regex = new RegExp(`^${namespace}\.`)
    return event.replace(regex, '')
  }
  const items = event.split('.')
  if (items.length > 1) {
    items.shift()
    return items.join('.')
  }
  return event
}
