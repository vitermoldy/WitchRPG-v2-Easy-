import * as THREE from 'three'
import { CAMP, ELITE, MOVE, UNITS, type V2Kind } from '../game/balance'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import type { Unit } from '../engine/units'
import { heightMap, inClearing, inWaterRect, LAKE, LANDMARKS, PLAY_HALF, SPOTS, toWorld, WATER_LEVEL, zoneAt } from './map'
import { campSpots, steepest, territoryAt, TERRITORIES } from './territories'

export interface CampDef {
  /** Map point (x east, y north). */
  c: [number, number]
  pack: Partial<Record<V2Kind, number>>
  levels: [number, number]
  /** How many of the pack come out elite, each with a random v1 trait. */
  elites?: number
  /** A boss of the open world: one creature, its own level, stands again after `CAMP.bossRespawn`. */
  boss?: boolean
  /** Key of the territory it belongs to (for a roaming pack: the nearest ground it takes its kind from). */
  territory?: string
  /** A pack roaming the open ground between the grounds: no stone ring, drifts about while calm. */
  roam?: boolean
}

/**
 * Every camp, from the territories (src/world/territories.ts): each kind keeps its camps on its own
 * ground, one kind per camp, the levels climbing from the first camp to the last (owner, 28 Nov 2026).
 * Until then the camps were a hand-placed list with mixed packs.
 */
export const CAMP_DEFS: CampDef[] = TERRITORIES.flatMap((t) => {
  const spots = campSpots(t)
  return spots.map((c, i): CampDef => {
    const [lo, hi] = t.levels
    const level = t.boss || spots.length < 2 ? hi : Math.round(lo + ((hi - lo) * i) / (spots.length - 1))
    const last = i === spots.length - 1
    return {
      c,
      pack: { [t.kind]: t.pack },
      levels: [level, level],
      elites: last && t.elites ? t.elites : undefined,
      boss: t.boss,
      territory: t.key,
    }
  })
})

/**
 * Packs roaming the open ground between the grounds (owner, 28 Nov 2026: more ordinary monsters about,
 * fitting the place): one on every CAMP.roam metres of a jittered grid that lands outside every ground,
 * place, clearing and deep water, of the kind and level band of the nearest ground of its zone (bosses and
 * lairs aside). Away from the start clearing, so the first steps stay calm. Deterministic.
 */
export const ROAM_DEFS: CampDef[] = (() => {
  let seed = 20261129
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const out: CampDef[] = []
  const step = CAMP.roam
  for (let y = -PLAY_HALF + step / 2; y < PLAY_HALF; y += step) {
    for (let x = -PLAY_HALF + step / 2; x < PLAY_HALF; x += step) {
      const px = Math.round(x + (rnd() - 0.5) * step * 0.6)
      const py = Math.round(y + (rnd() - 0.5) * step * 0.6)
      const size = rnd()
      const pick = rnd()
      if (Math.max(Math.abs(px), Math.abs(py)) > PLAY_HALF - 80) continue
      if (Math.hypot(px - SPOTS.hero[0], py - SPOTS.hero[1]) < 150) continue
      if (territoryAt(px, py) || inClearing(px, py, 20)) continue
      if (LANDMARKS.some((l) => Math.hypot(px - l.c[0], py - l.c[1]) < l.r * 1.4)) continue
      if (Math.hypot(px - LAKE.c[0], py - LAKE.c[1]) < LAKE.r * 1.4) continue
      if (inWaterRect(px, py) && WATER_LEVEL - heightMap(px, py) > MOVE.maxWade * 0.8) continue
      if (steepest(px, py) > MOVE.maxSlope * 0.6) continue
      const zone = zoneAt(px, py).key
      let best: (typeof TERRITORIES)[number] | null = null
      let bd = Infinity
      for (const t of TERRITORIES) {
        if (t.boss || t.noCamps || UNITS[t.kind].boss || zoneAt(t.c[0], t.c[1]).key !== zone) continue
        const d = Math.hypot(px - t.c[0], py - t.c[1])
        if (d < bd) {
          bd = d
          best = t
        }
      }
      if (!best) continue
      const [lo, hi] = best.levels
      const level = lo + Math.floor(pick * (hi - lo + 1))
      const [a, b] = CAMP.roamPack
      out.push({ c: [px, py], pack: { [best.kind]: a + Math.floor(size * (b - a + 1)) }, levels: [level, level], territory: best.key, roam: true })
    }
  }
  return out

export interface Camp {
  def: CampDef
  /** Centre on the ground (world). */
  pos: THREE.Vector3
  state: 'idle' | 'active' | 'cleared'
  units: Unit[]
  respawnAt: number
  roused: boolean
}

const STONES = 7

/**
 * The creature camps: they wake when she comes near, rouse when she or a shadow comes close, walk home
 * when she runs, clear when every creature has fallen, and stand again later out of her sight.
 * A ring of stones with amber shards marks each camp; the shards go dark while it is cleared.
 */
export class Camps {
  readonly camps: Camp[]
  readonly group = new THREE.Group()
  private readonly g: Game
  private readonly shards: THREE.InstancedMesh
  private readonly lit = new THREE.Color(COLOR.rift).multiplyScalar(2.2)
  private readonly dark = new THREE.Color(0x3a2a20)
  private readonly c = new THREE.Color()
  private time = 0
  /** The camps' own clock (s), for the map: a cleared camp stands again at its respawnAt. */
  get clock() {
    return this.time
  }
  /** The Minotaur's shield is explained once, the first time a pack with one is roused. */
  private toldShield = false

  constructor(g: Game) {
    this.g = g
    this.group.name = 'camps'
    this.camps = CAMP_DEFS.map((def) => {
      const [x, z] = toWorld(def.c[0], def.c[1])
      return { def, pos: new THREE.Vector3(x, heightMap(def.c[0], def.c[1]), z), state: 'idle', units: [], respawnAt: 0, roused: false }
    })
    const stoneGeo = new THREE.DodecahedronGeometry(0.45, 0)
    const stones = new THREE.InstancedMesh(stoneGeo, new THREE.MeshStandardMaterial({ color: 0x3b3633, roughness: 0.95 }), this.camps.length * STONES)
    const shardGeo = new THREE.OctahedronGeometry(0.16, 0)
    shardGeo.scale(1, 2.4, 1)
    this.shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), this.camps.length * STONES)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    let i = 0
    for (const camp of this.camps) {
      for (let k = 0; k < STONES; k++, i++) {
        const a = (k / STONES) * Math.PI * 2
        const x = camp.pos.x + Math.cos(a) * 2.2
        const z = camp.pos.z + Math.sin(a) * 2.2
        const y = g.ground.height(x, z)
        q.setFromEuler(new THREE.Euler(Math.random(), a, Math.random()))
        s.setScalar(0.7 + Math.random() * 0.5)
        m.compose(new THREE.Vector3(x, y + 0.1, z), q, s)
        stones.setMatrixAt(i, m)
        q.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5))
        m.compose(new THREE.Vector3(x, y + 0.6, z), q, new THREE.Vector3(1, 1, 1))
        this.shards.setMatrixAt(i, m)
        this.shards.setColorAt(i, this.lit)
      }
    }
    stones.castShadow = true
    stones.receiveShadow = true
    this.group.add(stones, this.shards)
  }

  private wake(camp: Camp, index: number) {
    const g = this.g
    camp.state = 'active'
    camp.roused = false
    camp.units = []
    const [lo, hi] = camp.def.levels
    let n = 0
    for (const [kind, listed] of Object.entries(camp.def.pack) as [V2Kind, number][]) {
      const count = camp.def.boss ? listed : Math.ceil(listed * CAMP.pack)
      for (let k = 0; k < count; k++, n++) {
        const a = n * 2.39996 + Math.random() * 0.4
        const r = 3 + Math.random() * 3.5
        const at = { x: camp.pos.x + Math.cos(a) * r, y: 0, z: camp.pos.z + Math.sin(a) * r }
        g.obstacles.pushOut(at, 0.6, 1.5)
        if (g.ground.blocked(at.x, at.z)) {
          at.x = camp.pos.x
          at.z = camp.pos.z
        }
        const u = g.units.spawn(kind, 'enemy', lo + Math.floor(Math.random() * (hi - lo + 1)), at)
        u.camp = index
        u.home = new THREE.Vector3(at.x, 0, at.z)
        u.aggro = false
        camp.units.push(u)
      }
    }
    // some of the pack come out elite, each with one v1 trait
    const plain = [...camp.units]
    for (let k = 0; k < (camp.def.elites ?? 0) && plain.length; k++) {
      const u = plain.splice(Math.floor(Math.random() * plain.length), 1)[0]
      u.makeElite(ELITE.traits[Math.floor(Math.random() * ELITE.traits.length)])
    }
  }

  /** Puts every awake pack back to sleep (she fell); cleared camps stay cleared. */
  sleepAll() {
    for (const camp of this.camps) {
      if (camp.state !== 'active') continue
      for (const u of camp.units) if (u.alive) this.g.units.remove(u)
      camp.units = []
      camp.state = 'idle'
    }
  }

  update(dt: number) {
    const g = this.g
    const p = g.player
    this.time += dt
    let colors = false
    this.camps.forEach((camp, index) => {
      const d = Math.hypot(p.pos.x - camp.pos.x, p.pos.z - camp.pos.z)
      if (camp.state === 'idle' && d < CAMP.wake && p.alive) {
        this.wake(camp, index)
        colors = true
      } else if (camp.state === 'active') {
        const alive = camp.units.filter((u) => u.alive)
        if (!alive.length) {
          camp.state = 'cleared'
          camp.respawnAt = this.time + (camp.def.boss ? CAMP.bossRespawn : CAMP.respawn)
          colors = true
          const boss = camp.def.boss ? UNITS[Object.keys(camp.def.pack)[0] as V2Kind] : null
          if (boss) {
            g.hud.banner(boss.name, 'tumbang. Tubuhnya bisa dibangkitkan dengan Kebangkitan Marsekal, satu kali')
            g.profile.bossKills += 1
            g.saveSoon()
          } else g.hud.message(`Kamp Lv ${camp.def.levels[0]}${camp.def.levels[1] !== camp.def.levels[0] ? ` sampai ${camp.def.levels[1]}` : ''} ditaklukkan. Batu ambernya padam.`, 'info')
          g.sfx.levelUp()
          g.counts.campsCleared++
          return
        }
        if (d > CAMP.sleep && alive.every((u) => Math.hypot(u.pos.x - p.pos.x, u.pos.z - p.pos.z) > CAMP.sleep - 40)) {
          // left far behind: the pack goes back into the ground until she returns
          for (const u of alive) g.units.remove(u)
          camp.units = []
          camp.state = 'idle'
          return
        }
        // rouse the whole pack when she or a shadow comes close, or one of them is hurt
        if (!camp.roused) {
          const close = (u: Unit) => {
            if (p.alive && Math.hypot(u.pos.x - p.pos.x, u.pos.z - p.pos.z) < CAMP.aggro) return true
            if (u.hp < u.maxHp - 0.01) return true
            const s = g.units.nearestFoe(u, CAMP.aggro * 0.6)
            return !!s
          }
          if (alive.some(close)) {
            camp.roused = true
            for (const u of alive) u.aggro = true
            g.sfx.growl()
            if (!this.toldShield && alive.some((u) => u.spec.shield)) {
              this.toldShield = true
              g.hud.message('Minotaur menahan pukulan dan bolt dari depan. Lempar tongkat (H), Telekinesis, atau serang dari samping.', 'info')
            }
          }
        } else if (!p.alive || d > CAMP.leash) {
          camp.roused = false
          for (const u of alive) u.aggro = false
        }
      } else if (camp.state === 'cleared' && this.time > camp.respawnAt && (camp.def.boss || d > CAMP.wake + 20)) {
        // a boss stands again on time even with her close by; it waits calm until she comes near
        camp.state = 'idle'
        colors = true
      }
    })
    if (colors) {
      let i = 0
      for (const camp of this.camps) {
        this.c.copy(camp.state === 'cleared' ? this.dark : this.lit)
        for (let k = 0; k < STONES; k++) this.shards.setColorAt(i++, this.c)
      }
      if (this.shards.instanceColor) this.shards.instanceColor.needsUpdate = true
    }
  }

  /** The closest camp still standing, for the HUD. */
  nearest(): { camp: Camp; dist: number } | null {
    const p = this.g.player.pos
    let best: { camp: Camp; dist: number } | null = null
    for (const camp of this.camps) {
      if (camp.state === 'cleared') continue
      const d = Math.hypot(p.x - camp.pos.x, p.z - camp.pos.z)
      if (!best || d < best.dist) best = { camp, dist: d }
    }
    return best
  }

  get cleared() {
    return this.camps.filter((c) => c.state === 'cleared').length
  }
}
