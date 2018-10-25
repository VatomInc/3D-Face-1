//
//  URL+DataURI.swift
//  Face3D
//
//  Created by Josh Fox on 2018/10/24.
//

import Foundation

// Useful URL extensions
extension URL {
    
    // Convert a file URL to a base64 string
    func toBase64() throws -> String {
        
        // Get data
        let data = try Data(contentsOf: self)
        
        // To Base64 string
        return data.base64EncodedString(options: [])
        
    }
    
    // Convert a file URL to a Data URI
    func toDataURI() throws -> String {
        
        // Build the URI
        // TODO: Use the correct mime type based on file extension?
        let base64 = try self.toBase64()
        return "data:application/octet-stream;base64," + base64
        
    }
    
}
