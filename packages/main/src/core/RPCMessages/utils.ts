export function toggleDeafMethod(is: boolean): 'call.undeaf' | 'call.deaf' {
  return is ? 'call.undeaf' : 'call.deaf';
}

export function toggleHandraiseMethod(is: boolean): 'call.lowerhand' | 'call.raisehand' {
  return is ? 'call.lowerhand' : 'call.raisehand';
}
