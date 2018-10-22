//
// Represents an animation trigger - An action, source, and a list of animations to apply to a list of objects.

function AnimationTrigger(scene, metadata) {

    // Store properties
    this.scene      = scene;
    this.name       = metadata["name"] || "";
    this.type       = metadata["trigger.type"];

}

module.exports = AnimationTrigger;
