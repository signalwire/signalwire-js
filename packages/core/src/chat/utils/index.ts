export * from './toInternalChatChannels'

export const isValidChannels = (
  input: unknown
): input is string | string[] | undefined => {
  return (
    input === undefined || Array.isArray(input) || typeof input === 'string'
  )
}
