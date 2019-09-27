//
// Manages the animation being played by the scene

module.exports = class AnimationManager {

    constructor(scene, clips, rules, objectState = {}) {

        // Store animation clips
        this.clips = clips || []

        // Store animation rules
        this.rules = rules || []

        // Currently playing animation
        this.currentAnimation = ""

        // Create animation mixer
        this.mixer = new THREE.AnimationMixer(scene)
        this.mixer.addEventListener("finished", this.onAnimationFinished.bind(this))

        // Trigger event
        this.onStart()

        // Trigger state changed event
        this.onStateChanged(objectState)

    }

    /** Must be called every frame by the renderer */
    update(delta) {
        this.mixer.update(delta)
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
        console.log(`[Animation Manager] Playing ${name}`)
        this.currentAnimation = name
        let action = this.mixer.clipAction(anim)
        action.clampWhenFinished = true
        action.setLoop(THREE.LoopOnce)
        action.reset()
        action.play()

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
        this.rules.filter(r => r.on == "start").forEach(rule => {

            // Trigger animation
            if (rule.play)
                this.play(rule.play)

        })

    }

    /** Called when the current animation clip finishes */
    onAnimationFinished(e) {

        // No longer playing an animation
        let lastAnimation = this.currentAnimation
        this.currentAnimation = ""

        // Go through all rules matching what to do next
        this.rules.filter(r => r.on == "animation-complete" && r.target == lastAnimation).forEach(rule => {

            // Trigger animation
            if (rule.play)
                this.play(rule.play)

        })

    }

    /** Call this when the user clicks on the 3D model */
    onClick() {

        // Fetch click events
        this.rules.filter(r => r.on == "click").forEach(rule => {

            // Check if target matches
            if (typeof rule.target != "undefined" && rule.target != this.currentAnimation)
                return

            // Trigger animation
            if (rule.play)
                this.play(rule.play)

        })

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
            this.play(rule.play)

        }

    }

}
