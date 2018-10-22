//
// Manages animations. Also handles automatic triggers.

function AnimationManager(scene) {

    // Store properties
    this.scene              = scene;
    this.triggers           = [];
    this.animations         = [];
	this.lastUpdate			= 0;
	this.firstRun			= true;
	this.mixer				= new THREE.AnimationMixer(scene);

}

/** @private Called every render frame */
AnimationManager.prototype.update = function() {

	// Get delta time
	var delta = Date.now() - this.lastUpdate;
	this.lastUpdate = Date.now();

	// Check if first run
	if (this.firstRun) {

		// Trigger all "preview" animations
		for (var i = 0 ; i < this.triggers.length ; i++)
			if (this.triggers[i].type == "preview")
				this.trigger(this.triggers[i]);

		// Done
		this.firstRun = false;
		return;

	}



	// Update animation mixer
	this.mixer.update(delta);

}

/** Trigger the specified animation */
AnimationManager.prototype.trigger = function(anim) {

	// Check if an animation name was provided
	if (typeof anim == "string")
		anim = this.getTriggerWithName(anim);

	// Check if null
	if (!anim)
		return;

	// Check if not the right type
	if (!(anim instanceof AnimationTrigger))
		return console.warn("V3D: Please specify an AnimationTrigger to the trigger() function.");


	// Trigger it
	console.log("V3D: Triggering animation " + anim.name);

}

/** Gets the specified animation trigger */
AnimationManager.prototype.getTriggerWithName = function(name) {

	// Find animation trigger
	for (var i = 0 ; i < this.triggers.length ; i++)
		if (this.triggers[i].name == name)
			return this.triggers[i];

}

module.exports = AnimationManager;
