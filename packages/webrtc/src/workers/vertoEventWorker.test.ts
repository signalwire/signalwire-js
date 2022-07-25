import {
  testUtils,
  sagaHelpers,
  toInternalAction,
  actions,
  VertoPong,
  VertoResult,
} from '@signalwire/core'
import { expectSaga } from 'redux-saga-test-plan'
import { vertoEventWorker } from '.'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

const { createPubSubChannel, createSwEventChannel } = testUtils

describe('vertoEventWorker', () => {
  it('should handle verto.ping method', () => {
    let runSaga = true
    const session = {} as any
    const pubSubChannel = createPubSubChannel()
    const swEventChannel = createSwEventChannel()
    const sessionChannel = sagaHelpers.eventChannel(() => () => {})
    const dispatchedActions: unknown[] = []

    return expectSaga(vertoEventWorker, {
      // @ts-expect-error
      session,
      channels: {
        pubSubChannel,
        swEventChannel,
      },
      sessionChannel,
      instance: {
        options: {} as any,
        _attachListeners: () => {},
        applyEmitterTransforms: () => {},
      } as any,
    })
      .provide([
        {
          take({ channel }, next) {
            if (runSaga && channel === swEventChannel) {
              runSaga = false

              return toInternalAction({
                event_type: 'webrtc.message',
                event_channel: 'event_channel',
                timestamp: 1627374894.011822,
                project_id: 'project_id',
                node_id: 'node_id',
                params: {
                  jsonrpc: '2.0',
                  id: '40',
                  method: 'verto.ping',
                  params: {
                    dialogParams: {
                      callID: 'call-uuid',
                    },
                  },
                },
              })
            } else if (runSaga === false) {
              sessionChannel.close()
              pubSubChannel.close()
            }
            return next()
          },
          put(action, next) {
            dispatchedActions.push(action)
            return next()
          },
        },
      ])
      .put(
        actions.executeAction({
          method: 'video.message',
          params: {
            message: VertoPong({
              dialogParams: {
                callID: 'call-uuid',
              },
            }),
            node_id: 'node_id',
          },
        })
      )
      .silentRun()
      .finally(() => {
        expect(dispatchedActions).toHaveLength(1)
      })
  })

  describe('verto.media', () => {
    it('should handle verto.media for the active peer', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'active',
        onRemoteSdp: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1627374894.010822,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: '40',
                    method: 'verto.media',
                    params: {
                      callID: '66e4b610-8d26-4835-8bd8-7022a42ee9bc',
                      sdp: 'MEDIA-SDP',
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult('40', 'verto.media'),
              node_id: 'node_id',
            },
          })
        )
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledTimes(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledWith(
            '66e4b610-8d26-4835-8bd8-7022a42ee9bc'
          )
          expect(instance.setState).toHaveBeenCalledTimes(1)
          expect(instance.setState).toHaveBeenCalledWith('early')
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledTimes(1)
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledWith('MEDIA-SDP')
        })
    })

    it('should handle verto.media for a queued peer', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'mocked',
        onRemoteSdp: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1627374894.010822,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: '40',
                    method: 'verto.media',
                    params: {
                      callID: '66e4b610-8d26-4835-8bd8-7022a42ee9bc',
                      sdp: 'MEDIA-SDP',
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult('40', 'verto.media'),
              node_id: 'node_id',
            },
          })
        )
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledTimes(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledWith(
            '66e4b610-8d26-4835-8bd8-7022a42ee9bc'
          )
          expect(instance.setState).toHaveBeenCalledTimes(0)
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledTimes(1)
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledWith('MEDIA-SDP')
        })
    })
  })

  describe('verto.answer', () => {
    it('should handle verto.answer (without SDP) for the active peer', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'active',
        onRemoteSdp: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1627374894.010822,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: '40',
                    method: 'verto.answer',
                    params: {
                      callID: '66e4b610-8d26-4835-8bd8-7022a42ee9bc',
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult('40', 'verto.answer'),
              node_id: 'node_id',
            },
          })
        )
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledTimes(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledWith(
            '66e4b610-8d26-4835-8bd8-7022a42ee9bc'
          )
          expect(instance.setState).toHaveBeenCalledTimes(1)
          expect(instance.setState).toHaveBeenCalledWith('active')
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledTimes(0)
        })
    })

    it('should handle verto.answer (with valid SDP) for the active peer', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'active',
        onRemoteSdp: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1627374894.010822,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: '40',
                    method: 'verto.answer',
                    params: {
                      callID: '66e4b610-8d26-4835-8bd8-7022a42ee9bc',
                      sdp: 'MEDIA-SDP',
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult('40', 'verto.answer'),
              node_id: 'node_id',
            },
          })
        )
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledTimes(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledWith(
            '66e4b610-8d26-4835-8bd8-7022a42ee9bc'
          )
          expect(instance.setState).toHaveBeenCalledTimes(1)
          expect(instance.setState).toHaveBeenCalledWith('active')
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledTimes(1)
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledWith('MEDIA-SDP')
        })
    })

    it('should handle verto.answer (without SDP) for a queued peer', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'mocked',
        onRemoteSdp: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1627374894.010822,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: '40',
                    method: 'verto.answer',
                    params: {
                      callID: '66e4b610-8d26-4835-8bd8-7022a42ee9bc',
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult('40', 'verto.answer'),
              node_id: 'node_id',
            },
          })
        )
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledTimes(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledWith(
            '66e4b610-8d26-4835-8bd8-7022a42ee9bc'
          )
          expect(instance.setState).toHaveBeenCalledTimes(0)
          expect(mockPeer.onRemoteSdp).toHaveBeenCalledTimes(0)
        })
    })
  })

  describe('verto.bye', () => {
    it('should handle verto.bye for the active peer', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'active',
        onRemoteSdp: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        onVertoBye: jest.fn(),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1658741088.079189,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: '1907',
                    method: 'verto.bye',
                    params: {
                      callID: '42f4f654-64c6-40e1-b86d-50a73a8363b9',
                      causeCode: '88',
                      cause: 'INCOMPATIBLE_DESTINATION',
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(
          actions.executeAction({
            method: 'video.message',
            params: {
              message: VertoResult('1907', 'verto.bye'),
              node_id: 'node_id',
            },
          })
        )
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(1)
          expect(instance.onVertoBye).toHaveBeenCalledTimes(1)
          expect(instance.onVertoBye).toHaveBeenCalledWith({
            rtcPeerId: '42f4f654-64c6-40e1-b86d-50a73a8363b9',
            byeCause: 'INCOMPATIBLE_DESTINATION',
            byeCauseCode: '88',
            redirectDestination: undefined,
          })
        })
    })
  })

  describe('verto.mediaParams', () => {
    it('should handle verto.mediaParams with audio constraints', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'active',
        applyMediaConstraints: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1658740453.915021,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: 3600,
                    method: 'verto.mediaParams',
                    params: {
                      callID: '0d30dd2e-dbec-4daa-81cb-c34e322f50e6',
                      mediaParams: {
                        audio: {
                          autoGainControl: true,
                          echoCancellation: true,
                          noiseSuppression: true,
                        },
                      },
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(0)
          expect(instance.getRTCPeerById).toHaveBeenCalledTimes(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledWith(
            '0d30dd2e-dbec-4daa-81cb-c34e322f50e6'
          )
          expect(mockPeer.applyMediaConstraints).toHaveBeenCalledTimes(1)
          expect(mockPeer.applyMediaConstraints).toHaveBeenCalledWith('audio', {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          })
        })
    })

    it('should handle verto.mediaParams with video constraints', () => {
      let runSaga = true
      const session = {} as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = sagaHelpers.eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const mockPeer = {
        uuid: 'active',
        applyMediaConstraints: jest.fn(),
      }
      const instance = {
        peer: {
          uuid: 'active',
        },
        getRTCPeerById: jest.fn((_id: string) => mockPeer),
        setState: jest.fn(),
      } as any

      return expectSaga(vertoEventWorker, {
        // @ts-expect-error
        session,
        channels: {
          pubSubChannel,
          swEventChannel,
        },
        sessionChannel,
        instance,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === swEventChannel) {
                runSaga = false

                return toInternalAction({
                  event_type: 'webrtc.message',
                  event_channel: 'event_channel',
                  timestamp: 1658740453.915021,
                  project_id: 'project_id',
                  node_id: 'node_id',
                  params: {
                    jsonrpc: '2.0',
                    id: 3600,
                    method: 'verto.mediaParams',
                    params: {
                      callID: '0d30dd2e-dbec-4daa-81cb-c34e322f50e6',
                      mediaParams: {
                        video: {
                          frameRate: 30,
                          aspectRatio: 1.7777777910232544,
                          width: 1920,
                          height: 1080,
                        },
                      },
                    },
                  },
                })
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .silentRun()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(0)
          expect(instance.getRTCPeerById).toHaveBeenCalledTimes(1)
          expect(instance.getRTCPeerById).toHaveBeenCalledWith(
            '0d30dd2e-dbec-4daa-81cb-c34e322f50e6'
          )
          expect(mockPeer.applyMediaConstraints).toHaveBeenCalledTimes(1)
          expect(mockPeer.applyMediaConstraints).toHaveBeenCalledWith('video', {
            frameRate: 30,
            aspectRatio: 1.7777777910232544,
            width: 1920,
            height: 1080,
          })
        })
    })
  })
})
