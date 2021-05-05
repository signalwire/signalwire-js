export interface ConfigParamaters {
  projectId?: string
  projectToken?: string
  spaceHost?: string
}

export type ConfigOptions = Required<ConfigParamaters> & {
  authCreds: string
}

const DEFAULT_HOST = process.env.SPACE_HOST || 'dev.swire.io'
const baseUrl = `https://${DEFAULT_HOST}/api/`

type GetConfig = (options: ConfigParamaters) => ConfigOptions

export const getConfig: GetConfig = (options) => {
  const {
    projectId = process.env.PROJECT_ID,
    projectToken = process.env.PROJECT_TOKEN,
    spaceHost = baseUrl,
  } = options

  if (!projectId || !projectToken) {
    throw new TypeError('Missing required options')
  }

  const authCreds = `${projectId}:${projectToken}`

  return {
    projectId,
    projectToken,
    spaceHost,
    authCreds,
  }
}
