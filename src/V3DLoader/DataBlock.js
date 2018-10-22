//
// Represents a data block in the V3D file

function DataBlock() {

	// Properties
	this.id = 0;
	this.levelOfDetail = 0;
	this.metadata = {};
	this.dataOffset = 0;
	this.dataLength = 0;
	this.buffer = null;

}

/** Gets a Boolean metadata property */
DataBlock.prototype.getBoolProperty = function(name, defaultValue) {

	// Get property
	var prop = this.metadata[name];
	if (typeof prop == "undefined")
		return defaultValue;

	// Return it
	return !!prop;

}

module.exports = DataBlock;
