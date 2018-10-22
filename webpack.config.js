
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
    path: __dirname + "/dist/",
    filename: "Face3D.min.js",
    libraryTarget:"var",
    library:"Face3D"
};
// Output a sourcemap
module.exports.devtool = "source-map";

// Support for resource files
module.exports.module.rules.push({
    test: /\.(jpg|png|svg)/,
    exclude: /node_modules/,
    loader: 'url-loader',
    options: {
        limit: 8192,
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
