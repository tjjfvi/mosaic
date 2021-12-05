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
  let letterPoly = getLetter("&")
  let letterBsp = polygonToBsp(letterPoly)
  {
    let voronoi = makeVoronoi(p => true || !pointInsideBsp(letterBsp, p), 100)
    // for(const x of letterPoly) drawPolygon(x)
    for(const cell of voronoi.cellPolygons()) {
      let poly = cell.reverse() as never as Point[]
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...diff(origBsp, letterBsp)]
      // for(let x of [...bspToConvexPolygons(addEdgesToBsp(null, [...diffedEdges]), [])])
      //   drawPolygon(x)
      for(let x of reconstructPolygon(diffedEdges))
        drawPolygon(x)
    }
  }
  {
    let voronoi = makeVoronoi(p => !!pointInsideBsp(letterBsp, p), 45)
    for(const x of letterPoly) drawPolygon(x)
    for(const cell of voronoi.cellPolygons()) {
      let poly = cell as never as Point[]
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...intersect(origBsp, letterBsp)]
      // for(let x of [...bspToConvexPolygons(addEdgesToBsp(null, [...diffedEdges]), [])])
      //   drawPolygon(x)
      for(let x of reconstructPolygon(diffedEdges))
        drawPolygon(x)
    }
  }
}

function reconstructPolygon(edges: Edge[]): Point[][]{
  let polys: Point[][] = []
  while(edges.length) {
    polys.push([...edges.pop()!])
    while(edges.length) {
      let i = edges.findIndex(x => v.mag(v.sub(polys[polys.length - 1].slice(-1)[0], x[0])) < 0.0001)
      if(i === -1) break
      polys[polys.length - 1].push(edges.splice(i, 1)[0][1])
    }
  }
  return polys
}

function* bspToConvexPolygons(bsp: Bsp, edges: Edge[]): IterableIterator<Point[]>{
  if(bsp == null) {
    return yield reconstructPolygon(edges)[0]
    let points = [...edges[0]]
    while(points.length < edges.length)
      points.push(edges.find(x => v.mag(v.sub(points[points.length - 1], x[0])) < 0.0001)![1])
    return yield points
  }
  let leftEdges: Edge[] = []
  let rightEdges: Edge[] = []
  let both: Edge[] = [[v.sub(bsp.line[0], v.rsz(v.sub(...bsp.line), 10000)), v.add(bsp.line[0], v.rsz(v.sub(...bsp.line), 10000))]]
  splitEdges(bsp.line, edges, {
    left: leftEdges,
    right: rightEdges,
    co: [],
    opp: [],
  })
  leftEdges = trimConvex([...leftEdges, ...both])
  rightEdges = trimConvex([...rightEdges, ...both.map(x => x.slice().reverse()) as Edge[]])
  yield* bspToConvexPolygons(bsp.left, leftEdges)
  if(bsp.right)
    yield* bspToConvexPolygons(bsp.right, rightEdges)
}

function trimConvex(edges: Edge[]){
  for(let i = 0; i < edges.length; i++) {
    let newEdges: Edge[] = []
    splitEdges(edges[i], edges, {
      left: [],
      right: newEdges,
      co: newEdges,
      opp: [],
    })
    edges = newEdges
  }
  return edges
}

function* bspEdges(bsp: Bsp): IterableIterator<Edge>{
  if(!bsp) return
  yield* bsp.segments
  yield* bspEdges(bsp.left)
  yield* bspEdges(bsp.right)
}

function allPolyEdges(poly: Point[][]): [Point, Point][]{
  return poly.flatMap(x => x.map((y, i) => [y, x[(i + 1) % x.length]]))
}

function* intersect(aBsp: Bsp,  bBsp: Bsp){
  yield* clipEdges(bBsp, [...bspEdges(aBsp)], true, false)
  yield* clipEdges(aBsp, [...bspEdges(bBsp)], true, true)
}

function* diff(aBsp: Bsp, bBsp: Bsp){
  bBsp = invert(bBsp)
  yield* clipEdges(bBsp, [...bspEdges(aBsp)], true, false)
  yield* clipEdges(aBsp, [...bspEdges(bBsp)], true, true)
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
  // console.log(poly)
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
  return addEdgesToBsp(null, allPolyEdges(polygon))
}

function addEdgesToBsp(bsp: Bsp, edges: Edge[]): Bsp{
  if(!edges.length) return bsp
  if(bsp === null) bsp = { line: edges[0], segments: [edges.shift()!], left: null, right: null }
  let leftEdges: Edge[] = []
  let rightEdges: Edge[] = []
  splitEdges(bsp.line, edges, {
    left: leftEdges,
    right: rightEdges,
    co: bsp.segments,
    opp: [],
  })
  bsp.left = addEdgesToBsp(bsp.left, leftEdges)
  bsp.right = addEdgesToBsp(bsp.right, rightEdges)
  return bsp
}

type Edge = [Point, Point]
function splitEdges(line: [Point, Point], edges: [Point, Point][], groups: Record<"left" | "right" | "co" | "opp", Edge[]>){
  for(const edge of edges) {
    let pSide = getSide(line, edge[0])
    let qSide = getSide(line, edge[1])
    if((pSide || qSide) === (qSide || pSide)) {
      let side = pSide || qSide
      if(side === 0)
        if(v.dot(v.sub(...edge), v.sub(...line)) > 0)
          groups.co.push(edge)
        else
          groups.opp.push(edge)
      else if(side === -1)
        groups.left.push(edge)
      else if(side === 1)
        groups.right.push(edge)
      else throw new Error("invalid side " + side)
    }
    else {
      let [, middle] = intersectLineSegments(line, edge)
      let pEdge: Edge = [edge[0], middle]
      let qEdge: Edge = [middle, edge[1]]
      for(let [side, edge] of [[pSide, pEdge], [qSide, qEdge]] as const)
        if(side === -1)
          groups.left.push(edge)
        else if(side === 1)
          groups.right.push(edge)
        else throw new Error("invalid side " + [pSide, qSide, side, edge])
    }
  }
}

function* clipEdges(bsp: Bsp, edges: [Point, Point][], inside: boolean, cplnb: boolean): IterableIterator<[Point, Point]>{
  if(bsp === null) return yield* edges
  let leftEdges: Edge[] = []
  let rightEdges: Edge[] = []
  splitEdges(bsp.line, edges, {
    left: leftEdges,
    right: rightEdges,
    co: !inside ? leftEdges : rightEdges,
    opp: cplnb === inside ? leftEdges : rightEdges,
  })
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
  rsz: (a: Point, b: number = 1)  => v.scl(a, b / Math.sqrt(v.dot(a, a))),
  mag: (a:Point) => Math.sqrt(v.dot(a, a)),
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

const size = 750
const cellVariance = 1
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


/*
console.log(rs.hi())

// let canvas = document.getElementById("canvas") as HTMLCanvasElement
// let ctx = canvas.getContext("2d")!


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
