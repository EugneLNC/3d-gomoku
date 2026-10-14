import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { GameEngine } from '../game/GameEngine'
import type { CellPosition, MoveFailureReason, PlayerId } from '../game/types'

const CELL_SIZE = 1
const PIECE_RADIUS = 0.31

interface GameSceneCallbacks {
  onHover: (position: CellPosition | null, reason: MoveFailureReason | null) => void
  onSelect: (position: CellPosition) => void
}

export class GameScene {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  private readonly controls: OrbitControls
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly pieces = new THREE.Group()
  private readonly layerGroup = new THREE.Group()
  private readonly markerMesh: THREE.InstancedMesh
  private readonly layerPlane: THREE.Mesh
  private readonly preview: THREE.Mesh
  private selectedLayer = 0
  private hovered: CellPosition | null = null
  private pointerDown = { x: 0, y: 0 }
  private markerPositions: CellPosition[] = []

  constructor(
    private readonly container: HTMLElement,
    private readonly game: GameEngine,
    private readonly callbacks: GameSceneCallbacks,
  ) {
    this.scene.background = new THREE.Color(0x071016)
    this.scene.fog = new THREE.FogExp2(0x071016, 0.025)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.container.append(this.renderer.domElement)

    const center = new THREE.Vector3(
      (game.config.width - 1) / 2,
      0,
      (game.config.depth - 1) / 2,
    )
    this.camera.position.set(
      game.config.width * 1.45,
      game.config.maxZ * 1.35,
      game.config.depth * 1.65,
    )
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.copy(center)
    this.controls.enableDamping = true
    this.controls.minDistance = 8
    this.controls.maxDistance = 42

    this.scene.add(new THREE.HemisphereLight(0xbdeaff, 0x12202a, 2.1))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
    keyLight.position.set(8, 14, 10)
    keyLight.castShadow = true
    this.scene.add(keyLight)

    this.createBoardFrame()
    this.scene.add(this.pieces, this.layerGroup)

    const markerGeometry = new THREE.SphereGeometry(0.075, 8, 8)
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0x8dc9d6,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    const layerCount = game.config.maxZ - game.config.minZ + 1
    const total = game.config.width * game.config.depth * layerCount
    this.markerMesh = new THREE.InstancedMesh(markerGeometry, markerMaterial, total)
    const matrix = new THREE.Matrix4()
    let index = 0
    for (let z = game.config.minZ; z <= game.config.maxZ; z += 1) {
      for (let y = 0; y < game.config.depth; y += 1) {
        for (let x = 0; x < game.config.width; x += 1) {
          const position = { x, y, z }
          this.markerPositions.push(position)
          matrix.setPosition(this.toWorld(position))
          this.markerMesh.setMatrixAt(index, matrix)
          index += 1
        }
      }
    }
    this.markerMesh.instanceMatrix.needsUpdate = true
    this.scene.add(this.markerMesh)

    this.layerPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(game.config.width - 0.3, game.config.depth - 0.3),
      new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    this.layerPlane.rotation.x = -Math.PI / 2
    this.layerPlane.position.set(
      (game.config.width - 1) / 2,
      0,
      (game.config.depth - 1) / 2,
    )
    this.layerGroup.add(this.layerPlane)

    this.preview = new THREE.Mesh(
      new THREE.SphereGeometry(PIECE_RADIUS * 1.05, 24, 18),
      new THREE.MeshStandardMaterial({
        color: game.currentPlayer.color,
        emissive: game.currentPlayer.color,
        emissiveIntensity: 0.18,
        transparent: true,
        opacity: 0.52,
        roughness: 0.25,
      }),
    )
    this.preview.visible = false
    this.scene.add(this.preview)

    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp)
    window.addEventListener('resize', this.resize)
    this.resize()
    this.sync()
    this.animate()
  }

  private createBoardFrame(): void {
    const { width, depth, minZ, maxZ } = this.game.config
    const gridPoints: number[] = []
    for (let x = 0; x < width; x += 1) {
      gridPoints.push(x, 0, 0, x, 0, depth - 1)
    }
    for (let y = 0; y < depth; y += 1) {
      gridPoints.push(0, 0, y, width - 1, 0, y)
    }
    const gridGeometry = new THREE.BufferGeometry()
    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3))
    const grid = new THREE.LineSegments(
      gridGeometry,
      new THREE.LineBasicMaterial({
        color: 0x49cfc8,
        transparent: true,
        opacity: 0.68,
      }),
    )
    this.scene.add(grid)

    const centralPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 1, depth - 1),
      new THREE.MeshBasicMaterial({
        color: 0x123c45,
        transparent: true,
        opacity: 0.26,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    centralPlane.rotation.x = -Math.PI / 2
    centralPlane.position.set((width - 1) / 2, -0.015, (depth - 1) / 2)
    this.scene.add(centralPlane)

    const box = new THREE.BoxGeometry(width - 1, maxZ - minZ, depth - 1)
    const edges = new THREE.EdgesGeometry(box)
    const frame = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x397582, transparent: true, opacity: 0.32 }),
    )
    frame.position.set((width - 1) / 2, (minZ + maxZ) / 2, (depth - 1) / 2)
    this.scene.add(frame)

    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, minZ, 0),
      new THREE.Vector3(0, maxZ, 0),
    ])
    this.scene.add(
      new THREE.Line(
        axisGeometry,
        new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.8 }),
      ),
    )
  }

  private toWorld(position: CellPosition): THREE.Vector3 {
    return new THREE.Vector3(
      position.x * CELL_SIZE,
      position.z * CELL_SIZE,
      position.y * CELL_SIZE,
    )
  }

  setSelectedLayer(layer: number): void {
    this.selectedLayer = Math.max(
      this.game.config.minZ,
      Math.min(this.game.config.maxZ, layer),
    )
    this.layerPlane.position.y = this.selectedLayer
    this.hovered = null
    this.preview.visible = false
  }

  sync(): void {
    this.pieces.clear()
    for (const { position, playerId } of this.game.board.entries()) {
      const player = this.game.getPlayer(playerId)
      const material = new THREE.MeshStandardMaterial({
        color: player.color,
        emissive: player.color,
        emissiveIntensity: 0.12,
        roughness: 0.2,
        metalness: 0.18,
      })
      const piece = new THREE.Mesh(
        new THREE.SphereGeometry(PIECE_RADIUS, 28, 20),
        material,
      )
      piece.position.copy(this.toWorld(position))
      piece.castShadow = true
      piece.userData.playerId = playerId
      this.pieces.add(piece)
    }
    this.updatePreview()
  }

  flashCleared(positions: CellPosition[], playerId: PlayerId): void {
    if (positions.length === 0) return
    const color = this.game.getPlayer(playerId).color
    positions.forEach((position) => {
      const ring = new THREE.Mesh(
        new THREE.SphereGeometry(PIECE_RADIUS * 1.35, 18, 12),
        new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity: 0.8,
        }),
      )
      ring.position.copy(this.toWorld(position))
      this.scene.add(ring)
      const start = performance.now()
      const fade = (now: number) => {
        const t = Math.min(1, (now - start) / 360)
        ring.scale.setScalar(1 + t * 0.9)
        ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t)
        if (t < 1) requestAnimationFrame(fade)
        else {
          this.scene.remove(ring)
          ring.geometry.dispose()
          ;(ring.material as THREE.Material).dispose()
        }
      }
      requestAnimationFrame(fade)
    })
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private pick(event: PointerEvent): CellPosition | null {
    this.updatePointer(event)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects([this.markerMesh, this.layerPlane], false)
    if (hits.length === 0) return null
    const hit = hits[0]
    if (hit.object === this.markerMesh && hit.instanceId !== undefined) {
      return this.markerPositions[hit.instanceId]
    }
    const point = hit.point
    return {
      x: Math.max(0, Math.min(this.game.config.width - 1, Math.round(point.x))),
      y: Math.max(0, Math.min(this.game.config.depth - 1, Math.round(point.z))),
      z: this.selectedLayer,
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const position = this.pick(event)
    this.hovered = position
    const reason = position ? this.game.getMoveFailure(position) : null
    this.callbacks.onHover(position, reason)
    this.updatePreview()
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY }
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const moved = Math.hypot(
      event.clientX - this.pointerDown.x,
      event.clientY - this.pointerDown.y,
    )
    if (moved < 5) {
      const position = this.pick(event)
      if (position) this.callbacks.onSelect(position)
    }
  }

  private updatePreview(): void {
    if (!this.hovered || this.game.state.status !== 'playing') {
      this.preview.visible = false
      return
    }
    const reason = this.game.getMoveFailure(this.hovered)
    const material = this.preview.material as THREE.MeshStandardMaterial
    const color = reason ? 0xff334f : this.game.currentPlayer.color
    material.color.setHex(color)
    material.emissive.setHex(color)
    this.preview.position.copy(this.toWorld(this.hovered))
    this.preview.visible = true
  }

  private readonly resize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / Math.max(height, 1)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private animate = (): void => {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.animate)
  }
}
