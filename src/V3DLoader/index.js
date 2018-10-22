//
// Main file for the THREE.js importer

// Dependencies
var FileStream = require("./FileStream.js");
var DataBlock = require("./DataBlock.js");
var Animation = require("./animation/Animation.js");
var AnimationTrigger = require("./animation/AnimationTrigger.js");
var AnimationManager = require("./animation/AnimationManager.js");

function V3DLoader(options) {

    // Store options
    this.options = options || {};
	this.dataBlocks = [];
    this.textureLoader = new THREE.TextureLoader();

}

/** Load using promises */
V3DLoader.load = function(source, options) {

    // Return a promise
    return new Promise(function(onSuccess, onFail) {

        // Start load
        var loader = new V3DLoader(options);
        loader.loadFile(source, onSuccess, onFail);

    });

}

/** Load a file */
V3DLoader.prototype.loadFile = function(source, onLoad, onError, onProgress) {

	// Store callbacks
	this.onLoad = onLoad;
	this.onProgress = onProgress;
	this.onError = onError;

	// Check source type
	if (typeof source == "string") {

		// Load via AJAX request
		this.loadFromURL(source);

	} else if (source instanceof ArrayBuffer) {

		// Load by reading an ArrayBuffer
		this.loadFromArrayBuffer(source);

	} else if (source instanceof File || source instanceof Blob) {

		// Load by reading a File or Blob
		this.loadFromFile(source);

	} else {

		// Unknown source type
		this.onError && this.onError(new Error("Unknown source type. Please specify a string, File, Blob, or ArrayBuffer."));

	}

}

/** @private Load via AJAX request */
V3DLoader.prototype.loadFromURL = function(url) {

    // Fetch file data
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = this.options.withCredentials;
    xhr.responseType = 'arraybuffer';
    xhr.open("GET", url);
    xhr.send();

    // Set progress
    xhr.onprogress = this.onProgress;

    // Set fail handler
    xhr.onerror = this.onError;

    // Set complete handler
    xhr.onload = (function() {

        // Read file
        try {

            // Read the scene
            var scene = this.processArrayBuffer(xhr.response);
            this.onLoad(scene);

        } catch (e) {

            // Failed
            this.onError && this.onError(e);

        }

    }).bind(this);

}

/** @private Load from a File */
V3DLoader.prototype.loadFromFile = function(file) {

	// Read the file into an ArrayBuffer
	var reader = new FileReader();
	reader.readAsArrayBuffer(file);

	// Check for error
	reader.onerror = this.onError;

	// On complete...
	reader.onload = (function() {

		// Read file
        try {

            // Read the scene
            var scene = this.processArrayBuffer(reader.result);
            this.onLoad(scene);

        } catch (e) {

            // Failed
            this.onError && this.onError(e);

        }

	}).bind(this);

}

/** @private Load from an ArrayBuffer */
V3DLoader.prototype.loadFromArrayBuffer = function(arraybuffer) {

	// Read file
	try {

		// Read the scene
		var scene = this.processArrayBuffer(arraybuffer);
		this.onLoad(scene);

	} catch (e) {

		// Failed
		this.onError && this.onError(e);

	}

}

/** Read and process the ArrayBuffer, and return a THREE.Scene(). */
V3DLoader.prototype.processArrayBuffer = function(arraybuffer) {

    // Store file
	this.buffer = arraybuffer;
    this.stream = new FileStream(arraybuffer);
    this.scene = new THREE.Scene();

    // Read the header and directory blocks
    this.readHeader();
	this.readDirectory();

	// Construct scene graph
	this.createSceneGraph();

    // Construct animations
    this.createAnimations();

	// Done
	return this.scene;

}

/** @private Read the header file */
V3DLoader.prototype.readHeader = function() {

    // Check magic bytes
    var magic = this.stream.readUint32(true);
    if (magic != 0x3D0B1EC7)
        throw new Error("Unknown file type.");

    // Read file metadata
    var metadataStr = this.stream.readString();
	this.scene.userData = {
        fileMetadata: JSON.parse(metadataStr)
    }

}

/** @private Read the directory block */
V3DLoader.prototype.readDirectory = function() {

	// Check header bytes
    var magic = this.stream.readUint32(true);
    if (magic != 0x44495242)
        throw new Error("Invalid header for directory block.");

	// Skip length field
	this.stream.move(4);

	// Get number of entries
	var numEntries = this.stream.readUint32();

	// Process each entry
	this.dataBlocks = [];
	for (var i = 0 ; i < numEntries ; i++) {

		// Create block
		var block = new DataBlock();

		// Read block ID
		block.id = this.stream.readUint32();

		// Read level of detail
		block.levelOfDetail = this.stream.readUint8();

		// Read metadata length
		var metadataLength = this.stream.readUint16();

		// Read metadata
		var metadataStr = this.stream.readString(metadataLength - 1, true);
		this.stream.move(1);

		// Parse metadata
		try {
			block.metadata = JSON.parse(metadataStr) || {};
		} catch (e) {
			console.warn("V3D: Unable to parse block metadata! " + e);
		}

		// Read data length and offset
		block.dataOffset = this.stream.readUint64();
		block.dataLength = this.stream.readUint64();

		// Make a copy of the data
		block.buffer = this.buffer.slice(block.dataOffset, block.dataOffset + block.dataLength);

		// Add to list of blocks
		this.dataBlocks.push(block);

	}

}

/** @private Gets a block with the specified ID */
V3DLoader.prototype.getBlockWithID = function(id) {

	// Find it
	for (var i = 0 ; i < this.dataBlocks.length ; i++)
		if (this.dataBlocks[i].id == id)
			return this.dataBlocks[i];

}

/** @private Gets a block with the specified type */
V3DLoader.prototype.getBlockWithType = function(type) {

	// Find it
	for (var i = 0 ; i < this.dataBlocks.length ; i++)
		if (this.dataBlocks[i].metadata.type == type)
			return this.dataBlocks[i];

}

/** @private Gets blocks with the specified parent ID */
V3DLoader.prototype.getBlocksWithParentID = function(id) {

	// Find them
	var itms = [];
	for (var i = 0 ; i < this.dataBlocks.length ; i++)
		if (this.dataBlocks[i].metadata.parent == id)
			itms.push(this.dataBlocks[i]);

	// Done
	return itms;

}

/** @private Constructs the scene graph from the data blocks */
V3DLoader.prototype.createSceneGraph = function() {

	// Get the first scene block
	var sceneBlock = this.getBlockWithType("scene");
	if (!sceneBlock)
		throw new Error("No scene block found.");

	// Add metadata to scene
    this.scene.userData.metadata = sceneBlock.metadata;
    this.scene.userData.animations = [];
	if (this.options.returnDataBlocks) {
        this.scene.userData.dataBlock = sceneBlock;
        this.scene.userData.dataBlocks = this.dataBlocks;
    }

	// Add child elements
	var childBlocks = this.getBlocksWithParentID(sceneBlock.id);
	for (var i = 0 ; i < childBlocks.length ; i++)
		this.createSceneGraphComponent(childBlocks[i], this.scene);

}

/** @private Construct a scene graph component */
V3DLoader.prototype.createSceneGraphComponent = function(dataBlock, parentNode) {

	// Check block type
	var node = null;
	if (dataBlock.metadata.type == "scene.mesh") {

		// Create geometry
		console.log("V3D: Loading mesh " + dataBlock.metadata.name);
		var geometry = new THREE.Geometry();

        // Fetch face data
        var faceIndexBlock = this.getBlockWithID(dataBlock.metadata.faces);
        if (!faceIndexBlock) throw new Error("Face index block not found.");
        var faceIndexInts = new Uint32Array(faceIndexBlock.buffer);
        for (var i = 0 ; i < faceIndexInts.length ; i += 3)
            geometry.faces.push(new THREE.Face3(faceIndexInts[i+0], faceIndexInts[i+1], faceIndexInts[i+2]));

		// Fetch vertex data
		var vertexBlock = this.getBlockWithID(dataBlock.metadata.vertexData);
		if (!vertexBlock) throw new Error("Vertex block not found.");
		var vertexFloats = new Float32Array(vertexBlock.buffer);
		for (var i = 0 ; i < vertexFloats.length ; i += 3)
			geometry.vertices.push(new THREE.Vector3(vertexFloats[i+0], vertexFloats[i+1], vertexFloats[i+2]));

		// Fetch normals
		var normalsBlock = this.getBlockWithID(dataBlock.metadata.normals);
		if (!normalsBlock) throw new Error("Normals block not found.");
		var normalFloats = new Float32Array(normalsBlock.buffer);
        if (normalFloats.length / 3 != faceIndexInts.length) throw new Error("Invalid normal count! There should have been " + faceIndexInts.length + ", but there were " + (normalFloats.length / 3));
		for (var i = 0 ; i < geometry.faces.length ; i++) {

			// Set each face vertex's normal value
			var face = geometry.faces[i];
			face.vertexNormals = [
				new THREE.Vector3(normalFloats[i * 9 + 0], normalFloats[i * 9 + 1], normalFloats[i * 9 + 2]),
				new THREE.Vector3(normalFloats[i * 9 + 3], normalFloats[i * 9 + 4], normalFloats[i * 9 + 5]),
				new THREE.Vector3(normalFloats[i * 9 + 6], normalFloats[i * 9 + 7], normalFloats[i * 9 + 8])
			];

		}

		// Fetch UVs
		var uvsBlock = this.getBlockWithID(dataBlock.metadata.uvs);
		if (uvsBlock) {

            // Get UV data
			var uvFloats = new Float32Array(uvsBlock.buffer);
            if (uvFloats.length / 2 != faceIndexInts.length)
                throw new Error("Invalid UV count! There should have been " + faceIndexInts.length + ", but there were " + (uvFloats.length / 2));

            // Go through each face
			geometry.faceVertexUvs = [[]];
			for (var i = 0 ; i < geometry.faces.length ; i++) {

                // Add face vertex UVs
    			geometry.faceVertexUvs[0].push([
                    new THREE.Vector2(uvFloats[i * 6 + 0], uvFloats[i * 6 + 1]),
    			    new THREE.Vector2(uvFloats[i * 6 + 2], uvFloats[i * 6 + 3]),
    			    new THREE.Vector2(uvFloats[i * 6 + 4], uvFloats[i * 6 + 5])
                ]);

			}

		}

		// Get material
		var material = new THREE.MeshNormalMaterial();
		var materialBlock = this.getBlockWithID(dataBlock.metadata.material);
		if (materialBlock) {

			// Set material type
			if (materialBlock.metadata.lightingMode == "phong")
				material = new THREE.MeshPhongMaterial();
			else if (materialBlock.metadata.lightingMode == "lambert")
				material = new THREE.MeshLambertMaterial();
			else
				material = new THREE.MeshBasicMaterial();

			// Get diffuse color
			material.color.fromArray(materialBlock.metadata["diffuse.color"]);
			console.log(material.color);

	        // Go through textures
	        var textureIDs = materialBlock.metadata.textures || [];
	        for (var i = 0 ; i < textureIDs.length ; i++) {

	            // Get texture block
	            var textureBlock = this.getBlockWithID(textureIDs[i]);
	            if (!textureBlock)
	                continue;

	            // Get texture blob
	            var blob = new Blob([textureBlock.buffer], {type: textureBlock.metadata.mimetype});
	            var url = URL.createObjectURL(blob);

	            // Load texture
	            var texture = this.textureLoader.load(url);
	            texture.name = textureBlock.metadata["name"];
	            texture.wrapS = textureBlock.getBoolProperty("wrapS") ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
	            texture.wrapT = textureBlock.getBoolProperty("wrapT") ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
	            texture.minFilter = THREE.NearestFilter;

	            // Apply texture based on type
	            if (textureBlock.metadata["texture.type"] == "diffuse")
	                material.map = texture;

                // Make transparent if texture supports it
                if ((textureBlock.mimetype || "").toLowerCase().indexOf("png") != -1)
                    texture.transparent = true;

	        }

		}

		// Fetch face vertex colors
		var faceVertexColorsBlock = this.getBlockWithID(dataBlock.metadata.faceVertexColors);
		if (faceVertexColorsBlock) {

            // Get face vertex color data
            var colorFloats = new Float32Array(faceVertexColorsBlock.buffer);
            if (colorFloats.length / 3 != faceIndexInts.length)
                throw new Error("Invalid face vertex color count! There should have been " + faceIndexInts.length + ", but there were " + (colorFloats.length / 3));

            // Go through each face
            for (var i = 0 ; i < geometry.faces.length ; i++) {

                // Add face vertex UVs
    			var face = geometry.faces[i];
                face.vertexColors = [
    				new THREE.Color(colorFloats[i * 9 + 0], colorFloats[i * 9 + 1], colorFloats[i * 9 + 2]),
    				new THREE.Color(colorFloats[i * 9 + 3], colorFloats[i * 9 + 4], colorFloats[i * 9 + 5]),
    				new THREE.Color(colorFloats[i * 9 + 6], colorFloats[i * 9 + 7], colorFloats[i * 9 + 8])
    			];

            }

            // Set vertex color mode on material
            material.vertexColors = THREE.VertexColors;

        }

		// Create object
		node = new THREE.Mesh(geometry, material);

	} else if (dataBlock.metadata.type == "scene.group") {

		// A scene graph group component
		console.log("V3D: Loading group " + dataBlock.metadata.name);
		node = new THREE.Object3D();

	} else if (dataBlock.metadata.type == "scene.light") {

		// A scene graph Lamp component
		console.log("V3D: Loading light " + dataBlock.metadata.name);
		if (dataBlock.metadata["light.type"] == "point")
			node = new THREE.PointLight();
		else if (dataBlock.metadata["light.type"] == "spot")
			node = new THREE.SpotLight();
		else if (dataBlock.metadata["light.type"] == "directional")
			node = new THREE.DirectionalLight();
		else
			node = new THREE.Light();

		// Get color
		node.color.fromArray(dataBlock.metadata["light.color"]);

	} else {

		// Unknown scene graph component
		console.warn("V3D: Unknown scene graph component type " + dataBlock.metadata.type);
		node = new THREE.Object3D();

	}

    // Set translation
    if (dataBlock.metadata.translation && dataBlock.metadata.translation.length == 3)
        node.position.fromArray(dataBlock.metadata.translation);

    // Set scale
    if (dataBlock.metadata.scale && dataBlock.metadata.scale.length == 3)
        node.scale.fromArray(dataBlock.metadata.scale);

    // Set rotation
    if (dataBlock.metadata["rotation.quaternion"] && dataBlock.metadata["rotation.quaternion"].length == 4)
        node.quaternion.fromArray(dataBlock.metadata["rotation.quaternion"]);

	// Add to parent
	parentNode.add(node);

	// Add metadata
	node.name = dataBlock.metadata.name;
	node.userData = {}
    node.userData.metadata = dataBlock.metadata;
    if (this.options.returnDataBlocks)
        node.userData.dataBlock = dataBlock;

	// Add children
	var childBlocks = this.getBlocksWithParentID(dataBlock.id);
	for (var i = 0 ; i < childBlocks.length ; i++)
		this.createSceneGraphComponent(childBlocks[i], node);

}

/** Creates the animations */
V3DLoader.prototype.createAnimations = function() {

    // Setup animation manager
    return;
    this.scene.animationManager = new AnimationManager(this.scene);

    // Prepare the list of animations
    this.dataBlocks.forEach((function(block) {

        // Check if animation
        if (block.metadata.type != "animation")
            return;

        // Read block data as string
        this.stream.moveTo(block.dataOffset);
        var text = this.stream.readString(block.dataLength, true);

        // Parse
        var animation = new Animation(block.metadata, text);
        animation.blockID = block.id;

        // Add to list of animations
        this.scene.animationManager.animations.push(animation);

    }).bind(this));

    // Prepare the list of animation triggers
    this.dataBlocks.forEach((function(block) {

        // Check if trigger
        if (block.metadata.type != "animation.trigger")
            return;

        // Store trigger
        var trigger = new AnimationTrigger(this.scene, block.metadata);
        this.scene.animationManager.triggers.push(trigger);

    }).bind(this));

}


// Export this
module.exports = V3DLoader;
module.exports.FileStream = FileStream;
