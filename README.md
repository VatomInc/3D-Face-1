# 3D Face

This is a face for the Android, iOS and Web BLOCKv SDKs, which allows rendering and interacting with 3D vatoms.

## Usage in the Android SDK

First add it to your gradle dependencies:

```gradle
//  In root build.gradle
allprojects {
  ...
  repositories {
    ...
    maven { url "https://jitpack.io" }
  }
}
```

``` gradle
//  In app/build.gradle
dependencies {
    implementation 'com.github.VatomInc:3d-face:+'
}
```

Then register it on app startup:

``` kotlin
// Kotlin
import io.blockv.face3d.Face3D

blockv.faceManager.registerFace(Face3D.factory)
```

``` java
// Java
import io.blockv.face3d.Face3D;

blockv.getFaceManager().registerFace(Face3D.Companion.getFactory());
```

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
import { VatomView } from '@vatom/sdk/face'
import Face3D from '@vatom/3d-face'

VatomView.registerFace(Face3D)
```

## Specification

- Display URL: `native://generic-3d`

## Building

To build, run `npm run build`. This results in running these scripts in this order:

- `build-lib` will compile the face code into `dist/Face3D.min.js`
- `copy-webapp` will copy all the files in `dist/` and put them into `webapp/`. This is the folder containing the wrapper web app the native apps use. The iOS library uses these files directly.
- `copy-android` copies all files in `webapp/` into the Android project's `assets/` folder. This is because I couldn't get the Android gradle build process to read these files directly.
