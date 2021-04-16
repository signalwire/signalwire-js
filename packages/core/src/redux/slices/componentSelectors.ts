import { SDKState } from '../interfaces'

export const getComponentNodeId = (
  { components }: SDKState,
  componentId: string
) => {
  // @ts-expect-error
  return components?.[componentId]?.nodeId
}
