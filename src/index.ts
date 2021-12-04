
console.clear()

import fs from "fs"
const input = fs.readFileSync(process.argv[2], "utf8")

const grids = input.replace(/^\n+|\n+$/g, "").split(/\n\s*([[\]])(?=\n|$)|(?:\n\s*){2,}/).map(x => x?.trim()).filter(x => x)
  .map(x => x.split("\n").map(x => x.trim().split(" ")))

console.log(grids)

const initialGrid = grids[0]

const replacementsArr = grids.slice(1).map((grid): Replacement | string => {
  let g = grid.toString()
  if(g === "[" || g === "]" || g === ".") return grid.toString()
  let blankInds: number[] = []
  for(let j = 0; ; j++) {
    let outOfBounds = true
    let hasOther = false
    for(let i = 0; i < grid.length; i++) {
      let cell = grid[i][j]
      if(cell !== undefined) {
        outOfBounds = false
        if(cell !== "") {
          hasOther = true
          break
        }
      }
    }
    if(outOfBounds) break
    if(!hasOther) blankInds.push(j)
  }
  console.log(grid)
  if(!blankInds.length) throw new Error("Missing separator")
  if(blankInds.slice(0, -1).some((x, i) => blankInds[i + 1] !== x + 1)) throw new Error("More than one separator")
  let left = grid.map(x => x.slice(0, blankInds[0]))
  let right = grid.map(x => x.slice(blankInds[blankInds.length - 1] + 1))
  return [left, right]
})


console.log(initialGrid)
for(const x of replacementsArr)
  console.log(x)

type Replacement = [string[][], string[][]]
type ReplacementsGrouped = Array<Replacement | { loop: ReplacementsGrouped } | ".">
let replacementsGrouped: ReplacementsGrouped = []
let stack = [replacementsGrouped]
for(const x of replacementsArr)
  if(typeof x !== "string")
    stack[stack.length - 1].push(x)
  else if(x === "[")
    stack.push([])
  else if(x === ".")
    stack[stack.length - 1].push(".")
  else
    stack[stack.length - 2].push({ loop: stack.pop()! })

console.log(JSON.stringify(replacementsGrouped, null, 2))

let grid = initialGrid

// printGrid()
run(replacementsGrouped)

function run(commands: ReplacementsGrouped){
  let cont = false
  for(const command of commands)
    if(command === ".") {
      if(cont) printGrid()
    }
    else if("loop" in command) while(run(command.loop)) cont ||= true
    else cont = applyRepl(command) || cont
  return cont
}
function applyRepl([pat, repl]: Replacement): boolean{
  let patWidth = Math.max(...pat.map(x => x.length))
  let patHeight = pat.length
  let gridWidth = Math.max(...grid.map(x => x.length))
  let gridHeight = grid.length
  for(let cornerI = 1 - patHeight; cornerI < gridHeight; cornerI++)
    locate: for(let cornerJ = 1 - patWidth; cornerJ < gridWidth; cornerJ++) {
      for(let patI = 0; patI < pat.length; patI++)
        for(let patJ = 0; patJ < pat[patI].length; patJ++) {
          let gridI = cornerI + patI
          let gridJ = cornerJ + patJ
          if(!match(grid[gridI]?.[gridJ] ?? "", pat[patI][patJ] ?? ""))
            continue locate
        }
      for(; cornerI < 0; cornerI++)
        grid.unshift([])
      for(; cornerJ < 0; cornerJ++)
        grid.forEach(x => x.unshift(".."))
      for(let replI = 0; replI < repl.length; replI++)
        for(let replJ = 0; replJ < repl[replI].length; replJ++) {
          let gridI = cornerI + replI
          let gridJ = cornerJ + replJ
            ;(grid[gridI] ??= [])[gridJ] = apply(grid[gridI]?.[gridJ] ?? "", repl[replI][replJ] ?? "")
        }
      // printGrid()
      return true
    }
  return false
}

function match(cell: string, pat: string){
  return pat.split("").every((x, i) => x === "_" || (cell[i] || ".") === x)
}

function apply(cell: string, repl: string){
  return [...Array(Math.max(cell.length, repl.length))].map((_, i) => (repl[i] ?? "_") === "_" ? cell[i] ?? "." : repl[i]).join("")
}

function printGrid(){
  console.log(grid.map(x => [...x].map(x => (x || "").padEnd(2, ".")).join(" ")).join("\n") + "\n")
}
