import * as rs from "../pkg/index.js"
import { Delaunay } from "d3-delaunay"
import * as opentype from "opentype.js"
// @ts-ignore
import inconsolata from "../RobotoMono-Regular.ttf"

let canvas = document.getElementById("canvas") as HTMLCanvasElement
let ctx = canvas.getContext("2d")!

const font = opentype.parse(inconsolata)

function tick(){
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx.fillStyle = "#000"
  // let b: Point[][] = [[[100, 100], [500, 100], [500, 500], [100, 500]]] // getLetter("B")
  let a = getLetter("&")
  let b = getLetter("@")
  for(let x of a)
    drawPolygon(x)
  for(let x of b)
    drawPolygon(x)
  let asp = polygonToBsp(a)
  let bsp = polygonToBsp(b)
  console.log(bsp)
  for(let i = 0; i < 100000; i++) {
    let point = [Math.random() * 6000, Math.random() * 800] as const
    if(pointInsideBsp(asp, point) && !pointInsideBsp(bsp, point)) {
      ctx.fillStyle = "#000"
      ctx.fillRect(...point, 1, 1)
    }
  }
  ctx.lineWidth = 3
  for(let x of diff(a, asp, b, bsp))
    drawPolygon(x)
}

function allPolyEdges(poly: Point[][]): [Point, Point][]{
  return poly.flatMap(x => x.map((y, i) => [y, x[(i + 1) % x.length]]))
}

function* intersect(aPoly: Point[][], aBsp: Bsp, bPoly: Point[][], bBsp: Bsp){
  yield* clipEdges(bBsp, allPolyEdges(aPoly), true, false)
  yield* clipEdges(aBsp, allPolyEdges(bPoly), true, true)
}

function* diff(aPoly: Point[][], aBsp: Bsp, bPoly: Point[][], bBsp: Bsp){
  bBsp = invert(bBsp)
  yield* clipEdges(bBsp, allPolyEdges(aPoly), true, false)
  yield* clipEdges(aBsp, allPolyEdges(bPoly), true, true)
}

function invert(bsp: Bsp):Bsp{
  if(bsp === null) return null
  return {
    line: bsp.line.slice().reverse() as never,
    segments: bsp.segments.map(x => x.slice().reverse()) as never,
    left: invert(bsp.right),
    right: invert(bsp.left),
  }
}

function drawPolygon(poly: Point[]){
  console.log(poly)
  ctx.beginPath()
  ctx.moveTo(...poly[poly.length - 1])
  for(const p of poly)
    ctx.lineTo(...p)
  ctx.stroke()
  ctx.closePath()
  // for(const [i, p] of poly.entries())
  //   ctx.fillRect(...p, i + 10, i + 10)
}

function getLetter(letter: string){
  let path = font.getPath(letter, 0, 700, 900)
  console.log(path.commands)
  let newPath = new opentype.Path()
  let el = document.createElementNS("http://www.w3.org/2000/svg", "path")
  let polygons: Point[][] = [[]]
  let p = [0, 0] as Point
  for(let [i, command] of path.commands.entries()) {
    newPath.extend([command])
    el.setAttribute("d", newPath.toPathData(10))
    let point = el.getPointAtLength(el.getTotalLength())
    if(p + "" !== [point.x, point.y] + "")
      polygons[polygons.length - 1].push(p = [point.x, point.y])
    if(command.type === "Z") {
      let p = polygons[polygons.length - 1]
      if(p[0] + "" === p[p.length - 1] + "")p.pop()
      if(i !== path.commands.length - 1) {
        polygons.push([])
        newPath = new opentype.Path()
      }
    }
  }
  return polygons
}

type Bsp = {
  line: [Point, Point],
  segments: [Point, Point][],
  left: Bsp,
  right: Bsp,
} | null

function polygonToBsp(polygon: Point[][]){
  let bsp = null
  for(let shape of polygon)
    for(let [i, p] of shape.entries()) {
      let q = shape[(i + 1) % shape.length]
      bsp = addEdgeToBsp(bsp, [p, q])
    }
  return bsp
}

function addEdgeToBsp(bsp: Bsp, edge: [Point, Point]): Bsp{
  if(bsp === null) return { line: edge, segments: [edge], left: null, right: null }
  let pSide = getSide(bsp.line, edge[0])
  let qSide = getSide(bsp.line, edge[1])
  if((pSide || qSide) === (qSide || pSide)) {
    let side = pSide || qSide
    if(side === 0)
      bsp.segments.push(edge)
    else if(side === -1)
      bsp.left = addEdgeToBsp(bsp.left, edge)
    else if(side === 1)
      bsp.right = addEdgeToBsp(bsp.right, edge)
    else throw new Error("invalid side " + side)
  }
  else {
    let [, middle] = intersectLineSegments(bsp.line, edge)
    let pEdge = [edge[0], middle] as [Point, Point]
    let qEdge = [middle, edge[1]] as [Point, Point]
    for(let [side, edge] of [[pSide, pEdge], [qSide, qEdge]] as const)
      if(side === -1)
        bsp.left = addEdgeToBsp(bsp.left, edge)
      else if(side === 1)
        bsp.right = addEdgeToBsp(bsp.right, edge)
      else throw new Error("invalid side " + [pSide, qSide, side, edge])
  }
  return bsp
}

function* clipEdges(bsp: Bsp, edges: [Point, Point][], inside: boolean, cplnb: boolean): IterableIterator<[Point, Point]>{
  if(bsp === null) return yield* edges
  let leftEdges = []
  let rightEdges = []
  for(let edge of edges) {
    let pSide = getSide(bsp.line, edge[0])
    let qSide = getSide(bsp.line, edge[1])
    if((pSide || qSide) === (qSide || pSide)) {
      let side = pSide || qSide
      if(side === 0)
        if(v.dot(v.sub(...edge), v.sub(...bsp.line)) > 0)
          (!inside ? leftEdges : rightEdges).push(edge)
        else
          (cplnb === inside ? leftEdges : rightEdges).push(edge)
      else if(side === -1)
        leftEdges.push(edge)
      else if(side === 1)
        rightEdges.push(edge)
      else throw new Error("invalid side " + side)
    }
    else {
      let [, middle] = intersectLineSegments(bsp.line, edge)
      let pEdge = [edge[0], middle] as [Point, Point]
      let qEdge = [middle, edge[1]] as [Point, Point]
      for(let [side, edge] of [[pSide, pEdge], [qSide, qEdge]] as const)
        if(side === -1)
          leftEdges.push(edge)
        else if(side === 1)
          rightEdges.push(edge)
        else throw new Error("invalid side " + [pSide, qSide, side, edge])
    }
  }
  if(bsp.left)
    yield* clipEdges(bsp.left, leftEdges, inside, cplnb)
  else if(inside)
    yield* leftEdges
  if(bsp.right)
    yield* clipEdges(bsp.right, rightEdges, inside, cplnb)
  else if(!inside)
    yield* rightEdges
}

function pointInsideBsp(bsp: Bsp, point: Point): boolean | null{
  if(bsp === null) return null
  let side = getSide(bsp.line, point)
  if(side === 0) return null
  let sub = side === 1 ? bsp.right : bsp.left
  if(sub === null) return side === -1
  return pointInsideBsp(sub, point)
}

type Point = readonly [number, number]
const v = {
  add: (a: Point, b: Point) => [a[0] + b[0], a[1] + b[1]] as const,
  sub: (a: Point, b: Point) => [a[0] - b[0], a[1] - b[1]] as const,
  dot: (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1],
  scl: (a: Point, b: number) => [a[0] * b, a[1] * b] as const,
}

function intersectLineSegments([p, pr]: [Point, Point], [q, qs]: [Point, Point]){
  let cross = (a: Point, b:Point) => a[0] * b[1] - a[1] * b[0]
  let r = v.sub(pr, p)
  let s = v.sub(qs, q)
  let rXs = cross(r, s)
  let t = cross(v.sub(q, p), s) / rXs
  let u = cross(v.sub(q, p), r) / rXs
  return [t >= 0 && t <= 1 && u >= 0 && u <= 1, v.add(p, v.scl(r, t)), t, u]as const
}

function getSide([p, q]: [Point, Point], r: Point): number{
  let s = v.sub(q, p)
  let t = v.sub(r, p)
  let x = s[0] * t[1] - s[1] * t[0]
  return Math.abs(x) < 0.0001 ? 0 : Math.sign(x)
}

/*
console.log(rs.hi())

const size = 750
const cellVariance = 1

// let canvas = document.getElementById("canvas") as HTMLCanvasElement
// let ctx = canvas.getContext("2d")!
function makeVoronoi(f: (x: [number, number]) => boolean, cellSize: number){
  const points = [...Array(Math.ceil(size / cellSize))].flatMap((_, i) => [...Array(Math.ceil(size / cellSize))].map((_, j) => genPoint(i, j))).filter(f)
  const delaunay = Delaunay.from(points)
  const voronoi = delaunay.voronoi([0, 0, size, size])
  return voronoi
  function genPoint(cellX: number, cellY: number){
    return [
      (Math.random() - .5) * cellSize * cellVariance + cellX * cellSize,
      (Math.random() - .5) * cellSize * cellVariance + cellY * cellSize,
    ] as [number, number]
  }

}


function tick(){
  // window.requestAnimationFrame(tick)
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx.fillStyle = "red"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "green"
  ctx.strokeStyle = "blue"
  ctx.lineWidth = 5
  ctx.stroke
  text("stroke", "A", 0, 0, size, size)
  text("fill", "A", 0, 0, size, size)
  let mask = ctx.getImageData(0, 0, size, size)
  let vs = []
  for(let [color, text, cellSize] of [["#0000ff", false, 70], ["#9999ff", true, 45]]as const) {
    ctx.putImageData(mask, 0, 0)
    let voronoi = makeVoronoi(x => (ctx.getImageData(x[0] | 0, x[1] | 0, 1, 1).data[0] === 0) === text, cellSize)
    let delaunay = voronoi.delaunay
    ctx.fillStyle = "white"
    ctx.lineCap = "round"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "blue"
    for(const cell of voronoi.cellPolygons()) {
      ctx.strokeStyle = "#eee"
      // ctx.strokeStyle = "white"
      // ctx.lineWidth = 4
      ctx.beginPath()
      voronoi.renderCell(cell.index, ctx)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fill()
      ctx.closePath()
    }
    vs.push(ctx.getImageData(0, 0, size, size))
  }
  for(let i = 0; i < mask.data.length; i++) {
    let R = vs[0].data.slice(i * 4, i * 4 + 4)
    let G = vs[1].data.slice(i * 4, i * 4 + 4)
    let B = [0xee, 0xee, 0xee, 255]
    // B = [255, 255, 255, 255]
    let [r, g, b] = mask.data.slice(i * 4, i * 4 + 4)
    let m = r + g + b
    for(let j = 0; j < 4; j++)
      mask.data[i * 4 + j] = R[j] * r / m + G[j] * g / m + B[j] * b / m
  }
  ctx.putImageData(mask, 0, 0)
}

function text(mode: "fill" | "stroke", text: string, x: number, y: number, width: number, height: number){
  let size = measure(text)
  let scale = Math.min(height / size[1], width / size[0])
  let rw = scale * size[0]
  let rh = scale * size[1]
  console.log(size, width, height, rw, rh)
  // ctx.fillRect(x + (width - rw) / 2, y + (height - rh) / 2, rw, rh)
  ctx.font = `bold ${scale}px Inconsolata`
  ctx.textBaseline = "middle"
  ctx[`${mode}Text` as const](text, x + (width - rw) / 2, y + height / 2)
}

let measureMemo: Record<string, readonly [number, number]> = {}

function measure(str: string){
  return measureMemo[str] ??= (() => {
    let measureSpan = document.createElement("span")
    let measureSize = 1000
    measureSpan.textContent = str
    measureSpan.style.font = `${measureSize}px Inconsolata`
    measureSpan.style.whiteSpace = "pre"
    document.body.appendChild(measureSpan)
    console.log(measureSpan.clientWidth)
    let x = [measureSpan.offsetWidth / measureSize, measureSpan.offsetHeight / measureSize] as const
    // document.body.removeChild(measureSpan)
    return x
  })()
}

tick()



/***/

tick()
