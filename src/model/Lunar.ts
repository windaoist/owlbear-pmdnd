// https://github.com/samwyse/PyMoon/blob/master/moon.py
// moon.py, based on code by John Walker (http://www.fourmilab.ch/)
// ported to Python by Kevin Turner <acapnotic@twistedmatrix.com>
// on June 6, 2001 (JDN 2452066.52491), under a full moon.
//
// This program is in the public domain: "Do what thou wilt shall be
// the whole of the law".

// 从 Python 翻译到 TypeScript
// by 空探的凯特

import { Julian } from 'lunarphase-js' // 使用 lunarphase-js 的 Julian 模块进行日期转换

// --- 天文常数类 ---
class AstronomicalConstants {
  // 1980 January 0.0 in JDN (儒略日)
  static readonly epoch = 2444238.5

  // 基准日 1980.0 时太阳的黄经
  static readonly ecliptic_longitude_epoch = 278.83354

  // 近地点时太阳的黄经
  static readonly ecliptic_longitude_perigee = 282.596403

  // 地球轨道偏心率
  static readonly eccentricity = 0.016718

  // 地球轨道半长轴，单位公里
  static readonly sun_smaxis = 1.49585e8

  // 在半长轴距离处太阳的角直径（度）
  static readonly sun_angular_size_smaxis = 0.533128

  // 月球轨道元素，基准日 1980.0

  // 基准日时月球的平均黄经
  static readonly moon_mean_longitude_epoch = 64.975464

  // 基准日时近地点的平均黄经
  static readonly moon_mean_perigee_epoch = 349.383063

  // 基准日时升交点的平均黄经
  static readonly node_mean_longitude_epoch = 151.950429

  // 月球轨道倾角
  static readonly moon_inclination = 5.145396

  // 月球轨道偏心率
  static readonly moon_eccentricity = 0.0549

  // 距离 a 时月球的角直径（度）
  static readonly moon_angular_size = 0.5181

  // 月球轨道半长轴，单位公里
  static readonly moon_smaxis = 384401.0
  // 距离 a 时的视差
  static readonly moon_parallax = 0.9507

  // 朔望月（新月到新月），单位天
  static readonly synodic_month = 29.53058868

  // E. W. Brown 编号月球周期的基准日
  // (1923 January 16)
  static readonly lunations_base = 2423436.0

  // 地球属性
  static readonly earth_radius = 6378.16
}

const c = AstronomicalConstants

function fixangle(a: number): number {
  return a - 360.0 * Math.floor(a / 360.0)
}

function torad(d: number): number {
  return (d * Math.PI) / 180.0
}

function todeg(r: number): number {
  return (r * 180.0) / Math.PI
}

function dsin(d: number): number {
  return Math.sin(torad(d))
}

function dcos(d: number): number {
  return Math.cos(torad(d))
}

// --- 月相 ---
const PRECISION = 0.05
const NEW = 0 / 4.0
const FIRST = 1 / 4.0
const FULL = 2 / 4.0
const LAST = 3 / 4.0
const NEXTNEW = 4 / 4.0

function phaseString(p: number): string {
  const phaseStrings = [
    [NEW + PRECISION, 'new'],
    [FIRST - PRECISION, 'waxing crescent'],
    [FIRST + PRECISION, 'first quarter'],
    [FULL - PRECISION, 'waxing gibbous'],
    [FULL + PRECISION, 'full'],
    [LAST - PRECISION, 'waning gibbous'],
    [LAST + PRECISION, 'last quarter'],
    [NEXTNEW - PRECISION, 'waning crescent'],
    [NEXTNEW + PRECISION, 'new']
  ] as const // 使用 const 断言以保持精确的类型

  // 使用二分查找逻辑
  let i = 0
  let j = phaseStrings.length - 1
  while (i <= j) {
    const mid = Math.floor((i + j) / 2)
    if (p < phaseStrings[mid][0]) {
      j = mid - 1
    } else {
      i = mid + 1
    }
  }
  // i 现在是第一个大于 p 的元素的索引，所以返回 i-1
  return phaseStrings[i - 1][1]
}

// --- 计算月相 ---
interface PhaseResult {
  phase: number // 终端相位角作为完整圆周的百分比 (0 到 1)
  illuminated: number // 月球盘面被照亮的部分
  age: number // 月球的年龄（天数）
  distance: number // 月球到地球中心的距离
  angular_diameter: number // 从地球中心观察到的月球的角直径
  sun_distance: number // 日地距离
  sun_angular_diameter: number // 太阳的角直径
}

function phase(phaseDate: Date | number = new Date()): PhaseResult {
  let day: number
  if (typeof phaseDate === 'number') {
    // 假设输入是儒略日
    day = phaseDate - c.epoch
  } else {
    // 输入是 Date 对象
    const jdn = Julian.fromDate(phaseDate)
    day = jdn - c.epoch
  }

  // 太阳的平均近点角
  const N = fixangle((360 / 365.2422) * day)
  // 从近地点坐标转换到基准日 1980
  const M = fixangle(N + c.ecliptic_longitude_epoch - c.ecliptic_longitude_perigee)

  // 解开普勒方程
  const Ec = kepler(M, c.eccentricity)
  const Ec2 = Math.sqrt((1 + c.eccentricity) / (1 - c.eccentricity)) * Math.tan(Ec / 2.0)
  // 真近点角
  const Ec_true = 2 * todeg(Math.atan(Ec2))
  // 太阳的几何黄经
  const lambdaSun = fixangle(Ec_true + c.ecliptic_longitude_perigee)

  // 轨道距离因子
  const F = (1 + c.eccentricity * Math.cos(torad(Ec_true))) / (1 - c.eccentricity ** 2)

  // 到太阳的距离（公里）
  const sunDist = c.sun_smaxis / F
  const sunAngularDiameter = F * c.sun_angular_size_smaxis

  // 月球位置的计算

  // 月球的平均黄经
  const moonLongitude = fixangle(13.1763966 * day + c.moon_mean_longitude_epoch)

  // 月球的平均近点角
  const MM = fixangle(moonLongitude - 0.1114041 * day - c.moon_mean_perigee_epoch)

  // 月球升交点的平均黄经
  // const MN = fixangle(c.node_mean_longitude_epoch - 0.0529539 * day); // 未用于相位计算

  // 月球经度的二均差 (Evection)
  const evection = 1.2739 * Math.sin(torad(2 * (moonLongitude - lambdaSun) - MM))

  // 年方程 (Annual equation)
  const annualEq = 0.1858 * Math.sin(torad(M))

  // 修正项 A3
  const A3 = 0.37 * Math.sin(torad(M))

  // 修正后的月球近点角
  const MmP = MM + evection - annualEq - A3

  // 中心差方程的修正
  const mEc = 6.2886 * Math.sin(torad(MmP))

  // 另一个修正项 A4
  const A4 = 0.214 * Math.sin(torad(2 * MmP))

  // 修正后的黄经
  const lP = moonLongitude + evection + mEc - annualEq + A4

  // 月球经度的视差修正 (Variation)
  const variation = 0.6583 * Math.sin(torad(2 * (lP - lambdaSun)))

  // 真黄经
  const lPP = lP + variation

  // 月相的计算

  // 月球年龄（度）
  const moonAge = lPP - lambdaSun

  // 月相
  const moonPhase = (1 - Math.cos(torad(moonAge))) / 2.0

  // 计算月球到地球中心的距离
  const moonDist =
    (c.moon_smaxis * (1 - c.moon_eccentricity ** 2)) /
    (1 + c.moon_eccentricity * Math.cos(torad(MmP + mEc)))

  // 计算月球的角直径
  const moonDiamFrac = moonDist / c.moon_smaxis
  const moonAngularDiameter = c.moon_angular_size / moonDiamFrac

  // 计算月球的视差 (未使用)
  // const moonParallax = c.moon_parallax / moonDiamFrac;

  return {
    phase: fixangle(moonAge) / 360.0,
    illuminated: moonPhase,
    age: (c.synodic_month * fixangle(moonAge)) / 360.0,
    distance: moonDist,
    angular_diameter: moonAngularDiameter,
    sun_distance: sunDist,
    sun_angular_diameter: sunAngularDiameter
  }
}

// --- 解开普勒方程 ---
function kepler(m: number, ecc: number, epsilon: number = 1e-6): number {
  let e = (m = torad(m))
  let delta: number
  do {
    delta = e - ecc * Math.sin(e) - m
    e -= delta / (1.0 - ecc * Math.cos(e))
  } while (Math.abs(delta) > epsilon)
  return e
}

// --- 查找月相 ---
interface PhaseHuntResult {
  newDate: Date
  q1Date: Date
  fullDate: Date
  q3Date: Date
  nextNewDate: Date
}

function phaseHunt(sdate: Date | number = new Date()): PhaseHuntResult {
  let jdn: number
  if (typeof sdate === 'number') {
    jdn = sdate
  } else {
    jdn = Julian.fromDate(sdate)
  }

  let adate = jdn - 45 // 回溯 45 天开始搜索

  const year = new Date(Julian.toDate(adate)).getFullYear()
  const month = new Date(Julian.toDate(adate)).getMonth() + 1 // getMonth() 从 0 开始
  let k1 = Math.floor((year + (month - 1) * (1.0 / 12.0) - 1900) * 12.3685)

  let nt1 = meanphase(adate, k1)
  adate = nt1
  let k2 = 0

  while (true) {
    adate = adate + c.synodic_month
    k2 = k1 + 1
    const nt2 = meanphase(adate, k2)
    if (nt1 <= jdn && jdn < nt2) {
      break
    }
    nt1 = nt2
    k1 = k2
  }

  const phases = [
    truephase(k1, 0 / 4.0), // New
    truephase(k1, 1 / 4.0), // First Quarter
    truephase(k1, 2 / 4.0), // Full
    truephase(k1, 3 / 4.0), // Last Quarter
    truephase(k2, 0 / 4.0) // Next New
  ]

  return {
    newDate: phases[0],
    q1Date: phases[1],
    fullDate: phases[2],
    q3Date: phases[3],
    nextNewDate: phases[4]
  }
}

// --- 计算平均新月时间 ---
function meanphase(sdate: number, k: number): number {
  // 计算 sdate 相对于 1900-01-01 12:00:00 UTC 的儒略世纪数
  // 1900-01-01 12:00:00 UTC 的儒略日是 2415020.0
  const deltaT = sdate - 2415020.0
  const t = deltaT / 36525.0

  const t2 = t * t
  const t3 = t2 * t

  const nt1 =
    2415020.75933 +
    c.synodic_month * k +
    0.0001178 * t2 -
    0.000000155 * t3 +
    0.00033 * dsin(166.56 + 132.87 * t - 0.009173 * t2)

  return nt1
}

// --- 计算精确月相时间 ---
function truephase(k: number, tphase: number): Date {
  // 将相位选择器加到 k 值上
  const k_corr = k + tphase
  // 计算儒略世纪数 t
  const t = k_corr / 1236.85

  const t2 = t * t
  const t3 = t2 * t

  // 平均相位时间
  let pt =
    2415020.75933 +
    c.synodic_month * k_corr +
    0.0001178 * t2 -
    0.000000155 * t3 +
    0.00033 * dsin(166.56 + 132.87 * t - 0.009173 * t2)

  // 太阳的平均近点角
  const m = 359.2242 + 29.10535608 * k_corr - 0.0000333 * t2 - 0.00000347 * t3

  // 月球的平均近点角
  const mprime = 306.0253 + 385.81691806 * k_corr + 0.0107306 * t2 + 0.00001236 * t3

  // 月球的纬度参数 (Argument of latitude)
  const f = 21.2964 + 390.67050646 * k_corr - 0.0016528 * t2 - 0.00000239 * t3

  if (Math.abs(tphase) < 0.01 || Math.abs(tphase - 0.5) < 0.01) {
    // 新月和满月的修正
    pt +=
      (0.1734 - 0.000393 * t) * dsin(m) +
      0.0021 * dsin(2 * m) -
      0.4068 * dsin(mprime) +
      0.0161 * dsin(2 * mprime) -
      0.0004 * dsin(3 * mprime) +
      0.0104 * dsin(2 * f) -
      0.0051 * dsin(m + mprime) -
      0.0074 * dsin(m - mprime) +
      0.0004 * dsin(2 * f + m) -
      0.0004 * dsin(2 * f - m) -
      0.0006 * dsin(2 * f + mprime) +
      0.001 * dsin(2 * f - mprime) +
      0.0005 * dsin(m + 2 * mprime)
  } else if (Math.abs(tphase - 0.25) < 0.01 || Math.abs(tphase - 0.75) < 0.01) {
    // 上弦月和下弦月的修正
    pt +=
      (0.1721 - 0.0004 * t) * dsin(m) +
      0.0021 * dsin(2 * m) -
      0.628 * dsin(mprime) +
      0.0089 * dsin(2 * mprime) -
      0.0004 * dsin(3 * mprime) +
      0.0079 * dsin(2 * f) -
      0.0119 * dsin(m + mprime) -
      0.0047 * dsin(m - mprime) +
      0.0003 * dsin(2 * f + m) -
      0.0004 * dsin(2 * f - m) -
      0.0006 * dsin(2 * f + mprime) +
      0.0021 * dsin(2 * f - mprime) +
      0.0003 * dsin(m + 2 * mprime) +
      0.0004 * dsin(m - 2 * mprime) -
      0.0003 * dsin(2 * m + mprime)
    if (tphase < 0.5) {
      // 上弦月修正
      pt += 0.0028 - 0.0004 * dcos(m) + 0.0003 * dcos(mprime)
    } else {
      // 下弦月修正
      pt += -0.0028 + 0.0004 * dcos(m) - 0.0003 * dcos(mprime)
    }
  } else {
    throw new Error('TRUEPHASE called with invalid phase selector')
  }

  return Julian.toDate(pt)
}

// --- MoonPhase 类 ---
class MoonPhase {
  date: Date
  phase: number
  phase_text: string
  illuminated: number
  age: number
  distance: number
  angular_diameter: number
  sun_distance: number
  sun_angular_diameter: number

  private _calculatedPhases: PhaseHuntResult | null = null

  constructor(date: Date = new Date()) {
    this.date = date
    const phaseInfo = phase(this.date)
    this.phase = phaseInfo.phase
    this.illuminated = phaseInfo.illuminated
    this.age = phaseInfo.age
    this.distance = phaseInfo.distance
    this.angular_diameter = phaseInfo.angular_diameter
    this.sun_distance = phaseInfo.sun_distance
    this.sun_angular_diameter = phaseInfo.sun_angular_diameter

    this.phase_text = phaseString(this.phase)
  }

  get new_date(): Date {
    if (!this._calculatedPhases) {
      this._calculatedPhases = phaseHunt(this.date)
    }
    return this._calculatedPhases.newDate
  }

  get q1_date(): Date {
    if (!this._calculatedPhases) {
      this._calculatedPhases = phaseHunt(this.date)
    }
    return this._calculatedPhases.q1Date
  }

  get full_date(): Date {
    if (!this._calculatedPhases) {
      this._calculatedPhases = phaseHunt(this.date)
    }
    return this._calculatedPhases.fullDate
  }

  get q3_date(): Date {
    if (!this._calculatedPhases) {
      this._calculatedPhases = phaseHunt(this.date)
    }
    return this._calculatedPhases.q3Date
  }

  get nextnew_date(): Date {
    if (!this._calculatedPhases) {
      this._calculatedPhases = phaseHunt(this.date)
    }
    return this._calculatedPhases.nextNewDate
  }

  toString(): string {
    return `MoonPhase for ${this.date.toISOString()}, ${this.phase_text} (${(this.illuminated * 100).toFixed(2)}% illuminated)`
  }
}

// --- 导出函数 ---
export {
  phase,
  phaseHunt,
  truephase,
  meanphase,
  kepler,
  phaseString,
  MoonPhase,
  AstronomicalConstants
}

const LUNAR_PHASE_EVENT_NAMES: Record<number, string> = {
  0.0: '朔月',
  7.38264692644: '上弦月',
  14.76529385288: '满月',
  22.14794077932: '下弦月'
}

// --- 根据日期计算月相和事件时间 ---
export function getLunarPhase(
  dateString: string,
  gmt: number = 8
): { phase: string; eventTime?: Date } {
  const date = new Date(dateString)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999) // 使用 23:59:59.999 来表示当天结束

  const startOfDayGmt = new Date(date)
  startOfDayGmt.setHours(gmt, 0, 0, 0)
  const huntResult = phaseHunt(startOfDayGmt)

  // 计算当前 lunation 内的所有关键事件时间
  const newMoonTime = huntResult.newDate
  const firstQuarterTime = huntResult.q1Date
  const fullMoonTime = huntResult.fullDate
  const lastQuarterTime = huntResult.q3Date
  newMoonTime.setHours(newMoonTime.getHours() + gmt)
  firstQuarterTime.setHours(firstQuarterTime.getHours() + gmt)
  fullMoonTime.setHours(fullMoonTime.getHours() + gmt)
  lastQuarterTime.setHours(lastQuarterTime.getHours() + gmt)

  // 检查哪个事件发生在当前日期 (dateString) 内
  for (const [eventAge, eventName] of Object.entries(LUNAR_PHASE_EVENT_NAMES)) {
    const eventAgeNum = parseFloat(eventAge)
    let eventTime: Date | null = null

    if (Math.abs(eventAgeNum - 0.0) < 0.1) eventTime = newMoonTime
    else if (Math.abs(eventAgeNum - 7.38264692644) < 0.1) eventTime = firstQuarterTime
    else if (Math.abs(eventAgeNum - 14.76529385288) < 0.1) eventTime = fullMoonTime
    else if (Math.abs(eventAgeNum - 22.14794077932) < 0.1) eventTime = lastQuarterTime

    if (eventTime && eventTime >= startOfDay && eventTime <= endOfDay) {
      return { phase: eventName, eventTime }
    }
  }

  // 如果当天没有关键事件，则计算当天开始时的月龄来判断常规月相
  const phaseInfo = phase(startOfDay)
  const currentAge = phaseInfo.age
  const cycleLength = AstronomicalConstants.synodic_month
  const ageMod = currentAge % cycleLength

  let phaseName = '未知'
  if (ageMod < 7.38264692644) {
    phaseName = '蛾眉月'
  } else if (ageMod < 14.76529385288) {
    phaseName = '盈凸月'
  } else if (ageMod < 22.14794077932) {
    phaseName = '亏凸月'
  } else {
    phaseName = '残月'
  }
  return { phase: phaseName }
}

// --- 获取月相序列 ---
export function getLunarPhasesSequence(
  startDate: string,
  count: number
): { phase: string; eventTime?: Date }[] {
  const sequence: { phase: string; eventTime?: Date }[] = []
  for (let i = 0; i < count; i++) {
    const dateObj = new Date(startDate)
    dateObj.setDate(dateObj.getDate() + i)
    const dateStr = dateObj.toISOString().split('T')[0]
    sequence.push(getLunarPhase(dateStr))
  }
  return sequence
}

// --- 格式化时间为 HH:MM ---
export function formatTime(date: Date | undefined): string {
  if (!date) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
