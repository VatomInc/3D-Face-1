//
// Manages the animation being played by the scene

const get = require('lodash/get')

const ShowDebugLogs = false

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
        if (ShowDebugLogs) console.debug(`[Animation Manager] Loaded, rules =`, rules)

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

        // Set by the user of this class, will be called when an alert needs to be displayed to the user. If null, will use the browser's `alert()` instead.
        this.requestingAlert = null

        // Set by the user of this class, will be called when an animation rule passes a custom value to the host app. This can be used to trigger host actions, such as closing a window, etc.
        this.requestingCustomAction = null

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

        // Expand vars in name
        name = this.expandVars(name)

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
        if (ShowDebugLogs) console.debug(`[Animation Manager] Playing animation = ${name}`)
        this.currentAnimation = name
        let action = this.mixer.clipAction(anim)
        action.clampWhenFinished = true
        action.setLoop(THREE.LoopOnce)
        action.reset()
        action.play()

        // Check for "animation-start" events (also prevent replaying the animation again)
        this.performActions(this.rules.filter(r => r.on == 'animation-start' && r.target == name && r.play != name))

    }

    /** Expand variables in the string */
    expandVars(str) {

        // Ensure it's a string
        if (!str || !str.substring)
            return str

        // Create variable context
        let ctx = {
            result: this.latestResult
        }

        // Go through each item, maximum of 100 vars
        for (let count = 0 ; count < 100 ; count++) {

            // Find brackets
            let startIdx = str.indexOf('${')
            let endIdx = str.indexOf('}', startIdx)
            if (startIdx == -1 || endIdx == -1)
                break

            // Get value
            let path = str.substring(startIdx + 2, endIdx)
            let value = get(ctx, path)

            // Replace in string
            str = str.substring(0, startIdx) + value + str.substring(endIdx + 1)

        }

        // Done
        return str

    }

    /** Display an alert */
    showAlert(text, title) {

        // Expand vars
        text = this.expandVars(text)
        title = this.expandVars(title)

        // Show alert, either by asking the host to show it, or just using the browser alert
        if (this.requestingAlert)
            this.requestingAlert(text, title)
        else
            alert(`${title} - ${text}`)

    }

    /** Perform the specified actions from the rules specified */
    performActions(rules) {

        // Perform all rules that don't have a condition
        rules.filter(r => !r.condition).map(r => this.performAction(r))

        // Go through each rule with a condition
        for (let rule of rules.filter(r => r.condition)) {

            // Get components
            let matched = /(.*)(==|!=)(.*)/g.exec(rule.condition)
            let left = matched && matched[1] || ""
            let type = matched && matched[2] || ""
            let right = matched && matched[3] || ""

            // Expand vars
            left = this.expandVars(left)
            right = this.expandVars(right)

            // Check type
            let passes = false
            if (!type && !right && left == "true") {

                // Always match
                passes = true

            } else if (type == "==") {

                // Check if equal
                passes = left == right

            } else if (type == "!=") {

                // Check if unequal
                passes = left != right

            }

            // Stop if didn't pass
            if (!passes) {
                console.log('[Animation Manager] Condition did not pass', left, type, right)
                continue
            }

            // Passed, run it
            console.log('[Animation Manager] Condition passed', left, type, right)
            this.performAction(rule)
            return

        }

    }

    /** Perform the specified action(s) from the rule payload */
    performAction(rule, isDelayedAlready) {

        // Execute action
        if (ShowDebugLogs) {
            let info = []
            if (rule.delay) info.push('delay = ' + rule.delay)
            if (rule.play) info.push('animation = ' + rule.play)
            if (rule.sound) info.push('sound = ' + rule.sound.resource_name)
            if (rule.action) info.push('action = ' + rule.action.name)
            console.debug(`[Animation Manager] ${rule.delay && !isDelayedAlready ? 'Delaying' : 'Executing'} ${rule.on} rule: ${info.join(', ')}`)
        }

        // Do delay if necessary
        if (rule.delay && !isDelayedAlready)
            return this.delayedActions.push({ rule, at: Date.now() + rule.delay })

        // Trigger animation
        if (rule.play)
            this.play(rule.play)

        // Pass custom data to the host
        if (rule.custom && !this.requestingCustomAction)
            console.warn(`[Animation Manager] Tried to perform custom action, but requestingCustomAction is not supplied by the host. custom = ${this.expandVars(rule.custom)}`)
        else if (rule.custom)
            this.requestingCustomAction(this.expandVars(rule.custom))

        // Show alert
        if (rule.alert)
            this.showAlert(rule.alert.text, rule.alert.title)

        // Trigger action
        if (rule.action) {
            
            // Send action
            this.runningVatomAction = Promise.resolve().then(e => this.requestingPerformAction(rule.action)).then(result => {

                // Action success, play related animations
                if (ShowDebugLogs) console.debug(`[Animation Manager] ${rule.action.name} action complete`, result)
                this.latestResult = result
                this.performActions(this.rules.filter(r => r.on == 'action-complete' && (!r.target || r.target == rule.action.name)))

            }).catch(err => {

                // Action failed, play related animations
                console.warn(`[Animation Manager] ${rule.action.name} action failed: ${err.message}`)
                let failRules = this.rules.filter(r => r.on == 'action-fail' && (!r.target || r.target == rule.action.name))
                if (failRules.length == 0) this.showAlert(err.message, "There was a problem")
                else this.performActions(failRules)

            }).then(e => {

                // Remove running action
                this.runningVatomAction = null

            })

        }

        // Play audio
        if (rule.sound) {
            
            let soundResource = this.expandVars(rule.sound.resource_name)
            this.fetchAudioBuffer(this.expandVars(soundResource)).then(buffer => {

                // Prevent overkill
                if (ShowDebugLogs) console.debug(`[Animation Manager] Playing sound = ${soundResource}`)
                let lastPlayTime = this.audioPlayTimes[soundResource] || 0
                if (Date.now() - lastPlayTime < 100) return
                this.audioPlayTimes[soundResource] = Date.now()

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
        this.performActions(this.rules.filter(r => r.on == "start"))

    }

    /** Called when the current animation clip finishes */
    onAnimationFinished(e) {

        // No longer playing an animation
        let lastAnimation = this.currentAnimation
        this.currentAnimation = ""

        // Go through all rules matching what to do next
        this.performActions(this.rules.filter(r => r.on == "animation-complete" && r.target == lastAnimation))

    }

    /** Call this when the user clicks on the 3D model. Returns `true` if a click rule was executed. */
    onClick() {

        // Stop if an action is running
        if (this.runningVatomAction) {
            console.log("[Animation Manager] Click ignored since there's a running action.")
            return true
        }

        // Fetch click events
        this.performActions(this.rules.filter(r => r.on == "click" && (typeof r.target == "undefined" || r.target == this.currentAnimation)))

        // Done. Return true if we have any click handlers at all.
        return this.rules.some(r => r.on == 'click')

    }

    /** Call this when the object state changes. */
    onStateChanged(newState) {

        // Go through each rule
        let rulesToPerform = []
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
            rulesToPerform.push(rule)

        }

        // Do them
        this.performActions(rulesToPerform)

    }

}
