//
//  JSON+Serialization.swift
//  Face3D
//
//  Created by Josh Fox on 2018/10/25.
//

import Foundation
import BLOCKv
import GenericJSON

extension JSON {
    
    /// Converts into a JSON string.
    public var jsonString : String {
        
        // Check type
        switch self {
        case .bool(let val):
            
            // Boolean
            return val ? "true" : "false"
            
        case .null:
            
            // Null
            return "null"
            
        case .number(let val):
            
            // Number
            return String(val)
            
        case .string(let val):
            
            // String, escape special characters
            return "\"" + val
                .replacingOccurrences(of: "\\", with: "\\\\")
                .replacingOccurrences(of: "\r", with: "\\r")
                .replacingOccurrences(of: "\n", with: "\\n")
                .replacingOccurrences(of: "\"", with: "\\\"") + "\""
            
        case .array(let items):
            
            // Array. Output each item
            return "[" + items.map { $0.jsonString }.joined(separator: ",") + "]"
            
        case .object(let items):
            
            // Object. Output each item.
            return "{" + items.map { "\"\($0.key)\":" + $0.value.jsonString }.joined(separator: ",") + "}"
            
        }
        
    }
    
}
