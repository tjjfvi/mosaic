import { allPolyEdges, Point, reconstructPolygon, v } from "./geo"
import { getSymbolPolygon } from "./getSymbolPolygon"
import { bspToConvexPolygons, diff, intersect, pointInsideBsp, polygonToBsp } from "./bsp"
import { makeVoronoi } from "./voronoi"
import { addGrout } from "./addGrout"
import { size, bgCellSize, fgCellSize, symbolGrout, thickness, tileSize, colorVariation } from "./constants"
import * as t from "three"

interface Stone {
  poly: Point[],
  color: t.Color,
  roughness: number,
  metalness: number,
  slantDir: number,
  slantSlope: number,
  center: Point,
}

export function createTile(bgColor: t.Color, fgColor: t.Color, symbol: string){
  let symbolPoly = getSymbolPolygon(symbol, size)

  const stones: Stone[] = []

  for(const [fillColor, isFg, cellSize] of [[bgColor, false, bgCellSize], [fgColor, true, fgCellSize]] as const) {
    let letterBsp = polygonToBsp(symbolPoly.map(x => addGrout(x, symbolGrout, !isFg)!))
    let voronoi = makeVoronoi(p => isFg === !!pointInsideBsp(letterBsp, p), size, cellSize)
    for(const poly of voronoi) {
      let origBsp = polygonToBsp([poly])
      let diffedEdges = [...(isFg ? intersect : diff)(origBsp, letterBsp)]
      for(let x of reconstructPolygon(diffedEdges)) {
        let g = addGrout(x)
        if(g) {
          let color = new t.Color(fillColor)
          let hsl = { h: 0, s: 0, l: 0 }
          color.getHSL(hsl)
          hsl.h = (1 + hsl.h + (Math.random() - .5) * colorVariation.h) % 1
          for(let x of ["s", "l"] as const) {
            hsl[x] = Math.max(Math.min(hsl[x], 1 - colorVariation[x] / 2), colorVariation[x] / 2)
            hsl[x] += (Math.random() - .5) * colorVariation[x]
          }

          color.setHSL(hsl.h, hsl.s, hsl.l)
          let min = g.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1])])
          let max = g.reduce((a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1])])
          let center = [min[0] / 2 + max[0] / 2, min[1] / 2 + max[1] / 2] as const
          let slantDir = Math.random() * Math.PI * 2
          let slantAmount = Math.random() * thickness
          let slantSlope = slantAmount / (v.mag(v.sub(max, min)) * tileSize / size)

          stones.push({
            poly: g,
            color,
            roughness: .35 + Math.random() * .05,
            metalness: .05 + Math.random() * .05,
            slantDir,
            slantSlope,
            center,
          })
        }
      }
    }
  }

  const lod = new t.LOD()
  lod.addLevel(highResTile(stones), 40)
  lod.addLevel(lowResTile(stones), 50)
  return lod
}

function lowResTile(stones: Stone[]){
  const textureSize = 500

  const createTexture = () => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    canvas.width = textureSize
    canvas.height = textureSize
    const texture = new t.CanvasTexture(canvas)
    ctx.imageSmoothingQuality = "high"
    texture.onUpdate = () => delete texture.image
    return [ctx, new t.CanvasTexture(canvas)] as const
  }

  const [albedo, albedoMap] = createTexture()
  const [surface, surfaceMap] = createTexture()
  const [normal, normalMap] = createTexture()

  albedo.fillStyle = rgb(0, 0, 0)
  surface.fillStyle = rgb(0, 1, 0)
  normal.fillStyle = rgb(.5, .5, 1)
  for(const ctx of [albedo, surface, normal])
    ctx.fillRect(0, 0, textureSize, textureSize)


  for(const stone of stones) {
    albedo.fillStyle = rgb(stone.color.r, stone.color.g, stone.color.b)
    surface.fillStyle = rgb(0, stone.roughness, stone.metalness)
    const h = Math.sqrt(1 / stone.slantSlope ** 2 + 1)
    let x = [Math.cos(stone.slantDir) * .5 / h + .5, -Math.sin(stone.slantDir) * .5 / h + .5, 1 / stone.slantSlope * .5 / h + .5] as const
    normal.fillStyle = rgb(...x)
    for(const ctx of [albedo, surface, normal]) {
      ctx.beginPath()
      ctx.moveTo(...v.scl(stone.poly[stone.poly.length - 1], textureSize / size))
      for(let p of stone.poly)
        ctx.lineTo(...v.scl(p, textureSize / size))
      ctx.fill()
      ctx.fill()
      ctx.closePath()
    }
  }

  const geo = new t.PlaneGeometry(tileSize, tileSize)
  const mat = new t.MeshStandardMaterial({ transparent: true })
  mat.map = albedoMap
  mat.roughnessMap = surfaceMap
  mat.metalnessMap = surfaceMap
  mat.normalMap = normalMap
  mat.normalMapType = t.ObjectSpaceNormalMap

  const tile = new t.Mesh(geo, mat)
  tile.rotation.x = -Math.PI / 2
  tile.position.y = thickness

  return tile

  function rgb(r: number, g: number, b: number){
    return `rgb(${r * 256 | 0}, ${g * 256 | 0}, ${b * 256 | 0})`
  }
}

function highResTile(stones: Stone[]){
  const tile = new t.Group()
  for(let stone of stones) {

    let edges = allPolyEdges([stone.poly])
    let polys = [...bspToConvexPolygons(polygonToBsp([stone.poly]), [])]

    let slantDirV = v.scl([Math.cos(stone.slantDir), Math.sin(stone.slantDir)], stone.slantSlope * tileSize / size)

    let th = (x: number, y: number) =>
      thickness - v.dot(slantDirV, v.sub([x, y], stone.center))

    const topGeo = makeGeo(
      polys.flatMap(poly => poly.length > 2 ? [...Array(poly.length - 2)].flatMap((_, i) =>
        [
          poly[i + 1],
          poly[0],
          poly[i + 2],
        ].map(([x, y]) => [x * tileSize / size, th(x, y), y * tileSize / size]),
      ) : []),
    )

    const sideGeo = makeGeo(
      edges.flatMap(edge =>
        ([
          [edge[1], 1],
          [edge[0], 1],
          [edge[1], 0],
          [edge[0], 1],
          [edge[0], 0],
          [edge[1], 0],
        ] as const).map(([[x, y], z]) =>
            [x * tileSize / size, z * th(x, y), y * tileSize / size] as const,
        ),
      ),
    )

    const topMat = new t.MeshStandardMaterial({
      color: stone.color,
      roughness: stone.roughness,
      metalness: stone.metalness,
    })

    const sideColor = new t.Color(stone.color)
    let hsl = { h: 0, s: 0, l: 0 }
    sideColor.getHSL(hsl)
    sideColor.setHSL(hsl.h, hsl.s * (1 - hsl.l) ** 5, hsl.l * .5)
    const sideMat = new t.MeshStandardMaterial({
      color: sideColor,
    })

    const topMesh = new t.Mesh(topGeo, topMat)
    const sideMesh = new t.Mesh(sideGeo, sideMat)
    tile.add(topMesh, sideMesh)
  }
  tile.position.set(-.5 * tileSize, 0, -.5 * tileSize)
  return tile
}

function makeGeo(verts: (readonly [number, number, number])[]){
  const geometry = new t.BufferGeometry()
  const vertices = new Float32Array(verts.length * 3)

  let i = 0

  for(let v of verts) {
    vertices[i++] = v[0]
    vertices[i++] = v[1]
    vertices[i++] = v[2]
  }

  geometry.setAttribute("position", new t.BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()

  return geometry
}
