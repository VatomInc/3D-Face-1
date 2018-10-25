//
//  Data+URI.swift
//  VatomFace3D
//
//  Created by Josh Fox on 2018/10/25.
//

import Foundation

// Useful URL extensions
extension Data {
    
    // Convert a file URL to a Data URI
    func toDataURI() -> String {
        
        // Build the URI
        // TODO: Use the correct mime type based on file extension?
        let base64 = self.base64EncodedString(options: [])
        return "data:application/octet-stream;base64," + base64
        
    }
    
}
