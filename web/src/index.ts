
import * as rs from "../pkg/index.js"
import { Delaunay } from "d3-delaunay"

console.log(rs.hi())

const size = 750
const cellVariance = 1

let canvas = document.getElementById("canvas") as HTMLCanvasElement
let ctx = canvas.getContext("2d")!
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


export {}
