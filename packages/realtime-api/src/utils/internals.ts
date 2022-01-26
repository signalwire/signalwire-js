import { configureStore, getEventEmitter, UserOptions } from '@signalwire/core'
import { Session } from '../Session'

export const setupInternals = (userOptions: {
  project: string
  token: string
  logLevel?: UserOptions['logLevel']
}) => {
  /**
   * The emitter will be used across the entire stack so no
   * need to type it here. Typings will be provided by each
   * constructor.
   */
  const emitter = getEventEmitter<any>()

  const baseOptions = {
    ...userOptions,
    emitter,
  }

  const store = configureStore({
    userOptions: baseOptions,
    SessionConstructor: Session,
  })

  return { store, emitter }
}

const getToken = (userToken?: string) => {
  // TODO: read from global store
  const token = userToken || process.env.SW_TOKEN

  if (!token) {
    // TODO: Add error message
    throw new Error('Missing `token`')
  }

  return token
}

const getProject = (userProject?: string) => {
  // TODO: read from global store
  const project = userProject || process.env.SW_PROJECT

  if (!project) {
    // TODO: Add error message
    throw new Error('Missing `project`')
  }

  return project
}

export const getCredentials = (options: {
  token?: string
  project?: string
}) => {
  const project = getProject(options.project)
  const token = getToken(options.token)

  return { project, token }
}
