# 3D Face

This is a face for the Android, iOS and Web BLOCKv SDKs, which allows rendering and interacting with 3D vatoms.

> NOTE: Only Web and iOS supported currently.

## Usage in the iOS SDK

First add it to your podfile:

``` ruby
pod 'VatomFace3D'
```

Then register it on app startup:

``` swift
import BLOCKv
import VatomFace3D

func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
    ...

    FaceViewRoster.shared.register(Face3D.self)

}
```

## Usage in the Web SDK

To use in the Web SDK, simply import and register when your app starts up:

``` javascript
import { VatomView } from '@blockv/sdk/face'
import Face3D from '@blockv/3d-face'

VatomView.registerFace(Face3D)
```

## Specification

- Display URL: `native://generic-3d`
