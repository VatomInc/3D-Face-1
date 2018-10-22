//
// Allow reading data as a stream from an ArrayBuffer

// Dependencies
var Utf8ArrayToStr = require("./utf8.js");

function FileStream(arraybuffer) {

    // Store vars
    this.buffer = arraybuffer;
    this.dataView = new DataView(this.buffer);
    this.littleEndian = true;
    this.offset = 0;

}

/** Move to the specified offset */
FileStream.prototype.moveTo = function(offset) {
    this.offset = offset;
}

/** Move the specified offset from the current position */
FileStream.prototype.move = function(offset) {
    this.offset += offset;
}

/** Read an unsigned 8-bit integer */
FileStream.prototype.readUint8 = function(bigEndian) {

	// Read number
	var val = this.dataView.getUint8(this.offset, !bigEndian);

	// Increase offset
	this.offset += 1;

	// Done
	return val;

}

/** Read a signed 8-bit integer */
FileStream.prototype.readInt8 = function(bigEndian) {

	// Read number
	var val = this.dataView.getInt8(this.offset, !bigEndian);

	// Increase offset
	this.offset += 1;

	// Done
	return val;

}

/** Read an unsigned 16-bit integer */
FileStream.prototype.readUint16 = function(bigEndian) {

	// Read number
	var val = this.dataView.getUint16(this.offset, !bigEndian);

	// Increase offset
	this.offset += 2;

	// Done
	return val;

}

/** Read a signed 16-bit integer */
FileStream.prototype.readInt16 = function(bigEndian) {

	// Read number
	var val = this.dataView.getInt16(this.offset, !bigEndian);

	// Increase offset
	this.offset += 2;

	// Done
	return val;

}

/** Read an unsigned 32-bit integer */
FileStream.prototype.readUint32 = function(bigEndian) {

	// Read number
	var val = this.dataView.getUint32(this.offset, !bigEndian);

	// Increase offset
	this.offset += 4;

	// Done
	return val;

}

/** Read a signed 32-bit integer */
FileStream.prototype.readInt32 = function(bigEndian) {

	// Read number
	var val = this.dataView.getInt32(this.offset, !bigEndian);

	// Increase offset
	this.offset += 4;

	// Done
	return val;

}

/** Read an unsigned 64-bit integer */
FileStream.prototype.readUint64 = function(bigEndian) {

	// Read number (we don't support 64bit, so get the 32bit value)
	var val = this.dataView.getUint32(bigEndian ? this.offset + 4 : this.offset, !bigEndian);

	// Increase offset
	this.offset += 8;

	// Done
	return val;

}

/** Read a signed 64-bit integer */
FileStream.prototype.readInt64 = function(bigEndian) {

	// Read number (we don't support 64bit, so get the 32bit value)
	var val = this.dataView.getInt32(bigEndian ? this.offset + 4 : this.offset, !bigEndian);

	// Increase offset
	this.offset += 8;

	// Done
	return val;

}

/** Read a 32-bit IEEE float */
FileStream.prototype.readFloat32 = function(bigEndian) {

	// Read number
	var val = this.dataView.getFloat32(this.offset, !bigEndian);

	// Increase offset
	this.offset += 4;

	// Done
	return val;

}

/** Read a 64-bit IEEE float */
FileStream.prototype.readFloat64 = function(bigEndian) {

	// Read number
	var val = this.dataView.getFloat64(this.offset, !bigEndian);

	// Increase offset
	this.offset += 8;

	// Done
	return val;

}

/** Read UTF-8 encoded string with null terminator */
FileStream.prototype.readString = function(maxLength, ignoreTerminator) {

	// Make sure we have a max length
	maxLength = maxLength || 1024*64;

	// Create an array view
	var view = new Uint8Array(this.buffer, this.offset, Math.min(this.buffer.byteLength - this.offset, maxLength));

	// Find null terminator
	if (ignoreTerminator) {

		// They gave us an explicit length, no need to find the length ourselves

		// Increase offset
		this.offset += view.length;

	} else {

		// Find length
		var len = 0;
		while (view[len] != 0)
			len++;

		// Trim array
		view = new Uint8Array(this.buffer, this.offset, len);

		// Increase offset, including terminator
		this.offset += view.length + 1;

	}

	// Read string
	return Utf8ArrayToStr(view);

}


// Export this class
module.exports = FileStream;
