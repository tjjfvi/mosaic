import * as rs from "../pkg/index.js"
import { createTile } from "./tileObj"
import { tileSize } from "./constants"
import { examples } from "./examples"
import * as t from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls"

console.log(rs.hi())

let canvas = document.getElementById("canvas") as HTMLCanvasElement

const scene = new t.Scene()
const camera = new t.PerspectiveCamera(75, 0, 0.1, 250)
const renderer = new t.WebGLRenderer({ canvas, antialias: true })
renderer.physicallyCorrectLights = true

const code = document.getElementById("code") as HTMLTextAreaElement
code.value = examples.fib
const errorBox = document.getElementById("error")!
const controlsBox = document.getElementById("controls")!
const speedBox = document.getElementById("speedBox")!
const speedInput = document.getElementById("speed")!
const pauseButton = document.getElementById("pause")!
const stepButton = document.getElementById("step")!

let light = new t.DirectionalLight()
light.position.set(-2, 5, -10)
light.intensity = 1
light.updateMatrixWorld()
scene.add(light)
scene.add(new t.AmbientLight(0xffffff, 2))

const groutColor = "#141921"
const skyColor = "#4f5e80"
const [skyBoxUp, skyBoxDown, skyBoxSide] = [[skyColor, skyColor], [groutColor, groutColor], [skyColor, groutColor]].map(([a, b]) => {
  let canvas = document.createElement("canvas")
  canvas.width = 1000
  canvas.height = 1000
  let ctx = canvas.getContext("2d")!
  let grd = ctx.createLinearGradient(0, 0, 0, 500)
  grd.addColorStop(0, a)
  grd.addColorStop(1, b)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 1000, 500)
  ctx.fillStyle = b
  ctx.fillRect(0, 500, 1000, 500)
  return canvas
})
scene.background = new t.CubeTexture([
  skyBoxSide,
  skyBoxSide,
  skyBoxUp,
  skyBoxDown,
  skyBoxSide,
  skyBoxSide,
])
scene.background.needsUpdate = true
scene.fog = new t.Fog(skyColor, 175, 250)

scene.autoUpdate = false

code.addEventListener("change", onChange)
function onChange(){
  for(let k in tiles) {
    let tile = tiles[k][0]
    scene.remove(tile)
    tilePool[tile.name].push(tile)
    delete tiles[k]
  }
  program?.free()
  program = undefined
  try {
    program = rs.Program.new(code.value)
  }
  catch (e) {
    errorBox.textContent = `Error: ${e}`
    controlsBox.style.display = "none"
    return
  }
  errorBox.textContent = ""
  controlsBox.style.display = "flex"
  console.log(program)
  run()
}

let tiles: Record<string, [t.Object3D, string]> = {}
let program: rs.Program | undefined
let paused = false
let speed = 100

pauseButton.addEventListener("click", () => {
  paused = !paused
  pauseButton.textContent = paused ? "Play" : "Pause"
  if(!paused) {
    clearTimeout(timeout)
    run()
  }
})

speedInput.addEventListener("blur", () => {
  let newSpeed = +speedInput.textContent!
  if(isNaN(newSpeed)) newSpeed = speed
  if(newSpeed < 10) newSpeed = 10
  speed = newSpeed
  speedInput.textContent = speed + ""
  clearTimeout(timeout)
  run()
})

stepButton.addEventListener("click", step)

speedBox.addEventListener("click", () => {
  speedInput.focus()
})

let timeout: number | undefined
function run(){
  if(!paused && step())
    timeout = setTimeout(run, speed)
}

function step(){
  if(!program) return false
  let r = program.step()
  updateMosaic()
  return r
}

camera.position.set(0, 50, 0)

const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target.set(0, 0, 0)
orbitControls.enableDamping = true
orbitControls.dampingFactor = 0.05
orbitControls.screenSpacePanning = false
orbitControls.enableRotate = false
orbitControls.mouseButtons.LEFT = t.MOUSE.PAN
orbitControls.enableZoom = false
const trackballControls = new TrackballControls(camera, renderer.domElement)
trackballControls.noRoll = true
trackballControls.noPan = true
trackballControls.noRotate = true
trackballControls.minDistance = 5
trackballControls.maxDistance = 150
trackballControls.target = orbitControls.target

orbitControls.maxPolarAngle = Math.PI * .45

function tick(){
  window.requestAnimationFrame(tick)
  if(canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.setViewOffset(window.innerWidth * 4 / 3, window.innerHeight, 0, 0, window.innerWidth, window.innerHeight)
    camera.updateProjectionMatrix()
  }
  trackballControls.update()
  const dist = orbitControls.getDistance()
  orbitControls.minPolarAngle = orbitControls.maxPolarAngle = Math.PI / 2 *  (1 - dist / 150) ** 2
  orbitControls.update()
  renderer.render(scene, camera)
}


const fg = new t.Color("#fff")
function updateMosaic(){
  if(!program) return
  let { x_min, x_max, y_min, y_max } = program.grid_region()
  for(let x = x_min; x <= x_max; x++)
    for(let y = y_min; y <= y_max; y++) {
      let key = `${x},${y}`
      let cell = program.grid_get(x, y)
      let str = cell ? cell.color + cell.symbol : undefined
      if((tiles[key]?.[1] ?? "..") === (str ?? "..")) continue
      if(tiles[key]) {
        let tile = tiles[key][0]
        scene.remove(tile)
        tilePool[tile.name]!.push(tile)
      }
      if((str ?? "..") !== "..") {
        let color = getColor(str![0])
        let char = str![1] === "." ? " " : str![1]
        let tile = getTile(color, fg, char)
        tile.position.set(x * tileSize, 0, y * tileSize)
        tile.updateMatrixWorld()
        scene.add(tile)
        tiles[key] = [tile, str!]
      }
      else
        delete tiles[key]
    }
}

let colors: Record<string, t.Color> = {
  ".": new t.Color("#111"),
}
function getColor(c: string){
  if(colors[c])
    return colors[c]
  let color = new t.Color()
  let n = c.charCodeAt(0)
  let hue = Math.random() * 256 | 0 // (n * ~n) % 256
  color.setHSL(hue / 256, .9, .4)
  return colors[c] = color
}


let tilePool: Record<string, t.Object3D[]> = {}
function getTile(bg: t.Color, fg: t.Color, symb: string){
  let key = [bg.r, bg.b, bg.g, fg.r, fg.g, fg.b, symb].join(",")
  let existing = (tilePool[key] ??= []).pop()
  if(existing) return existing
  let tile = createTile(bg, fg, symb)
  tile.name = key
  return tile
}

onChange()
tick()
