import * as rs from "../pkg/index.js"
import { Point, reconstructPolygon } from "./geo"
import { getLetterPolygon } from "./getLetterPolygon"
import { diff, intersect, pointInsideBsp, polygonToBsp } from "./bsp"
import { makeVoronoi } from "./voronoi"
import { addGrout } from "./addGrout"

console.log(rs.hi())

let canvas = document.getElementById("canvas") as HTMLCanvasElement
let ctx = canvas.getContext("2d")!

const size = 750

function tick(){
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx.fillStyle = "#eee"
  ctx.fillRect(0, 0, size, size)
  let letterPoly = getLetterPolygon("@", size)
  // for(let x of letterPoly) {
  //   ctx.lineWidth = 2
  //   drawPolygon(x)
  //   ctx.lineWidth = 1
  //   drawPolygon(addGrout(x))
  // }
  ctx.strokeStyle = "#fff"
  {
    let letterBsp = polygonToBsp(letterPoly.map(x => addGrout(x.slice().reverse(), .1)!.reverse()))
    ctx.fillStyle = "#03f"
    let voronoi = makeVoronoi(p => !pointInsideBsp(letterBsp, p), size, 70)
    for(const cell of voronoi.cellPolygons()) {
      let poly = (cell.slice(1).reverse() as never as Point[])
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...diff(origBsp, letterBsp)]
      for(let x of reconstructPolygon(diffedEdges)) {
        // console.log(x)
        let g = addGrout(x)
        if(g)
          drawPolygon(g)
      }
    }
  }
  {
    ctx.fillStyle = "#0f3"
    let letterBsp = polygonToBsp(letterPoly.map(x => addGrout(x.slice(), .1)!))
    let voronoi = makeVoronoi(p => !!pointInsideBsp(letterBsp, p), size, 45)
    for(const cell of voronoi.cellPolygons()) {
      let poly = (cell.slice(1).reverse() as never as Point[])
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...intersect(origBsp, letterBsp)]
      for(let x of reconstructPolygon(diffedEdges)) {
        // console.log(x)
        let g = addGrout(x, 1)
        if(g)
          drawPolygon(g)
      }
    }
  }
}

function drawPolygon(poly: Point[]){
  // console.log(poly)
  ctx.beginPath()
  ctx.moveTo(...poly[poly.length - 1])
  for(const p of poly)
    ctx.lineTo(...p)
  // ctx.stroke()
  ctx.fill()
  ctx.closePath()
  // for(const [i, p] of poly.entries())
  //   ctx.fillRect(...p, i + 10, i + 10)
}

tick()
