//
//  VatomModel+JSON.swift
//  Face3D
//
//  Created by Josh Fox on 2018/10/25.
//

import Foundation
import BLOCKv

extension VatomModel {
    
    /// Converts the VatomModel back to the server's JSON format. This is an approximation, since data can be lost during deserialization.
    public var toJSON : JSON {
        
        return JSON.object([
            "id": JSON.string(self.id),
            "vAtom::vAtomType": JSON.object([
                "title": JSON.string(self.props.title),
                "template": JSON.string(self.props.templateID),
                "template_variation": JSON.string(self.props.templateVariationID),
                "cloning_score": JSON.number(Float(self.props.cloningScore)),
                "acquireable": JSON.bool(self.props.isAcquirable),
                "tradeable": JSON.bool(self.props.isTradeable),
                "redeemable": JSON.bool(self.props.isRedeemable),
                "resources": JSON.array(self.props.resources.map {[
                    "name": JSON.string($0.name),
                    "resourceType": JSON.string($0.type),
                    "value": JSON.object([
                        "value": JSON.string($0.url.absoluteString)
                    ])
                ]})
            ]),
            "private": self.private ?? JSON.object([:]),
            "eth": self.eth ?? JSON.object([:]),
            "eos": self.eos ?? JSON.object([:])
        ])
        
    }
    
}
