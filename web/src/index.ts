import * as rs from "../pkg/index.js"
import { Point, reconstructPolygon } from "./geo"
import { getSymbolPolygon } from "./getSymbolPolygon"
import { diff, intersect, pointInsideBsp, polygonToBsp } from "./bsp"
import { makeVoronoi } from "./voronoi"
import { addGrout } from "./addGrout"

console.log(rs.hi())

let canvas = document.getElementById("canvas") as HTMLCanvasElement
let ctx = canvas.getContext("2d")!

const size = 750
const bgCellSize = size / 11
const fgCellSize = size / 17
const symbolGrout = .1

function tick(){
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx.fillStyle = "#eee"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let symbolPoly = getSymbolPolygon("@", size)
  for(const [fillColor, isFg, cellSize] of [["#03f", false, bgCellSize], ["#0f3", true, fgCellSize]] as const) {
    ctx.fillStyle = fillColor
    let letterBsp = polygonToBsp(symbolPoly.map(x => addGrout(x, symbolGrout, !isFg)!))
    let voronoi = makeVoronoi(p => isFg === !!pointInsideBsp(letterBsp, p), size, cellSize)
    for(const poly of voronoi) {
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...(isFg ? intersect : diff)(origBsp, letterBsp)]
      for(let x of reconstructPolygon(diffedEdges)) {
        let g = addGrout(x)
        if(g)
          fillPolygon(g)
      }
    }
  }
}

function strokePolygon(poly: Point[]){
  ctx.beginPath()
  ctx.moveTo(...poly[poly.length - 1])
  for(const p of poly)
    ctx.lineTo(...p)
  ctx.stroke()
  ctx.closePath()
}

function fillPolygon(poly: Point[]){
  ctx.beginPath()
  ctx.moveTo(...poly[poly.length - 1])
  for(const p of poly)
    ctx.lineTo(...p)
  ctx.fill()
  ctx.closePath()
}

tick()
