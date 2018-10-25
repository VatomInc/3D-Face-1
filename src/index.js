
// Import the THREE.js 3D library
window.THREE = window.THREE || require("three")

// Attach GLTFLoader, which is not yet a core part of THREE.js. It's being actively developed, so get updates from https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/GLTFLoader.js
require("./GLTFLoader.js")

// Other imports
const BaseFace = require('@blockv/sdk/face/faces/BaseFace')
const createThreeDotLoader = require('./ThreeDotLoader')
const Hammer = require('hammerjs')
const AnimationManager = require('./AnimationManager')
const V3DLoader = require('./V3DLoader')

// Desired distance of the camera from the scene, in multiples of the scene radius
const CAMERA_DISTANCE_MULTIPLIER = 1.5

module.exports = class Face3D extends BaseFace {

    /** Face URL */
    static get url() { return 'native://generic-3d' }

    /** This face is too heavy to load in the inventory view. */
    static get heavy() { return true }

    /** Called by VatomView when this face is loaded */
    onLoad() {

        // Store options
        this.options = this.face.config || this.vatom.private || {}

        // Create clock to measure delta between frames
        this.clock = new THREE.Clock()

        // Create canvas
        this.canvas = document.createElement("canvas")
        this.canvas.style.cssText = "position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; "
        this.element.appendChild(this.canvas)

        // Create placeholder image
        this.placeholderImg = document.createElement("div")
        this.placeholderImg.style.cssText = "position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; background-size: contain; background-position: center; background-repeat: no-repeat; "
        this.element.appendChild(this.placeholderImg)

        // Find correct image resource to display
        let resname = this.face.config && this.face.config.placeholder_image || "ActivatedImage"
        let res = this.vatom.properties.resources.find(r => r.name == resname)
        if (res)
            this.placeholderImg.style.backgroundImage = "url(" + this.vatomView.blockv.UserManager.encodeAssetProvider(res.value.value) + ")"

        // Create loader
        this.loader = createThreeDotLoader()
        this.loader.style.cssText = "position: absolute; bottom: 25%; left: calc(50% - 35px); width: 70px; background-color: rgba(255, 255, 255, 0.95); border-radius: 4px; "
        this.element.appendChild(this.loader)

        // Prepare 3D
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true })
        this.renderer.setClearColor(0, 0)
        this.renderer.setPixelRatio(window.devicePixelRatio || 1)

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(45, this.element.clientWidth / this.element.clientHeight, 0.0001, 20000)
        this.cameraRotationTarget = new THREE.Vector3()
        this.cameraContainer = new THREE.Object3D()
        this.cameraContainer.add(this.camera)

        // Add light to camera
        this.cameraLight = new THREE.PointLight(0xffffff , 1, 0, 2)
        this.camera.add(this.cameraLight)

        // Animation mixer
        this.mixer = null

        // Bind render function
        this.render = this.render.bind(this)

        // Setup resize listener
        this.onResize = this.onResize.bind(this)
        window.addEventListener('resize', this.onResize)

        // Start render loop
        this.render()

        // Prevent gestures from scrolling or zooming the page
        this.canvas.addEventListener("touchstart", e => e.preventDefault())

        // Add rotate gesture recognizer
        this.hammertime = new Hammer(this.canvas)
        this.hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
        this.hammertime.on("pan", ev => {

            // Set target rotation
            this.cameraRotationTarget.y -= ev.velocityX * 0.2
            this.cameraRotationTarget.x -= ev.velocityY * 0.2
            this.cameraRotationTarget.x = Math.min(Math.max(this.cameraRotationTarget.x, -Math.PI / 2), Math.PI / 2)

        })

        // The desired camera distance from the center of the scene
        this.desiredCameraZ = 0

        // Add zoom gesture recognizer
        var lastDistance = this.desiredCameraZ
        this.hammertime.get('pinch').set({ enable: true })
        this.hammertime.on("pinchstart", e => {
            lastDistance = this.desiredCameraZ
        })
        this.hammertime.on("pinch", ev => {

            // Change camera distance (reverse the scale property, since smaller is actually closer, and thereby bigger)
            this.desiredCameraZ = lastDistance * Math.abs((ev.scale - 1) * 0.5 - 1)

        })

        // On single tap, notify the animation manager
        this.hammertime.on("tap", e => {

            // Notify animation manager, if it exists
            if (this.animation)
                this.animation.onClick()

        })

        // Reset camera on double tap
        this.hammertime.on("doubletap", e => {
            this.desiredCameraZ = this.sceneBSRadius * CAMERA_DISTANCE_MULTIPLIER
            lastDistance = this.desiredCameraZ
            this.cameraRotationTarget.set(0, 0, 0)
        })

        // Get resource specified in the face config
        let resource = this.vatom.properties.resources.find(r => r.name == this.options.scene)

        // Get resource specified in the resources array
        if (!resource)
            resource = this.face.resources && this.faces.resources[0] && this.vatom.properties.resources.find(r => r.name == this.faces.resources[0])

        // Failing that, get the Scene GLB resource if it exists
        if (!resource)
            resource = this.vatom.properties.resources.find(r => r.name == 'Scene.glb')

        // Failing that, get the Scene resource if it exists
        if (!resource)
            resource = this.vatom.properties.resources.find(r => r.name == 'Scene')

        // If still no resource, stop
        if (!resource)
            return Promise.reject(new Error("No scene resource found"))

        // Check if got a GLB resource
        var isGLB = resource.value.value.toLowerCase().indexOf(".v3d") == -1

        // Sign the URL
        this.whenLoadComplete = Promise.resolve(this.vatomView.blockv.UserManager.encodeAssetProvider(resource.value.value)).then(signedURL => {

            // Load scene
            return isGLB ? this.loadGLTFScene(signedURL) : V3DLoader.load(signedURL).then(scene => ({ scene }))

        }).then(({ scene, animations }) => {

            // Hide loader and placeholder image
            if (this.placeholderImg.parentNode) this.placeholderImg.parentNode.removeChild(this.placeholderImg)
            if (this.loader.parentNode) this.loader.parentNode.removeChild(this.loader)

            // Display scene
            this.scene = scene

            // Add camera to scene
            this.scene.add(this.cameraContainer)

            // Reset camera position
            this.resetCamera()

            // Reset viewport just in case it changed while we were loading
            this.onResize()

            // Enable or disable camera light
            if (this.vatom.private.no_camera_light)
                this.cameraLight.parent.remove(this.cameraLight)

            // Load skybox texture
            Face3D.loadSkyboxCubeMap().then(skyboxTexture => {

                // Apply skybox texture as env map to all materials. First traverse each object
                // Adapted from https://github.com/donmccurdy/three-gltf-viewer/blob/98ad8ee8528e87a4654ef7a86cf79042ba1dcea3/src/viewer.js#L394
                this.scene.traverse(node => {

                    // Stop if not a mesh
                    if (!node.isMesh)
                        return

                    // Get materials array
                    var materials = Array.isArray(node.material) ? node.material : [node.material]

                    // Go through each material
                    materials.forEach(material => {

                        // Apply env map if supported material type
                        if (material.isMeshStandardMaterial || material.isGLTFSpecularGlossinessMaterial) {
                            material.envMap = skyboxTexture
                            material.needsUpdate = true
                        }

                    })
                })

            })

            // Create animation manager
            this.animation = new AnimationManager(this.scene, animations, this.options.animation_rules, this.vatom.payload)

        })

    }

    /** @private Loads the skybox cubemap texture */
    static loadSkyboxCubeMap() {

        // Stop if loading already
        if (Face3D.skyboxPromise)
            return Face3D.skyboxPromise

        // Create URLs
        const cubeMapURLs = [
          require("./skybox/posx.jpg"), require("./skybox/negx.jpg"),
          require("./skybox/posy.jpg"), require("./skybox/negy.jpg"),
          require("./skybox/posz.jpg"), require("./skybox/negz.jpg")
        ]

        // Create loader
        var envMap = new THREE.CubeTextureLoader().load(cubeMapURLs)
        envMap.format = THREE.RGBFormat
        Face3D.skyboxPromise = Promise.resolve(envMap)

        // Return promise
        return Face3D.skyboxPromise

    }

    /** @private Called to load a GLTF scene */
    loadGLTFScene(url) {

        // Return promise
        return new Promise((onSuccess, onFail) => {

            // Load scene
            var ldr = new THREE.GLTFLoader()
            ldr.load(url, onSuccess, null, onFail)

        })

    }

    /** @private @override Called when the face is removed */
    onUnload() {

        // Remove elements
        this.canvas.parentNode.removeChild(this.canvas)
        this.canvas = null
        this.camera = null
        this.cameraContainer = null
        this.scene = null
        this.renderer = null

        // Remove listeners
        window.removeEventListener('resize', this.onResize)

    }

    /** @private @override Called when the view is resized */
    onResize() {

        // Stop if canvas has been removed already
        if (!this.canvas)
            return

        // Get size of canvas
        var rect = this.canvas.getBoundingClientRect()

        // Update renderer size
        this.renderer.setSize(rect.width, rect.height, false)
        this.camera.aspect = rect.width / rect.height
        this.camera.updateProjectionMatrix()
        this.camera.position.z = this.sceneBSRadius * CAMERA_DISTANCE_MULTIPLIER * (this.options.zoom || 1)//* Math.max(this.element.clientWidth / this.element.clientHeight, this.element.clientHeight / this.element.clientWidth);

    }

    /** @private @override Called when the vatom's state changes */
    onVatomUpdated() {

        // Notify animation manager
        if (this.animation)
            this.animation.onStateChanged(this.vatom.payload)

    }

    /** @private The render loop */
    render() {

        // Stop render loop if no canvas element
        if (!this.canvas)
            return

        // Do again soon
        requestAnimationFrame(this.render)

        // Get delta time
        var delta = this.clock.getDelta()

        // Stop if no scene yet
        if (!this.scene)
            return

        // Rotate camera
        var velocityDelta = Math.min(1, delta * 6)
        this.cameraContainer.rotation.x += (this.cameraRotationTarget.x - this.cameraContainer.rotation.x) * velocityDelta
        this.cameraContainer.rotation.y += (this.cameraRotationTarget.y - this.cameraContainer.rotation.y) * velocityDelta
        this.cameraContainer.rotation.z += (this.cameraRotationTarget.z - this.cameraContainer.rotation.z) * velocityDelta
        this.camera.position.z += (this.desiredCameraZ - this.camera.position.z) * velocityDelta

        // Progres animations
        this.animation && this.animation.update(delta)

        // Do render
        this.renderer.render(this.scene, this.camera)

        // Do autorotate if requested
        if (this.options.autorotate)
            this.cameraRotationTarget.y += 0.05 * delta

    }

    /** @private Moves the camera to the best distance to view the whole scene */
    resetCamera() {

        // Stop if no scene
        if (!this.scene || !this.camera)
            return

        // Calculate the center and radius of the scene (code from https://github.com/mrdoob/three.js/issues/1493)
        var box = new THREE.Box3().setFromObject(this.scene)
        this.sceneBSRadius = Math.sqrt(Math.pow((box.max.x - box.min.x), 2) + Math.pow((box.max.z - box.min.z), 2) + Math.pow((box.max.y - box.min.y), 2))

        // Move camera container to be at the center of the scene
        box.center(this.cameraContainer.position)

        // Move camera
        this.desiredCameraZ = this.sceneBSRadius * CAMERA_DISTANCE_MULTIPLIER

        // Set camera's near and far values, to prevent artefacts
        this.camera.near = this.sceneBSRadius * 0.1
        this.camera.far = this.sceneBSRadius * 10
        this.camera.updateProjectionMatrix()

    }

}
