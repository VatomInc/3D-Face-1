//
// Holds an animation, which is a series of animation commands.

function Animation(metadata, commandText) {

    // Store properties
    this.name 			= metadata.name || "";
    this.repeat 		= !!metadata.repeat;
	this.tracks			= [];

	// Create tracks
	this.processCommands(commandText);

	// Store Animation Clip
    this.clip			= new THREE.AnimationClip(this.name, -1, this.tracks);

}

/** @private Process command text into a list of commands */
Animation.prototype.processCommands = function(txt) {

    // Go through each line
    var lines = txt.split("\n");
    lines.forEach(function(line) {

        // Trim it
        line = line.trim();

        // Check if comment
        if (!line || line.substring(0, 1) == "#")
            return;

        // Split into parameters
        var params = line.split(" ");
        if (params.length == 0)
            return;

        // Get command and arguments
        var cmd = params[0];
        var args = {};
        params.forEach(function(param) {

            // Check if empty
            if (!param || param == cmd)
                return;

            // Get index of =
            var idx = param.indexOf("=");
            if (idx == -1)
                return;

            // Split into key=value
            var key = param.substring(0, idx).toLowerCase();
            var val = param.substring(idx+1).toLowerCase();
            args[key] = val;

        });

        // Check command type
        if (cmd == "translate_x")
            this.commands.push(new AnimateProperty(["position", "x"], args));
        else if (cmd == "translate_y")
            this.commands.push(new AnimateProperty(["position", "y"], args));
        else if (cmd == "translate_z")
            this.commands.push(new AnimateProperty(["position", "z"], args));
        else if (cmd == "scale_x")
            this.commands.push(new AnimateProperty(["scale", "x"], args));
        else if (cmd == "scale_y")
            this.commands.push(new AnimateProperty(["scale", "y"], args));
        else if (cmd == "scale_`")
            this.commands.push(new AnimateProperty(["scale", "z"], args));

    }.bind(this));

}

module.exports = Animation;
