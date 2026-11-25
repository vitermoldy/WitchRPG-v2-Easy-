import * as THREE from 'three'
import { CAMP, ELITE, UNITS, type V2Kind } from '../game/balance'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import type { Unit } from '../engine/units'
import { heightMap, toWorld } from './map'

export interface CampDef {
  /** Map point (x east, y north). */
  c: [number, number]
  pack: Partial<Record<V2Kind, number>>
  levels: [number, number]
  /** How many of the pack come out elite, each with a random v1 trait. */
  elites?: number
  /** A boss of the open world: one creature, its own level, stands again after `CAMP.bossRespawn`. */
  boss?: boolean
}

/**
 * Hutan Pembuka (Tier I, Lv 1 to 3): Imps and Hellhounds, the first camps along the path north of the
 * start clearing. Tebing Berangin (Tier II, Lv 4 to 6): Harpies and Centaurs on the plateau. Rawa
 * Berkabut (Tier III, Lv 7 to 9): Naga, Minotaurs, and the lairs of Medusa and the Chimera. Levels rise
 * with the distance from the start, inside each zone's band.
 */
export const CAMP_DEFS: CampDef[] = [
  { c: [-20, -292], pack: { imp: 4 }, levels: [1, 1] },
  { c: [-44, -384], pack: { imp: 4 }, levels: [1, 1] },
  { c: [30, -300], pack: { imp: 5 }, levels: [1, 2] },
  { c: [-72, -292], pack: { hellhound: 3 }, levels: [1, 2] },
  { c: [72, -358], pack: { hellhound: 3 }, levels: [2, 2] },
  { c: [-112, -330], pack: { imp: 5, hellhound: 1 }, levels: [2, 2] },
  { c: [12, -228], pack: { imp: 4, hellhound: 2 }, levels: [2, 3] },
  { c: [110, -280], pack: { imp: 6 }, levels: [2, 3] },
  { c: [-150, -250], pack: { hellhound: 4 }, levels: [3, 3] },
  { c: [40, -168], pack: { imp: 4, hellhound: 2 }, levels: [3, 3] },
  { c: [286, -70], pack: { harpy: 3 }, levels: [4, 4] },
  { c: [222, -78], pack: { centaur: 2 }, levels: [4, 4] },
  { c: [250, 30], pack: { harpy: 3, centaur: 1 }, levels: [4, 5] },
  { c: [302, -6], pack: { centaur: 2, harpy: 1 }, levels: [5, 5] },
  { c: [360, 10], pack: { harpy: 4 }, levels: [5, 5] },
  { c: [336, -128], pack: { harpy: 3, centaur: 1 }, levels: [5, 6] },
  { c: [392, -62], pack: { centaur: 3 }, levels: [6, 6] },
  // Rawa Berkabut (Tier III, Lv 7 to 9): Naga in the swamp, Minotaurs on the drier ground, two lairs
  { c: [-140, -70], pack: { naga: 3 }, levels: [7, 7] },
  { c: [-222, -42], pack: { naga: 2, minotaur: 1 }, levels: [7, 8] },
  { c: [-252, 40], pack: { minotaur: 2 }, levels: [8, 8] },
  { c: [-300, 120], pack: { naga: 4 }, levels: [8, 8] },
  { c: [-200, 108], pack: { minotaur: 1, naga: 2 }, levels: [8, 9] },
  { c: [-332, 30], pack: { medusa: 1, naga: 2 }, levels: [9, 9] },
  { c: [-252, 190], pack: { chimera: 1 }, levels: [9, 9] },
  // elite camps at the edges of zones I to III (PROMPT: "kamp elit ada di tepi zona")
  { c: [96, -176], pack: { imp: 3, hellhound: 2 }, levels: [3, 3], elites: 1 },
  { c: [196, 14], pack: { centaur: 2, harpy: 2 }, levels: [6, 6], elites: 1 },
  { c: [-120, 40], pack: { minotaur: 1, naga: 2 }, levels: [9, 9], elites: 1 },
  // Reruntuhan Kuil (Tier IV, Lv 10 to 12, sealed until the Hydra falls): Minotaurs, Cyclopes, Succubus, Incubus
  { c: [40, 282], pack: { minotaur: 2 }, levels: [10, 10] },
  { c: [100, 300], pack: { succubus: 1, imp: 2 }, levels: [10, 11] },
  { c: [-20, 330], pack: { cyclops: 1, minotaur: 1 }, levels: [11, 11] },
  { c: [92, 382], pack: { incubus: 1, minotaur: 1 }, levels: [11, 12] },
  { c: [40, 330], pack: { incubus: 1, succubus: 1 }, levels: [12, 12], elites: 1 },
  { c: [-40, 400], pack: { cyclops: 2 }, levels: [12, 12], elites: 1 },
  { c: [140, 250], pack: { minotaur: 2, cyclops: 1 }, levels: [12, 12], elites: 2 },
  // Lembah Bara (Tier V, Lv 13 to 15, sealed until the Hydra falls): Phoenixes and elite mixes
  { c: [312, 258], pack: { phoenix: 2 }, levels: [13, 13] },
  { c: [384, 300], pack: { phoenix: 1, hellhound: 3 }, levels: [13, 14], elites: 1 },
  { c: [262, 350], pack: { incubus: 2 }, levels: [14, 14], elites: 1 },
  { c: [330, 384], pack: { cyclops: 2, phoenix: 1 }, levels: [14, 14], elites: 1 },
  { c: [400, 384], pack: { phoenix: 3 }, levels: [15, 15], elites: 2 },
  { c: [330, 330], pack: { cyclops: 1, succubus: 1, incubus: 1 }, levels: [15, 15], elites: 2 },
  // more of them (owner: "banyakin monster yang spawn"): Griffins and Hippogriffs on Tebing, and one or two more packs per zone
  { c: [-60, -220], pack: { imp: 4, hellhound: 1 }, levels: [2, 3] },
  { c: [90, -220], pack: { hellhound: 3 }, levels: [3, 3] },
  { c: [270, -150], pack: { griffin: 2 }, levels: [5, 5] },
  { c: [380, 60], pack: { hippogriff: 3 }, levels: [5, 6] },
  { c: [420, -20], pack: { griffin: 2, hippogriff: 1 }, levels: [6, 6], elites: 1 },
  { c: [-280, -20], pack: { naga: 4 }, levels: [7, 8] },
  { c: [-200, 160], pack: { minotaur: 2, naga: 2 }, levels: [9, 9] },
  { c: [-80, 280], pack: { cyclops: 1, minotaur: 2 }, levels: [11, 12] },
  { c: [150, 380], pack: { succubus: 2, imp: 3 }, levels: [12, 12] },
  { c: [280, 220], pack: { phoenix: 2, hellhound: 3 }, levels: [13, 14] },
  { c: [430, 330], pack: { incubus: 2, phoenix: 1 }, levels: [15, 15], elites: 1 },
  // the bosses of the open world (PROMPT roster), each alone in its camp; their levels run past the zone band
  { c: [300, 420], pack: { cerberus: 1 }, levels: [15, 15], boss: true },
  { c: [420, 260], pack: { lilith: 1 }, levels: [16, 16], boss: true },
  { c: [250, 400], pack: { dragon: 1 }, levels: [17, 17], boss: true },
  { c: [40, 300], pack: { atlas: 1 }, levels: [17, 17], boss: true },
  { c: [-60, 440], pack: { typhon: 1 }, levels: [18, 18], boss: true },
  { c: [360, 350], pack: { samael: 1 }, levels: [19, 19], boss: true },
]

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
