import * as rs from "../pkg/index.js"
import { createTile } from "./tileObj"
import { tileSize } from "./constants"
import { examples } from "./examples"
import * as t from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls"
import { Object3D } from "three"

console.log(rs.hi())

let canvas = document.getElementById("canvas") as HTMLCanvasElement

const scene = new t.Scene()
const camera = new t.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200)
const renderer = new t.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.physicallyCorrectLights = true

let light = new t.DirectionalLight()
light.position.set(-2, 5, -10)
light.intensity = 1
light.updateMatrixWorld()
scene.add(light)
scene.add(new t.AmbientLight(0xffffff, 2))

scene.updateMatrixWorld = function(force: boolean){
  if(force)
    Object3D.prototype.updateMatrixWorld.call(this, force)
}

let tiles: Record<string, [t.Object3D, string]> = {}
let program = rs.Program.new(examples.cgol)

let interval = setInterval(() => {
  if(!program.step())
    clearTimeout(interval)
  updateMosaic()
}, 1000)

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
    camera.updateProjectionMatrix()
  }
  trackballControls.update()
  const dist = orbitControls.getDistance()
  orbitControls.minPolarAngle = orbitControls.maxPolarAngle = Math.PI / 2 *  (1 - dist / 150) ** 2
  orbitControls.update()
  renderer.render(scene, camera)
}


function updateMosaic(){
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
        console.log(str![1])
        let tile = getTile("#05f", "#0f5", str![1])
        tile.position.set(x * tileSize, 0, y * tileSize)
        tile.updateMatrixWorld()
        scene.add(tile)
        tiles[key] = [tile, str!]
      }
      else
        delete tiles[key]
    }
}

let tilePool: Record<string, t.Object3D[]> = {}
function getTile(bg: string, fg: string, symb: string){
  let key = `${bg}/${fg}/${symb}`
  let existing = (tilePool[key] ??= []).pop()
  if(existing) return existing
  let tile = createTile(bg, fg, symb)
  tile.name = key
  return tile
}

updateMosaic()
tick()
