//
// This function creates a three-dot loader element, which views can then attach to the dom.

const styles = `
.threedfacespinner {
  margin: 0px auto;
  width: 70px;
  text-align: center;
}
.threeddfacespinner > div {
  width: 12px;
  height: 12px;
  margin: 0px 3px;
  border-radius: 100%;
  display: inline-block;
  -webkit-animation: threeddface-sk-bouncedelay 1.4s infinite ease-in-out both;
  animation: threeddface-sk-bouncedelay 1.4s infinite ease-in-out both;
}
.threeddfacespinner .bounce1 {
  -webkit-animation-delay: -0.32s;
  animation-delay: -0.32s;
}
.threeddfacespinner .bounce2 {
  -webkit-animation-delay: -0.16s;
  animation-delay: -0.16s;
}
@-webkit-keyframes threeddface-sk-bouncedelay {
  0%, 80%, 100% { -webkit-transform: scale(0) }
  40% { -webkit-transform: scale(1.0) }
}
@keyframes threeddface-sk-bouncedelay {
  0%, 80%, 100% {
    -webkit-transform: scale(0);
    transform: scale(0);
  } 40% {
    -webkit-transform: scale(1.0);
    transform: scale(1.0);
  }
}
`

/** Used to ensure we only ever attach the styles once */
var stylesElement = null

/**
 *  Creates a loader element which can be attached to the DOM.
 *
 *  @param {string} color The color of the dots.
 *  @returns {DOMElement} The new loader.
 */
module.exports = function createThreeDotLoader(color = "#333") {

    // Attach styles if not attached yet
    if (!stylesElement) {

        // Attach styles to document
        stylesElement = document.createElement("style")
        stylesElement.innerHTML = styles
        document.body.appendChild(stylesElement)

    }

    // Create element
    let div = document.createElement("div")
    div.className = "threeddfacespinner"
    div.innerHTML = `
        <div class="bounce1" style="background-color: ${color}; "></div>
        <div class="bounce2" style="background-color: ${color}; "></div>
        <div class="bounce3" style="background-color: ${color}; "></div>
    `

    // Done
    return div

}
