import * as rs from "../pkg/index.js"
import { allPolyEdges, Point, reconstructPolygon, v } from "./geo"
import { getSymbolPolygon } from "./getSymbolPolygon"
import { addEdgesToBsp, Bsp, bspEdges, bspToConvexPolygons, diff, intersect, pointInsideBsp, polygonToBsp } from "./bsp"
import { makeVoronoi } from "./voronoi"
import { addGrout } from "./addGrout"
import * as t from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls"
import { Object3D } from "three"

console.log(rs.hi())

let canvas = document.getElementById("canvas") as HTMLCanvasElement

const scene = new t.Scene()
const camera = new t.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200)
const renderer = new t.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.physicallyCorrectLights = true

const size = 750
const bgCellSize = size / 11
const fgCellSize = size / 17
const symbolGrout = .1

let light = new t.DirectionalLight()
light.position.set(-2, 5, -10)
light.intensity = 1
// light.decay = 1
// light.color = new t.Color(0x101010)
scene.add(light)
scene.add(new t.AmbientLight(0xffffff, 2))
// scene.add(new t.PointLightHelper(light))

function tick(){
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  scene.updateMatrixWorld = function(force: boolean){
    if(force)
      Object3D.prototype.updateMatrixWorld.call(this, force)
  }

  const chunkSize = 100
  let tiles = [...Array(20)].map(x => createTile("#03f", "#0f3", "&"))
  for(let i = 0; i < chunkSize; i++)
    for(let j = 0; j < chunkSize; j++) {
      let tile = tileObject(tiles[(Math.random() * 20) | 0], i, j)
      scene.add(tile)
      tile.updateMatrixWorld()
    }

  camera.position.set(0, 50, 0)

  const orbitControls = new OrbitControls(camera, renderer.domElement)
  orbitControls.target.set(0, 0, 0)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.05
  orbitControls.screenSpacePanning = false
  orbitControls.enableRotate = false
  orbitControls.mouseButtons.LEFT = t.MOUSE.PAN
  orbitControls.enableZoom = false
  const trackballControls = new TrackballControls(camera, renderer.domElement)
  trackballControls.noRoll = true
  trackballControls.noPan = true
  trackballControls.noRotate = true
  trackballControls.minDistance = 5
  trackballControls.maxDistance = 150
  trackballControls.target = orbitControls.target

  orbitControls.maxPolarAngle = Math.PI * .45

  f()
  function f(){
    window.requestAnimationFrame(f)
    trackballControls.update()
    const dist = orbitControls.getDistance()
    orbitControls.minPolarAngle = orbitControls.maxPolarAngle = Math.PI / 2 *  (1 - dist / 150) ** 2
    orbitControls.update()
    renderer.render(scene, camera)
  }
}

interface Stone {
  poly: Point[],
  color: t.Color,
  roughness: number,
  metalness: number,
  slantDir: number,
  slantSlope: number,
  center: Point,
}

const tileSize = 10
const thickness = .1

function createTile(bgColor: string, fgColor: string, symbol: string): Stone[]{
  let symbolPoly = getSymbolPolygon(symbol, size)

  const stones: Stone[] = []

  for(const [fillColor, isFg, cellSize] of [[bgColor, false, bgCellSize], [fgColor, true, fgCellSize]] as const) {
    let letterBsp = polygonToBsp(symbolPoly.map(x => addGrout(x, symbolGrout, !isFg)!))
    let voronoi = makeVoronoi(p => isFg === !!pointInsideBsp(letterBsp, p), size, cellSize)
    for(const poly of voronoi) {
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...(isFg ? intersect : diff)(origBsp, letterBsp)]
      for(let x of reconstructPolygon(diffedEdges)) {
        let g = addGrout(x)
        if(g) {
          let color = new t.Color(fillColor)
          let hsl = { h: 0, s: 0, l: 0 }
          color.getHSL(hsl)
          hsl.h += (Math.random() - .5) * .075
          hsl.s += (Math.random() - .5) * .1
          hsl.l += (Math.random() - .5) * .2
          color.setHSL(hsl.h, hsl.s, hsl.l)
          let min = g.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1])])
          let max = g.reduce((a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1])])
          let center = [min[0] / 2 + max[0] / 2, min[1] / 2 + max[1] / 2] as const
          let slantDir = Math.random() * Math.PI * 2
          let slantAmount = Math.random() * thickness
          let slantSlope = slantAmount / (v.mag(v.sub(max, min)) * tileSize / size)

          stones.push({
            poly: g,
            color,
            roughness: .35 + Math.random() * .05,
            metalness: .05 + Math.random() * .05,
            slantDir,
            slantSlope,
            center,
          })
        }
      }
    }
  }

  return stones
}

function tileObject(stones: Stone[], x: number, y: number){
  const lod = new t.LOD()
  // @ts-ignore
  lod.addLevel((stones.a ??= highResTile(stones)).clone(), 40)
  // @ts-ignore
  lod.addLevel((stones.b ??= lowResTile(stones)).clone(), 50)
  // lod.addLevel(new t.Group(), 200)
  lod.position.set(x * tileSize, 0, y * tileSize)
  return lod
}

function lowResTile(stones: Stone[]){
  const textureSize = 500

  const createTexture = () => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    canvas.width = textureSize
    canvas.height = textureSize
    const texture = new t.CanvasTexture(canvas)
    ctx.imageSmoothingQuality = "high"
    texture.onUpdate = () => delete texture.image
    return [ctx, new t.CanvasTexture(canvas)] as const
  }

  const [albedo, albedoMap] = createTexture()
  const [surface, surfaceMap] = createTexture()
  const [normal, normalMap] = createTexture()

  albedo.fillStyle = rgb(0, 0, 0)
  surface.fillStyle = rgb(0, 1, 0)
  normal.fillStyle = rgb(.5, .5, 1)
  for(const ctx of [albedo, surface, normal])
    ctx.fillRect(0, 0, textureSize, textureSize)


  for(const stone of stones) {
    albedo.fillStyle = rgb(stone.color.r, stone.color.g, stone.color.b)
    surface.fillStyle = rgb(0, stone.roughness, stone.metalness)
    const h = Math.sqrt(1 / stone.slantSlope ** 2 + 1)
    let x = [Math.cos(stone.slantDir) * .5 / h + .5, -Math.sin(stone.slantDir) * .5 / h + .5, 1 / stone.slantSlope * .5 / h + .5] as const
    normal.fillStyle = rgb(...x)
    for(const ctx of [albedo, surface, normal]) {
      ctx.beginPath()
      ctx.moveTo(...v.scl(stone.poly[stone.poly.length - 1], textureSize / size))
      for(let p of stone.poly)
        ctx.lineTo(...v.scl(p, textureSize / size))
      ctx.fill()
      ctx.fill()
      ctx.closePath()
    }
  }

  const geo = new t.PlaneGeometry(tileSize, tileSize)
  const mat = new t.MeshStandardMaterial({ transparent: true })
  mat.map = albedoMap
  mat.roughnessMap = surfaceMap
  mat.metalnessMap = surfaceMap
  mat.normalMap = normalMap
  mat.normalMapType = t.ObjectSpaceNormalMap

  const tile = new t.Mesh(geo, mat)
  tile.rotation.x = -Math.PI / 2
  tile.position.y = thickness

  return tile

  function rgb(r: number, g: number, b: number){
    return `rgb(${r * 256 | 0}, ${g * 256 | 0}, ${b * 256 | 0})`
  }
}

function highResTile(stones: Stone[]){
  const tile = new t.Group()
  for(let stone of stones) {

    let edges = allPolyEdges([stone.poly])
    let polys = [...bspToConvexPolygons(polygonToBsp([stone.poly]), [])]

    let slantDirV = v.scl([Math.cos(stone.slantDir), Math.sin(stone.slantDir)], stone.slantSlope * tileSize / size)

    let th = (x: number, y: number) =>
      thickness - v.dot(slantDirV, v.sub([x, y], stone.center))

    const topGeo = makeGeo(
      polys.flatMap(poly => poly.length > 2 ? [...Array(poly.length - 2)].flatMap((_, i) =>
        [
          poly[i + 1],
          poly[0],
          poly[i + 2],
        ].map(([x, y]) => [x * tileSize / size, th(x, y), y * tileSize / size]),
      ) : []),
    )

    const sideGeo = makeGeo(
      edges.flatMap(edge =>
        ([
          [edge[1], 1],
          [edge[0], 1],
          [edge[1], 0],
          [edge[0], 1],
          [edge[0], 0],
          [edge[1], 0],
        ] as const).map(([[x, y], z]) =>
            [x * tileSize / size, z * th(x, y), y * tileSize / size] as const,
        ),
      ),
    )

    const topMat = new t.MeshStandardMaterial({
      color: stone.color,
      roughness: stone.roughness,
      metalness: stone.metalness,
    })

    const sideColor = new t.Color(stone.color)
    let hsl = { h: 0, s: 0, l: 0 }
    sideColor.getHSL(hsl)
    sideColor.setHSL(hsl.h, hsl.s * .7, hsl.l * .5)
    const sideMat = new t.MeshStandardMaterial({
      color: sideColor,
    })

    const topMesh = new t.Mesh(topGeo, topMat)
    const sideMesh = new t.Mesh(sideGeo, sideMat)
    tile.add(topMesh, sideMesh)
  }
  tile.position.set(-.5 * tileSize, 0, -.5 * tileSize)
  return tile
}

tick()

function makeGeo(verts: (readonly [number, number, number])[]){
  const geometry = new t.BufferGeometry()
  const vertices = new Float32Array(verts.length * 3)

  let i = 0

  for(let v of verts) {
    vertices[i++] = v[0]
    vertices[i++] = v[1]
    vertices[i++] = v[2]
  }

  geometry.setAttribute("position", new t.BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()

  return geometry
}
