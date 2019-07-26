//
//  BlockV AG. Copyright (c) 2018, all rights reserved.
//
//  Licensed under the BlockV SDK License (the "License"); you may not use this file or
//  the BlockV SDK except in compliance with the License accompanying it. Unless
//  required by applicable law or agreed to in writing, the BlockV SDK distributed under
//  the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
//  ANY KIND, either express or implied. See the License for the specific language
//  governing permissions and limitations under the License.
//

import Foundation

extension FileManager {

    /// Removes the files in the specified directory which occur in the original directory.
    func removeFiles(in directory: URL, occuringIn originalDirectory: URL) throws {
        
        let contents = try self.contentsOfDirectory(at: originalDirectory, includingPropertiesForKeys: nil, options: [])
        
        for originalFile in contents {
            let unwantedFile = directory.appendingPathComponent(originalFile.lastPathComponent)
            try? self.removeItem(at: unwantedFile)
        }
    }
    
    /// Copies the files in the specified source directory to the destination directory.
    func copyContents(in sourceDirectory: URL, to destinationDirectory: URL) throws {
        
        guard let contents = try? self.contentsOfDirectory(at: sourceDirectory, includingPropertiesForKeys: nil, options: []) else { return }
        
        for originalFile in contents {
            let destination = destinationDirectory.appendingPathComponent(originalFile.lastPathComponent)
            try? self.copyItem(at: originalFile, to: destination)
        }
        
    }

}
