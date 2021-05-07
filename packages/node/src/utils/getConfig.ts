export interface ConfigParamaters {
  projectId?: string
  projectToken?: string
  spaceHost?: string
}

export type ConfigOptions = {
  projectId: string
  projectToken: string
  authCreds: string
  baseUrl: string
}

type GetConfig = (options?: ConfigParamaters) => ConfigOptions

const getBaseUrl = (spaceHost: string) => {
  return `https://${spaceHost}/api/`
}

export const getConfig: GetConfig = (options = {}) => {
  const {
    projectId = process.env.PROJECT_ID,
    projectToken = process.env.PROJECT_TOKEN,
    spaceHost = process.env.SPACE_HOST,
  } = options

  if (!projectId || !projectToken || !spaceHost) {
    throw new TypeError('Missing required options')
  }

  const authCreds = `${projectId}:${projectToken}`

  return {
    projectId,
    projectToken,
    baseUrl: getBaseUrl(spaceHost),
    authCreds,
  }
}
