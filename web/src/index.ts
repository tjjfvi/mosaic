import * as rs from "../pkg/index.js"
import { createTile } from "./tileObj"
import * as t from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls"
import { Object3D } from "three"
import { tileSize } from "./constants"

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

const chunkSize = 10
let tiles = [...Array(20)].map(x => createTile("#03f", "#0f3", "&"))
for(let i = 0; i < chunkSize; i++)
  for(let j = 0; j < chunkSize; j++) {
    let tile = tiles[(Math.random() * 20) | 0].clone()
    tile.position.set(i * tileSize, 0, j * tileSize)
    scene.add(tile)
    tile.updateMatrixWorld()
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

tick()
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
