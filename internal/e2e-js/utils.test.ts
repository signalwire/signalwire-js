import { verifyWsTraffic } from "./utils"

describe('utils.ts', () => {
    describe('assertWsTraffic', () => {
        it('Should PASS, all expected messages exists', () => {
            expect(verifyWsTraffic([
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
                {type: 'recv', payload: {jsonRPC: '2.0', result: 'ok', status: 200  } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'jsonRPC': '2.0',
                    'method':  'testRequest',
                    'params.p1': 'p1',
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.n1': 1,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expect: {
                    'jsonRPC': '2.0',
                    'result':  'ok',
                    'status': 200 }
                }
            ]
        )).toEqual('')
        })

        it('Should PASS, all expected messages exists (partial payload check)', () => {
            expect(verifyWsTraffic([
                {type: 'recv', payload: {jsonRPC: '2.0', result: 'ok', status: 200  } },
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expect: {
                    'status': 200 }
                }
            ]
        )).toEqual('')
        })

        it('Should PASS, all expected messages exists (in any order)', () => {
            expect(verifyWsTraffic([
                {type: 'recv', payload: {jsonRPC: '2.0', result: 'ok', status: 200  } },
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'jsonRPC': '2.0',
                    'method':  'testRequest',
                    'params.p1': 'p1',
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.n1': 1,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expect: {
                    'jsonRPC': '2.0',
                    'result':  'ok',
                    'status': 200 }
                }
            ]
        )).toEqual('')
        })

        it('Should FAIL, all expected messages exists not not in order and options.ordered == true', () => {
            expect(verifyWsTraffic([
                {type: 'recv', payload: {jsonRPC: '2.0', result: 'ok', status: 200  } },
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'jsonRPC': '2.0',
                    'method':  'testRequest',
                    'params.p1': 'p1',
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.n1': 1,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expect: {
                    'jsonRPC': '2.0',
                    'result':  'ok',
                    'status': 200 }
                }
            ],
            {ordered: true}
        )).toEqual('request failed, response failed')
        })

        it('Should FAIL, expected messages greatter then existing messages', () => {
            expect(verifyWsTraffic([
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'jsonRPC': '2.0',
                    'method':  'testRequest',
                    'params.p1': 'p1',
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.n1': 1,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expect: {
                    'jsonRPC': '2.0',
                    'result':  'ok',
                    'status': 200 }
                }
            ],
            {ordered: true}
        )).toEqual('traffic < tests')
        })

        it('Should PASS, all expected messages exists (ignore not expected)', () => {
            expect(verifyWsTraffic([
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'jsonRPC': '2.0',
                    'method':  'testRequest',
                    'params.p1': 'p1',
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.n1': 1,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expectNot: {
                    'jsonRPC': '2.0',
                    'result':  'ok',
                    'status': 200 }
                }
            ],
            {ordered: true}
        )).toEqual('')
        })

        

        it('Should FAIL, not all expected messages exists', () => {
            expect( verifyWsTraffic([
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
                {type: 'recv', payload: {jsonRPC: '2.0', result: 'ok', status: 200  } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'jsonRPC': '2.0',
                    'method':  'testRequest',
                    'params.p1': 'p1',
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.n1': 1,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expect: {
                    'jsonRPC': '2.0',
                    'result':  'error',
                    'status': 500 }
                }
            ]
        )).toEqual('response failed')
        })
        
        it('Should FAIL, traffic not expected', () => {
            expect(verifyWsTraffic([
                {type: 'send', payload: {jsonRPC: '2.0', method: 'testRequest', params: {p1: 'p1', p2: 'acb-xyz', n1: 1, obj1: {name: 'obje1'} } } },
                {type: 'recv', payload: {jsonRPC: '2.0', result: 'ok', status: 200  } },
            ],
            [
                { type: 'send', name: 'request', expect: {
                    'jsonRPC': '2.0',
                    'method':  'testRequest',
                    'params.p1': 'p1',
                    'params.p2': /^[a-z]{3}\-[a-z]{3}$/,
                    'params.n1': 1,
                    'params.obj1': {name: 'obje1'} } 
                },
                { type: 'recv', name: 'response', expectNot: {
                    'jsonRPC': '2.0',
                    'result':  'ok',
                    'status': 200 }
                }
            ]
            
        )).toEqual('response failed')
        })
    })

    
})