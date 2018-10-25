
Pod::Spec.new do |spec|

    # Pod info
    spec.name                   = 'VatomFace3D'
    spec.version                = '1.0.3'
    spec.license                = { :type => 'ISC' }
    spec.author                 = { 'BLOCKv' => 'developer.blockv.io' }
    spec.homepage               = 'https://github.com/BLOCKvIO/3D-Face'
    spec.summary                = 'This vAtom face can plug into the SDKs to render 3D content in either binary glTF or V3D format.'
    spec.source                 = { :git => 'https://github.com/BLOCKvIO/3D-Face.git', :tag => '1.0.3' }
    spec.source_files           = 'ios/*.{swift}'
    spec.resources              = 'webapp/**'
    spec.swift_version          = '4.2'
    spec.ios.deployment_target  = '10.0'

    # iOS framework dependencies
    spec.framework = 'WebKit'

    # Dependencies
    spec.dependency 'BLOCKv/Face'
    spec.dependency 'Nuke'
    spec.dependency 'FLAnimatedImage'
    spec.dependency 'NVActivityIndicatorView'

end
