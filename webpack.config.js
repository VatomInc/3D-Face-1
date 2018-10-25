
//
// WebPack config file

var webpack = require('webpack');

module.exports = {
    plugins: [],
    module: {
        rules: []
    }
};
// The app's starting file
module.exports.entry = "./src/index.js";

// The final app's JS output file
module.exports.output = {
    path: __dirname + "/webapp/",
    filename: "Face3D.min.js",
    libraryTarget:"var",
    library:"Face3D"
};
// Output a sourcemap
module.exports.devtool = "source-map";

// Support for resource files. NOTE: We're using a big number to embed, because our web view will be run from a file:
// URL and apparently 3D textures have to be loaded over CORS. It's stupid.
module.exports.module.rules.push({
    test: /\.(jpg|png|svg)/,
    exclude: /node_modules/,
    loader: 'url-loader',
    options: {
        limit: 1024 * 1024 * 16, //8192,
        name: '[name].[ext]'
    }
});

// Compile support for ES6 classes etc
// module.exports.module.rules.push({
//     test: /\.js$/,
//     exclude: /node_modules/,
//     loader: 'babel-loader',
//     options: {
//         presets: [require("@babel/preset-env")]
//     }
// });
