//
// An animation command to animate a property

function AnimateProperty(path, args) {

    // Store properties
    this.path               = path;
    this.from               = parseFloat(args.from || 0);
    this.to                 = parseFloat(args.to || 0);
    this.duration           = parseFloat(args.duration || 0);
    this.delay              = parseFloat(args.delay || 0);
    this.interpolation      = args.interpolation || "ease";

}

module.exports = AnimateProperty;
