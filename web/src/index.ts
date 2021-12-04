
import * as rs from "../pkg/index.js"
import { Delaunay } from "d3-delaunay"

console.log(rs.hi())

const size = 750
const cellSize = 30
const cellVariance = 2

let canvas = document.getElementById("canvas") as HTMLCanvasElement
let ctx = canvas.getContext("2d")!
function makeVoronoi(){
  const points = [...Array(Math.ceil(size / cellSize))].flatMap((_, i) => [...Array(Math.ceil(size / cellSize))].map((_, j) => genPoint(i, j)))
  const delaunay = Delaunay.from(points)
  const voronoi = delaunay.voronoi([0, 0, size, size])
  return voronoi
}


function genPoint(cellX: number, cellY: number){
  return [
    (Math.random() - .5) * cellSize * cellVariance + cellX * cellSize,
    (Math.random() - .5) * cellSize * cellVariance + cellY * cellSize,
  ]
}

function tick(){
  // window.requestAnimationFrame(tick)
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "black"
  text("A", 0, 0, size, size)
  let mask = ctx.getImageData(0, 0, size, size)
  setTimeout(() => {
    let voronoi = makeVoronoi()
    let delaunay = voronoi.delaunay
    let x = []
    for(const cell of voronoi.cellPolygons()) {
      let y = 0
      for(const point of [...cell, [delaunay.points[cell.index * 2], delaunay.points[cell.index * 2 + 1]]])
        if(ctx.getImageData(point[0] | 0, point[1] | 0, 1, 1).data.join(",") === "0,0,0,255") {
          y++
        }
      x.push(y > 2)
    }
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "blue"
    console.log(x.length, [...voronoi.cellPolygons()].length)
    console.log(ctx.getImageData(413, 472, 1, 1).data)
    for(const cell of voronoi.cellPolygons()) {
    // if(Math.random() > .1) continue
      ctx.strokeStyle = "white"
      ctx.lineWidth = 5
      ctx.beginPath()
      voronoi.renderCell(cell.index, ctx)
      // ctx.lineTo(delaunay.points[cell.index * 2], delaunay.points[cell.index * 2 + 1])
      // ctx.lineTo(413, 472)
      ctx.stroke()
      ctx.fillStyle = x.shift() ? "blue" : "lightblue"
      ctx.fill()
      ctx.closePath()
    }
  }, 10)
}

function text(text: string, x: number, y: number, width: number, height: number){
  let size = measure(text)
  let scale = Math.min(height / size[1], width / size[0])
  let rw = scale * size[0]
  let rh = scale * size[1]
  console.log(size, width, height, rw, rh)
  // ctx.fillRect(x + (width - rw) / 2, y + (height - rh) / 2, rw, rh)
  ctx.font = `${scale}px Inconsolata`
  ctx.textBaseline = "middle"
  ctx.fillText(text, x + (width - rw) / 2, y + height / 2)
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
