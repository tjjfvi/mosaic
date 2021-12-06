
import { Point } from "./geo"
import * as opentype from "opentype.js"
// @ts-ignore
import fontData from "../RobotoMono-Regular.ttf"

const font = opentype.parse(fontData)

export function getLetterPolygon(letter: string){
  let path = font.getPath(letter, 100, 700, 900)
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
