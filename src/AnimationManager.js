//
// Manages the animation being played by the scene

module.exports = class AnimationManager {

    /**
     * Manages and executes animations.
     * 
     * @param {THREE.Object3D} scene The root object for animations.
     * @param {THREE.AnimationClip[]} clips Animation clips
     * @param {object[]} rules Set of animation_rules attached to the vatom
     * @param {object} objectState The vatom's raw payload
     * @param {THREE.AudioListener} audioListener Audio listener for the scene
     */
    constructor(scene, clips, rules, objectState = {}, audioListener) {

        // Store vars
        this.scene = scene
        this.clips = clips || []
        this.rules = rules || []
        this.audioListener = audioListener

        // Currently playing animation
        this.currentAnimation = ""

        // Stores pending and completed audio buffer promises
        this.audioBufferPromises = {}

        // Stores the last playback time of a sound. This helps prevent playing back multiple times after loading.
        this.audioPlayTimes = {}

        // Delayed actions. Each object contains an `at` timestamp and a `rule` to perform.
        this.delayedActions = []

        // Create animation mixer
        this.mixer = new THREE.AnimationMixer(scene)
        this.mixer.addEventListener("finished", this.onAnimationFinished.bind(this))

        // Trigger event
        this.onStart()

        // Trigger state changed event
        this.onStateChanged(objectState)

        // Set by the user of this class, will be called when an animation rule requests to perform an action.
        this.requestingPerformAction = null

        // Set by the user of this class, will be called to map a resource name to a URL
        this.requestingResourceURL = null

    }

    /** Must be called every frame by the renderer */
    update(delta) {

        // Update animation mixer
        this.mixer.update(delta)

        // Perform any delayed actions
        while (this.delayedActions.length > 0 && this.delayedActions[0].at <= Date.now()) {

            // Perform this delayed action now
            let action = this.delayedActions.shift()
            this.performAction(action.rule, true)

        }

    }

    /** Plays the specified named animation */
    play(name) {

        // Check if currently playing animation name matches this one
        if (name == this.currentAnimation)
            return

        // Find new animation
        var anim = this.clips.find(c => c.name == name)
        if (!anim)
            return console.warn(`[Animation Manager] Unable to find animation with the name ${name}. Ignoring.`)

        // Stop all current animations
        this.mixer.stopAllAction()

        // HACK: For some reason the animation just won't play if you call play() a second time? Let's just remove all
        // cached actions until this can be sorted.
        for (let clip of this.clips)
            this.mixer.uncacheClip(clip)

        // Play this one
        this.currentAnimation = name
        let action = this.mixer.clipAction(anim)
        action.clampWhenFinished = true
        action.setLoop(THREE.LoopOnce)
        action.reset()
        action.play()

        // Check for "animation-start" events (also prevent replaying the animation again)
        this.rules.filter(r => r.on == 'animation-start' && r.target == name && r.play != name).forEach(rule => this.performAction(rule))

    }

    /** Perform the specified action(s) from the rule payload */
    performAction(rule, isDelayedAlready) {

        // Execute action
        // let info = []
        // if (rule.delay) info.push('delay = ' + rule.delay)
        // if (rule.play) info.push('animation = ' + rule.play)
        // if (rule.sound) info.push('sound = ' + rule.sound.resource_name)
        // if (rule.action) info.push('action = ' + rule.action.name)
        // console.log(`[Animation Manager] ${rule.delay && !isDelayedAlready ? 'Delaying' : 'Executing'} ${rule.on} rule: ${info.join(', ')}`)

        // Do delay if necessary
        if (rule.delay && !isDelayedAlready)
            return this.delayedActions.push({ rule, at: Date.now() + rule.delay })

        // Trigger animation
        if (rule.play)
            this.play(rule.play)

        // Trigger action
        if (rule.action) {
            
            // Send action
            Promise.resolve().then(e => this.requestingPerformAction(rule.action)).then(e => {

                // Action success, play related animations
                console.log(`[Animation Manager] ${rule.action.name} action complete`)
                this.rules.filter(r => r.on == 'action-complete' && (!r.target || r.target == rule.action.name)).forEach(rule => this.performAction(rule))

            }).catch(err => {

                // Action failed, play related animations
                console.log(`[Animation Manager] ${rule.action.name} action failed: ${err.message}`)
                this.rules.filter(r => r.on == 'action-fail' && (!r.target || r.target == rule.action.name)).forEach(rule => this.performAction(rule))

            })

        }

        // Play audio
        if (rule.sound) this.fetchAudioBuffer(rule.sound.resource_name).then(buffer => {

            // Prevent overkill
            let lastPlayTime = this.audioPlayTimes[rule.sound.resource_name] || 0
            if (Date.now() - lastPlayTime < 100) return
            this.audioPlayTimes[rule.sound.resource_name] = Date.now()

            // Check which class to create
            let sound = rule.sound.is_positional ? new THREE.PositionalAudio(this.audioListener) : new THREE.Audio(this.audioListener)

            // Set buffer
            sound.setBuffer(buffer)

            // Set volume
            let volume = parseFloat(rule.sound.volume)
            if (volume)
                sound.setVolume(volume)

            // Add to scene if positional
            if (rule.sound.is_positional) {

                // Add to scene
                this.scene.add(sound)

                // Remove from scene once sound has finished playing
                sound.onEnded = e => {
                    this.scene.remove(sound)
                }

            }

            // Play
            sound.play()

        })

    }

    /** Fetch audio buffer */
    fetchAudioBuffer(resourceName) {

        // Check if one exists already
        if (this.audioBufferPromises[resourceName])
            return this.audioBufferPromises[resourceName]

        // Create promise chain
        let promise = Promise.resolve().then(e => this.requestingResourceURL(resourceName)).then(url => {

            // Load resource
            return new Promise((resolve, reject) => new THREE.AudioLoader().load(url, resolve, null, reject))

        })

        // Store promise
        this.audioBufferPromises[resourceName] = promise
        return promise

    }

    /** Called on startup */
    onStart() {

        // If no animation rules, just play the first clip
        if (this.rules.length == 0) {

            // Play first clip, if any
            if (this.clips.length > 0)
                this.mixer.clipAction(this.clips[0]).play()

            // Done
            return

        }

        // Go through all "start" rules
        this.rules.filter(r => r.on == "start").forEach(rule => this.performAction(rule))

    }

    /** Called when the current animation clip finishes */
    onAnimationFinished(e) {

        // No longer playing an animation
        let lastAnimation = this.currentAnimation
        this.currentAnimation = ""

        // Go through all rules matching what to do next
        this.rules.filter(r => r.on == "animation-complete" && r.target == lastAnimation).forEach(rule => this.performAction(rule))

    }

    /** Call this when the user clicks on the 3D model. Returns `true` if a click rule was executed. */
    onClick() {

        // Fetch click events
        let currentAnimation = this.currentAnimation
        this.rules.filter(r => r.on == "click").forEach(rule => {

            // Check if target matches
            if (typeof rule.target != "undefined" && rule.target != currentAnimation)
                return

            // Trigger animation
            this.performAction(rule)

        })

        // Done. Return true if we have any click handlers at all.
        return this.rules.some(r => r.on == 'click')

    }

    /** Call this when the object state changes. */
    onStateChanged(newState) {

        // Go through each rule
        for (let rule of this.rules) {

            // Check rule type
            if (rule.on != "state")
                continue

            // Get key path
            let keyPath = rule.target.split(/\.(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(k => k.replace(/"/g, ''))

            // Follow key path and get the value
            let keyValue = newState
            while (keyPath.length > 0) {

                keyValue = keyValue[keyPath[0]]
                keyPath.splice(0, 1)
                if (!keyValue)
                    break

            }

            // Check if value matches
            if (rule.value != keyValue)
                continue

            // Matched!
            this.performAction(rule)

        }

    }

}
