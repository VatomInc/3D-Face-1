// Import the THREE.js 3D library
import * as THREE from "three"
window.THREE = window.THREE || THREE

// Attach GLTFLoader, which is not yet a core part of THREE.js. It's being actively developed, so get updates from https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/GLTFLoader.js
const GLTFLoader = require("./GLTFLoader.js")

// Other imports
const OrbitControls = require('./OrbitControls')
const Hammer = require('hammerjs')
const AnimationManager = require('./AnimationManager')
const V3DLoader = require('./V3DLoader')



// Desired distance of the camera from the scene, in multiples of the scene radius
const CAMERA_DISTANCE_MULTIPLIER = 1

export default class Face3D {

    constructor (vatomView, vatom, face) {

        // Store info
        this.vatomView = vatomView
        this.face = face

        // Create element
        this.element = document.createElement('div')
        this.element.style.position = 'relative'
        this.element.style.width = '100%'
        this.element.style.height = '100%'

    }

    get vatom() {
        return this.vatomView.vatom
    }

    /** Face URL */
    static get url() {
        return 'native://generic-3d'
    }

    /** This face is too heavy to load in the inventory view. */
    static get heavy() {
        return true
    }

    /** Called by VatomView when this face is loaded */
    onLoad() {

        // Store options
        this.options = this.face.properties.config || this.vatom.private || {}
        // Create clock to measure delta between frames
        console.log("acá",THREE.Clock)
        this.clock = new THREE.Clock()

        // Create canvas
        this.canvas = document.createElement("canvas")
        this.canvas.style.cssText = "position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; outline: none; "
        this.element.appendChild(this.canvas)

        // Create placeholder image
        this.placeholderImg = document.createElement("div")
        this.placeholderImg.style.cssText = "position: absolute; pointer-events: none; top: 0px; left: 0px; width: 100%; height: 100%; background-size: contain; background-position: center; background-repeat: no-repeat; "
        this.element.appendChild(this.placeholderImg)

        // Find correct image resource to display
        let resname = this.face.config && this.face.config.placeholder_image || "ActivatedImage"
        let res = this.vatom.properties.resources.find(r => r.name == resname)
        if (res)
            this.placeholderImg.style.backgroundImage = "url(" + this.vatomView.vatomNet.UserManager.encodeAssetProvider(res.value.value) + ")"

        // Create loader
        // this.loader = createThreeDotLoader()
        // this.loader.style.cssText = "position: absolute; pointer-events: none; bottom: 25%; left: calc(50% - 35px); width: 70px; background-color: rgba(255, 255, 255, 0.95); border-radius: 4px; "
        // this.element.appendChild(this.loader)

        // Prepare 3D
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: window.devicePixelRatio == 1
        })
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        // this.renderer.gammaFactor = 1.7;
        this.renderer.setClearColor(0, 0)
        this.renderer.setPixelRatio(window.devicePixelRatio || 1)

        // Setup camera and orbit controls
        this.camera = new THREE.PerspectiveCamera(60, this.element.clientWidth / this.element.clientHeight, 0.01, 100)
        this.controls = new OrbitControls.OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enabled = true;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.autoRotate = !!this.options.autorotate;
        this.controls.autoRotateSpeed = 0.25;
        this.controls.update()

        // Setup audio listener
        this.audioListener = new THREE.AudioListener()
        this.camera.add(this.audioListener)

        // Add light to camera
        this.cameraLight = new THREE.PointLight(0xffffff, 1, 0, 2)
        //this.camera.add(this.cameraLight)

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

        // On single tap, notify the animation manager
        this.hammertime = new Hammer(this.canvas)
        this.hammertime.on("tap", e => {

            // Notify animation manager, if it exists
            if (this.animation)
                this.animation.onClick()

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
        var isGLB = (resource.value.value || '').toLowerCase().indexOf(".v3d") == -1

        // Load scene
        return Promise.resolve(this.vatomView.vatomNet.UserManager.encodeAssetProvider(resource.value.value || '')).then(resourceURL => 
            isGLB 
                ? this.loadGLTFScene(resourceURL) 
                : V3DLoader.load(resourceURL).then(scene => ({ scene }))
        ).then(({ scene, animations }) => {

            // Hide loader and placeholder image
            if (this.placeholderImg.parentNode) this.placeholderImg.parentNode.removeChild(this.placeholderImg)
            // if (this.loader.parentNode) this.loader.parentNode.removeChild(this.loader)

            // Add scene
            this.scene = new THREE.Scene()
            this.scene.add(scene)
            this.scene.add(this.camera)

            // Calculate the center and radius of the scene (code from https://github.com/mrdoob/three.js/issues/1493)
            var box = new THREE.Box3().setFromObject(this.scene)
            this.sceneBSRadius = Math.sqrt(Math.pow((box.max.x - box.min.x), 2) + Math.pow((box.max.z - box.min.z), 2) + Math.pow((box.max.y - box.min.y), 2))

            // Move orbit control target to be the center of the model
            box.getCenter(this.controls.target)
            box.getCenter(this.camera.position)

            // Apply extra transforms from the face config
            let transform = this.options.transform || {}
            if (transform.rotate)
                scene.rotation.set(transform.rotate.x || 0, transform.rotate.y || 0, transform.rotate.z || 0)
            
            // Set camera's near and far values, to prevent artefacts
            this.camera.near = this.sceneBSRadius * 0.1
            this.camera.far = this.sceneBSRadius * 10

            // Set camera distance
            this.camera.position.z = this.sceneBSRadius * CAMERA_DISTANCE_MULTIPLIER * (this.options.zoom || 1)
            this.camera.updateProjectionMatrix()

            var light = new THREE.AmbientLight(0x768b97); // soft white light
            scene.add(light);

            var spotLight = new THREE.SpotLight(0xffffff, 1);
            spotLight.position.set(500, 400, 200);
            spotLight.angle = 0.4;
            spotLight.penumbra = 0.05;
            spotLight.decay = 1;
            spotLight.distance = 2000;

            spotLight.castShadow = true;
            spotLight.shadow.mapSize.width = 512;
            spotLight.shadow.mapSize.height = 512;
            scene.add(spotLight);

            spotLight.target.position.set(100, 100, -100);

            spotLight.shadow.camera.near = 0.5;
            spotLight.shadow.camera.far = 600;

            scene.add(spotLight.target);

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
                    if (!node.isMesh) {
                        return
                    } else {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }

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
            this.animation = new AnimationManager(this.scene, animations, this.options.animation_rules, this.vatom.payload, this.audioListener)
            this.animation.requestingResourceURL = name => this.vatomView.vatomNet.UserManager.encodeAssetProvider(this.vatom.properties.resources.find(r => r.name == name).value.value)
            this.animation.requestingPerformAction = actionDetails => {
                if (this.vatom.actions.includes(actionDetails.name))
                    this.vatom.performAction(actionDetails.name, actionDetails.payload)
            }
            this.animation.requestingCustomAction = name => this.vatomView.onMessage(name, {})

        }).then ( e => { this.render() })

    }

    /** @private Loads the skybox cubemap texture */
    static loadSkyboxCubeMap() {

        // Stop if loading already
        if (Face3D.skyboxPromise)
            return Face3D.skyboxPromise

        // Create URLs
        const cubeMapURLs = [
            require("./skybox/posx.jpg").default, require("./skybox/negx.jpg").default,
            require("./skybox/posy.jpg").default, require("./skybox/negy.jpg").default,
            require("./skybox/posz.jpg").default, require("./skybox/negz.jpg").default
        ]

        console.info("Loading skybox", cubeMapURLs)

        // Create loader
        var envMap = new THREE.CubeTextureLoader().load(cubeMapURLs)
        envMap.format = THREE.RGBAFormat
        Face3D.skyboxPromise = Promise.resolve(envMap).catch(console.error)

        // Return promise
        return Face3D.skyboxPromise

    }

    /** @private Called to load a GLTF scene */
    loadGLTFScene(url) {

        // Return promise
        return new Promise((onSuccess, onFail) => {

            // Load scene
            var ldr = new GLTFLoader.GLTFLoader()
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
        this.hammertime.destroy()

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
        this.controls.update()

        // Get delta time
        var delta = this.clock.getDelta()

        // Stop if no scene yet
        if (!this.scene)
            return

        // Progres animations
        this.animation && this.animation.update(delta)

        // Do render
        this.renderer.render(this.scene, this.camera)


        // Do autorotate if requested
        // if (this.options.autorotate)
        //     this.cameraRotationTarget.y += 0.05 * delta

    }

}