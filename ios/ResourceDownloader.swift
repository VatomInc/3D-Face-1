//
//  ResourceDownloader.swift
//  VatomFace3D
//
//  Created by Josh Fox on 2018/10/25.
//

import Foundation

/// Provides utilities for downloading resources
public class ResourceDownloader {
    
    /// Currently running downloads
    internal static var currentDownloads : [ResourceDownloader] = []
    
    /// Download a resource
    public static func download(url : URL) -> ResourceDownloader {
        
        // Check if currently downloading
        if let existing = currentDownloads.first(where: { $0.url == url }) {
            return existing
        }
        
        // Do download
        let download = ResourceDownloader(url: url)
        
        // Store it in the list of current downloads
        currentDownloads.append(download)
        
        // Done, return it
        return download
        
    }
    
    /// Current state
    private var isDownloading = true
    private var error : Error?
    
    /// Currently downloading URL
    public let url : URL
    
    /// Downloaded data
    public private(set) var data : Data?
    
    /// Callback types
    public typealias CallbackComplete = (Data) -> Void
    public typealias CallbackFailed = (Error) -> Void
    
    /// Callbacks when completed
    private var callbacksOnCompleted : [CallbackComplete] = []
    
    /// Callbacks when failed
    private var callbacksOnFail : [CallbackFailed] = []
    
    /// Constructor
    init(url : URL) {
        
        // Store URL
        self.url = url
        
        // Create request which prioritizes the cache
        let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 30)
        
        // Begin download
        URLSession.shared.dataTask(with: request) { (data, response, error) in
            
            // Done, mark as so
            self.isDownloading = false
            self.error = error
            self.data = data
            
            // Check for error
            if let err = error {
                
                // Notify failed
                for callback in self.callbacksOnFail {
                    callback(err)
                }
                
            } else if let data = data {
                
                // Notify completed
                for callback in self.callbacksOnCompleted {
                    callback(data)
                }
                
            }
            
            // Remove callbacks
            self.callbacksOnCompleted = []
            self.callbacksOnFail = []
            
            // Remove us from the list of currently running tasks
            ResourceDownloader.currentDownloads = ResourceDownloader.currentDownloads.filter { $0 !== self }
            
        }.resume()
        
    }
    
    // Add a callback for when the download is complete
    public func onComplete(_ cb : @escaping CallbackComplete) {
        
        // Check if done already
        if !isDownloading {
            
            // Check if we have data
            if let data = self.data {
                cb(data)
            }
            
            // Stop
            return
            
        }
        
        // Not downloading, add to callback list
        callbacksOnCompleted.append(cb)
        
    }
    
    // Add a callback for when the download is complete
    public func onFail(_ cb : @escaping CallbackFailed) {
        
        // Check if done already
        if !isDownloading {
            
            // Check if we have data
            if let error = self.error {
                cb(error)
            }
            
            // Stop
            return
            
        }
        
        // Not downloading, add to callback list
        callbacksOnFail.append(cb)
        
    }
    
}
