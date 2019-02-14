//
//  FaceModel+JSON.swift
//  VatomFace3D
//
//  Created by Josh Fox on 2018/10/25.
//

import Foundation
import BLOCKv
import GenericJSON

extension FaceModel {
    
    /// Converts the FaceModel back to the server's JSON format. This is an approximation, since data can be lost during deserialization.
    public var toJSON : JSON {
        
        return JSON.object([
            "id": JSON.string(self.id),
            "properties": JSON.object([
                "display_url": JSON.string(self.properties.displayURL),
                "constraints": JSON.object([
                    "platform": JSON.string(self.properties.constraints.platform),
                    "view_mode": JSON.string(self.properties.constraints.viewMode)
                ]),
                "config": self.properties.config ?? JSON.null
            ])
        ])
        
    }
    
}
