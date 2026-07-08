export function dvalue(mx: number): number {
  mx = Math.max(Math.round(mx), 1)
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % mx) + 1
}

export function d10(): number {
  return dvalue(10)
}

export function d20(): number {
  return dvalue(20)
}

export function toMod(mod: number): string {
  return `${mod > 0 ? '+' : ''}${mod == 0 ? '' : mod}`
}

export function toAdvantage(mod: number): string {
  return `${mod > 0 ? '+' : ''}${mod == 0 ? '' : mod} ${mod > 0 ? '优势' : '劣势'}`
}

export function valueToColor(val: number): string {
  if (val == 0) {
    return 'black'
  } else if (val > 0) {
    return 'crimson'
  } else {
    return 'dodgerblue'
  }
}

export function valueToColorBinary(val: number): string {
  if (val == 0) {
    return 'lightgray'
  } else {
    return 'black'
  }
}

export function stringHP(hp: number[], maxhp: number): string {
  return `${hp[0]}${hp[1] > 0 ? '+' + String(hp[1]) : ''}/${maxhp}`
}

export function autoResize(el: HTMLTextAreaElement): void {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 4 + 'px'
}
