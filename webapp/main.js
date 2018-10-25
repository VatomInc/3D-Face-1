//
// Entry point for the 3D face web app

// Our running face
var face

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {

    // Create our simulated VatomView
    var vatomView = {

        // Replace the Web SDK's signing function with our one
        blockv: {
            UserManager: {
                encodeAssetProvider: signURL
            }
        }

    }

    // Get our vatom from the native bridge, mapping it to the Web SDK's model
    var vatomPayload = window.rendererInfo && window.rendererInfo.vatomPayload
    var facePayload = window.rendererInfo && window.rendererInfo.facePayload
    var vatom = new Vatom(vatomPayload, [facePayload], [])

    // Get our face from the native bridge

    // Create 3D face
    face = new Face3D(vatomView, vatom, facePayload)

    // Add face to the screen
    document.body.appendChild(face.element)
    face.element.style.cssText += "position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; "

    // Call it's onLoad
    face.onLoad()

    // Wait for the load to complete
    face.whenLoadComplete.then(function() {

        // Notify iOS native host that load has completed
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge)
            window.webkit.messageHandlers.nativeBridge.postMessage({ action: "load" })

    }).catch(function(err) {

        // Load failed
        console.error(err)

        // Notify iOS native host that the load failed
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge)
            window.webkit.messageHandlers.nativeBridge.postMessage({ action: "loadfail", text: err.message })

    })

})

// Called by the native host when a new vatom payload has come through
function vatomStateChanged(payload) {

    // Update vatom payload
    face.vatom.payload = payload

    // Notify face
    face.onVatomUpdated()

}

var pendingSignRequests = {}

/** Send a sign URL request to the native app. @returns {Promise<String>} the signed URL. */
function signURL(url) {

    // Create request
    var id = Math.random().toString(36).substr(2)
    var request = { id: id }
    pendingSignRequests[id] = request

    // Create promise
    return new Promise(function(onSuccess, onFail) {

        // Store handlers
        request.onSuccess = onSuccess
        request.onFail = onFail

        // Send request to iOS host
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge)
            window.webkit.messageHandlers.nativeBridge.postMessage({ action: "sign-url", id: id, url: url })

    })

}

// Called by the native app when a sign request fails
function signURLFailed(id, errorText) {

    // Create error
    var error = new Error(errorText)

    // Find request
    var request = pendingSignRequests[id]
    if (!request)
        return

    // Finish the request
    request.onFail(error)
    delete pendingSignRequests[id]

}

// Called by the native app when a sign request completes
function signURLComplete(id, signedURL) {

    // Find request
    var request = pendingSignRequests[id]
    if (!request)
        return

    // Finish the request
    request.onSuccess(signedURL)
    delete pendingSignRequests[id]

}
