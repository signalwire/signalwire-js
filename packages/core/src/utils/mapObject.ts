export interface MappableObject {
  type: string
  payload?: Record<string, object | string | boolean | number>
}

export function isMappableObject(obj: any): obj is MappableObject {
  return !!obj.type
}

export function mapObject(
  template: string,
  action: MappableObject
): MappableObject | undefined {
  // TODO better doc... test is a template ex: call.state.{call_state}
  const matches =
    /^(?<prefix>(\w|\.)*)(\[(?<stateKey>[^\(\)]*)(?<replace>\((?<from>(\w|\.)*):(?<to>\S*)\))?\]){0,1}(?<payloadMap>\{.*\}){0,1}/.exec(
      template
    )

  let result = {
    ...action,
    type: template,
  }

  if (matches?.groups && !!action.payload) {
    // is a template
    const { prefix, stateKey, replace, from, to } = matches.groups

    let newType
    if (!!replace) {
      newType = action.payload[stateKey] === from ? `${prefix}${to}` : undefined
    } else if (!!stateKey) {
      newType = !!action.payload[stateKey]
        ? `${prefix}${action.payload[stateKey]}`
        : undefined
    } else {
      newType = `${prefix}`
    }

    //@ts-ignore FIXME
    result = !!newType
      ? {
          ...action,
          type: newType,
        }
      : undefined
  }

  if (matches?.groups?.payloadMap) {
    // const { payloadMap: mapString } = matches.groups
    const { payload } = action
    // const payloadMap: Record<string, string> = JSON.parse(mapString)
    // const newContent = {}

    // Object.entries(payloadMap).forEach(([old_path, new_path]) => {
    //   const value = objectPath.get(payload as object, old_path)
    //   objectPath.del(payload as object, old_path)
    //   objectPath.set(newContent, new_path, value)
    // })
    // const newPayload = {
    //   ...payload,
    //   ...newContent,
    // }
    result = {
      ...result,
      //@ts-ignore
      payload,
    }
  }

  return result
}
