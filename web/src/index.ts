import * as rs from "../pkg/index.js"
import { allPolyEdges, Point, reconstructPolygon, v } from "./geo"
import { getSymbolPolygon } from "./getSymbolPolygon"
import { addEdgesToBsp, Bsp, bspEdges, bspToConvexPolygons, diff, intersect, pointInsideBsp, polygonToBsp } from "./bsp"
import { makeVoronoi } from "./voronoi"
import { addGrout } from "./addGrout"
import * as t from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

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

  let symbolPoly = getSymbolPolygon("@", size)
  for(const [fillColor, isFg, cellSize] of [["#03f", false, bgCellSize], ["#0f3", true, fgCellSize]] as const) {
    let letterBsp = polygonToBsp(symbolPoly.map(x => addGrout(x, symbolGrout, !isFg)!))
    let voronoi = makeVoronoi(p => isFg === !!pointInsideBsp(letterBsp, p), size, cellSize)
    for(const poly of voronoi) {
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...(isFg ? intersect : diff)(origBsp, letterBsp)]
      for(let x of reconstructPolygon(diffedEdges)) {
        let g = addGrout(x)
        if(g) {
          const geometry = bspGeo(polygonToBsp([g]), 10 / 750)
          geometry.computeVertexNormals()
          let color = new t.Color(fillColor)
          let hsl = { h: 0, s: 0, l: 0 }
          color.getHSL(hsl)
          console.log(hsl)
          hsl.h += (Math.random() - .5) * .075
          hsl.s += (Math.random() - .5) * .1
          hsl.l += (Math.random() - .5) * .2
          color.setHSL(hsl.h, hsl.s, hsl.l)
          const material = new t.MeshStandardMaterial({ color, roughness: .35 + Math.random() * .05, metalness: .1 + Math.random() * .1 })
          const cube = new t.Mesh(geometry, material)
          scene.add(cube)
        }
      }
    }
  }

  camera.position.set(5, 5, 5)

  const controls = new OrbitControls(camera, renderer.domElement)
  // @ts-ignore
  controls.target.set(5, 0, 5)
  camera.position.z = 5

  f()
  function f(){
    window.requestAnimationFrame(f)
    // @ts-ignore
    controls.update()
    renderer.render(scene, camera)
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

  console.log(polys)

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
        console.log("v")
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
      console.log("v")
      vertices[vi++] = x * s
      vertices[vi++] = z * th(x, y)
      vertices[vi++] = y * s
    }

  console.log(vertices)

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
