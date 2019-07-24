//
// Entry point for the 3D face web app (v2)

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

    // Start promise chain
    Promise.resolve().then(function() {

        // Get renderer info
        var rendererInfo = window.rendererInfo
        if (typeof nativeBridge != 'undefined') rendererInfo = JSON.parse(nativeBridge.getRendererInfo())
        if (!rendererInfo)
            throw new Error("No renderer info available.")

        // Get our vatom from the native bridge, mapping it to the Web SDK's model
        var vatom = new Vatom(rendererInfo.vatomPayload, [rendererInfo.facePayload], [])
        vatomView.vatom = vatom

        // Create 3D face
        face = new Face3D(vatomView, vatom, rendererInfo.facePayload)

        // Add face to the screen
        document.body.appendChild(face.element)
        face.element.style.cssText += "position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; "

        // Call it's onLoad
        return face.onLoad()

    }).then(function() {

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
            return window.webkit.messageHandlers.nativeBridge.postMessage({ action: "sign-url", id: id, url: url })

        // Send request to Android host
        if (typeof nativeBridge != 'undefined' && nativeBridge.signURL)
            return nativeBridge.signURL(id, url)

        // No handler
        delete pendingSignRequests[id]
        onFail(new Error("No native bridge handler available to sign this URL."))

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
