
import fs from "fs"
import { deflateRaw } from "zlib"
const input = fs.readFileSync(process.argv[2], "utf8")

let quilt = input.split("\n").map(x => x.split(""))
let signals = new Map<string, number>()

let dirs: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]]

for(let i = 0; i < quilt.length; i++)
  for(let j = 0; j < quilt[i].length; j++) {
    let c = quilt[i][j]
    if(c.toLowerCase() === c.toUpperCase() && c !== " ") throw new Error("invalid char")
    let f = (I: number, J: number) => c.toLowerCase() === quilt[i + I]?.[j + J]?.toLowerCase()
    if(dirs.every(x => !f(...x)))
      if(c !== " ") {
        console.log("hi", c)
        if(c === c.toUpperCase())signals.set([i, j] + "", 0)
        quilt[i][j] = c.toUpperCase()
      }
  }

while(signals.size) {
  print()
  let newSignals: typeof signals = new Map()
  for(let [sig, d] of signals) {
    let [i, j] = sig.split(",").map(x => +x)
    let c = quilt[i][j]
    let to = (dirs.map(([I, J], d) =>
      c.toLowerCase() === quilt[i + I]?.[j + J]?.toLowerCase() ? 1 << d : 0,
    ).reduce((a, b) => a | b, 0) & ~d)
    || dirs.map(([I, J], d) => {
      let o = quilt[i + I]?.[j + J]
      return o && c.toLowerCase() !== o.toLowerCase() && o !== " " && o === o.toUpperCase() ? 1 << d : 0
    }).reduce((a, b) => a | b, 0)
    for(let [d, [I, J]] of dirs.entries())
      if(to & (1 << d)) {
        let k = [i + I, j + J] + ""
        newSignals.set(k, (newSignals.get(k) ?? 0) | (1 << ((d + 2) % 4)))
      }
  }
  for(let [sig, d] of newSignals)
    if(d.toString(2).split("").filter(x => +x).length !== 1)
      newSignals.delete(sig)
  signals = newSignals
}

print()

function print(){
  console.clear()
  console.log(quilt.map((x, i) => x.map((x, j) => !signals.has([i, j] + "") ? "\x1b[2m" + x + "\x1b[0m" : x).join("")).join("\n") + "\n")
  let i = Date.now()
  while(Date.now() < i + 500);
}
