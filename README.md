# 3D Face

This is a face for the Android, iOS and Web BLOCKv SDKs, which allows rendering and interacting with 3D vatoms.

> NOTE: Only Web supported currently.

## Usage in the Web SDK

To use in the Web SDK, simply import and register when your app starts up:

```
import { VatomView } from '@blockv/sdk/face'
import Face3D from '@blockv/3d-face'

VatomView.registerFace(Face3D)
```

## Specification

- Display URL: `native://generic-3d`
