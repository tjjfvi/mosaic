import * as rs from "../pkg/index.js"
import { allPolyEdges, Point, reconstructPolygon, v } from "./geo"
import { getSymbolPolygon } from "./getSymbolPolygon"
import { addEdgesToBsp, Bsp, bspEdges, bspToConvexPolygons, diff, intersect, pointInsideBsp, polygonToBsp } from "./bsp"
import { makeVoronoi } from "./voronoi"
import { addGrout } from "./addGrout"
import * as t from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { MeshNormalMaterial } from "three"

console.log(rs.hi())

let canvas = document.getElementById("canvas") as HTMLCanvasElement

const scene = new t.Scene()
const camera = new t.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new t.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)

const size = 750
const bgCellSize = size / 11
const fgCellSize = size / 17
const symbolGrout = .1

let light = new t.PointLight()
light.position.x += 5
light.position.y += 15
light.position.z += 0
scene.add(light)
scene.add(new t.AmbientLight(0x404040))

function tick(){
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  // for(let i = 0; i < 5; i++)
  //   for(let j = 0; j < 5; j++)
  //     createTile("#03f", "#0f3", "@", i, j)
  for(let i = -20; i < 20; i++)
    for(let j = -20; j < 20; j++)
      createTile("#03f", "#0f3", "@", i, j)
  // createTile("#03f", "#0f3", "@", 0, 0)

  camera.position.set(0, 5, 0)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.screenSpacePanning = false
  controls.minDistance = 1
  controls.maxDistance = 500

  controls.maxPolarAngle = Math.PI * .45

  f()
  function f(){
    window.requestAnimationFrame(f)
    controls.target.y = 0
    controls.update()
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
  }
function createTile(bgColor: string, fgColor: string, symbol: string, x:number, y: number){
  let symbolPoly = getSymbolPolygon(symbol, size)

  const tileSize = 10

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
          const thickness = .1
          let slantAmount = Math.random() * thickness * 1
          let slantSlope = slantAmount / (v.mag(v.sub(max, min)) * tileSize / size)

          stones.push({
            poly: g,
            color,
            roughness: .35 + Math.random() * .05,
            metalness: .05 + Math.random() * .05,
            slantDir,
            slantSlope,
          })
        }
      }
    }
  }

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
    let x = [-Math.cos(stone.slantDir) * .5 / h + .5, -Math.sin(stone.slantDir) * .5 / h + .5, 1 / stone.slantSlope * .5 / h + .5] as const
    normal.fillStyle = rgb(...x)
    for(const ctx of [albedo, surface, normal]) {
      ctx.beginPath()
      ctx.moveTo(...v.scl(stone.poly[stone.poly.length - 1], textureSize / size))
      for(let p of stone.poly)
        ctx.lineTo(...v.scl(p, textureSize / size))
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
  const plane = new t.Mesh(geo, mat)
  plane.rotation.x = -Math.PI / 2
  plane.position.set(x * tileSize, 0, y * tileSize)
  scene.add(plane)

  renderer.render(scene, camera)

  function rgb(r: number, g: number, b: number){
    return `rgb(${r * 256 | 0}, ${g * 256 | 0}, ${b * 256 | 0})`
  }
}

function bspGeo(bsp: Bsp, s: number): t.BufferGeometry{
  const geometry = new t.BufferGeometry()

  let edges = [...bspEdges(bsp)]
  let polys = [...bspToConvexPolygons(bsp, [])]

  const thickness = .1

  let min = edges.flat().reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1])])
  let max = edges.flat().reduce((a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1])])
  let center = [min[0] / 2 + max[0] / 2, min[1] / 2 + max[1] / 2] as const
  let slantDir = Math.random() * Math.PI * 2
  let slantAmount = Math.random() * thickness * 1
  let slantDirV = v.scl([Math.cos(slantDir), Math.sin(slantDir)], slantAmount / v.mag(v.sub(max, min)))

  let th = (x: number, y: number) =>
    thickness - v.dot(slantDirV, v.sub([x, y], center))

  const vertices = new Float32Array(
    polys.map(x => (x.length - 2) * 3 * 3).reduce((a, b) => a + b, 0) * 2
    + edges.length * 2 * 3 * 3,
  )

  let vi = 0

  for(let poly of polys)
    for(let i = 0; i < poly.length - 2; i++)
      for(let [[x, y], z] of [
        [poly[0], 0],
        [poly[i + 1], 0],
        [poly[i + 2], 0],
        [poly[i + 1], 1],
        [poly[0], 1],
        [poly[i + 2], 1],
      ] as const) {
        vertices[vi++] = x * s
        vertices[vi++] = z * th(x, y)
        vertices[vi++] = y * s
      }

  for(let edge of edges)
    for(let [[x, y], z] of [
      [edge[1], 1],
      [edge[0], 1],
      [edge[1], 0],
      [edge[0], 1],
      [edge[0], 0],
      [edge[1], 0],
    ] as const) {
      vertices[vi++] = x * s
      vertices[vi++] = z * th(x, y)
      vertices[vi++] = y * s
    }

  geometry.setAttribute("position", new t.BufferAttribute(vertices, 3))
  return geometry
}

// function strokePolygon(poly: Point[]){
//   ctx.beginPath()
//   ctx.moveTo(...poly[poly.length - 1])
//   for(const p of poly)
//     ctx.lineTo(...p)
//   ctx.stroke()
//   ctx.closePath()
// }

// function fillPolygon(poly: Point[]){
//   ctx.beginPath()
//   ctx.moveTo(...poly[poly.length - 1])
//   for(const p of poly)
//     ctx.lineTo(...p)
//   ctx.fill()
//   ctx.closePath()
// }

tick()
